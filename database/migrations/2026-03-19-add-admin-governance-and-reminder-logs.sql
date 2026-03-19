CREATE TABLE IF NOT EXISTS `admin_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(120) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `role` ENUM('super_admin', 'operator', 'moderator', 'support') NOT NULL DEFAULT 'operator',
  `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_openid` VARCHAR(64) DEFAULT '' NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_admin_accounts_email` (`email`),
  KEY `idx_admin_accounts_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_email` VARCHAR(120) DEFAULT NULL,
  `admin_name` VARCHAR(80) DEFAULT NULL,
  `admin_role` VARCHAR(40) DEFAULT NULL,
  `action` VARCHAR(80) NOT NULL,
  `target_type` VARCHAR(80) DEFAULT NULL,
  `target_id` VARCHAR(80) DEFAULT NULL,
  `summary` VARCHAR(255) DEFAULT NULL,
  `detail_json` LONGTEXT DEFAULT NULL,
  `ip_address` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `_openid` VARCHAR(64) DEFAULT '' NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_admin_audit_logs_action_created` (`action`, `created_at`),
  KEY `idx_admin_audit_logs_target` (`target_type`, `target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reminder_send_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reminder_id` BIGINT DEFAULT NULL,
  `user_id` BIGINT DEFAULT NULL,
  `course_id` BIGINT DEFAULT NULL,
  `status` ENUM('sent', 'failed') NOT NULL,
  `template_id` VARCHAR(120) DEFAULT NULL,
  `page_path` VARCHAR(255) DEFAULT NULL,
  `course_name` VARCHAR(120) DEFAULT NULL,
  `start_time` VARCHAR(20) DEFAULT NULL,
  `location` VARCHAR(120) DEFAULT NULL,
  `remark` VARCHAR(255) DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `response_json` LONGTEXT DEFAULT NULL,
  `sent_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `_openid` VARCHAR(64) DEFAULT '' NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reminder_send_logs_status_created` (`status`, `created_at`),
  KEY `idx_reminder_send_logs_user_created` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
