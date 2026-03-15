-- 用户表
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `openid` VARCHAR(64) NOT NULL UNIQUE COMMENT '微信openid',
  `unionid` VARCHAR(64) DEFAULT NULL COMMENT '微信unionid',
  `nickname` VARCHAR(100) DEFAULT NULL COMMENT '昵称',
  `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  `school_name` VARCHAR(100) DEFAULT NULL COMMENT '学校名称',
  `major` VARCHAR(100) DEFAULT NULL COMMENT '专业',
  `grade` VARCHAR(20) DEFAULT NULL COMMENT '年级',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 导入任务表
CREATE TABLE `import_tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `image_url` VARCHAR(500) NOT NULL COMMENT '课程表图片URL',
  `ocr_result` TEXT COMMENT 'OCR识别原始结果',
  `parsed_data` JSON COMMENT '解析后的课程数据',
  `status` ENUM('pending', 'processing', 'success', 'failed') DEFAULT 'pending' COMMENT '任务状态',
  `error_msg` TEXT COMMENT '错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='导入任务表';

-- 课程表
CREATE TABLE `courses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `course_name` VARCHAR(100) NOT NULL COMMENT '课程名称',
  `teacher_name` VARCHAR(50) DEFAULT NULL COMMENT '教师姓名',
  `classroom` VARCHAR(100) DEFAULT NULL COMMENT '教室',
  `weekday` TINYINT NOT NULL COMMENT '星期几(1-7)',
  `start_section` TINYINT NOT NULL COMMENT '开始节次',
  `end_section` TINYINT NOT NULL COMMENT '结束节次',
  `start_week` TINYINT NOT NULL COMMENT '开始周',
  `end_week` TINYINT NOT NULL COMMENT '结束周',
  `week_type` ENUM('all', 'odd', 'even') DEFAULT 'all' COMMENT '周类型',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_weekday` (`weekday`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课程表';

-- 提醒记录表
CREATE TABLE `reminders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `course_id` BIGINT UNSIGNED NOT NULL COMMENT '课程ID',
  `remind_time` DATETIME NOT NULL COMMENT '提醒时间',
  `status` ENUM('pending', 'sent', 'failed') DEFAULT 'pending' COMMENT '发送状态',
  `error_msg` TEXT COMMENT '错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_course_id` (`course_id`),
  INDEX `idx_remind_time` (`remind_time`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提醒记录表';

-- 管理员表
CREATE TABLE `admins` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码(bcrypt)',
  `nickname` VARCHAR(50) DEFAULT NULL COMMENT '昵称',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';
