# 课表提醒系统二次开发与维护总指南

最后更新：`2026-03-20`

这份文档不是项目宣传文档，而是给后续开发者、维护者、AI 编码代理直接接手项目使用的实战手册。目标只有一个：让后续接手者能在最短时间内分清楚当前主链路、关键配置入口、部署方式、数据库来源，以及在 CloudBase 和宝塔两种模式下分别应该改哪里。

如果你只看一份文档，优先看这份。

## 1. 文档适用范围

本指南覆盖以下场景：

- 在当前项目基础上继续开发功能
- 维护现有 CloudBase 小程序运行链路
- 把 `backend/` 和 `admin/` 部署到宝塔面板
- 把小程序逐步从 `wx.cloud` 改为自建 API
- 开源数据库结构但不带生产数据
- 给后续 AI / 外包 / 二开团队快速交接

## 2. 仓库结构与职责

### 2.1 目录说明

| 目录 | 作用 | 当前状态 |
| --- | --- | --- |
| `miniprogram/` | 微信小程序 | 仍是当前真实主前端 |
| `backend/` | NestJS API、管理端 API、提醒调度 | 当前可独立部署 |
| `admin/` | Vue 3 + Vite 管理后台 | 当前可独立部署 |
| `database/` | 开源数据库结构与迁移 SQL | 当前以 CloudBase 线上结构核对为准 |
| `docs/` | 开发、部署、接口、测试文档 | 部分新文档可用，部分旧文档已过时或乱码 |

### 2.2 当前推荐阅读顺序

1. `AGENTS.md`
2. `docs/secondary-development-guide.md`
3. `docs/developer-handoff.md`
4. `docs/api-reference.md`
5. `docs/database-open-source.md`
6. `docs/test-cases.md`

## 3. 先讲最重要的事实

### 3.1 当前线上真实环境

已核对 CloudBase 环境：

- `envId`: `dawdawd15-8g023nsw8cb3f68a`
- `alias`: `dawdawd15`
- `region`: `ap-shanghai`

`2026-03-20` 通过 `mcporter` 校验结果：

- 当前账号已登录 CloudBase
- 当前本地 CLI 处于“已登录但未绑定环境”状态
- 正式动 CloudBase 前必须先执行：

```bash
npx mcporter describe cloudbase
npx mcporter call cloudbase.auth action=status --output json
npx mcporter call cloudbase.auth action=set_env envId=dawdawd15-8g023nsw8cb3f68a --output json
npx mcporter call cloudbase.envQuery action=info --output json
```

### 3.2 线上数据库事实来源

这个项目最容易出问题的地方，是“本地以为的表结构”和“CloudBase 线上真实表结构”不一致。

因此必须遵守：

- 业务表结构以 CloudBase 线上 MySQL 为准
- `backend/src/**/*.entity.ts` 只能视为代码映射，不是最终事实
- `database/schema.sql` 是历史草稿，不能视为权威
- 改表前先看线上，再决定改代码还是改 SQL

推荐先执行：

```bash
npx mcporter call cloudbase.executeReadOnlySQL sql="SHOW TABLES" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE users" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE courses" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="SHOW CREATE TABLE announcements" --output json
```

### 3.3 已核对的核心业务表

当前业务上重点使用的表包括：

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

CloudBase 环境里还存在一些平台模板表，例如：

- `project_mgmt_tpl_*`
- `mid_project_*`

这些不是当前课表提醒系统的主业务表，二开时一般不用碰。

### 3.4 `synchronize` 已关闭

`backend/src/app.module.ts` 当前配置：

- `synchronize: false`

这意味着：

- TypeORM 不会自动帮你修线上表
- 加字段、改索引、建表后，必须自己维护 SQL
- 如果要开源数据库结构，也要同步更新 `database/open-source-schema.sql`

## 4. 当前真正生效的运行链路

这一节非常重要。因为仓库里同时存在“当前主链路代码”和“旧版/预留的 HTTP 化代码”，如果你改错地方，会出现“代码改了但功能没变”的假象。

### 4.1 小程序当前主链路

