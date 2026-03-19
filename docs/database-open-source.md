# 数据库开源结构说明

最后更新：`2026-03-19`

本文档说明当前仓库附带的数据库结构文件，以及它们和 CloudBase 线上真实数据库的关系。

## 1. 开源原则

本仓库公开：

- 表结构
- 字段
- 索引
- 约束

本仓库不公开：

- 任何用户数据
- 公告正文数据
- 反馈正文数据
- 任何生产敏感业务数据

## 2. 结构来源

当前权威结构文件是：

- [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)

来源于 `2026-03-19` 对 CloudBase 线上 MySQL 执行以下命令后整理而成：

```bash
SHOW TABLES
SHOW CREATE TABLE <table_name>
```

## 3. 当前包含的表

- `admin_accounts`
- `admin_audit_logs`
- `announcements`
- `content_pages`
- `content_reports`
- `course_templates`
- `courses`
- `note_shares`
- `notes`
- `reminder_send_logs`
- `reminders`
- `schedule_share_keys`
- `user_feedback`
- `user_subscriptions`
- `users`

## 4. 重点说明

### 4.1 管理员体系

- `admin_accounts`：管理员账号、角色、状态、权限
- `admin_audit_logs`：后台审计日志

### 4.2 用户治理

- `users`：用户基础资料，以及账号/笔记/分享状态控制字段

### 4.3 课表与提醒

- `courses`
- `course_templates`
- `user_subscriptions`
- `reminders`
- `reminder_send_logs`

### 4.4 内容治理

- `notes`
- `note_shares`
- `content_reports`
- `user_feedback`
- `announcements`
- `content_pages`

## 5. 开源使用建议

如果你要用这份结构自建数据库：

1. 先导入 [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)
2. 再按你的环境初始化管理员
3. 不要导入任何线上业务数据
4. 如果继续扩展表结构，记得同步更新开源结构文件

## 6. `database/` 目录文件用途

当前仓库里的 SQL 文件不要混着导，建议按下面理解：

| 文件 | 是否推荐直接导入 | 说明 |
| --- | --- | --- |
| [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql) | 是 | 当前唯一推荐的完整空库建表文件，来源于 CloudBase 线上真实结构 |
| [database/schema.sql](/E:/codebese1/database/schema.sql) | 否 | 历史本地草稿，和当前真实线上结构有差异 |
| [database/course_templates.sql](/E:/codebese1/database/course_templates.sql) | 否 | 早期模板课表脚本，带模板数据，导入前必须人工核对 |
| [database/notes.sql](/E:/codebese1/database/notes.sql) | 否 | 早期单表脚本，只覆盖 `notes`，不能作为整库初始化文件 |

## 7. 导库建议

如果你是新建数据库：

1. 只先导入 [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)
2. 不要直接导入 [database/schema.sql](/E:/codebese1/database/schema.sql)
3. 不要把 [database/course_templates.sql](/E:/codebese1/database/course_templates.sql) 当成生产初始化脚本
4. 不要把 [database/notes.sql](/E:/codebese1/database/notes.sql) 当成完整数据库文件
5. 后续如需模板数据，再根据当前真实字段整理后单独导入
