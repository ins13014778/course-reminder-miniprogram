CREATE TABLE `notes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL COMMENT 'user id',
  `content` text NOT NULL COMMENT 'note content',
  `image_url` varchar(500) DEFAULT '' COMMENT 'note image',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL DEFAULT 'visible',
  `moderation_reason` varchar(255) DEFAULT NULL,
  `moderated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notes_user_id` (`user_id`),
  KEY `idx_notes_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='user notes';

