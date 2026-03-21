CREATE TABLE `schedule_share_keys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL COMMENT '?? ID',
  `share_key` varchar(32) NOT NULL COMMENT '??????',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '????',
  `last_imported_at` timestamp NULL DEFAULT NULL COMMENT '?????????',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `ban_reason` varchar(255) DEFAULT NULL,
  `banned_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_id` (`user_id`),
  UNIQUE KEY `uniq_share_key` (`share_key`),
  KEY `idx_share_key_active` (`share_key`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='???????';