当前小程序主要还是走 `wx.cloud + 云函数 + db-query` 链路，而不是纯 HTTP API 链路。

当前主入口：

- `miniprogram/app.js`
  - 直接调用 `wx.cloud.init`
  - 当前写死了 CloudBase 环境 `dawdawd15-8g023nsw8cb3f68a`

当前登录主链路：

- `miniprogram/pages/login/login.js`
- `miniprogram/services/auth.js`
- `miniprogram/services/database.js`
- `miniprogram/cloudfunctions/login/`
- `miniprogram/cloudfunctions/user-getOrCreate/`

当前数据库查询主链路：

- `miniprogram/utils/cloud-db.js`
  - 封装 `wx.cloud.callFunction({ name: 'db-query' })`
- `miniprogram/cloudfunctions/db-query/`
  - 真正执行 SQL

当前仍在使用 `db-query` 的页面和功能包括但不限于：

- `miniprogram/pages/feedback/feedback.js`
- `miniprogram/pages/appeals/appeals.js`
- `miniprogram/pages/notes/notes.js`
- `miniprogram/pages/settings/settings.js`
- `miniprogram/utils/default-schedule-import.js`

### 4.2 小程序内保留但不是当前主链路的文件

仓库里还有一组“偏 HTTP API 风格”的文件，但当前页面并不是主要依赖它们：

- `miniprogram/services/auth.ts`
- `miniprogram/services/course.ts`
- `miniprogram/services/import.ts`
- `miniprogram/utils/request.ts`
- `miniprogram/config/index.js`

这些文件更像“未来彻底切换成 API 模式时可参考的骨架”，不是当前线上小程序主链路。

结论：

- 如果你在维护当前线上小程序，优先改 `app.js`、`services/auth.js`、`services/database.js`、`utils/cloud-db.js`、页面 JS、云函数
- 如果你想把小程序彻底改成自建 API 模式，才需要系统性改 `services/*.ts`、`utils/request.ts` 并替换页面调用

### 4.3 后端当前主链路

后端是标准 NestJS 项目。

关键入口：

- `backend/src/main.ts`
- `backend/src/app.module.ts`

当前职责：

- 提供管理后台 API
- 提供部分面向前端/小程序的 HTTP API
- 连接 MySQL
- 负责提醒调度
- 管理公告、内容页、治理、申诉、反馈、审计、管理员权限

### 4.4 管理后台当前主链路

管理后台是 `Vue 3 + Vite + Element Plus`。

关键入口：

- `admin/src/router/index.ts`
- `admin/src/utils/request.ts`
- `admin/src/utils/auth.ts`

当前行为：

- `VITE_API_BASE_URL` 决定请求指向哪个 API
- token 存储键名：
  - `admin_token`
  - `admin_profile`
- 登录后会请求 `/admin/profile` 同步角色和权限

## 5. 关键配置与修改入口总表

### 5.1 后端配置总表

| 位置 | 作用 | 什么时候改 |
| --- | --- | --- |
| `backend/.env.example` | 后端环境变量模板 | 新环境部署必改 |
| `backend/src/app.module.ts` | MySQL 连接、TypeORM 总配置 | 改数据库或 ORM 策略时改 |
| `backend/src/main.ts` | CORS、监听端口 | 改端口或中间件时改 |
| `backend/ecosystem.config.cjs` | PM2 启动配置 | 宝塔/PM2 部署时改 |
| `backend/deploy/nginx.course-reminder-backend.conf` | Nginx 反代示例 | 切域名或端口时改 |
| `backend/package.json` | 启动与构建脚本 | 需要新增脚本时改 |

### 5.2 后端环境变量说明

参考文件：

- `backend/.env.example`

重点变量：

