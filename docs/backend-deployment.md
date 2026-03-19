# 宝塔部署教程

最后更新：`2026-03-19`

本文档覆盖：

- 后端 API 宝塔部署
- 管理后台宝塔部署
- CloudBase MySQL 外部连接配置
- PM2 常驻与 Nginx 反向代理

## 1. 推荐部署拓扑

推荐拆成两个站点：

1. `api.xxx.com` 指向 `backend/`
2. `admin.xxx.com` 指向 `admin/`

数据库继续使用 CloudBase MySQL，不在宝塔本机落业务数据。

## 2. 服务器准备

宝塔服务器建议：

- Ubuntu 22.04 或 CentOS 7+
- Node.js 20
- PM2
- Nginx
- Git

安装 PM2：

```bash
npm install -g pm2
```

## 3. 拉取代码

```bash
cd /www/wwwroot
git clone https://github.com/ins13014778/course-reminder-miniprogram.git
cd course-reminder-miniprogram
```

## 4. 部署后端 API

### 4.1 安装与构建

```bash
cd /www/wwwroot/course-reminder-miniprogram/backend
npm install
npm run build
```

### 4.2 配置环境变量

复制：

```bash
cp .env.example .env
```

最少需要配置：

```env
NODE_ENV=production
PORT=3000

DB_HOST=你的 CloudBase MySQL 地址
DB_PORT=27720
DB_USERNAME=你的数据库账号
DB_PASSWORD=你的数据库密码
DB_DATABASE=dawdawd15-8g023nsw8cb3f68a

JWT_SECRET=请替换为长随机字符串

WECHAT_APPID=你的小程序 AppID
WECHAT_SECRET=你的小程序 Secret
WECHAT_SUBSCRIBE_TEMPLATE_ID=订阅消息模板 ID
SEMESTER_START_DATE=2026-03-16

ADMIN_EMAIL=478201690@qq.com
ADMIN_NAME=System Admin
ADMIN_PASSWORD_HASH=建议使用 bcrypt 哈希
```

说明：

- 线上现在支持 `admin_accounts` 数据表管理员体系
- `ADMIN_EMAIL / ADMIN_PASSWORD_HASH` 保留作兜底根账号配置
- 生产环境不要继续使用明文 `ADMIN_PASSWORD`

### 4.3 使用 PM2 启动

```bash
cd /www/wwwroot/course-reminder-miniprogram/backend
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

### 4.4 宝塔 Nginx 反代配置

在宝塔中新建站点，例如 `api.xxx.com`，反代到 `127.0.0.1:3000`。

示例：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 5. 部署管理后台

### 5.1 构建后台

```bash
cd /www/wwwroot/course-reminder-miniprogram/admin
npm install
```

如果你要指定线上 API 地址，先创建 `.env.production`：

```env
VITE_API_BASE_URL=https://api.xxx.com
```

然后构建：

```bash
npm run build
```

### 5.2 发布到宝塔站点

在宝塔中新建站点，例如 `admin.xxx.com`。

把构建产物：

- `admin/dist/`

复制到站点根目录。

如果是手动复制：

```bash
rm -rf /www/wwwroot/admin.xxx.com/*
cp -r /www/wwwroot/course-reminder-miniprogram/admin/dist/* /www/wwwroot/admin.xxx.com/
```

### 5.3 Nginx 单页应用配置

后台是 Vue Router history 模式，需要加回退：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## 6. CloudBase 数据库连接说明

本项目当前数据库不建议迁到本机 MySQL。

推荐做法：

- 宝塔服务器只运行 `backend/` 和静态后台
- 业务数据继续用 CloudBase MySQL
- 数据结构变更统一走仓库迁移文件与 CloudBase 校验

数据库开源结构见：

- [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)

## 7. 上线后验证

至少检查以下几项：

1. `https://api.xxx.com/admin/overview` 是否可返回 401 或正常数据
2. 管理员登录后能否看到完整菜单
3. 公告能否发布并在小程序显示
4. 反馈处理后，小程序通知中心是否可见
5. 课程提醒日志能否在后台打开

## 8. 更新部署

后端更新：

```bash
cd /www/wwwroot/course-reminder-miniprogram
git pull origin master
cd backend
npm install
npm run build
pm2 restart course-reminder-backend
```

后台更新：

```bash
cd /www/wwwroot/course-reminder-miniprogram/admin
npm install
npm run build
rm -rf /www/wwwroot/admin.xxx.com/*
cp -r dist/* /www/wwwroot/admin.xxx.com/
```

## 9. 云函数额外说明

如果你改了以下目录，宝塔部署并不会自动更新 CloudBase 云函数：

- `miniprogram/cloudfunctions/db-query/`
- `miniprogram/cloudfunctions/user-getOrCreate/`

这类改动仍需要单独重新部署到 CloudBase。
