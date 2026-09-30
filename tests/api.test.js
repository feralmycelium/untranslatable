import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleApi } from "../server/api.js";
import { createDatabase } from "../server/local.js";

let directory;
let database;
let db;
let databaseFile;

const mark = (id, x = 4200, y = 4200) => ({
  id,
  x,
  y,
  strokes: [
    {
      kind: "script",
      ink: "ink",
      seed: 42,
      points: [
        [0, 0, 0.25],
        [30, -12, 0.75],
      ],
    },
  ],
});

const request = (path, init) => new Request(`http://world.test${path}`, init);

const api = async (path, init) => {
  const response = await handleApi(request(path, init), db);
  return { response, body: await response.json() };
};

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "living-manuscript-api-"));
  databaseFile = join(directory, "world.sqlite");
  ({ database, db } = createDatabase(databaseFile));
});

afterEach(async () => {
  database.close();
  await rm(directory, { force: true, recursive: true });
});

test("shared requests expose a newly created mark to an independent client", async () => {
  // Given: one client has a valid contribution.
  const created = await api("/api/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mark("0f8fad5b-d9cb-469f-a165-70867728950e")),
  });

  // When: another client reads the shared world.
  const observed = await api("/api/world?cursor=0&limit=100");

  // Then: it receives the persisted public item in ascending sequence order.
  expect(created.response.status).toBe(201);
  expect(observed.response.status).toBe(200);
  expect(observed.body).toEqual({
    items: [created.body.item],
    cursor: created.body.item.seq,
    hasMore: false,
    total: 1,
  });
});

test("a restarted SQLite connection retains contributions", async () => {
  // Given: a mark was written through the request API.
  const created = await api("/api/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mark("1f8fad5b-d9cb-469f-a165-70867728950e")),
  });
  database.close();
  ({ database, db } = createDatabase(databaseFile));

  // When: a fresh local process reads the database file.
  const exported = await api("/api/world/export");

  // Then: the mark remains available as open-world export data.
  expect(exported.response.status).toBe(200);
  expect(exported.body).toEqual({ items: [created.body.item], total: 1 });
});

test("a repeated contribution id returns its original item and rejects a conflicting body", async () => {
  // Given: a contribution id has been accepted once.
  const id = "2f8fad5b-d9cb-469f-a165-70867728950e";
  const first = await api("/api/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mark(id)),
  });

  // When: the client retries that id, then submits a changed body under it.
  const retry = await api("/api/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mark(id)),
  });
  const conflict = await api("/api/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mark(id, 4500)),
  });

  // Then: the retry is idempotent and the changed body is refused.
  expect(first.response.status).toBe(201);
  expect(retry.response.status).toBe(200);
  expect(retry.body.item).toEqual(first.body.item);
  expect(conflict.response.status).toBe(409);
  expect(conflict.body.error).toBe("id_conflict");
});

test("invalid marks and cross-origin writes are rejected before persistence", async () => {
  // Given: malformed geometry and an untrusted browser origin.
  const invalid = mark("3f8fad5b-d9cb-469f-a165-70867728950e");
  invalid.strokes[0].points[0][2] = 1.1;

  // When: each is submitted to the contribution endpoint.
  const invalidResponse = await api("/api/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(invalid),
  });
  const foreignOrigin = await api("/api/marks", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://elsewhere.test" },
    body: JSON.stringify(mark("4f8fad5b-d9cb-469f-a165-70867728950e")),
  });

  // Then: neither submission becomes world data.
  const world = await api("/api/world");
  expect(invalidResponse.response.status).toBe(400);
  expect(foreignOrigin.response.status).toBe(403);
  expect(world.body.total).toBe(0);
});

test("world pagination returns only entries after the supplied sequence cursor", async () => {
  // Given: three contributions exist in creation order.
  for (const [index, id] of [
    "5f8fad5b-d9cb-469f-a165-70867728950e",
    "6f8fad5b-d9cb-469f-a165-70867728950e",
    "7f8fad5b-d9cb-469f-a165-70867728950e",
  ].entries()) {
    await api("/api/marks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mark(id, 4200 + index * 200)),
    });
  }

  // When: a client asks for a two-item page and follows its cursor.
  const firstPage = await api("/api/world?cursor=0&limit=2");
  const nextPage = await api(`/api/world?cursor=${firstPage.body.cursor}&limit=2`);

  // Then: no contribution is duplicated or skipped.
  expect(firstPage.body.items.map((item) => item.id)).toEqual([
    "5f8fad5b-d9cb-469f-a165-70867728950e",
    "6f8fad5b-d9cb-469f-a165-70867728950e",
  ]);
  expect(firstPage.body.hasMore).toBe(true);
  expect(nextPage.body.items.map((item) => item.id)).toEqual([
    "7f8fad5b-d9cb-469f-a165-70867728950e",
  ]);
  expect(nextPage.body.hasMore).toBe(false);
  expect(nextPage.body.total).toBe(3);
});

