# 课表提醒系统

最后更新：`2026-03-20`

这是一个多端课表提醒与内容治理项目仓库，当前包含：

- `miniprogram/`：微信小程序
- `backend/`：NestJS API 与提醒调度服务
- `admin/`：Vue 3 + Vite 管理后台
- `database/`：开源数据库结构与迁移 SQL
- `docs/`：开发、部署、接口、测试和交接文档

## 当前最重要的阅读入口

如果你是第一次接手本仓库，优先看这些文档：

1. [AGENTS.md](./AGENTS.md)
2. [docs/secondary-development-guide.md](./docs/secondary-development-guide.md)
3. [docs/developer-handoff.md](./docs/developer-handoff.md)
4. [docs/api-reference.md](./docs/api-reference.md)
5. [docs/database-open-source.md](./docs/database-open-source.md)
6. [docs/test-cases.md](./docs/test-cases.md)

## 当前项目状态

当前项目的真实运行状态有几个关键点：

- 小程序当前主链路仍以 `wx.cloud + 云函数 + db-query` 为主
- 后端和管理后台已经可以独立部署
- CloudBase 线上数据库结构是当前事实来源
- `backend/src/app.module.ts` 中 `synchronize: false`
- 管理员权限不是单纯角色判断，而是 `role + status + permission_json`

## 本地启动

### 后端

```bash
cd backend
npm install
npm run build
npm run start:dev
```

### 后台

```bash
cd admin
npm install
npm run build
npm run dev
```

### 小程序

用微信开发者工具打开：

- `E:\codebese1\miniprogram`

并确认：

- `miniprogram/project.config.json`
- `miniprogram/app.js`

## 环境与部署

### CloudBase 真实环境

- `envId`: `dawdawd15-8g023nsw8cb3f68a`
- `alias`: `dawdawd15`
- `region`: `ap-shanghai`

操作 CloudBase 前建议先执行：

```bash
npx mcporter describe cloudbase
npx mcporter call cloudbase.auth action=status --output json
npx mcporter call cloudbase.auth action=set_env envId=dawdawd15-8g023nsw8cb3f68a --output json
npx mcporter call cloudbase.envQuery action=info --output json
```

### 宝塔部署入口

如果你要把 API 和后台部署到宝塔，优先看：

- [docs/secondary-development-guide.md](./docs/secondary-development-guide.md)
- [docs/backend-deployment.md](./docs/backend-deployment.md)

## 数据库开源结构

当前推荐使用的数据库结构文件：

- [database/open-source-schema.sql](./database/open-source-schema.sql)

增量迁移文件：

- [database/migrations/2026-03-19-add-governance-batch-messages.sql](./database/migrations/2026-03-19-add-governance-batch-messages.sql)

不要把这些历史文件当作唯一事实来源：

- `database/schema.sql`
- `database/course_templates.sql`
- `database/notes.sql`

## 文档说明

当前仓库里有部分历史文档存在乱码或过时信息。后续维护时，请优先以这些文件为准：

- `AGENTS.md`
- `docs/secondary-development-guide.md`
- `docs/developer-handoff.md`
- `docs/api-reference.md`
- `docs/database-open-source.md`

## 一句话提醒

这个项目后续维护的关键，不是盲目改代码，而是先确认你改的是当前真正生效的那条链路。
