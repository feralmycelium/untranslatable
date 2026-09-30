import { RULES, boundsOf, placementIssue } from "../public/rules.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PAYLOAD_BYTES = 256 * 1024;
const MAX_POINT_OFFSET = 3000;
const ITEM_FIELDS = "seq, id, created_at, x, y, payload";

const json = (body, init = {}) => Response.json(body, init);
const badRequest = (error) => json({ error }, { status: 400 });
const unavailable = () => json({ error: "storage_unavailable", recoverable: true }, { status: 503 });
const placementConflict = (message) => json({ error: "placement_conflict", message }, { status: 409 });

const itemFromRow = (row) => {
  const payload = JSON.parse(row.payload);
  return {
    seq: row.seq,
    id: row.id,
    createdAt: row.created_at,
    x: row.x,
    y: row.y,
    strokes: payload.strokes,
  };
};

const rows = async (statement) => (await statement.all()).results;

const validNumber = (value, maximum) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= maximum;

const parseMark = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { id, x, y, strokes } = value;
  if (typeof id !== "string" || !UUID.test(id) || !validNumber(x, RULES.worldLimit) || !validNumber(y, RULES.worldLimit)) return null;
  if (!Array.isArray(strokes) || strokes.length < 1 || strokes.length > RULES.maxStrokes) return null;
  let pointCount = 0;
  const parsedStrokes = [];
  for (const stroke of strokes) {
    if (!stroke || typeof stroke !== "object" || Array.isArray(stroke)) return null;
    const { kind, ink, seed, points } = stroke;
    if ((kind !== "script" && kind !== "thread") || (ink !== "ink" && ink !== "blue" && ink !== "red")) return null;
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || !Array.isArray(points) || points.length < 2 || points.length > RULES.maxStrokePoints) return null;
    const parsedPoints = [];
    for (const point of points) {
      if (!Array.isArray(point) || point.length !== 3 || !validNumber(point[0], MAX_POINT_OFFSET) || !validNumber(point[1], MAX_POINT_OFFSET) || !validNumber(point[2], 1) || point[2] < 0) return null;
      parsedPoints.push([point[0], point[1], point[2]]);
    }
    pointCount += parsedPoints.length;
    if (pointCount > RULES.maxPoints) return null;
    parsedStrokes.push({ kind, ink, seed, points: parsedPoints });
  }
  return { id, x, y, strokes: parsedStrokes };
};

const selectById = async (db, id) => db.prepare(`SELECT ${ITEM_FIELDS} FROM marks WHERE id = ?`).bind(id).first();

const selectAll = async (db) => rows(db.prepare(`SELECT ${ITEM_FIELDS} FROM marks ORDER BY seq ASC`).bind());

const parseInteger = (value, fallback, maximum) => {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
};

const boundedBody = async (request) => {
  if (!request.body) return "";
  const reader = request.body.getReader(), decoder = new TextDecoder();
  let size = 0, text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > MAX_PAYLOAD_BYTES) { await reader.cancel(); return null; }
      text += decoder.decode(value, { stream: true });
    }
  } catch { return null; }
  finally { reader.releaseLock(); }
};

