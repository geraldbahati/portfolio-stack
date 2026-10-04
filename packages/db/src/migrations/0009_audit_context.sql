ALTER TABLE `audit_log` ADD `actor_id` text;--> statement-breakpoint
ALTER TABLE `audit_log` ADD `outcome` text DEFAULT 'succeeded' NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_log` ADD `operation_id` text;--> statement-breakpoint
ALTER TABLE `audit_log` ADD `request_id` text;--> statement-breakpoint
CREATE INDEX `audit_log_operation_idx` ON `audit_log` (`operation_id`) WHERE operation_id is not null;--> statement-breakpoint
CREATE INDEX `audit_log_pending_idx` ON `audit_log` (`created_at`) WHERE outcome = 'pending';