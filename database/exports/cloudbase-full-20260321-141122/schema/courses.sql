CREATE TABLE `courses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `course_name` varchar(100) NOT NULL,
  `teacher` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `weekday` int NOT NULL,
  `start_section` int NOT NULL,
  `end_section` int NOT NULL,
  `start_time` varchar(5) DEFAULT NULL COMMENT '???????',
  `end_time` varchar(5) DEFAULT NULL COMMENT '???????',
  `start_week` int NOT NULL,
  `end_week` int NOT NULL,
  `color` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `_openid` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=330 DEFAULT CHARSET=utf8mb3;

