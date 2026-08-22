-- Adds the `id` column Better Auth's adapter writes for every model. Without
-- it the rate limiter throws and every sign-in returns 500.
--
-- Drizzle generated this as a table rebuild that copies the old rows across,
-- but the copy selects `id` from a table that has no such column, which SQLite
-- rejects at parse time even when the table is empty. These are ephemeral
-- request counters with nothing worth preserving, so the table is recreated
-- outright instead.
DROP TABLE `rate_limit`;--> statement-breakpoint
CREATE TABLE `rate_limit` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_key_idx` ON `rate_limit` (`key`);
