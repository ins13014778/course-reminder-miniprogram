# 开发交接文档

最后更新：`2026-03-20`

这份文档给后续开发者和 AI 使用。目标不是介绍项目，而是帮助接手者快速进入“可继续开发、可继续部署、可继续排障”的真实状态。

## 1. 仓库结构

- `miniprogram/`：微信小程序
- `backend/`：NestJS 后端
- `admin/`：Vue 3 + Vite 管理后台
- `database/`：开源数据库结构与迁移 SQL
- `docs/`：开发、接口、部署、测试文档

## 2. CloudBase 真实环境

- `envId`: `dawdawd15-8g023nsw8cb3f68a`
- `alias`: `dawdawd15`
- `region`: `ap-shanghai`

开始处理 CloudBase 前，先执行：

```bash
npx mcporter describe cloudbase
npx mcporter call cloudbase.auth action=status --output json
npx mcporter call cloudbase.auth action=set_env envId=dawdawd15-8g023nsw8cb3f68a --output json
npx mcporter call cloudbase.envQuery action=info --output json
```

## 3. 当前线上事实

### 3.1 线上结构以 CloudBase 为准

不要只相信以下文件：

- `backend/src/common/entities/*.entity.ts`
- 旧版 `database/schema.sql`
- 历史 README 或历史部署文档

先查线上，再动代码：

```bash
npx mcporter call cloudbase.executeReadOnlySQL sql="SHOW TABLES" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE users" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE reminder_send_logs" --output json
```

### 3.2 `synchronize` 已关闭

后端当前是：

- `backend/src/app.module.ts` -> `synchronize: false`

这意味着：

- 改表不会自动同步到线上
- 每次改表都要同步维护 `database/open-source-schema.sql`
- 需要时要显式执行迁移 SQL

## 4. 当前线上关键表

已核实线上存在以下核心表：

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

## 5. 本轮已落地能力

### 5.1 用户治理与后台批量操作

这一轮已经补齐以下能力：

- 用户批量封禁 / 解封
- 分享密钥批量封禁 / 恢复
- 笔记批量下架 / 恢复
- 笔记分享批量封禁 / 恢复
- 举报批量处理

对应后端接口：

- `POST /admin/users/batch-permissions`
- `PATCH /admin/share-keys/batch-status`
- `PATCH /admin/notes/batch-moderation`
- `PATCH /admin/note-shares/batch-status`
- `PATCH /admin/reports/batch-review`

### 5.2 高风险二次确认

高风险操作新增二次确认挑战机制：

- `POST /admin/high-risk-actions/challenge`

说明：

- 后台会先创建短时效确认记录到 `admin_action_confirmations`
- 前端要求管理员输入验证码
- 高风险接口需要携带 `confirmationId` 和 `confirmationCode`

### 5.3 违规档案

后台已接入用户违规档案：

- 新表：`user_violation_records`
- 用户详情中可返回：
  - `violationStats`
  - `violationRecords`

适用场景：

- 账号封禁
- 笔记权限封禁
- 分享权限封禁
- 头像封禁
- 个签封禁
- 举报联动治理

### 5.4 通知中心合流

小程序通知中心已改为统一消息中心，合并展示：

- 公告
- 反馈处理结果
- 申诉处理结果

新增表：

- `user_message_reads`

已上线的关键点：

- 首页公告卡片可进入通知中心
- 消息支持已读 / 未读
- 账号封禁状态下，仍允许读取公告、反馈、申诉相关内容用于申诉和查看回执

### 5.5 提醒重试与告警汇总

提醒日志新增：

- `retry_count`
- `retried_from_log_id`
- `last_retry_at`
- `idx_reminder_send_logs_retry_status`

新增接口：

- `GET /admin/reminder-logs/summary`
- `POST /admin/reminder-logs/retry`

用途：

- 汇总近 24 小时失败告警
- 对失败提醒手动重试

## 6. 线上迁移状态

已于 `2026-03-20` 完成以下线上变更：

- 创建 `user_violation_records`
- 创建 `admin_action_confirmations`
- 创建 `user_message_reads`
- 为 `reminder_send_logs` 补齐重试字段与索引
- 重新部署 `miniprogram/cloudfunctions/db-query`

说明：

- `db-query` 云函数最新线上发布时间已核对
- 如果后续继续修改 `miniprogram/cloudfunctions/db-query/`，本地改完后仍然要重新部署

## 7. 本地启动方式

后端：

```powershell
cd E:\codebese1\backend
npm install
npm run build
npm run start:dev
```

后台：

```powershell
cd E:\codebese1\admin
npm install
npm run build
npm run dev
```

## 8. 环境变量重点

后端参考：

- [backend/.env.example](/E:/codebese1/backend/.env.example)

重点变量：

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `JWT_SECRET`
- `WECHAT_APPID`
- `WECHAT_SECRET`
- `WECHAT_SUBSCRIBE_TEMPLATE_ID`
- `SEMESTER_START_DATE`
- `ADMIN_EMAIL`
- `ADMIN_NAME`
- `ADMIN_PASSWORD`
- `ADMIN_PASSWORD_HASH`

后台重点变量：

- `VITE_API_BASE_URL`

## 9. 推荐接手顺序

1. 先读本文件
2. 再读 [api-reference.md](/E:/codebese1/docs/api-reference.md)
3. 再读 [database-open-source.md](/E:/codebese1/docs/database-open-source.md)
4. 需要部署时读 [backend-deployment.md](/E:/codebese1/docs/backend-deployment.md)
5. 回归前读 [test-cases.md](/E:/codebese1/docs/test-cases.md)

## 10. 后续开发建议

如果后续继续扩展治理体系，建议延续当前这套模式：

- 独立权限域
- 独立违规记录
- 独立申诉类型
- 后台审核后自动联动解除或维持限制
- 小程序通知中心同步回执

## 11. 一句话提醒

这个项目最容易出问题的地方，不是代码不会写，而是“本地认知和 CloudBase 线上真实状态不一致”。先核实，再开发。
