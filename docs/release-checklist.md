# 上线检查清单

最后更新：`2026-03-19`

这份清单给当前项目的后续开发者、运维和 AI 使用。目标不是讲原理，而是提供一份能直接照着执行的发布前后核对单，尽量避免因为 CloudBase 线上环境、云函数或权限配置遗漏而导致上线后才发现问题。

## 1. 发布前准备

发布前先确认这 5 件事：

1. 代码已经合并到准备发布的分支，并且 `git status --short` 为空或只包含你明确知道的变更。
2. 本次是否涉及 `backend/`、`admin/`、`miniprogram/cloudfunctions/`、数据库结构、CloudBase 权限规则。
3. 本次是否修改了环境变量，例如 `JWT_SECRET`、数据库连接、`VITE_API_BASE_URL`、微信配置。
4. 本次是否需要同步更新开源结构文档：
   - [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)
   - [docs/database-open-source.md](/E:/codebese1/docs/database-open-source.md)
5. 本次是否需要单独重新部署 CloudBase 云函数。

## 2. CloudBase 环境核验

发布前不要凭记忆判断环境，先执行：

```bash
npx mcporter describe cloudbase
npx mcporter call cloudbase.auth action=status --output json
npx mcporter call cloudbase.auth action=set_env envId=dawdawd15-8g023nsw8cb3f68a --output json
npx mcporter call cloudbase.envQuery action=info --output json
```

至少确认以下事实：

- 当前环境仍然是 `dawdawd15-8g023nsw8cb3f68a`
- Region 仍然是 `ap-shanghai`
- 当前账号有权限访问 CloudBase MySQL

## 3. 数据库结构核验

当前项目的高风险点不是“代码是否能编译”，而是“本地认知是否和线上真实结构一致”。

发布前建议执行：

```bash
npx mcporter call cloudbase.executeReadOnlySQL sql="SHOW TABLES" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE users" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE courses" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE user_subscriptions" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE admin_accounts" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE announcements" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE content_pages" --output json
```

如果这次发布涉及笔记、举报、反馈、提醒或分享，再额外核对：

```bash
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE notes" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE note_shares" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE content_reports" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE user_feedback" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE reminders" --output json
npx mcporter call cloudbase.executeReadOnlySQL sql="DESCRIBE reminder_send_logs" --output json
```

核验原则：

- 不要只看 `database/schema.sql`
- 不要只看实体类
- 不要在不确认线上结构的情况下直接相信 `TypeORM synchronize`

## 4. 后端发布前检查

进入后端目录后执行：

```bash
cd E:\codebese1\backend
npm install
npm run build
```

需要重点确认：

- [backend/.env.example](/E:/codebese1/backend/.env.example) 中新增的变量是否已经同步到服务器
- 生产环境 `.env` 是否正确设置 `JWT_SECRET`
- 数据库连接是否仍然指向 CloudBase 当前生产库
- 如为生产发布，是否需要关闭 `synchronize`

建议上线前核对的关键变量：

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

## 5. 管理台发布前检查

进入管理台目录后执行：

```bash
cd E:\codebese1\admin
npm install
npm run build
```

上线前确认：

- `VITE_API_BASE_URL` 指向的是当前线上 API 域名
- 登录页不应预填真实管理员账号密码
- 左侧菜单、滚动和权限裁剪在本地联调时正常
- 管理员登录后能正常跳转到 `/overview` 并刷新 `/admin/profile`

## 6. 云函数额外检查

如果本次发布改动了以下目录，宝塔上重新部署 `backend/` 和 `admin/` 并不会自动生效：

- `miniprogram/cloudfunctions/db-query/`
- `miniprogram/cloudfunctions/user-getOrCreate/`

这类改动必须单独重新部署到 CloudBase。

特别提醒：

- `db-query` 云函数属于高风险入口
- 如果改了 SQL、字段名、表名、调用参数或登录校验，必须重新部署并单独回归

## 7. 宝塔部署步骤核对

如果本次要实际发版到宝塔，建议按以下顺序：

1. 服务器拉取最新代码：

```bash
cd /www/wwwroot/course-reminder-miniprogram
git pull origin master
```

2. 部署后端：

```bash
cd /www/wwwroot/course-reminder-miniprogram/backend
npm install
npm run build
pm2 restart course-reminder-backend
```

3. 部署管理台：

```bash
cd /www/wwwroot/course-reminder-miniprogram/admin
npm install
npm run build
rm -rf /www/wwwroot/admin.xxx.com/*
cp -r dist/* /www/wwwroot/admin.xxx.com/
```

详细步骤见：

- [docs/backend-deployment.md](/E:/codebese1/docs/backend-deployment.md)
- [backend/README.md](/E:/codebese1/backend/README.md)

## 8. 上线后冒烟检查

至少手工走完下面这些链路：

1. 后台登录页可以正常登录，登录成功后会跳转到总览页。
2. 打开后台后左侧菜单可以滚动，不会卡死。
3. `/admin/profile` 返回的角色和权限正确，菜单数量与权限一致。
4. 公告可以新增、编辑、删除，刷新后不丢失。
5. 小程序端可以正常读取当前公告。
6. “关于我们”等内容页能在后台修改并在前台生效。
7. 用户反馈可以提交，后台可以看到并处理。
8. 举报记录、笔记审核、分享审核等页面能正常打开并执行操作。
9. 提醒日志和订阅列表能正常读取。
10. 超级管理员账号不能被后台降权或停用。

## 9. 回滚原则

如果上线后出现严重问题，按下面顺序处理：

1. 先确认是前端问题、后端问题、云函数问题还是数据库问题。
2. 如果是前端静态资源问题，优先回滚 `admin/dist`。
3. 如果是后端 API 问题，优先回滚 `backend` 对应版本并重启 PM2。
4. 如果是云函数问题，回滚 CloudBase 云函数到上一个稳定版本。
5. 如果是数据库结构问题，不要直接在生产库上临时手改，先核对变更脚本和真实表结构。

## 10. 这次项目最容易漏掉的点

- 只更新了仓库代码，没有重新部署 CloudBase 云函数
- 只改了本地实体，没有核对 CloudBase 线上表结构
- 改了 `JWT_SECRET` 或 token 逻辑，但浏览器里还保留旧 token，导致 `invalid signature`
- 更新了管理员权限，却忘了刷新 `/admin/profile`
- 只发布了后台页面，没有同步发布 API
- 发布后没有验证公告、内容页、反馈和审核链路

## 11. 推荐搭配阅读

- [docs/developer-handoff.md](/E:/codebese1/docs/developer-handoff.md)
- [docs/api-reference.md](/E:/codebese1/docs/api-reference.md)
- [docs/admin-permission-matrix.md](/E:/codebese1/docs/admin-permission-matrix.md)
- [docs/backend-deployment.md](/E:/codebese1/docs/backend-deployment.md)
