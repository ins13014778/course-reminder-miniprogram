CREATE TABLE IF NOT EXISTS `user_feedback` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '提交反馈的用户 ID',
  `category` ENUM('feature', 'ux', 'bug', 'other') NOT NULL DEFAULT 'feature' COMMENT '反馈分类',
  `title` VARCHAR(120) NOT NULL COMMENT '反馈标题',
  `content` TEXT NOT NULL COMMENT '反馈内容',
  `contact` VARCHAR(100) DEFAULT NULL COMMENT '联系方式',
  `status` ENUM('pending', 'reviewed', 'archived') NOT NULL DEFAULT 'pending' COMMENT '处理状态',
  `admin_note` VARCHAR(255) DEFAULT NULL COMMENT '后台处理备注',
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL COMMENT '处理时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_openid` VARCHAR(64) DEFAULT '' NOT NULL,
  INDEX `idx_feedback_user` (`user_id`),
  INDEX `idx_feedback_status_created` (`status`, `created_at`),
  INDEX `idx_feedback_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户留言反馈表';
