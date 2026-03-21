CREATE TABLE `note_shares` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `note_id` bigint unsigned NOT NULL COMMENT '分享的笔记 ID',
  `user_id` bigint unsigned NOT NULL COMMENT '分享发起人 ID',
  `share_code` varchar(64) NOT NULL COMMENT '分享码',
  `status` enum('active','blocked') NOT NULL DEFAULT 'active' COMMENT '分享状态',
  `view_count` int unsigned NOT NULL DEFAULT '0' COMMENT '查看次数',
  `last_viewed_at` timestamp NULL DEFAULT NULL COMMENT '最近查看时间',
  `ban_reason` varchar(255) DEFAULT NULL COMMENT '封禁原因',
  `banned_at` timestamp NULL DEFAULT NULL COMMENT '封禁时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_note_id` (`note_id`),
  UNIQUE KEY `uniq_share_code` (`share_code`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='笔记分享表';

