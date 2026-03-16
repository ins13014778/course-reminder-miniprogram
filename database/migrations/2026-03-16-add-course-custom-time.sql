ALTER TABLE `courses`
  ADD COLUMN `start_time` VARCHAR(5) NULL DEFAULT NULL COMMENT '自定义开始时间' AFTER `end_section`,
  ADD COLUMN `end_time` VARCHAR(5) NULL DEFAULT NULL COMMENT '自定义结束时间' AFTER `start_time`;
