ALTER TABLE `card_states` ADD `stage` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `card_states` ADD `success_rate` real;--> statement-breakpoint
ALTER TABLE `cards` ADD `category` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `difficulty` integer;--> statement-breakpoint
ALTER TABLE `cards` ADD `embedding` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `updated_at` integer;