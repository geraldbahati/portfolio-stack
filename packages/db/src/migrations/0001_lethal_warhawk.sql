CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`src` text NOT NULL,
	`type` text NOT NULL,
	`poster` text,
	`alt` text,
	`url` text,
	`badges` text,
	`aspect_ratio` text,
	`sort_order` integer NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `project_published_order_idx` ON `project` (`is_published`,`sort_order`);--> statement-breakpoint
CREATE INDEX `project_order_idx` ON `project` (`sort_order`);