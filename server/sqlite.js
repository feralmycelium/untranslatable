import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const migrationsDirectory = fileURLToPath(new URL("../drizzle", import.meta.url));

export const createD1Adapter = (database) => ({
  prepare(sql) {
    const statement = database.query(sql);
    return {
      bind(...parameters) {
        return {
          all: () => Promise.resolve({ results: statement.all(...parameters) }),
          first: () => Promise.resolve(statement.get(...parameters) ?? null),
          run: () => {
            const result = statement.run(...parameters);
            return Promise.resolve({ meta: { changes: result.changes }, results: [] });
          },
        };
      },
    };
  },
});

export const applySchema = (database) => {
  database.run("CREATE TABLE IF NOT EXISTS _living_manuscript_migrations (name TEXT PRIMARY KEY NOT NULL)");
  for (const filename of readdirSync(migrationsDirectory).filter((name) => name.endsWith(".sql")).sort()) {
    if (database.query("SELECT 1 FROM _living_manuscript_migrations WHERE name = ?").get(filename)) continue;
    const migration = readFileSync(`${migrationsDirectory}/${filename}`, "utf8");
    database.run("BEGIN");
    try {
      for (const statement of migration.split("--> statement-breakpoint").map((sql) => sql.trim()).filter(Boolean)) {
        database.run(statement);
      }
      database.query("INSERT INTO _living_manuscript_migrations (name) VALUES (?)").run(filename);
      database.run("COMMIT");
    } catch (error) {
      database.run("ROLLBACK");
      throw error;
    }
  }
};
