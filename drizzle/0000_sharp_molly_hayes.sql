CREATE TABLE `environments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`document` text NOT NULL,
	`revision` integer NOT NULL,
	`published_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `environments_owner` ON `environments` (`owner`);--> statement-breakpoint
CREATE INDEX `environments_published` ON `environments` (`published_at`);--> statement-breakpoint
CREATE TABLE `environment_votes` (
	`environment_id` text NOT NULL,
	`user_id` text NOT NULL,
	`value` integer NOT NULL,
	PRIMARY KEY(`environment_id`, `user_id`),
	FOREIGN KEY (`environment_id`) REFERENCES `environments`(`id`) ON UPDATE no action ON DELETE cascade
);
