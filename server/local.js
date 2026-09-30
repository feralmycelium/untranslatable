import { mkdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";

import { handleApi } from "./api.js";
import { applySchema, createD1Adapter } from "./sqlite.js";

const projectDirectory = fileURLToPath(new URL("..", import.meta.url));
const publicDirectory = join(projectDirectory, "public");

export const createDatabase = (filename = join(projectDirectory, "data", "world.sqlite")) => {
  mkdirSync(dirname(filename), { recursive: true });
  const database = new Database(filename, { create: true, strict: true });
  database.run("PRAGMA journal_mode = WAL");
  applySchema(database);
  return { database, db: createD1Adapter(database) };
};

const staticResponse = (request, directory) => {
  const pathname = new URL(request.url).pathname;
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filename = resolve(directory, relativePath);
  if (relative(directory, filename).startsWith("..") || !statSync(filename, { throwIfNoEntry: false })?.isFile()) return new Response("Not found", { status: 404 });
  return new Response(Bun.file(filename));
};

export const createApp = ({ db, assetsDirectory = publicDirectory }) => ({
  fetch: (request) => new URL(request.url).pathname.startsWith("/api/") ? handleApi(request, db) : staticResponse(request, assetsDirectory),
});

if (import.meta.main) {
  const { db } = createDatabase();
  Bun.serve({
    fetch: createApp({ db }).fetch,
    hostname: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? "8770"),
  });
}
