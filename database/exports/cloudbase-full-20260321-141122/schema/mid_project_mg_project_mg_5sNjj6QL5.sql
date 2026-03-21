CREATE TABLE `mid_project_mg_project_mg_5sNjj6QL5` (
  `rightRecordId` varchar(34) NOT NULL,
  `createdAt` bigint DEFAULT NULL,
  `createBy` varchar(256) DEFAULT NULL,
  `updateBy` varchar(256) DEFAULT NULL,
  `_id` varchar(34) NOT NULL,
  `leftRecordId` varchar(34) NOT NULL,
  `updatedAt` bigint DEFAULT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `lcap-index-left-right` (`leftRecordId`,`rightRecordId`),
  KEY `lcap-index-left` (`leftRecordId`),
  KEY `lcap-index-right` (`rightRecordId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='项目管理团队和项目管理成员中间表';

