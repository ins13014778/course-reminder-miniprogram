CREATE TABLE IF NOT EXISTS `course_templates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `template_key` VARCHAR(64) NOT NULL COMMENT 'template identifier',
  `template_name` VARCHAR(100) NOT NULL COMMENT 'template display name',
  `course_name` VARCHAR(100) NOT NULL COMMENT 'course name',
  `teacher_name` VARCHAR(50) DEFAULT '' COMMENT 'teacher name',
  `classroom` VARCHAR(100) DEFAULT '' COMMENT 'classroom',
  `weekday` TINYINT NOT NULL COMMENT 'weekday 1-7',
  `start_section` TINYINT NOT NULL COMMENT 'start section',
  `end_section` TINYINT NOT NULL COMMENT 'end section',
  `start_time` VARCHAR(5) DEFAULT NULL COMMENT 'custom start time',
  `end_time` VARCHAR(5) DEFAULT NULL COMMENT 'custom end time',
  `start_week` TINYINT NOT NULL DEFAULT 1 COMMENT 'start week',
  `end_week` TINYINT NOT NULL DEFAULT 18 COMMENT 'end week',
  `week_type` ENUM('all', 'odd', 'even') DEFAULT 'all' COMMENT 'week type',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'sort order',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'whether active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_template_key` (`template_key`),
  INDEX `idx_template_weekday` (`template_key`, `weekday`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='default course templates';

ALTER TABLE `course_templates`
  ADD COLUMN IF NOT EXISTS `start_time` VARCHAR(5) DEFAULT NULL COMMENT 'custom start time' AFTER `end_section`,
  ADD COLUMN IF NOT EXISTS `end_time` VARCHAR(5) DEFAULT NULL COMMENT 'custom end time' AFTER `start_time`;

DELETE FROM `course_templates` WHERE `template_key` = 'default_ai302';

INSERT INTO `course_templates`
(`template_key`, `template_name`, `course_name`, `teacher_name`, `classroom`, `weekday`, `start_section`, `end_section`, `start_time`, `end_time`, `start_week`, `end_week`, `week_type`, `sort_order`, `is_active`)
VALUES
('default_ai302', '郑州幼专默认课表', '幼儿文学', '待定', '待定', 1, 1, 2, '08:30', '10:10', 1, 18, 'all', 10, 1),
('default_ai302', '郑州幼专默认课表', '学前儿童语言教育', '待定', '待定', 1, 3, 4, '10:25', '12:05', 1, 18, 'all', 20, 1),
('default_ai302', '郑州幼专默认课表', '学前卫生学', '待定', '待定', 1, 5, 6, '14:00', '15:40', 1, 18, 'all', 30, 1),
('default_ai302', '郑州幼专默认课表', '晚自习', '待定', '教室', 1, 9, 10, '19:00', '20:30', 1, 18, 'all', 40, 1),

('default_ai302', '郑州幼专默认课表', '学前教育学', '待定', '待定', 2, 1, 2, '08:30', '10:10', 1, 18, 'all', 10, 1),
('default_ai302', '郑州幼专默认课表', '幼儿园活动设计', '待定', '待定', 2, 3, 4, '10:25', '12:05', 1, 18, 'all', 20, 1),
('default_ai302', '郑州幼专默认课表', '幼儿游戏与指导', '待定', '待定', 2, 5, 6, '14:00', '15:40', 1, 18, 'all', 30, 1),
('default_ai302', '郑州幼专默认课表', '课外活动', '待定', '操场', 2, 7, 8, '16:00', '17:40', 1, 18, 'all', 40, 1),

('default_ai302', '郑州幼专默认课表', '教师口语', '待定', '待定', 3, 1, 2, '08:30', '10:10', 1, 18, 'all', 10, 1),
('default_ai302', '郑州幼专默认课表', '钢琴基础', '待定', '琴房', 3, 3, 4, '10:25', '12:05', 1, 18, 'all', 20, 1),
('default_ai302', '郑州幼专默认课表', '舞蹈基础', '待定', '舞蹈教室', 3, 5, 6, '14:00', '15:40', 1, 18, 'all', 30, 1),
('default_ai302', '郑州幼专默认课表', '晚自习', '待定', '教室', 3, 9, 10, '19:00', '20:30', 1, 18, 'all', 40, 1),

('default_ai302', '郑州幼专默认课表', '美术基础', '待定', '美术教室', 4, 1, 2, '08:30', '10:10', 1, 18, 'all', 10, 1),
('default_ai302', '郑州幼专默认课表', '手工制作', '待定', '美工室', 4, 3, 4, '10:25', '12:05', 1, 18, 'all', 20, 1),
('default_ai302', '郑州幼专默认课表', '学前儿童心理学', '待定', '待定', 4, 5, 6, '14:00', '15:40', 1, 18, 'all', 30, 1),
('default_ai302', '郑州幼专默认课表', '课外活动', '待定', '操场', 4, 7, 8, '16:00', '17:40', 1, 18, 'all', 40, 1),

('default_ai302', '郑州幼专默认课表', '思想政治', '待定', '待定', 5, 1, 2, '08:30', '10:10', 1, 18, 'all', 10, 1),
('default_ai302', '郑州幼专默认课表', '普通话', '待定', '待定', 5, 3, 4, '10:25', '12:05', 1, 18, 'all', 20, 1),
('default_ai302', '郑州幼专默认课表', '体育', '待定', '操场', 5, 5, 6, '14:00', '15:40', 1, 18, 'all', 30, 1),
('default_ai302', '郑州幼专默认课表', '班会', '辅导员', '教室', 5, 7, 8, '16:00', '17:40', 1, 18, 'all', 40, 1);
