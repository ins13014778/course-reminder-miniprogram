# AGENTS.md

本文件给后续 AI / 编码代理使用。目标不是介绍项目，而是帮助接手者快速进入真实可开发状态，避免被旧文档和旧认知误导。

最后核对时间：`2026-03-19`

## 1. 项目概况

这是一个课表提醒系统多端仓库：

- `miniprogram/`：微信小程序
- `backend/`：NestJS 后端
- `admin/`：Vue 3 + Vite 管理后台
- `database/`：迁移与开源数据库结构
- `docs/`：开发、部署、接口、测试文档

## 2. CloudBase 真实环境

已验证环境：

- `envId`: `dawdawd15-8g023nsw8cb3f68a`
- `alias`: `dawdawd15`
- `region`: `ap-shanghai`

涉及 CloudBase 前，优先执行：

```bash
npx mcporter describe cloudbase
npx mcporter call cloudbase.auth action=status --output json
npx mcporter call cloudbase.auth action=set_env envId=dawdawd15-8g023nsw8cb3f68a --output json
npx mcporter call cloudbase.envQuery action=info --output json
```

## 3. 先知道的事实

### 3.1 线上数据库结构以 CloudBase 为准

不要只相信：

- `backend/src/common/entities/*.entity.ts`
- 旧版 `database/schema.sql`
- 旧 README 和旧部署文档

如需确认，先跑：

```bash
npx mcporter call cloudbase.executeReadOnlySQL sql="SHOW TABLES" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE users" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE courses" --output json
```

### 3.2 当前线上已经存在以下关键表

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

### 3.3 `synchronize` 已关闭

`backend/src/app.module.ts` 当前是：

- `synchronize: false`

这意味着：

- 不要指望 TypeORM 自动帮你修线上表
- 改表后要显式维护迁移文件与 CloudBase 真实结构

### 3.4 当前管理员体系不是单一角色判断

`admin_accounts` 当前包含：

- `role`
- `status`
- `permission_json`

并且：

- 系统默认超管账号禁止在后台被降权或停用
- 管理员不能在后台把自己降权或停用
- 后台登录后会请求 `/admin/profile` 同步当前权限

### 3.5 小程序云函数仍需单独部署

如果改了：

- `miniprogram/cloudfunctions/db-query/`
- `miniprogram/cloudfunctions/user-getOrCreate/`

本地代码改完不等于线上生效，仍需重新发布 CloudBase 云函数。

## 4. 当前文档入口

优先阅读：

1. `docs/developer-handoff.md`
2. `docs/api-reference.md`
3. `docs/database-open-source.md`
4. `docs/backend-deployment.md`
5. `docs/test-cases.md`

## 5. 当前本地启动方式

后端：

```bash
cd backend
npm install
npm run build
npm run start:dev
```

后台：

```bash
cd admin
npm install
npm run build
npm run dev
```

## 6. 后续 AI 的推荐工作流

### 6.1 涉及数据库

推荐顺序：

1. 读本文件
2. 绑定 CloudBase 环境
3. `SHOW TABLES`
4. `DESCRIBE` / `SHOW CREATE TABLE`
5. 再决定改代码还是改库

### 6.2 涉及提醒

先核实：

1. `reminders`
2. `reminder_send_logs`
3. `user_subscriptions`
4. `WECHAT_SUBSCRIBE_TEMPLATE_ID`
5. `SEMESTER_START_DATE`

### 6.3 涉及后台权限

先核实：

1. `admin_accounts`
2. `permission_json`
3. `/admin/profile`
4. 前端缓存的 `admin_profile`

## 7. 一句话建议

这个项目最大的问题从来不是“不会写代码”，而是“本地认知和 CloudBase 线上真实状态不一致”。先核实，再开发。