test("protected artwork, occupied space, and a full cell reject new marks", async () => {
  // Given: an original seed, an existing visitor mark, and a bounded manuscript cell.
  const seed = await api("/api/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mark("8f8fad5b-d9cb-469f-a165-70867728950e", -450, -600)),
  });
  const existing = await api("/api/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mark("9f8fad5b-d9cb-469f-a165-70867728950e")),
  });
  for (let index = 0; index < 18; index += 1) {
    await api("/api/marks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mark(`af8fad5b-d9cb-469f-a165-${String(index).padStart(12, "0")}`, 9800 + (index % 6) * 250, 9800 + Math.floor(index / 6) * 250)),
    });
  }

  // When: another visitor attempts each placement boundary.
  const overlap = await api("/api/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mark("bf8fad5b-d9cb-469f-a165-70867728950e")),
  });
  const fullCell = await api("/api/marks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mark("cf8fad5b-d9cb-469f-a165-70867728950e", 11200, 11200)),
  });

  // Then: the original artwork and other contributions retain their space.
  expect(seed.response.status).toBe(409);
  expect(existing.response.status).toBe(201);
  expect(overlap.response.status).toBe(409);
  expect(overlap.body.message).toBe("Another trace needs a little room. Move yours into an open space.");
  expect(fullCell.response.status).toBe(409);
  expect(fullCell.body.message).toBe("This part of the manuscript is full. Move outward to begin a new passage.");
});

test("database failures return a recoverable unavailable response", async () => {
  // Given: the API is given a D1-shaped database that cannot read.
  const unavailable = { prepare() { throw new Error("offline"); } };

  // When: a client reads world data.
  const response = await handleApi(request("/api/world"), unavailable);

  // Then: the failure is represented as a retryable HTTP response.
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "storage_unavailable", recoverable: true });
});

const post = (value) => api("/api/marks", {method:"POST",body:JSON.stringify(value)});

test("simultaneous writers preserve identity, space, and cell capacity", async () => {
  const id=crypto.randomUUID();
  const conflicts=await Promise.all([post(mark(id,6000,6000)),post(mark(id,6300,6000))]);
  expect(conflicts.map(r=>r.response.status).sort()).toEqual([201,409]);
  const duplicate=mark(crypto.randomUUID(),7000,6000);
  const retries=await Promise.all([post(duplicate),post(duplicate)]);
  expect(retries.map(r=>r.response.status).sort()).toEqual([200,201]);
  const overlaps=await Promise.all([post(mark(crypto.randomUUID(),8000,6000)),post(mark(crypto.randomUUID(),8020,6000))]);
  expect(overlaps.map(r=>r.response.status).sort()).toEqual([201,409]);
  const capacity=await Promise.all(Array.from({length:19},(_,i)=>post(mark(crypto.randomUUID(),10000+i%5*230,10000+Math.floor(i/5)*230))));
  expect(capacity.filter(r=>r.response.status===201)).toHaveLength(18);
  expect(capacity.filter(r=>r.response.status===409)).toHaveLength(1);
  expect((await api('/api/world')).body.total).toBe(21);
});

test("an oversized chunked body is cancelled without consuming the rest", async () => {
  let pulls=0,cancelled=false;
  const body=new ReadableStream({pull(controller){pulls++;controller.enqueue(new Uint8Array(64*1024));if(pulls===20)controller.close();},cancel(){cancelled=true;}});
  const response=await handleApi(request('/api/marks',{method:'POST',body,duplex:'half'}),db);
  expect(response.status).toBe(400);
  expect(cancelled).toBe(true);
  expect(pulls).toBeLessThan(10);
});

test("mark geometry stays within the world boundary",async()=>{
  const response=await post(mark(crypto.randomUUID(),50000,45000));
  expect(response.response.status).toBe(409);
  expect((await api('/api/world')).body.total).toBe(0);
});

test.each([1,-1])("painted bounds collide across distant anchor cells (%i)",async(sign)=>{
  const first=mark(crypto.randomUUID(),sign*10000,12000);
  first.strokes[0].points=[[sign*3000,0,.5],[sign*2990,20,.5]];
  const second=mark(crypto.randomUUID(),sign*16000,12000);
  second.strokes[0].points=[[-sign*3000,0,.5],[-sign*2990,20,.5]];
  const results=await Promise.all([post(first),post(second)]);
  expect(results.map(r=>r.response.status).sort()).toEqual([201,409]);
  expect((await api('/api/world')).body.total).toBe(1);
});
