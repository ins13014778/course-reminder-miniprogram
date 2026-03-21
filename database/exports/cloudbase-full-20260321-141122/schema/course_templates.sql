CREATE TABLE `course_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `template_key` varchar(64) NOT NULL COMMENT 'template identifier',
  `template_name` varchar(100) NOT NULL COMMENT 'template display name',
  `course_name` varchar(100) NOT NULL COMMENT 'course name',
  `teacher_name` varchar(50) DEFAULT '' COMMENT 'teacher name',
  `classroom` varchar(100) DEFAULT '' COMMENT 'classroom',
  `weekday` tinyint NOT NULL COMMENT 'weekday 1-7',
  `start_section` tinyint NOT NULL COMMENT 'start section',
  `end_section` tinyint NOT NULL COMMENT 'end section',
  `start_time` varchar(5) DEFAULT NULL COMMENT '??????',
  `end_time` varchar(5) DEFAULT NULL COMMENT '??????',
  `start_week` tinyint NOT NULL DEFAULT '1' COMMENT 'start week',
  `end_week` tinyint NOT NULL DEFAULT '18' COMMENT 'end week',
  `week_type` enum('all','odd','even') DEFAULT 'all' COMMENT 'week type',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT 'sort order',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'whether active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_key` (`template_key`),
  KEY `idx_template_weekday` (`template_key`,`weekday`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='default course templates';

