# 数据库开源结构说明

最后更新：`2026-03-19`

这份文档说明仓库中公开的数据库结构文件，以及它和 CloudBase 线上真实数据库的关系。

## 1. 开源原则

本仓库公开：

- 表结构
- 字段定义
- 索引
- 约束

本仓库不公开：

- 任何用户业务数据
- 公告正文数据
- 留言反馈内容
- 申诉内容
- 任何生产环境敏感数据

## 2. 权威结构来源

当前推荐使用的结构文件：

- [open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)

该文件基于 `2026-03-19` 对 CloudBase 线上 MySQL 的真实结构核对后整理，核对方式包括：

```bash
SHOW TABLES
SHOW CREATE TABLE <table_name>
DESCRIBE <table_name>
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
- `user_appeals`
- `user_feedback`
- `user_subscriptions`
- `users`

## 4. 新增的申诉表

`2026-03-19` 已补齐并同步开源的申诉表：

- `user_appeals`

用途：

- 用户对账号封禁发起申诉
- 用户对笔记封禁发起申诉
- 用户对分享封禁发起申诉
- 后台审核通过后自动解除对应限制
- 后台审核结果同步到小程序通知中心

关键字段：

- `appeal_type`：申诉类型，取值 `account / note / share`
- `status`：审核状态，取值 `pending / approved / rejected`
- `review_action`：后台处理动作，当前支持 `none / lift_restriction`
- `restriction_reason`：用户被限制时的原因快照
- `restriction_expires_at`：限制截止时间快照
- `admin_note`：后台审核备注

## 5. 使用建议

如果你要在新环境初始化数据库，建议顺序如下：

1. 只导入 [open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)
2. 再按你的环境初始化管理员账号
3. 不要导入任何线上业务数据
4. 如果后续继续加表或改表，记得同步更新开源 SQL 和本文档

## 6. `database/` 目录文件说明

| 文件 | 是否推荐直接导入 | 说明 |
| --- | --- | --- |
| [open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql) | 是 | 当前唯一推荐的完整空库建表文件，来源于 CloudBase 线上真实结构 |
| [schema.sql](/E:/codebese1/database/schema.sql) | 否 | 历史草稿，不能再当成线上事实来源 |
| [course_templates.sql](/E:/codebese1/database/course_templates.sql) | 否 | 早期模板课表脚本，导入前必须人工核对 |
| [notes.sql](/E:/codebese1/database/notes.sql) | 否 | 仅覆盖部分旧表，不适合作为整库初始化文件 |

## 7. 一句话提醒

这个项目的数据库事实来源永远应该是 CloudBase 线上结构，不是旧 SQL 草稿。
