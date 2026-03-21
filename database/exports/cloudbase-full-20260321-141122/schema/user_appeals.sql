CREATE TABLE `user_appeals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `appeal_type` enum('account','note','share','avatar','signature') NOT NULL,
  `title` varchar(120) NOT NULL,
  `content` text NOT NULL,
  `contact` varchar(100) DEFAULT NULL,
  `restriction_reason` varchar(255) DEFAULT NULL,
  `restriction_expires_at` datetime DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `review_action` enum('none','lift_restriction') NOT NULL DEFAULT 'none',
  `admin_note` varchar(255) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `_openid` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_user_appeals_user_created` (`user_id`,`created_at`),
  KEY `idx_user_appeals_status_created` (`status`,`created_at`),
  KEY `idx_user_appeals_type_status` (`appeal_type`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

