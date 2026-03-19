CREATE TABLE IF NOT EXISTS `user_violation_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `violation_type` enum('account','note','share','avatar','signature','report') NOT NULL,
  `source_type` varchar(64) NOT NULL,
  `source_id` varchar(80) DEFAULT NULL,
  `action_type` varchar(80) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `duration_days` int DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `record_status` enum('active','lifted') NOT NULL DEFAULT 'active',
  `related_report_id` bigint unsigned DEFAULT NULL,
  `related_appeal_id` bigint unsigned DEFAULT NULL,
  `operator_email` varchar(120) DEFAULT NULL,
  `metadata_json` longtext,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `_openid` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_user_violation_records_user_created` (`user_id`,`created_at`),
  KEY `idx_user_violation_records_status` (`record_status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_action_confirmations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` bigint unsigned DEFAULT NULL,
  `admin_email` varchar(120) DEFAULT NULL,
  `action_key` varchar(80) NOT NULL,
  `target_type` varchar(80) NOT NULL,
  `target_ids_json` longtext NOT NULL,
  `summary` varchar(255) DEFAULT NULL,
  `confirmation_code` varchar(16) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `_openid` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_admin_action_confirmations_admin` (`admin_email`,`action_key`),
  KEY `idx_admin_action_confirmations_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_message_reads` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `message_type` enum('announcement','feedback','appeal') NOT NULL,
  `message_id` bigint unsigned NOT NULL,
  `read_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_openid` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_message_reads_user_message` (`user_id`,`message_type`,`message_id`),
  KEY `idx_user_message_reads_user_read` (`user_id`,`read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `reminder_send_logs`
  ADD COLUMN IF NOT EXISTS `retry_count` int NOT NULL DEFAULT 0 AFTER `response_json`,
  ADD COLUMN IF NOT EXISTS `retried_from_log_id` bigint DEFAULT NULL AFTER `retry_count`,
  ADD COLUMN IF NOT EXISTS `last_retry_at` datetime DEFAULT NULL AFTER `retried_from_log_id`;

ALTER TABLE `reminder_send_logs`
  ADD KEY `idx_reminder_send_logs_retry_status` (`status`,`retry_count`,`created_at`);