| 变量 | 用途 | 必填 |
| --- | --- | --- |
| `PORT` | API 监听端口 | 是 |
| `DB_HOST` | MySQL 主机地址 | 是 |
| `DB_PORT` | MySQL 端口 | 是 |
| `DB_USERNAME` | MySQL 用户名 | 是 |
| `DB_PASSWORD` | MySQL 密码 | 是 |
| `DB_DATABASE` | 数据库名 | 是 |
| `JWT_SECRET` | 管理端和接口签名密钥 | 是 |
| `JWT_EXPIRES_IN` | JWT 过期时间 | 建议配置 |
| `WECHAT_APPID` | 小程序 AppID | 涉及微信能力时必填 |
| `WECHAT_SECRET` | 小程序密钥 | 涉及微信登录时必填 |
| `WECHAT_SUBSCRIBE_TEMPLATE_ID` | 订阅消息模板 ID | 提醒功能必填 |
| `SEMESTER_START_DATE` | 学期起始日期 | 课表提醒依赖 |
| `ADMIN_EMAIL` | 初始化超管邮箱 | 初始化环境时必填 |
| `ADMIN_NAME` | 初始化超管显示名 | 建议配置 |
| `ADMIN_PASSWORD_HASH` | 初始化超管密码哈希 | 正式环境建议只存哈希 |
| `OCR_API_URL` | OCR 服务地址 | 用到 OCR 时改 |
| `OCR_API_KEY` | OCR 服务密钥 | 用到 OCR 时改 |

注意：

- 当前 `.env.example` 同时保留了 `ADMIN_PASSWORD_HASH`
- 生产环境不要把明文密码写进仓库
- `JWT_SECRET` 变更后，旧 token 会全部失效

### 5.3 管理后台配置总表

| 位置 | 作用 | 什么时候改 |
| --- | --- | --- |
| `admin/.env.example` | 后台环境变量模板 | 新环境部署必改 |
| `admin/src/utils/request.ts` | API 请求基地址、401 处理 | 切 API 地址时改 |
| `admin/src/utils/auth.ts` | token / profile 缓存规则 | 改鉴权逻辑时改 |
| `admin/src/router/index.ts` | 页面路由和权限守卫 | 新增后台功能时改 |
| `admin/package.json` | `dev/build` 脚本 | 需要新增构建脚本时改 |
| `admin/vite.config.ts` | Vite 构建配置 | 改前端构建策略时改 |

后台当前环境变量：

| 变量 | 作用 |
| --- | --- |
| `VITE_API_BASE_URL` | 后台请求 API 域名或地址 |

### 5.4 小程序配置总表

| 位置 | 作用 | 什么时候改 |
| --- | --- | --- |
| `miniprogram/app.js` | `wx.cloud.init` 环境初始化 | 切 CloudBase 环境时改 |
| `miniprogram/project.config.json` | 小程序 AppID、CloudBase 环境 | 换小程序主体或换环境时改 |
| `miniprogram/utils/auth.js` | 小程序登录缓存键名 | 改登录态方案时改 |
| `miniprogram/utils/cloud-db.js` | 云函数 SQL 代理封装 | 当前主数据库入口 |
| `miniprogram/services/auth.js` | 当前登录主服务 | 当前登录逻辑改这里 |
| `miniprogram/services/database.js` | 云函数用户/存储封装 | 当前用户创建、上传主链路 |
| `miniprogram/config/index.js` | 预留的 API 基础配置 | 走 HTTP API 路线时改 |
| `miniprogram/utils/request.ts` | 预留 HTTP 请求封装 | 走 HTTP API 路线时改 |
| `miniprogram/services/auth.ts` | 预留 HTTP 登录服务 | 去 CloudBase 化时改 |
| `miniprogram/services/course.ts` | 预留 HTTP 课表服务 | 去 CloudBase 化时改 |
| `miniprogram/services/import.ts` | 预留 HTTP 导入服务 | 去 CloudBase 化时改 |
| `miniprogram/services/ocr.ts` | OCR 直连配置 | OCR 服务切换时改 |

### 5.5 云函数当前关键风险点

当前以下云函数里仍存在“数据库连接写死在代码里”的问题：

- `miniprogram/cloudfunctions/db-query/index.js`
- `miniprogram/cloudfunctions/user-getOrCreate/index.js`

当前写死内容包括：

- 数据库 host
- port
- user
- password
- database

这意味着：

- 如果你切换数据库实例，必须同步改云函数源码
- 改完本地代码不代表线上立即生效，还要重新部署云函数
- 如果要开源给别人二开，强烈建议后续改造成环境变量读取，而不是把数据库信息写在源码里

