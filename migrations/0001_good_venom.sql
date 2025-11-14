-- 古い customer テーブルを削除
DROP TABLE IF EXISTS `customer`;
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`tags` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `card_states` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`card_id` integer NOT NULL,
	`ease` real DEFAULT 2.3 NOT NULL,
	`interval_days` integer DEFAULT 1 NOT NULL,
	`rep_count` integer DEFAULT 0 NOT NULL,
	`next_review_at` integer NOT NULL,
	`last_reviewed_at` integer
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`card_id` integer NOT NULL,
	`rating` text NOT NULL,
	`reviewed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL
);