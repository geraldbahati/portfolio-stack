CREATE TABLE `project_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_challenges_project_order_idx` ON `project_challenges` (`project_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `project_details` (
	`project_id` text PRIMARY KEY NOT NULL,
	`hero_image` text,
	`hero_alt` text,
	`tagline` text,
	`full_description` text,
	`services` text,
	`client` text,
	`industry` text,
	`period` text,
	`year` integer,
	`features` text,
	`color_palette` text,
	`related_project_ids` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_gallery` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`src` text NOT NULL,
	`alt` text,
	`caption` text,
	`gallery_type` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`device_type` text,
	`sort_order` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_gallery_project_order_idx` ON `project_gallery` (`project_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `project_gallery_project_type_idx` ON `project_gallery` (`project_id`,`gallery_type`);--> statement-breakpoint
CREATE TABLE `project_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`value` text NOT NULL,
	`label` text NOT NULL,
	`icon` text,
	`sort_order` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_metrics_project_order_idx` ON `project_metrics` (`project_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `project_testimonials` (
	`project_id` text PRIMARY KEY NOT NULL,
	`quote` text NOT NULL,
	`author_name` text NOT NULL,
	`author_role` text,
	`author_company` text,
	`author_image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