## 6. 当前管理员体系说明

当前管理员不是单一 `role` 判断，而是三层共同作用：

- `role`
- `status`
- `permission_json`

重点规则：

- 默认超管账号禁止在后台被降权或停用
- 管理员不能把自己降权或停用
- 登录后会通过 `/admin/profile` 拉取实际权限
- 前端本地缓存键是 `admin_profile`

如果二开权限体系，优先改这些地方：

- `admin_accounts` 表结构
- 后端管理员权限校验逻辑
- `GET /admin/profile`
- `admin/src/utils/auth.ts`
- `admin/src/router/index.ts`

## 7. 本地开发与联调方式

### 7.1 后端本地启动

```bash
cd backend
npm install
npm run build
npm run start:dev
```

默认监听：

- `http://localhost:3000`

### 7.2 后台本地启动

```bash
cd admin
npm install
npm run build
npm run dev
```

默认访问：

- `http://localhost:5173`

### 7.3 小程序本地调试

使用微信开发者工具打开：

- `E:\codebese1\miniprogram`

启动前重点确认：

- `miniprogram/project.config.json` 里的 `appid`
- `miniprogram/project.config.json` 里的 `cloudenv`
- `miniprogram/app.js` 里的 `wx.cloud.init({ env })`

## 8. CloudBase 模式下的推荐维护方式

这个项目当前最稳定的方式，仍然是：

- 小程序继续使用 `wx.cloud`
- 云函数继续负责登录和 SQL 代理
- 后端和后台可以独立运行
- 数据库以 CloudBase MySQL 为主库

### 8.1 适合这种模式的场景

- 你要快速维护现有小程序
- 你不想重写小程序登录和数据库调用
- 你要继续使用 CloudBase 提供的云函数和云存储

### 8.2 这条链路下应该改哪里

如果要维护小程序业务：

- 页面逻辑：改 `miniprogram/pages/**`
- 登录逻辑：改 `miniprogram/pages/login/login.js` 与 `miniprogram/services/auth.js`
- SQL 查询能力：改 `miniprogram/utils/cloud-db.js`
- 云函数数据库执行：改 `miniprogram/cloudfunctions/db-query/index.js`
- 用户首次创建逻辑：改 `miniprogram/cloudfunctions/user-getOrCreate/index.js`

### 8.3 改完哪些文件后必须重新部署云函数

只要改了以下目录，就必须重新部署：

- `miniprogram/cloudfunctions/db-query/`
- `miniprogram/cloudfunctions/user-getOrCreate/`
- `miniprogram/cloudfunctions/login/`
- `miniprogram/cloudfunctions/parse-schedule/`

### 8.4 CloudBase 模式维护清单

每次动 CloudBase 前建议按这个顺序：

1. 执行 `mcporter` 绑定环境
2. `SHOW TABLES`
3. `DESCRIBE` 目标表
4. 再改代码
5. 改完如果涉及云函数，重新部署云函数
6. 在小程序端重新真机验证

## 9. 宝塔部署模式说明

这里单独讲“后端 API + 管理后台”部署到宝塔面板的方案。

### 9.1 适合的场景

- 你有自己的服务器
- 想把 `backend/` 和 `admin/` 独立部署
- 想通过域名提供管理后台和 API
- 小程序可以继续留在 CloudBase，也可以后续逐步迁移到自建 API

### 9.2 宝塔部署的推荐拆分

推荐拆成两个站点：

1. API 站点
   - 对应 `backend/`
   - PM2 常驻
   - Nginx 反向代理到 Node 端口

2. 管理后台站点
   - 对应 `admin/`
   - 构建后部署静态文件
   - Nginx 直接托管 `dist/`

### 9.3 宝塔部署后端步骤

#### 第一步：准备环境

宝塔面板建议安装：

- Nginx
- Node.js 18 或以上
- PM2
- MySQL 8.x

#### 第二步：上传代码

上传或拉取仓库到服务器，例如：

- `/www/wwwroot/course-reminder`

#### 第三步：安装依赖并构建

