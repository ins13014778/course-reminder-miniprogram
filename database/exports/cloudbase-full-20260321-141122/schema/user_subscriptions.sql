CREATE TABLE `user_subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL COMMENT '?? ID',
  `template_id` varchar(128) NOT NULL COMMENT '???? ID',
  `page_path` varchar(255) NOT NULL DEFAULT 'pages/index/index' COMMENT '??????????',
  `remind_minutes` int NOT NULL DEFAULT '15' COMMENT '???????',
  `remind_weekends` tinyint(1) NOT NULL DEFAULT '0',
  `remaining_count` int NOT NULL DEFAULT '0' COMMENT '????????????',
  `status` varchar(20) NOT NULL DEFAULT 'active' COMMENT '????',
  `last_subscribed_at` datetime DEFAULT NULL COMMENT '??????',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_template` (`user_id`,`template_id`),
  KEY `idx_subscription_status` (`status`,`remaining_count`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='?????????';

