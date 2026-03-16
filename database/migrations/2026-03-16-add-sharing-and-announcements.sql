CREATE TABLE IF NOT EXISTS `schedule_share_keys` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户 ID',
  `share_key` VARCHAR(32) NOT NULL COMMENT '课表分享密钥',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `last_imported_at` TIMESTAMP NULL DEFAULT NULL COMMENT '最近一次被导入时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_user_id` (`user_id`),
  UNIQUE KEY `uniq_share_key` (`share_key`),
  INDEX `idx_share_key_active` (`share_key`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课表分享密钥表';

CREATE TABLE IF NOT EXISTS `announcements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(120) NOT NULL COMMENT '公告标题',
  `content` TEXT NOT NULL COMMENT '公告正文',
  `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft' COMMENT '公告状态',
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否置顶',
  `published_at` TIMESTAMP NULL DEFAULT NULL COMMENT '发布时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status_updated` (`status`, `updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统公告表';
