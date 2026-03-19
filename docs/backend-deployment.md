# 宝塔部署教程

最后更新：`2026-03-19`

本文档专门说明两件事：

- 宝塔上后端 API 到底部署哪一部分代码
- 数据库到底该导入哪个 `.sql` 文件

## 1. 推荐部署拓扑

推荐拆成两个站点：

1. `api.xxx.com` 指向 `backend/`
2. `admin.xxx.com` 指向 `admin/`

业务数据库继续使用 CloudBase MySQL，不建议把当前生产业务数据迁到宝塔本机 MySQL。

## 2. 服务器准备

建议环境：

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

## 4. 后端 API 部署

### 4.1 API 部署代码在哪里

宝塔部署的 API 代码就在：

- [backend/](/E:/codebese1/backend)

其中和部署最相关的文件是：

- [backend/package.json](/E:/codebese1/backend/package.json)
  作用：定义 `npm run build`、`npm run start:prod`
- [backend/ecosystem.config.cjs](/E:/codebese1/backend/ecosystem.config.cjs)
  作用：PM2 配置文件，当前启动入口配置为 `dist/main.js`
- [backend/src/main.ts](/E:/codebese1/backend/src/main.ts)
  作用：NestJS 源码入口
- [backend/dist/main.js](/E:/codebese1/backend/dist/main.js)
  作用：执行构建后生成的生产启动文件

实际部署链路是：

1. 拉取整个 [backend/](/E:/codebese1/backend)
2. 执行 `npm install`
3. 执行 `npm run build`
4. 产出 `backend/dist/main.js`
5. 由 PM2 通过 [backend/ecosystem.config.cjs](/E:/codebese1/backend/ecosystem.config.cjs) 启动

### 4.2 安装与构建

```bash
cd /www/wwwroot/course-reminder-miniprogram/backend
npm install
npm run build
```

### 4.3 配置环境变量

复制环境变量模板：

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

- 当前线上管理员体系已经使用 `admin_accounts`
- `ADMIN_EMAIL / ADMIN_PASSWORD_HASH` 主要作为兜底初始化配置
- 生产环境不要继续使用明文 `ADMIN_PASSWORD`

### 4.4 使用 PM2 启动

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

如果你想确认宝塔上 API 到底跑的是哪个文件，可以看：

```bash
cat /www/wwwroot/course-reminder-miniprogram/backend/ecosystem.config.cjs
```

当前关键配置是：

```js
script: 'dist/main.js'
```

所以线上 API 的启动入口是：

- [backend/dist/main.js](/E:/codebese1/backend/dist/main.js)

### 4.5 宝塔 Nginx 反代配置

在宝塔中新增站点，例如 `api.xxx.com`，反代到 `127.0.0.1:3000`。

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

## 5. 管理后台部署

### 5.1 构建后台

```bash
cd /www/wwwroot/course-reminder-miniprogram/admin
npm install
```

如需指定线上 API 地址，先创建 `.env.production`：

```env
VITE_API_BASE_URL=https://api.xxx.com
```

然后构建：

```bash
npm run build
```

### 5.2 发布到宝塔站点

在宝塔中新增站点，例如 `admin.xxx.com`。

把构建产物：

- [admin/dist/](/E:/codebese1/admin/dist)

复制到站点根目录。

手动复制示例：

```bash
rm -rf /www/wwwroot/admin.xxx.com/*
cp -r /www/wwwroot/course-reminder-miniprogram/admin/dist/* /www/wwwroot/admin.xxx.com/
```

### 5.3 Nginx 单页应用配置

后台使用 Vue Router history 模式，需要回退配置：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## 6. 数据库到底导入哪些文件

### 6.1 如果你接的是当前 CloudBase 线上库

这种情况：

- 不需要导入任何本地 `.sql` 文件
- 只需要把 [backend/.env.example](/E:/codebese1/backend/.env.example) 对应变量填到生产 `.env`
- 后端直接连接 CloudBase MySQL

也就是说，宝塔服务器只负责跑 API 和后台页面，不负责“恢复当前线上数据库数据”。

### 6.2 如果你是新建一套空数据库

只推荐先导入：

- [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)

这个文件是当前仓库里唯一推荐的完整建表文件，来源于 `2026-03-19` 的 CloudBase 线上真实结构快照，不包含生产数据。

### 6.3 `database/` 目录每个 SQL 文件的用途

- [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)
  用途：完整空库建表，推荐导入
- [database/schema.sql](/E:/codebese1/database/schema.sql)
  用途：历史草稿，不推荐直接导入
- [database/course_templates.sql](/E:/codebese1/database/course_templates.sql)
  用途：早期模板课表脚本，含模板数据，不推荐直接导入生产
- [database/notes.sql](/E:/codebese1/database/notes.sql)
  用途：早期 `notes` 单表脚本，不能当完整初始化文件

结论：

- 要新建完整空库，导 `open-source-schema.sql`
- 不要把 `schema.sql` 当成当前真实表结构
- 不要把 `course_templates.sql`、`notes.sql` 当成整库初始化脚本

### 6.4 推荐导库顺序

如果你要自建数据库，建议顺序如下：

1. 新建空数据库
2. 导入 [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)
3. 手动创建你的管理员账号
4. 配置后端 `.env`
5. 启动 API
6. 验证 `/admin/login`、`/admin/profile`

如果你后面确实要补充模板课表数据，不要直接执行旧的 [database/course_templates.sql](/E:/codebese1/database/course_templates.sql)，先核对字段是否与当前真实表结构一致，再决定是否整理后导入。

## 7. 上线后验证

至少检查以下几项：

1. `https://api.xxx.com/admin/overview` 能返回 `401` 或正常数据
2. 管理员登录后能看到正确菜单
3. 公告可以发布并在小程序显示
4. 内容页修改后前台能读取到最新内容
5. 反馈处理后小程序通知中心能看到结果
6. 提醒日志页面可以打开

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

这类改动仍然需要单独重新部署到 CloudBase。
