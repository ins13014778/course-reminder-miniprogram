# AGENTS.md

本文件给后续 AI / 编码代理使用。目标不是介绍项目，而是帮助后来的开发者快速进入真实可开发状态，避免被仓库中的过时文档、本地实体和 CloudBase 线上环境差异误导。

最后核对时间：`2026-03-18`

## 1. 项目概况

这是一个课表提醒系统，当前是多端仓库：

- `miniprogram/`：微信小程序
- `backend/`：NestJS 后端
- `admin/`：Vue 3 + Vite 管理台
- `database/`：本地 SQL 草稿和迁移文件
- `docs/`：早期项目文档，部分内容已经过时

核心业务：

- 用户登录
- 课表导入/维护
- 课表分享
- 订阅消息提醒

## 2. CloudBase 真实环境

这个仓库已经配置了 CloudBase MCP，可直接查询真实环境。

已验证环境：

- `envId`: `dawdawd15-8g023nsw8cb3f68a`
- `alias`: `dawdawd15`
- `region`: `ap-shanghai`
- MySQL 实例存在且可通过 CloudBase MCP 查询

先做任何 CloudBase 相关改动前，优先执行：

```bash
npx mcporter describe cloudbase
npx mcporter call cloudbase.auth action=status --output json
npx mcporter call cloudbase.auth action=set_env envId=dawdawd15-8g023nsw8cb3f68a --output json
npx mcporter call cloudbase.envQuery action=info --output json
```

## 3. 必须先知道的事实

### 3.1 不要盲信本地实体

`backend/src/common/entities/*.entity.ts` 与 CloudBase 线上表结构已经出现分叉。

最明显的例子：

- 本地 `Course` 实体使用 `teacherName` / `classroom`
- CloudBase 实表 `courses` 使用 `teacher` / `location`

- 本地 `User` 实体使用 `avatar` / `schoolName` / `unionid`
- CloudBase 实表 `users` 使用 `avatar_url` / `school`

所以：

- 修改后端实体前，先查线上表结构
- 不要根据 `database/schema.sql` 或旧文档直接推断真实字段
- 如果要改表，先用 MCP 读真实结构，再决定是迁移线上，还是修正本地代码

建议查询方式：

```bash
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE courses" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE users" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE user_subscriptions" --output json
```

### 3.2 当前线上没有 `reminders` 表

虽然本地有：

- `backend/src/common/entities/reminder.entity.ts`
- `database/schema.sql` 中的 `reminders`

但截至 `2026-03-18`，CloudBase 线上 MySQL 中 **没有** `reminders` 表。

这意味着：

- 提醒链路当前不能假定线上已有这张表
- 新 AI 如果要做提醒功能，不要只改代码，要同时核实线上表是否真的存在

验证方式：

```bash
npx mcporter call cloudbase.executeReadOnlySQL sql="SHOW TABLES LIKE 'reminders'" --output json
```

### 3.3 `TypeORM synchronize` 现在是高风险项

`backend/src/app.module.ts` 当前配置：

- `synchronize: true`

由于本地实体与线上表不一致，这个配置有真实风险。后续 AI：

- 不要在不了解线上结构的情况下直接启动生产后端
- 不要默认相信 TypeORM 会“帮你修好”
- 如果要部署后端，优先确认是否应该关闭 `synchronize`

### 3.4 小程序 `db-query` 云函数非常敏感

当前链路是：

- 小程序把原始 SQL 传给 `db-query`
- `db-query` 云函数直接执行客户端传入 SQL

相关文件：

- `miniprogram/utils/cloud-db.js`
- `miniprogram/cloudfunctions/db-query/index.js`

已验证事实：

- 云函数代码中存在硬编码数据库连接信息
- 云函数只校验“已登录且非匿名”
- 没有 SQL 白名单、表白名单、语句类型限制

因此：

- 不要扩展这条能力
- 不要把新的敏感写操作继续堆到这条链路上
- 如果要做安全整改，应优先把任意 SQL 能力收口到受控接口

## 4. 当前线上表结构快照

以下内容基于 CloudBase MCP 实查，不是基于本地猜测。

### 4.1 `courses`

