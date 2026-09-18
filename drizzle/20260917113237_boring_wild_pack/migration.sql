CREATE TABLE `results` (
	`run_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`package_name` text NOT NULL,
	`suite_name` text NOT NULL,
	`test_id` text NOT NULL,
	`type` text,
	`status` text NOT NULL,
	`group` text NOT NULL,
	`time` integer,
	CONSTRAINT `results_pk` PRIMARY KEY(`run_id`, `workspace_id`, `package_name`, `suite_name`, `test_id`)
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`run_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`package_name` text NOT NULL,
	`suite_name` text NOT NULL,
	`test_id` text NOT NULL,
	`round_id` integer NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`data` text NOT NULL,
	CONSTRAINT `rounds_pk` PRIMARY KEY(`run_id`, `workspace_id`, `package_name`, `suite_name`, `test_id`, `round_id`)
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`run_id` text PRIMARY KEY,
	`status` text NOT NULL,
	`started_on` integer NOT NULL,
	`finished_on` integer
);
