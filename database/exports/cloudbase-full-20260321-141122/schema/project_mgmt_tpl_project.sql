CREATE TABLE `project_mgmt_tpl_project` (
  `end_date` bigint DEFAULT NULL,
  `owner` varchar(256) DEFAULT NULL,
  `_mainDep` varchar(64) DEFAULT NULL,
  `createdAt` bigint DEFAULT NULL,
  `createBy` varchar(256) DEFAULT NULL,
  `updateBy` varchar(256) DEFAULT NULL,
  `_openid` varchar(256) DEFAULT NULL,
  `description` text,
  `_id` varchar(34) NOT NULL,
  `project_name` varchar(256) DEFAULT NULL,
  `start_date` bigint DEFAULT NULL,
  `updatedAt` bigint DEFAULT NULL,
  `status` varchar(64) DEFAULT NULL,
  `team` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='项目管理项目';

