CREATE TABLE `marks` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`bounds_x` real NOT NULL,
	`bounds_y` real NOT NULL,
	`bounds_right` real NOT NULL,
	`bounds_bottom` real NOT NULL,
	`cell_x` integer NOT NULL,
	`cell_y` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marks_id_unique` ON `marks` (`id`);--> statement-breakpoint
CREATE INDEX `marks_cell_index` ON `marks` (`cell_x`,`cell_y`);