```bash
cd /www/wwwroot/course-reminder/backend
npm install
npm run build
```

#### 第四步：创建后端环境变量

在 `backend/` 目录新建 `.env`，参考：

- `backend/.env.example`

你至少要填：

```env
NODE_ENV=production
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你的数据库密码
DB_DATABASE=course_reminder
JWT_SECRET=你自己的长随机串
WECHAT_APPID=你的小程序appid
WECHAT_SECRET=你的小程序secret
WECHAT_SUBSCRIBE_TEMPLATE_ID=模板id
SEMESTER_START_DATE=2026-03-16
ADMIN_EMAIL=你的超管邮箱
ADMIN_NAME=Super Admin
ADMIN_PASSWORD_HASH=你的密码哈希
```

#### 第五步：用 PM2 启动

可直接使用：

- `backend/ecosystem.config.cjs`

启动命令：

```bash
cd /www/wwwroot/course-reminder/backend
pm2 start ecosystem.config.cjs
pm2 save
```

如果你不用 `ecosystem.config.cjs`，也可以直接：

```bash
cd /www/wwwroot/course-reminder/backend
pm2 start dist/main.js --name course-reminder-backend
pm2 save
```

#### 第六步：配置 Nginx 反代

示例参考：

- `backend/deploy/nginx.course-reminder-backend.conf`

你需要把：

- `server_name api.your-domain.com`

改成你自己的域名，例如：

- `api.example.com`

核心逻辑是把请求转发到：

- `http://127.0.0.1:3000`

### 9.4 宝塔部署管理后台步骤

#### 第一步：配置 API 地址

在后台项目目录设置环境变量文件，参考：

- `admin/.env.example`

例如：

```env
VITE_API_BASE_URL=https://api.example.com
```

#### 第二步：安装依赖并构建

```bash
cd /www/wwwroot/course-reminder/admin
npm install
npm run build
```

构建产物目录：

- `admin/dist/`

#### 第三步：宝塔创建静态站点

新建站点，例如：

- `admin.example.com`

站点根目录指向：

- `/www/wwwroot/course-reminder/admin/dist`

#### 第四步：配置历史路由回退

因为后台是 Vue Router history 模式，Nginx 要加回退：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

否则刷新子页面会 404。

### 9.5 宝塔部署数据库该导入哪个文件

如果你在新环境初始化数据库，优先使用：

- `database/open-source-schema.sql`

如果你需要补当前治理/消息中心这一轮结构，再执行：

- `database/migrations/2026-03-19-add-governance-batch-messages.sql`

不要把这些旧文件当作主初始化文件：

- `database/schema.sql`
- `database/course_templates.sql`
- `database/notes.sql`

原因：

- 这些文件是历史阶段产物
- 不是当前线上完整事实来源
- 容易造成表结构不一致

### 9.6 宝塔模式下，小程序是否必须改

分两种情况：

#### 情况 A：只把后端和后台搬到宝塔，小程序仍继续使用 CloudBase

这时小程序通常不需要大改。

仍然走：

- `wx.cloud.init`
- `login` 云函数
- `user-getOrCreate` 云函数
- `db-query` 云函数

你要改的主要是：

- 后端 `.env`
- 后台 `VITE_API_BASE_URL`
- 服务器数据库连接

#### 情况 B：你要把小程序也逐步改成“全部走自建 API”

这时才需要系统性改小程序代码，详见第 10 节。

## 10. 小程序去 CloudBase 化改造指南

这一节专门写给想把小程序迁移到“自建 API + 宝塔后端”的二开团队。

### 10.1 改造目标

把当前依赖：

- `wx.cloud.init`
- `wx.cloud.callFunction`
- `wx.cloud.uploadFile`

的链路，替换成：

- `wx.login + 自建后端登录`
- `wx.request`
- `wx.uploadFile` 上传到自建服务或对象存储

### 10.2 必改文件清单

#### 1. CloudBase 初始化

文件：

- `miniprogram/app.js`
- `miniprogram/project.config.json`

需要处理：

- 移除或停用 `wx.cloud.init`
- `project.config.json` 中保留 `appid`，但 `cloudenv` 可不再作为业务依赖

