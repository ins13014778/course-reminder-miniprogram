-- Open-source schema export
-- Source: CloudBase MySQL production schema
-- Snapshot date: 2026-03-19
-- Data rows are intentionally excluded

CREATE TABLE `admin_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('super_admin','operator','moderator','support') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'operator',
  `status` enum('active','disabled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `permission_json` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_openid` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_admin_accounts_email` (`email`),
  KEY `idx_admin_accounts_role_status` (`role`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `admin_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `admin_email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admin_name` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admin_role` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `summary` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detail_json` longtext COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `_openid` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_admin_audit_logs_action_created` (`action`,`created_at`),
  KEY `idx_admin_audit_logs_target` (`target_type`,`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openid` varchar(100) NOT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `signature` varchar(255) DEFAULT '',
  `avatar_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_openid` varchar(64) NOT NULL DEFAULT '',
  `school` varchar(100) DEFAULT '' COMMENT '学校',
  `major` varchar(100) DEFAULT '' COMMENT '专业',
  `grade` varchar(50) DEFAULT '' COMMENT '年级',
  `account_status` varchar(20) NOT NULL DEFAULT 'active',
  `account_ban_reason` varchar(255) DEFAULT NULL,
  `account_banned_until` datetime DEFAULT NULL,
  `note_status` varchar(20) NOT NULL DEFAULT 'active',
  `note_ban_reason` varchar(255) DEFAULT NULL,
  `note_banned_until` datetime DEFAULT NULL,
  `share_status` varchar(20) NOT NULL DEFAULT 'active',
  `share_ban_reason` varchar(255) DEFAULT NULL,
  `share_banned_until` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE `courses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `course_name` varchar(100) NOT NULL,
  `teacher` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `weekday` int NOT NULL,
  `start_section` int NOT NULL,
  `end_section` int NOT NULL,
  `start_time` varchar(5) DEFAULT NULL,
  `end_time` varchar(5) DEFAULT NULL,
  `start_week` int NOT NULL,
  `end_week` int NOT NULL,
  `color` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `_openid` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE `course_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `template_key` varchar(64) NOT NULL,
  `template_name` varchar(100) NOT NULL,
  `course_name` varchar(100) NOT NULL,
  `teacher_name` varchar(50) DEFAULT '',
  `classroom` varchar(100) DEFAULT '',
  `weekday` tinyint NOT NULL,
  `start_section` tinyint NOT NULL,
  `end_section` tinyint NOT NULL,
  `start_time` varchar(5) DEFAULT NULL,
  `end_time` varchar(5) DEFAULT NULL,
  `start_week` tinyint NOT NULL DEFAULT '1',
  `end_week` tinyint NOT NULL DEFAULT '18',
  `week_type` enum('all','odd','even') DEFAULT 'all',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_key` (`template_key`),
  KEY `idx_template_weekday` (`template_key`,`weekday`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `template_id` varchar(128) NOT NULL,
  `page_path` varchar(255) NOT NULL DEFAULT 'pages/index/index',
  `remind_minutes` int NOT NULL DEFAULT '15',
  `remind_weekends` tinyint(1) NOT NULL DEFAULT '0',
  `remaining_count` int NOT NULL DEFAULT '0',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `last_subscribed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_template` (`user_id`,`template_id`),
  KEY `idx_subscription_status` (`status`,`remaining_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `reminders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `course_id` bigint unsigned NOT NULL,
  `remind_time` datetime NOT NULL,
  `status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
  `error_msg` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_openid` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_course_time` (`user_id`,`course_id`,`remind_time`),
  KEY `idx_reminder_status_time` (`status`,`remind_time`),
  KEY `idx_reminder_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `reminder_send_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reminder_id` bigint DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  `course_id` bigint DEFAULT NULL,
  `status` enum('sent','failed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `page_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `course_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_time` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `response_json` longtext COLLATE utf8mb4_unicode_ci,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `_openid` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_reminder_send_logs_status_created` (`status`,`created_at`),
  KEY `idx_reminder_send_logs_user_created` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `content` text NOT NULL,
  `image_url` varchar(500) DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL DEFAULT 'visible',
  `moderation_reason` varchar(255) DEFAULT NULL,
  `moderated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notes_user_id` (`user_id`),
  KEY `idx_notes_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `note_shares` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `note_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `share_code` varchar(64) NOT NULL,
  `status` enum('active','blocked') NOT NULL DEFAULT 'active',
  `view_count` int unsigned NOT NULL DEFAULT '0',
  `last_viewed_at` timestamp NULL DEFAULT NULL,
  `ban_reason` varchar(255) DEFAULT NULL,
  `banned_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_note_id` (`note_id`),
  UNIQUE KEY `uniq_share_code` (`share_code`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `content_reports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reporter_user_id` bigint unsigned NOT NULL,
  `reported_user_id` bigint unsigned DEFAULT NULL,
  `target_type` enum('note','note_share') NOT NULL,
  `target_id` bigint unsigned NOT NULL,
  `reason` varchar(64) NOT NULL,
  `description` varchar(500) DEFAULT '',
  `status` enum('pending','resolved','rejected') NOT NULL DEFAULT 'pending',
  `action_taken` enum('none','block_note','block_share') NOT NULL DEFAULT 'none',
  `review_note` varchar(255) DEFAULT '',
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reporter_user` (`reporter_user_id`),
  KEY `idx_reported_user` (`reported_user_id`),
  KEY `idx_target` (`target_type`,`target_id`),
  KEY `idx_status_created` (`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_feedback` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `category` enum('feature','ux','bug','other') NOT NULL DEFAULT 'feature',
  `title` varchar(120) NOT NULL,
  `content` text NOT NULL,
  `contact` varchar(100) DEFAULT NULL,
  `status` enum('pending','reviewed','archived') NOT NULL DEFAULT 'pending',
  `admin_note` varchar(255) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_openid` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_feedback_user` (`user_id`),
  KEY `idx_feedback_status_created` (`status`,`created_at`),
  KEY `idx_feedback_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `schedule_share_keys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `share_key` varchar(32) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_imported_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `ban_reason` varchar(255) DEFAULT NULL,
  `banned_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_id` (`user_id`),
  UNIQUE KEY `uniq_share_key` (`share_key`),
  KEY `idx_share_key_active` (`share_key`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `announcements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(120) NOT NULL,
  `content` text NOT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '1',
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_updated` (`status`,`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `content_pages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `page_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subtitle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','published','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `extra_json` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_openid` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_content_pages_key` (`page_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
