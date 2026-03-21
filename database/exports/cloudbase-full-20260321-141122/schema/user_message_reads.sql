CREATE TABLE `user_message_reads` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `message_type` enum('announcement','feedback','appeal') COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_id` bigint unsigned NOT NULL,
  `ead_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_openid` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_message_reads_user_message` (`user_id`,`message_type`,`message_id`),
  KEY `idx_user_message_reads_user_read` (`user_id`,`ead_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