#### 2. 小程序登录链路

当前主链路文件：

- `miniprogram/pages/login/login.js`
- `miniprogram/services/auth.js`
- `miniprogram/services/database.js`
- `miniprogram/cloudfunctions/login/index.js`
- `miniprogram/cloudfunctions/user-getOrCreate/index.js`

迁移目标：

- 用 `wx.login` 获取 `code`
- 后端提供 `POST /auth/wechat-login`
- 后端根据 `code` 换取 openid/session
- 后端签发你自己的业务 token

如果完全切 API，建议把页面统一迁到：

- `miniprogram/services/auth.ts`
- `miniprogram/utils/request.ts`

并逐步让页面不再依赖 `services/auth.js`

#### 3. 数据查询链路

当前主链路文件：

- `miniprogram/utils/cloud-db.js`
- `miniprogram/cloudfunctions/db-query/index.js`

这套链路本质是“小程序通过云函数转发 SQL”，如果你要去 CloudBase，必须替换。

建议做法：

- 停止在前端拼 SQL
- 由后端提供明确 REST API
- 小程序页面改调用 `request('/xxx')`

重点需要重构的页面：

- `miniprogram/pages/feedback/feedback.js`
- `miniprogram/pages/appeals/appeals.js`
- `miniprogram/pages/notes/notes.js`
- `miniprogram/pages/settings/settings.js`
- 其他所有依赖 `callDbQuery` 的页面

#### 4. 文件上传链路

当前主链路：

- `wx.cloud.uploadFile`
- `miniprogram/services/database.js`
- `miniprogram/pages/notes/notes.js`

去 CloudBase 后，你要选择新的存储方式：

- 后端本地存储
- COS
- OSS
- S3
- 七牛云

改造时至少要改：

- 上传接口地址
- 文件返回 URL 结构
- 数据库存储字段内容

#### 5. OCR 链路

相关文件：

- `miniprogram/services/ocr.ts`
- `miniprogram/config/index.js`
- `backend/src/import/ocr.service.ts`

当前现状：

- 小程序 `ocr.ts` 里仍有硬编码第三方地址和默认 key
- 后端 OCR 服务偏 stub/mock 性质

建议二开时统一成“后端代理 OCR”，不要把第三方密钥放在小程序。

### 10.3 去 CloudBase 后建议保留的抽象

建议不要让页面直接写请求细节，而是按层分离：

1. `utils/request.ts`
   - 只负责统一域名、header、token、错误处理

2. `services/*.ts`
   - 每个业务模块单独维护 API

3. `pages/**`
   - 只负责页面状态和交互

### 10.4 去 CloudBase 后最少要改的配置

#### 小程序端

至少要改这些文件：

- `miniprogram/utils/request.ts`
  - 把 `BASE_URL` 改成你自己的 API 域名
- `miniprogram/config/index.js`
  - 把 `apiBaseUrl` 改成你的 API 域名
- `miniprogram/services/import.ts`
  - 把上传地址 `https://your-api-domain.com/import/upload` 改成真实地址
- `miniprogram/services/auth.ts`
  - 对齐实际登录接口
- `miniprogram/services/course.ts`
  - 对齐实际课表接口

#### 微信后台

还要同步做：

- 在微信小程序后台配置合法 request 域名
- 配置合法 uploadFile 域名
- 如果使用下载资源，也要配置 download 域名

### 10.5 推荐迁移顺序

不要一次性全改，建议分阶段：

1. 先让后台和 API 独立运行
2. 先把管理后台全部切到自建 API
3. 小程序先保留 CloudBase 登录和数据库
4. 再逐页把小程序功能改成 HTTP API
5. 最后再移除云函数

这样风险最低。

## 11. 数据库开源与新环境初始化指南

### 11.1 哪个文件是推荐初始化文件

推荐：

- `database/open-source-schema.sql`

增量迁移：

- `database/migrations/2026-03-19-add-governance-batch-messages.sql`

### 11.2 不应该直接导入的历史文件

- `database/schema.sql`
- `database/course_templates.sql`
- `database/notes.sql`

