# 课表提醒项目

这是一个基于 CloudBase 的多端项目，当前仓库包含：

- `miniprogram/`：微信小程序
- `backend/`：NestJS API 与提醒调度服务
- `admin/`：Vue 3 + Vite 管理后台
- `database/`：数据库迁移与开源结构文件
- `docs/`：开发交接、API、部署与测试文档

## 当前已落地能力

- 微信登录与用户资料初始化
- 课表导入、维护、分享导入
- 课前订阅提醒
- 公告发布与前端展示
- 笔记、笔记分享、举报、反馈闭环
- 后台管理员登录、角色分级、细粒度权限控制
- 后台用户治理、封号、封笔记、封分享
- 提醒发送日志、后台审计日志

## 真实运行环境

- CloudBase `envId`：`dawdawd15-8g023nsw8cb3f68a`
- CloudBase `alias`：`dawdawd15`
- Region：`ap-shanghai`

当前数据库结构、管理员权限表、反馈表、内容页表、提醒日志表等，都以 CloudBase 线上真实结构为准，不要只看旧 SQL 草稿。

## 本地启动

后端：

```powershell
cd E:\codebese1\backend
npm install
npm run start:dev
```

后台：

```powershell
cd E:\codebese1\admin
npm install
npm run dev
```

访问地址：

- 后台：`http://localhost:5173`
- API：`http://localhost:3000`

## 开发与部署文档

- [开发交接文档](./docs/developer-handoff.md)
- [API 接口文档](./docs/api-reference.md)
- [宝塔部署教程](./docs/backend-deployment.md)
- [数据库开源结构说明](./docs/database-open-source.md)
- [测试用例文档](./docs/test-cases.md)

## 开源数据库结构

本仓库已附带不含任何生产数据的开源结构文件：

- [database/open-source-schema.sql](./database/open-source-schema.sql)

该文件基于 `2026-03-19` 对 CloudBase 线上 MySQL 执行 `SHOW CREATE TABLE` 整理而成，只保留表结构、索引、字段，不包含任何用户数据。

## 开源 API 说明

当前后端接口已经随仓库开源，主要分为：

- 小程序与前台接口
- 后台管理接口
- 内容页与公告接口

完整清单见：

- [docs/api-reference.md](./docs/api-reference.md)

## 宝塔部署建议

如果你要部署完整项目，推荐分为两部分：

1. 后端 `backend/` 用 PM2 常驻，Nginx 反代到 API 域名
2. 后台 `admin/` 构建后作为静态站点部署到宝塔站点目录

完整步骤见：

- [docs/backend-deployment.md](./docs/backend-deployment.md)
- [backend/README.md](./backend/README.md)

## 维护原则

- 涉及数据库前，优先核对 CloudBase 线上真实表结构
- 涉及云函数前，确认是否需要重新部署到 CloudBase
- 涉及后台权限时，优先核对 `admin_accounts.permission_json`
- 不要把生产数据提交到 GitHub

## 当前仓库说明

这个仓库当前作为主仓库继续维护。后续如果拆分子仓库部署，也建议以本仓库中的文档为主线来源。
