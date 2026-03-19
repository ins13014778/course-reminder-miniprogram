# 数据库开源结构说明

最后更新：`2026-03-20`

这份文档说明仓库中公开的数据库结构文件，以及它和 CloudBase 线上真实数据库之间的关系。

## 1. 开源原则

本仓库公开：

- 表结构
- 字段定义
- 索引
- 约束
- 迁移 SQL

本仓库不公开：

- 任何用户业务数据
- 公告正文数据
- 留言反馈内容
- 申诉内容
- 任何生产环境敏感数据

## 2. 权威结构来源

当前推荐使用的结构文件：

- [open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)

当前推荐使用的迁移文件：

- [2026-03-19-add-governance-batch-messages.sql](/E:/codebese1/database/migrations/2026-03-19-add-governance-batch-messages.sql)

这些文件已根据 `2026-03-20` 的 CloudBase 线上实际情况核对并同步。

核对方式：

```bash
SHOW TABLES
SHOW CREATE TABLE <table_name>
DESCRIBE <table_name>
SHOW INDEX FROM <table_name>
```

## 3. 当前开源结构包含的核心表

- `admin_accounts`
- `admin_action_confirmations`
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
- `user_appeals`
- `user_feedback`
- `user_message_reads`
- `user_subscriptions`
- `user_violation_records`
- `users`

## 4. 本轮新增结构

### 4.1 `user_violation_records`

用途：

- 记录账号、笔记、分享、头像、个签等违规处理历史
- 给后台用户详情页提供违规档案

### 4.2 `admin_action_confirmations`

用途：

- 存储高风险操作确认码
- 支撑后台二次确认机制

### 4.3 `user_message_reads`

用途：

- 记录用户在通知中心的已读状态
- 消息类型覆盖：
  - `announcement`
  - `feedback`
  - `appeal`

### 4.4 `reminder_send_logs` 新增字段

新增字段：

- `retry_count`
- `retried_from_log_id`
- `last_retry_at`

新增索引：

- `idx_reminder_send_logs_retry_status`

用途：

- 记录人工重试次数
- 关联重试来源日志
- 支持后台提醒告警汇总和重试筛查

## 5. 初始化建议

如果你要在新环境初始化数据库，建议顺序如下：

1. 导入 [open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)
2. 再按需要执行 `database/migrations/` 下的增量迁移
3. 手动初始化管理员账号
4. 不要导入任何线上业务数据

## 6. `database/` 目录文件说明

| 文件 | 是否推荐直接导入 | 说明 |
| --- | --- | --- |
| [open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql) | 是 | 当前唯一推荐的完整空库结构文件 |
| [2026-03-19-add-governance-batch-messages.sql](/E:/codebese1/database/migrations/2026-03-19-add-governance-batch-messages.sql) | 是 | 本轮治理、消息中心、提醒重试相关迁移 |
| [schema.sql](/E:/codebese1/database/schema.sql) | 否 | 历史草稿，不能再视为线上事实来源 |
| [course_templates.sql](/E:/codebese1/database/course_templates.sql) | 否 | 早期模板数据脚本，导入前必须人工核对 |
| [notes.sql](/E:/codebese1/database/notes.sql) | 否 | 仅覆盖部分旧表，不适合作为整库初始化文件 |

## 7. 一句话提醒

这个项目的数据库事实来源永远应该是 CloudBase 线上结构，而不是旧 SQL 草稿。
