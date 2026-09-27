CREATE TABLE `recorded_lectures` (
	`student_id` text NOT NULL,
	`activity_id` integer NOT NULL,
	PRIMARY KEY(`student_id`, `activity_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
