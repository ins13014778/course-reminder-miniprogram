CREATE TABLE `announcements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(120) NOT NULL COMMENT '????',
  `content` text NOT NULL COMMENT '????',
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT '????',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '1' COMMENT '????',
  `published_at` timestamp NULL DEFAULT NULL COMMENT '????',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_updated` (`status`,`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='?????';

