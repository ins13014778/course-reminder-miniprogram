# 开发交接文档

最后更新：`2026-03-19`

这份文档给后续开发者和 AI 使用，目标不是介绍项目，而是帮助接手者快速进入真实可开发状态。

## 1. 项目组成

- `miniprogram/`：微信小程序
- `backend/`：NestJS 后端
- `admin/`：Vue 3 + Vite 管理后台
- `database/`：开源数据库结构与历史 SQL
- `docs/`：开发、部署、接口、测试文档

## 2. CloudBase 真实环境

- `envId`: `dawdawd15-8g023nsw8cb3f68a`
- `alias`: `dawdawd15`
- `region`: `ap-shanghai`

涉及 CloudBase 前，优先执行：

```bash
npx mcporter describe cloudbase
npx mcporter call cloudbase.auth action=status --output json
npx mcporter call cloudbase.auth action=set_env envId=dawdawd15-8g023nsw8cb3f68a --output json
npx mcporter call cloudbase.envQuery action=info --output json
```

## 3. 当前线上关键表

已核实线上存在以下表：

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
- `user_appeals`
- `user_feedback`
- `user_subscriptions`
- `users`

## 4. 当前已落地的关键能力

### 4.1 小程序

- 微信登录
- 课表查看、编辑、导入、冲突检测
- 笔记发布与分享
- 举报提交
- 留言反馈
- 公告读取
- 内容页读取
- 通知中心
- 申诉中心

### 4.2 后端

- 管理员登录与权限同步
- 用户权限封禁控制
- 课表查询与删除
- 笔记审核
- 举报审核
- 留言反馈审核
- 公告管理
- 内容页管理
- 管理员账号与权限管理
- 用户申诉审核

### 4.3 管理后台

- 总览
- 用户管理
- 课表巡检
- 模板课表
- 分享密钥管理
- 订阅提醒
- 提醒日志
- 笔记审核
- 笔记分享
- 内容举报
- 用户申诉
- 留言反馈
- 公告运营
- 页面配置
- 审计日志
- 管理员账号与权限分配

## 5. 当前申诉系统状态

`2026-03-19` 已完成：

- 小程序新增 [appeals.js](/E:/codebese1/miniprogram/pages/appeals/appeals.js)
- 小程序个人中心已接入“申诉中心”入口
- 小程序通知中心已展示申诉审核结果
- 后台新增 `/admin/appeals`
- 后台新增 `PATCH /admin/appeals/:id/review`
- 后台权限新增：
  - `appeal.view`
  - `appeal.review`
- CloudBase 线上已创建 `user_appeals` 表
- 开源 SQL 已同步 `user_appeals`

## 6. 本地启动方式

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

## 7. 环境变量重点

后端参考：

- [backend/.env.example](/E:/codebese1/backend/.env.example)

重点变量：

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
- `ADMIN_PASSWORD`
- `ADMIN_PASSWORD_HASH`

后台重点变量：

- `VITE_API_BASE_URL`

## 8. 容易踩坑的地方

### 8.1 不要只看本地 entity

不要只相信：

- `backend/src/common/entities/*.entity.ts`
- 旧版 `database/schema.sql`
- 旧 README

遇到数据库问题，先查 CloudBase 线上真实结构。

### 8.2 `synchronize` 已关闭

当前后端是：

- `synchronize: false`

这意味着改表后必须手动同步：

- CloudBase 线上表
- `database/open-source-schema.sql`
- 相关文档

### 8.3 云函数代码改了不等于线上生效

如果改了以下目录：

- `miniprogram/cloudfunctions/db-query/`
- `miniprogram/cloudfunctions/user-getOrCreate/`

仍然需要重新部署 CloudBase 云函数。

### 8.4 后台菜单丢失通常不是功能没了

优先检查：

- 当前管理员 `role`
- `permission_json`
- 浏览器缓存中的 `admin_profile`
- `/admin/profile`

## 9. 推荐阅读顺序

1. 本文档
2. [api-reference.md](/E:/codebese1/docs/api-reference.md)
3. [database-open-source.md](/E:/codebese1/docs/database-open-source.md)
4. [backend-deployment.md](/E:/codebese1/docs/backend-deployment.md)
5. [test-cases.md](/E:/codebese1/docs/test-cases.md)

## 10. 一句话建议

这个项目最容易出问题的地方，不是代码不会写，而是“本地认知和 CloudBase 线上真实状态不一致”。先核实，再开发。

## 11. 2026-03-19 追加：资料违规治理

本次新增了两组独立用户限制域：

- `avatar_status` / `avatar_ban_reason` / `avatar_banned_until`
- `signature_status` / `signature_ban_reason` / `signature_banned_until`

同时 `user_appeals.appeal_type` 已扩展为：

- `account`
- `note`
- `share`
- `avatar`
- `signature`

影响范围：

- `backend/src/admin/admin.service.ts`
- `admin/src/views/Users.vue`
- `admin/src/views/Appeals.vue`
- `miniprogram/pages/profile/*`
- `miniprogram/pages/appeals/*`
- `miniprogram/utils/restriction.js`
- `miniprogram/cloudfunctions/db-query/index.js`

如果后续继续扩展资料治理（例如昵称、学校、专业单独审核），优先沿用这套“独立限制域 + 独立申诉类型 + 后台解封”的模式。
