CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subject_code` text NOT NULL,
	`code` text NOT NULL,
	`kind` text NOT NULL,
	FOREIGN KEY (`subject_code`) REFERENCES `subjects`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `class_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_id` integer NOT NULL,
	`label` text NOT NULL,
	`day` integer NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`location` text NOT NULL,
	`weeks` text NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pins` (
	`student_id` text NOT NULL,
	`activity_id` integer NOT NULL,
	`class_option_id` integer NOT NULL,
	PRIMARY KEY(`student_id`, `activity_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_option_id`) REFERENCES `class_options`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `student_subjects` (
	`student_id` text NOT NULL,
	`subject_code` text NOT NULL,
	PRIMARY KEY(`student_id`, `subject_code`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_code`) REFERENCES `subjects`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