const createMark = async (request, db) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "cross_origin_write" }, { status: 403 });
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_PAYLOAD_BYTES)) return badRequest("invalid_payload");
  const text = await boundedBody(request);
  if (text === null) return badRequest("invalid_payload");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return badRequest("invalid_json");
  }
  const mark = parseMark(value);
  if (!mark) return badRequest("invalid_payload");
  const payload = JSON.stringify(mark);
  const bounds = boundsOf(mark);
  const cellX = Math.floor(mark.x / RULES.cellSize);
  const cellY = Math.floor(mark.y / RULES.cellSize);
  // A stored mark's anchor can sit outside its painted bounds. Include every
  // cell whose bounded point offsets could reach this trace, plus pen padding.
  const reach = MAX_POINT_OFFSET + 30 + RULES.clearance;
  const cells = (low, high) => Array.from({ length: Math.floor(high / RULES.cellSize) - Math.floor(low / RULES.cellSize) + 1 }, (_, i) => Math.floor(low / RULES.cellSize) + i);
  const xs = cells(bounds.x - reach, bounds.right + reach), ys = cells(bounds.y - reach, bounds.bottom + reach);
  const nearby = `cell_x IN (${xs.map(() => '?').join(',')}) AND cell_y IN (${ys.map(() => '?').join(',')})`;
  try {
    const existing = await selectById(db, mark.id);
    if (existing) return existing.payload === payload ? json({ item: itemFromRow(existing) }) : json({ error: "id_conflict" }, { status: 409 });
    const issue = placementIssue(mark);
    if (issue) return placementConflict(issue);
    const createdAt = new Date().toISOString();
    const insertion = await db.prepare(`
      INSERT INTO marks (id, created_at, x, y, bounds_x, bounds_y, bounds_right, bounds_bottom, cell_x, cell_y, payload)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM marks
        WHERE ${nearby} AND bounds_x < ? AND bounds_right > ? AND bounds_y < ? AND bounds_bottom > ?
      ) AND (SELECT COUNT(*) FROM marks WHERE cell_x = ? AND cell_y = ?) < ?
      ON CONFLICT(id) DO NOTHING
    `).bind(
      mark.id, createdAt, mark.x, mark.y, bounds.x, bounds.y, bounds.right, bounds.bottom, cellX, cellY, payload,
      ...xs, ...ys,
      bounds.right + RULES.clearance, bounds.x - RULES.clearance, bounds.bottom + RULES.clearance, bounds.y - RULES.clearance,
      cellX, cellY, RULES.maxTracesPerCell,
    ).run();
    const stored = await selectById(db, mark.id);
    if (stored) return stored.payload === payload ? json({ item: itemFromRow(stored) }, { status: insertion.meta?.changes ? 201 : 200 }) : json({ error: "id_conflict" }, { status: 409 });
    const occupied = await db.prepare(`SELECT 1 FROM marks WHERE ${nearby} AND bounds_x < ? AND bounds_right > ? AND bounds_y < ? AND bounds_bottom > ? LIMIT 1`)
      .bind(...xs, ...ys, bounds.right + RULES.clearance, bounds.x - RULES.clearance, bounds.bottom + RULES.clearance, bounds.y - RULES.clearance).first();
    return placementConflict(occupied ? "Another trace needs a little room. Move yours into an open space." : "This part of the manuscript is full. Move outward to begin a new passage.");
  } catch {
    return unavailable();
  }
};

const world = async (url, db) => {
  const cursor = parseInteger(url.searchParams.get("cursor"), 0, Number.MAX_SAFE_INTEGER);
  const limit = parseInteger(url.searchParams.get("limit"), 100, 100);
  if (cursor === null || limit === null || limit < 1) return badRequest("invalid_pagination");
  try {
    const result = await rows(db.prepare(`SELECT ${ITEM_FIELDS} FROM marks WHERE seq > ? ORDER BY seq ASC LIMIT ?`).bind(cursor, limit + 1));
    const total = await db.prepare("SELECT COUNT(*) AS total FROM marks").bind().first();
    const hasMore = result.length > limit;
    const items = result.slice(0, limit).map(itemFromRow);
    return json({ items, cursor: items.at(-1)?.seq ?? cursor, hasMore, total: total.total });
  } catch {
    return unavailable();
  }
};

const worldExport = async (db) => {
  try {
    const result = await selectAll(db);
    return json({ items: result.map(itemFromRow), total: result.length });
  } catch {
    return unavailable();
  }
};

export const handleApi = async (request, db) => {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/world") return world(url, db);
  if (request.method === "GET" && url.pathname === "/api/world/export") return worldExport(db);
  if (request.method === "POST" && url.pathname === "/api/marks") return createMark(request, db);
  return json({ error: "not_found" }, { status: 404 });
};
