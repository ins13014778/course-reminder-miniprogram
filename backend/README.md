# 课表提醒系统后端

这是用于宝塔部署的独立后端服务仓库，基于 NestJS + TypeORM + MySQL，负责提供小程序端和管理后台所需的 API。

## 功能概览

- 管理员登录
- 公告发布与删除
- 用户列表、用户详情、用户课表查询
- 用户权限治理
- 账号封禁、笔记封禁、分享密钥封禁
- 违规笔记审核、下架与恢复
- 课程查询与删除
- 订阅提醒任务调度

## 技术栈

- Node.js 20
- NestJS 10
- TypeORM
- MySQL
- Redis
- PM2

## 目录结构

```text
src/
  admin/             管理后台接口
  announcements/     公告接口
  auth/              管理员鉴权
  common/entities/   数据实体
  courses/           课程接口
  import/            导入与 OCR
  reminders/         提醒任务
deploy/
  nginx.course-reminder-backend.conf   宝塔反向代理示例
ecosystem.config.cjs                   PM2 配置
```

## 环境变量

复制 `.env.example` 为 `.env`，按实际环境填写：

```bash
cp .env.example .env
```

重点变量：

- `PORT`: 后端监听端口，默认 `3000`
- `DB_HOST`: MySQL 地址
- `DB_PORT`: MySQL 端口
- `DB_USERNAME`: MySQL 用户名
- `DB_PASSWORD`: MySQL 密码
- `DB_DATABASE`: MySQL 数据库名
- `REDIS_HOST`: Redis 地址
- `REDIS_PORT`: Redis 端口
- `JWT_SECRET`: JWT 密钥
- `WECHAT_APPID`: 小程序 AppID
- `WECHAT_SECRET`: 小程序 Secret
- `WECHAT_SUBSCRIBE_TEMPLATE_ID`: 订阅提醒模板 ID
- `SEMESTER_START_DATE`: 学期开始日期，格式 `YYYY-MM-DD`

## 本地启动

```bash
npm install
npm run build
npm run start:prod
```

开发模式：

```bash
npm install
npm run start:dev
```

## 宝塔部署

### 1. 服务器准备

- 安装 Node.js 20
- 安装 MySQL
- 安装 Redis
- 安装 PM2
- 安装 Nginx

PM2 安装命令：

```bash
npm install -g pm2
```

### 2. 拉取代码

```bash
cd /www/wwwroot
git clone <你的后端仓库地址>
cd course-reminder-backend
```

### 3. 安装依赖并构建

```bash
npm install
cp .env.example .env
npm run build
```

### 4. 使用 PM2 启动

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

常用命令：

```bash
pm2 status
pm2 logs course-reminder-backend
pm2 restart course-reminder-backend
pm2 stop course-reminder-backend
```

### 5. 宝塔反向代理

在宝塔站点中把域名反代到 `127.0.0.1:3000`，可直接参考：

- `deploy/nginx.course-reminder-backend.conf`

如果你使用 HTTPS，请在宝塔面板中正常申请证书，然后保留反代配置即可。

## 更新部署

```bash
cd /www/wwwroot/course-reminder-backend
git pull origin main
npm install
npm run build
pm2 restart course-reminder-backend
```

如果仓库默认分支是 `master`，把上面的 `main` 改成 `master`。

## 接口说明

当前核心接口包括：

- `GET /admin/overview`
- `GET /admin/users`
- `GET /admin/users/:id/detail`
- `PATCH /admin/users/:id/permissions`
- `GET /admin/notes`
- `PATCH /admin/notes/:id/moderation`
- `GET /admin/share-keys`
- `PATCH /admin/share-keys/:id/status`
- `GET /announcements`
- `POST /announcements`
- `DELETE /announcements/:id`

## 维护建议

- 生产环境务必关闭数据库自动同步，当前已设为 `synchronize: false`
- 先在测试库验证权限和封禁逻辑，再操作正式库
- 每次上线前至少执行一次 `npm run build`
- 修改数据库结构时，同步补充迁移说明或 SQL 文档