### 11.3 新环境初始化顺序

推荐顺序：

1. 创建空数据库
2. 导入 `database/open-source-schema.sql`
3. 执行 `database/migrations/` 下需要的迁移
4. 手动初始化超管账号
5. 填写后端 `.env`
6. 启动后端
7. 启动后台
8. 用后台验证权限、公告、内容页、反馈、申诉等功能

### 11.4 开源时不要提交什么

不要提交：

- 任何生产数据
- 用户头像、隐私资料、反馈正文、申诉正文
- 云函数里硬编码的真实生产密码
- 实际 `JWT_SECRET`
- 实际微信 `secret`

## 12. 二开新增功能时的改动原则

### 12.1 新增后台功能

一般需要同时改四层：

1. 数据库表或字段
2. 后端模块、控制器、服务
3. 管理后台页面与路由
4. 权限点与审计日志

### 12.2 新增小程序功能

先判断自己走哪条链路：

#### 如果仍走 CloudBase 主链路

一般要改：

- 页面
- `services/auth.js` 或 `services/database.js`
- `utils/cloud-db.js`
- 必要时改云函数

#### 如果已走自建 API

一般要改：

- `utils/request.ts`
- 对应 `services/*.ts`
- 页面
- 后端 API

### 12.3 涉及权限治理时

要一起考虑：

- `admin_accounts.permission_json`
- 后台路由 meta 权限
- 后端接口权限校验
- 审计日志
- 是否需要高风险二次确认

## 13. 常见坑位与排查建议

### 13.1 改了小程序 API 文件但页面没生效

大概率原因：

- 你改的是 `miniprogram/services/*.ts`
- 但页面实际还在走 `services/auth.js` 或 `utils/cloud-db.js`

先确认页面真实 import 的文件。

### 13.2 改了云函数代码但线上没变

大概率原因：

- 本地改完没有重新部署 CloudBase 云函数

### 13.3 后台刷新后 401 或反复回登录页

重点排查：

- `VITE_API_BASE_URL` 是否指向正确环境
- 后端 `JWT_SECRET` 是否变化
- 浏览器本地 `admin_token` 是否是旧 token
- `/admin/profile` 是否正常

### 13.4 宝塔部署后台刷新子路由 404

原因：

- 没有配置 `try_files $uri $uri/ /index.html;`

### 13.5 小程序仍显示旧 CloudBase 环境

重点排查：

- `miniprogram/app.js`
- `miniprogram/project.config.json`

### 13.6 数据结构和代码不一致

优先排查顺序：

1. `SHOW CREATE TABLE`
2. `DESCRIBE`
3. `database/open-source-schema.sql`
4. 后端实体

不要反过来。

## 14. 推荐发布与交接清单

### 14.1 每次发版前

- 确认数据库结构是否有变化
- 确认迁移 SQL 是否补齐
- 确认接口文档是否补齐
- 确认测试用例文档是否更新
- 如果改了云函数，确认是否已部署
- 如果改了后台域名，确认 `VITE_API_BASE_URL`
- 如果改了 JWT，确认已重新登录验证

### 14.2 每次交接给下一位开发者前

- 更新这份文档
- 更新 `docs/developer-handoff.md`
- 如果数据库结构变了，更新 `database/open-source-schema.sql`
- 如果部署方式变了，补充宝塔或 CloudBase 的实际步骤

## 15. 当前仓库里最值得信任的文件

优先相信：

- `AGENTS.md`
- `docs/secondary-development-guide.md`
- `docs/developer-handoff.md`
- `docs/api-reference.md`
- `docs/database-open-source.md`
- `database/open-source-schema.sql`
- `backend/.env.example`
- `admin/.env.example`

谨慎对待：

- 旧 README 历史版本
- 旧部署文档
- `database/schema.sql`
- 小程序里未被页面主链路引用的 TS 服务文件

## 16. 一句话结论

这个项目后续二开的核心不是“会不会写代码”，而是“先分清楚当前到底是哪条链路在跑、数据库真实结构在哪、你到底该改哪个文件”。先核实，再开发，成功率会高很多。
