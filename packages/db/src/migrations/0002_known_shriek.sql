CREATE TABLE `contact_submission` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`message` text NOT NULL,
	`email_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_submission_email_idx` ON `contact_submission` (`email`);--> statement-breakpoint
CREATE INDEX `contact_submission_created_idx` ON `contact_submission` (`created_at`);--> statement-breakpoint
CREATE INDEX `contact_submission_status_idx` ON `contact_submission` (`status`);--> statement-breakpoint
CREATE INDEX `contact_submission_email_id_idx` ON `contact_submission` (`email_id`);