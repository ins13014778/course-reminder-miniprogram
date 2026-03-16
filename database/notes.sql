CREATE TABLE IF NOT EXISTS `notes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'user id',
  `content` TEXT NOT NULL COMMENT 'note content',
  `image_url` VARCHAR(500) DEFAULT '' COMMENT 'note image',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_notes_user_id` (`user_id`),
  INDEX `idx_notes_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='user notes';
