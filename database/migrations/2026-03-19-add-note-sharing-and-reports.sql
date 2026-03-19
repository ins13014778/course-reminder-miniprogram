CREATE TABLE IF NOT EXISTS `note_shares` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `note_id` BIGINT UNSIGNED NOT NULL COMMENT '分享的笔记 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '分享发起人 ID',
  `share_code` VARCHAR(64) NOT NULL COMMENT '分享码',
  `status` ENUM('active', 'blocked') NOT NULL DEFAULT 'active' COMMENT '分享状态',
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '查看次数',
  `last_viewed_at` TIMESTAMP NULL DEFAULT NULL COMMENT '最近查看时间',
  `ban_reason` VARCHAR(255) DEFAULT NULL COMMENT '封禁原因',
  `banned_at` TIMESTAMP NULL DEFAULT NULL COMMENT '封禁时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_note_id` (`note_id`),
  UNIQUE KEY `uniq_share_code` (`share_code`),
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='笔记分享表';

CREATE TABLE IF NOT EXISTS `content_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `reporter_user_id` BIGINT UNSIGNED NOT NULL COMMENT '举报人 ID',
  `reported_user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '被举报用户 ID',
  `target_type` ENUM('note', 'note_share') NOT NULL COMMENT '举报目标类型',
  `target_id` BIGINT UNSIGNED NOT NULL COMMENT '举报目标 ID',
  `reason` VARCHAR(64) NOT NULL COMMENT '举报原因',
  `description` VARCHAR(500) DEFAULT '' COMMENT '补充说明',
  `status` ENUM('pending', 'resolved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
  `action_taken` ENUM('none', 'block_note', 'block_share') NOT NULL DEFAULT 'none' COMMENT '处置动作',
  `review_note` VARCHAR(255) DEFAULT '' COMMENT '审核备注',
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL COMMENT '审核时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_reporter_user` (`reporter_user_id`),
  INDEX `idx_reported_user` (`reported_user_id`),
  INDEX `idx_target` (`target_type`, `target_id`),
  INDEX `idx_status_created` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容举报表';
