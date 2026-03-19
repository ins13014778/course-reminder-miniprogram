# 开发交接文档

最后更新：`2026-03-19`

这份文档给后续开发者和 AI 使用，目标是帮助接手者快速进入“当前真实可开发状态”。

## 1. 项目组成

- `miniprogram/`：微信小程序
- `backend/`：NestJS 后端与提醒调度
- `admin/`：Vue 3 + Vite 管理后台
- `database/`：迁移文件与开源数据库结构
- `docs/`：交接、API、部署、测试文档

## 2. 真实环境

- CloudBase `envId`：`dawdawd15-8g023nsw8cb3f68a`
- CloudBase `alias`：`dawdawd15`
- Region：`ap-shanghai`
- 小程序 `cloudenv` 已指向上述环境

涉及 CloudBase 时，先执行：

```bash
npx mcporter describe cloudbase
npx mcporter call cloudbase.auth action=status --output json
npx mcporter call cloudbase.auth action=set_env envId=dawdawd15-8g023nsw8cb3f68a --output json
npx mcporter call cloudbase.envQuery action=info --output json
```

## 3. 当前数据库现状

`2026-03-19` 实查线上存在以下表：

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

开源结构文件见：

- [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)

数据库说明见：

- [database-open-source.md](./database-open-source.md)

## 4. 当前关键能力

### 4.1 小程序

- 微信登录
- 课表查看与编辑
- 课表冲突检测
- 课表分享导入
- 笔记发布
- 举报
- 留言反馈
- 内容页读取
- 公告读取
- 通知中心查看反馈处理结果

### 4.2 后端

- 管理员登录
- 管理员资料同步
- 角色与细粒度权限控制
- 用户封号、笔记权限封禁、分享权限封禁
- 课表查询与删除
- 笔记审核
- 笔记分享管理
- 举报处理
- 反馈处理
- 公告管理
- 内容页管理
- 提醒调度与发送日志
- 审计日志

### 4.3 管理后台

- 总览
- 用户治理
- 课表巡检
- 模板课表
- 分享密钥管理
- 订阅提醒
- 提醒日志
- 笔记审核
- 笔记分享
- 内容举报
- 留言反馈
- 公告运营
- 页面配置
- 审计日志
- 管理员账号与权限分配

## 5. 当前管理员权限机制

当前管理员体系不是只靠角色判断，还包括细粒度权限字段：

- 字段：`admin_accounts.permission_json`
- 角色：`super_admin / operator / moderator / support`
- 细粒度权限例如：
  - `user.view`
  - `user.ban`
  - `course.view`
  - `course.manage`
  - `note.moderate`
  - `report.review`
  - `feedback.review`
  - `announcement.manage`
  - `content.manage`
  - `audit.view`
  - `admin.manage`

额外保护：

- 系统默认超管账号禁止在后台降权或停用
- 管理员不能在后台把自己降权或停用
- 登录后后台会自动拉取当前最新管理员资料，避免旧缓存导致菜单缺失

## 6. 本地启动

后端：

```powershell
cd E:\codebese1\backend
npm install
npm run build
npm run start:dev
```

后台：

```powershell
cd E:\codebese1\admin
npm install
npm run build
npm run dev
```

## 7. 环境变量

后端主要环境变量见：

- [backend/.env.example](/E:/codebese1/backend/.env.example)

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

前端主要环境变量：

- `VITE_API_BASE_URL`

## 8. 最容易踩坑的点

### 8.1 不要只改本地代码

如果改的是：

- `miniprogram/cloudfunctions/`
- 数据库表结构
- CloudBase 权限规则

那只改仓库代码并不等于线上生效。

### 8.2 不要只看旧文档和旧 schema

旧版 `README.md`、旧部署文档、旧 SQL 草稿都不能直接作为事实来源。

### 8.3 数据库变更后要同步开源结构

如果后续继续加表或改表，记得同步更新：

- [database/open-source-schema.sql](/E:/codebese1/database/open-source-schema.sql)
- [docs/database-open-source.md](./database-open-source.md)

### 8.4 后台菜单缺失通常不是功能没了

优先检查：

- 当前登录管理员角色
- `permission_json`
- 浏览器缓存中的旧 `admin_profile`
- `/admin/profile` 返回是否正确

## 9. 推荐阅读顺序

1. 本文档
2. [API 接口文档](./api-reference.md)
3. [数据库开源结构说明](./database-open-source.md)
4. [宝塔部署教程](./backend-deployment.md)
5. [测试用例文档](./test-cases.md)

## 10. 一句话建议

这个项目最重要的不是“先写代码”，而是先确认你要改的是：

- 小程序页面
- CloudBase 云函数
- 后端 API
- 管理后台
- 还是 CloudBase 线上真实数据库

确认链路，再动手，返工会少很多。
