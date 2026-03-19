# course-reminder-backend

这是 `课表提醒` 项目的后端服务，基于 NestJS + TypeORM + MySQL。

## 功能范围

- 管理员登录
- 后台权限治理
- 公告管理
- 内容页管理
- 用户封号与权限封禁
- 笔记审核、举报处理、反馈处理
- 订阅提醒调度
- 提醒发送日志与审计日志

## 本地开发

```bash
npm install
npm run build
npm run start:dev
```

默认端口：

- `3000`

## 生产启动

```bash
npm install
npm run build
npm run start:prod
```

也可使用 PM2：

```bash
pm2 start ecosystem.config.cjs --env production
```

## 环境变量

复制：

```bash
cp .env.example .env
```

重点变量：

- `PORT`
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
- `ADMIN_PASSWORD_HASH`
- `OCR_API_URL`
- `OCR_API_KEY`

## 数据库结构

数据库开源结构位于：

- [../database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)

注意：

- 该文件不包含任何数据
- 当前生产数据库运行在 CloudBase MySQL

## 宝塔部署

完整教程见：

- [../docs/backend-deployment.md](/E:/codebese1/docs/backend-deployment.md)

## 已开源接口

接口清单见：

- [../docs/api-reference.md](/E:/codebese1/docs/api-reference.md)
