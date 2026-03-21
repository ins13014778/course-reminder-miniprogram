CREATE TABLE `project_mgmt_tpl_project_status` (
  `owner` varchar(256) DEFAULT NULL,
  `_mainDep` varchar(64) DEFAULT NULL,
  `createdAt` bigint DEFAULT NULL,
  `createBy` varchar(256) DEFAULT NULL,
  `updateBy` varchar(256) DEFAULT NULL,
  `_openid` varchar(256) DEFAULT NULL,
  `project_status` varchar(256) DEFAULT NULL,
  `_id` varchar(34) NOT NULL,
  `updatedAt` bigint DEFAULT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='项目管理项目状态';

