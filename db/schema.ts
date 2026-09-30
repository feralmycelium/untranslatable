import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const marks = sqliteTable(
  "marks",
  {
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    id: text("id").notNull(),
    createdAt: text("created_at").notNull(),
    x: real("x").notNull(),
    y: real("y").notNull(),
    boundsX: real("bounds_x").notNull(),
    boundsY: real("bounds_y").notNull(),
    boundsRight: real("bounds_right").notNull(),
    boundsBottom: real("bounds_bottom").notNull(),
    cellX: integer("cell_x").notNull(),
    cellY: integer("cell_y").notNull(),
    payload: text("payload").notNull(),
  },
  (table) => [
    uniqueIndex("marks_id_unique").on(table.id),
    index("marks_cell_index").on(table.cellX, table.cellY),
  ],
);
