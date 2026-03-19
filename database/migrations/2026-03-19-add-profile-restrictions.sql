ALTER TABLE `users`
  ADD COLUMN `avatar_status` VARCHAR(20) NOT NULL DEFAULT 'active' AFTER `share_banned_until`,
  ADD COLUMN `avatar_ban_reason` VARCHAR(255) DEFAULT NULL AFTER `avatar_status`,
  ADD COLUMN `avatar_banned_until` DATETIME DEFAULT NULL AFTER `avatar_ban_reason`,
  ADD COLUMN `signature_status` VARCHAR(20) NOT NULL DEFAULT 'active' AFTER `avatar_banned_until`,
  ADD COLUMN `signature_ban_reason` VARCHAR(255) DEFAULT NULL AFTER `signature_status`,
  ADD COLUMN `signature_banned_until` DATETIME DEFAULT NULL AFTER `signature_ban_reason`;

ALTER TABLE `user_appeals`
  MODIFY COLUMN `appeal_type` ENUM('account','note','share','avatar','signature') NOT NULL;
