CREATE TABLE `content_reports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reporter_user_id` bigint unsigned NOT NULL COMMENT '举报人 ID',
  `reported_user_id` bigint unsigned DEFAULT NULL COMMENT '被举报用户 ID',
  `target_type` enum('note','note_share') NOT NULL COMMENT '举报目标类型',
  `target_id` bigint unsigned NOT NULL COMMENT '举报目标 ID',
  `reason` varchar(64) NOT NULL COMMENT '举报原因',
  `description` varchar(500) DEFAULT '' COMMENT '补充说明',
  `status` enum('pending','resolved','rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
  `action_taken` enum('none','block_note','block_share') NOT NULL DEFAULT 'none' COMMENT '处置动作',
  `review_note` varchar(255) DEFAULT '' COMMENT '审核备注',
  `reviewed_at` timestamp NULL DEFAULT NULL COMMENT '审核时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reporter_user` (`reporter_user_id`),
  KEY `idx_reported_user` (`reported_user_id`),
  KEY `idx_target` (`target_type`,`target_id`),
  KEY `idx_status_created` (`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='内容举报表';

