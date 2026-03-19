# 数据库开源结构说明

最后更新：`2026-03-19`

本文档说明当前仓库附带的数据库开源结构文件，以及它与 CloudBase 线上库的关系。

## 1. 开源原则

本仓库公开：

- 数据库表结构
- 字段
- 索引
- 枚举值
- 约束关系

本仓库不公开：

- 任何用户数据
- 任何公告正文数据
- 任何反馈内容数据
- 任何管理员密码哈希以外的生产敏感内容

## 2. 结构来源

当前结构文件：

- [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)

来源为 `2026-03-19` 对 CloudBase 线上 MySQL 执行以下命令后整理：

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

- `admin_accounts`：后台管理员账号、角色、状态、权限
- `admin_audit_logs`：后台操作审计日志

### 4.2 用户治理

- `users`：账号、学校、专业、年级，以及封号/封笔记/封分享字段

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

1. 先导入 `database/open-source-schema.sql`
2. 再按你的环境填入初始化管理员
3. 不要导入任何线上业务数据
4. 如果继续扩展表结构，记得同步回仓库中的开源结构文件
