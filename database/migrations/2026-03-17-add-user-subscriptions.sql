CREATE TABLE IF NOT EXISTS `user_subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户 ID',
  `template_id` VARCHAR(128) NOT NULL COMMENT '订阅模板 ID',
  `page_path` VARCHAR(255) NOT NULL DEFAULT 'pages/index/index' COMMENT '点击消息后打开的页面',
  `remind_minutes` INT NOT NULL DEFAULT 15 COMMENT '提前提醒分钟数',
  `remaining_count` INT NOT NULL DEFAULT 0 COMMENT '一次性订阅剩余可发送次数',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '订阅状态',
  `last_subscribed_at` DATETIME DEFAULT NULL COMMENT '最近授权时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_user_template` (`user_id`, `template_id`),
  INDEX `idx_subscription_status` (`status`, `remaining_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户订阅消息授权表';
