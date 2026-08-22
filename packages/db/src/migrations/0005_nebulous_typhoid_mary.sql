ALTER TABLE `contact_submission` ADD `read_at` integer;--> statement-breakpoint
ALTER TABLE `contact_submission` ADD `archived_at` integer;--> statement-breakpoint
CREATE INDEX `contact_submission_read_idx` ON `contact_submission` (`read_at`);--> statement-breakpoint
CREATE INDEX `contact_submission_archived_idx` ON `contact_submission` (`archived_at`);