ALTER TABLE `course_templates`
  ADD COLUMN `start_time` VARCHAR(5) NULL DEFAULT NULL COMMENT '模板开始时间' AFTER `end_section`,
  ADD COLUMN `end_time` VARCHAR(5) NULL DEFAULT NULL COMMENT '模板结束时间' AFTER `start_time`;
