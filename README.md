# Untranslatable

A shared, living manuscript. Wander through the paper, make a trace in its
handwriting, and leave it for someone else to find.

The small core is Canvas2D, browser JavaScript and a persistent shared API.
There are no frontend runtime dependencies. The same API runs on Bun/SQLite
or on a Cloudflare Worker with D1. A browser draft is temporary; the shared
world lives in the server database.

## Run it

Install Bun and Node.js, then:

```sh
npm install
bun run start
```

Open http://127.0.0.1:8770. The SQLite database is created in `data/world.sqlite`.
`HOST=0.0.0.0 PORT=8770 bun run start` exposes the server to other devices on
your network. For a public instance, run it behind a TLS reverse proxy and
back up the SQLite database using SQLite's backup tools.

Use `bun run dev` for local development and `bun test` for behavioural tests.
For the browser tests, run `npx playwright install chromium`, then
`node tests/browser.mjs`. They use a temporary database and two independent
browser sessions; port 8771 must be free. Bun 1.4, Node 24 and Playwright 1.62
were used for this release. The build also needs the `zip` command.
`bun run build` produces `dist/server/index.js` and `dist/client/` for a
Cloudflare-compatible deployment. `npm run db:generate` generates new Drizzle
migrations after schema changes. Never rewrite a migration already deployed.

## Use it

Drag the paper or use arrow keys to wander. Scroll, pinch, or use the zoom
buttons to get closer. Passages locates the original artworks. Make a mark
finds open paper; Hand and Thread use the same drawing language. Add a line is
a keyboard-friendly alternative to dragging. Undo changes the current draft.
Move places it elsewhere. Leave here publishes it to the shared world.

Other browsers pick up new contributions within five seconds. Failed writes
keep the draft. Keep for later returns to exploring with the draft stored in
that browser. Pause ink stops ambient movement; reduced motion starts paused.

## Extend it

Read [DESIGN-CONTRACT.md](DESIGN-CONTRACT.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
The contract defines the artistic identity, measurable parameters and change
process. `public/rules.js` is the shared executable source for those parameters.

`public/ink.js` renders visitor gestures. `public/asemic.js` renders the seed
collection. `public/app.js` owns exploration and drafting. `server/api.js`
validates and stores shared marks. `db/schema.ts` and `drizzle/` own the schema.

`GET /api/world` is cursor-paginated; `POST /api/marks` publishes an idempotent
contribution. `GET /api/world/export` exports the world as structured JSON.
No visitor can edit or delete an existing contribution through the API.

Code: MIT. Shared artwork: CC BY 4.0, see [ART-LICENSE.md](ART-LICENSE.md).

The audiovisual direction is an ambient album explored as a place, with
gradual changes as you move. This release is silent. The sound contract is in
DESIGN-CONTRACT.md; music integration is a separate phase.

API references used: [Bun SQLite](https://bun.sh/docs/runtime/sqlite),
[D1 Worker API](https://developers.cloudflare.com/d1/worker-api/),
[Worker assets](https://developers.cloudflare.com/workers/static-assets/binding/).