实际字段：

- `id`
- `user_id`
- `course_name`
- `teacher`
- `location`
- `weekday`
- `start_section`
- `end_section`
- `start_time`
- `end_time`
- `start_week`
- `end_week`
- `color`
- `created_at`
- `_openid`

注意：

- 线上 `courses` 表目前 **没有** `updated_at`
- 线上 `courses` 表目前 **没有** `week_type`

### 4.2 `users`

实际字段：

- `id`
- `openid`
- `nickname`
- `signature`
- `avatar_url`
- `created_at`
- `updated_at`
- `_openid`
- `school`
- `major`
- `grade`

### 4.3 `user_subscriptions`

实际字段：

- `id`
- `user_id`
- `template_id`
- `page_path`
- `remind_minutes`
- `remaining_count`
- `status`
- `last_subscribed_at`
- `created_at`
- `updated_at`

## 5. 当前数据规模

截至 `2026-03-18` 实查：

- `courses`: `78`
- `users`: `18`
- `user_subscriptions`: `1`

说明这不是空库。任何结构调整、批量更新、提醒逻辑变更都要假设会影响真实用户数据。

## 6. 目录说明

### 6.1 小程序

关键目录：

- `miniprogram/pages/`
- `miniprogram/utils/`
- `miniprogram/cloudfunctions/`
- `miniprogram/project.config.json`

已确认：

- `project.config.json` 中配置了 `appid`
- `cloudenv` 为 `dawdawd15-8g023nsw8cb3f68a`

### 6.2 后端

关键目录：

- `backend/src/auth/`
- `backend/src/courses/`
- `backend/src/import/`
- `backend/src/reminders/`
- `backend/src/common/entities/`

当前 `build` 可通过，但“能编译”不代表“和线上结构一致”。

### 6.3 管理台

关键目录：

- `admin/src/`

当前 `vite build` 可通过，但存在较大的产物 chunk，后续如做前端性能优化可继续拆包。

## 7. 本地可执行命令

### 7.1 后端

```bash
cd backend
npm install
npm run build
npm run start:dev
```

### 7.2 管理台

```bash
cd admin
npm install
npm run build
npm run dev
```

### 7.3 小程序

```bash
cd miniprogram
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('ok')"
```

小程序调试以微信开发者工具为主。

## 8. 后续 AI 的推荐工作流

### 8.1 涉及 CloudBase / 数据库时

必须优先使用：

- `cloudbase`
- `miniprogram-development`
- `relational-database-mcp-cloudbase`

推荐顺序：

1. 读技能说明
2. `npx mcporter describe cloudbase`
3. 绑定环境
4. `DESCRIBE` / `SHOW TABLES`
5. 再决定改代码还是改库

### 8.2 涉及提醒功能时

先核实这 4 件事：

1. 线上是否已有 `reminders` 表
2. `user_subscriptions` 是否已有有效记录
3. 模板 ID 是否以数据库为准还是以环境变量为准
4. 发送链路是否仍依赖危险的 SQL 云函数

### 8.3 涉及部署时

先核实：

1. 后端连接的是否就是 CloudBase 当前生产库
2. `synchronize` 是否应该关闭
3. 本地实体是否与线上表对齐
4. 是否会因部署触发表结构自动变更

## 9. 已知文档问题

仓库中若干早期文档已经不完全可信：

- `README.md`
- `docs/summary.md`
- `docs/progress.md`
- `docs/backend-deployment.md`
- `database/schema.sql`

主要问题：

- 部分环境 ID 是旧的
- 部分数据库结构与线上不一致
- 部分功能完成度描述已经过时

这些文件可以参考项目意图，但不能作为最终事实来源。

## 10. 修改前建议

如果后续 AI 要进行中高风险操作，先做最小核验：

```bash
npx mcporter call cloudbase.executeReadOnlySQL sql="SHOW TABLES" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE courses" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE users" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE user_subscriptions" --output json
git status --short
```

## 11. 给后续 AI 的一句话建议

这个项目最大的问题不是“代码不会写”，而是“本地认知和 CloudBase 线上真实状态不一致”。先核实，再开发，通常比直接改代码更重要。
