CREATE TABLE `user_violation_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `violation_type` enum('account','note','share','avatar','signature','report') COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_type` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_days` int DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `record_status` enum('active','lifted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `related_report_id` bigint unsigned DEFAULT NULL,
  `related_appeal_id` bigint unsigned DEFAULT NULL,
  `operator_email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata_json` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `_openid` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_user_violation_records_user_created` (`user_id`,`created_at`),
  KEY `idx_user_violation_records_status` (`record_status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

