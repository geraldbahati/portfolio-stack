CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`professional_title` text NOT NULL,
	`location` text NOT NULL,
	`business_hours` text NOT NULL,
	`availability` text NOT NULL,
	`instagram_url` text,
	`linkedin_url` text,
	`x_url` text,
	`whatsapp_url` text,
	`github_url` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
