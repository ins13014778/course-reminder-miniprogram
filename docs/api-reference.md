# API 接口文档

最后更新：`2026-03-19`

本文档基于当前 `backend/src` 的真实代码整理，覆盖已开源接口，不包含任何业务数据。

## 1. 鉴权说明

### 1.1 小程序用户接口

- 登录接口：`POST /auth/wechat-login`
- 请求体：`{ code }`

### 1.2 后台接口

- 登录接口：`POST /admin/login`
- 登录成功后使用：`Authorization: Bearer <token>`

后台接口支持两层控制：

- 角色控制
- 细粒度权限控制

## 2. 后台接口

统一前缀：`/admin`

### 2.1 认证与总览

- `POST /admin/login`
- `GET /admin/profile`
- `GET /admin/overview`

### 2.2 用户与课表

- `GET /admin/users`
- `GET /admin/users/:id/detail`
- `PATCH /admin/users/:id/permissions`
- `GET /admin/courses`
- `DELETE /admin/courses/:id`
- `GET /admin/template-courses`

### 2.3 分享、订阅与提醒

- `GET /admin/share-keys`
- `PATCH /admin/share-keys/:id/status`
- `GET /admin/subscriptions`
- `GET /admin/reminder-logs`

### 2.4 笔记、分享与举报

- `GET /admin/notes`
- `PATCH /admin/notes/:id/moderation`
- `GET /admin/note-shares`
- `PATCH /admin/note-shares/:id/status`
- `GET /admin/reports`
- `PATCH /admin/reports/:id/review`

### 2.5 用户申诉

- `GET /admin/appeals`
- `PATCH /admin/appeals/:id/review`

说明：

- 仅 `pending` 状态的申诉允许审核
- `approved` 会自动解除对应的用户限制
- `rejected` 会保留当前限制

### 2.6 留言反馈

- `GET /admin/feedback`
- `PATCH /admin/feedback/:id/review`

### 2.7 公告与内容页

- `GET /admin/announcements/current`
- `GET /admin/announcements`
- `POST /admin/announcements`
- `PUT /admin/announcements/:id`
- `PUT /admin/announcements/current`
- `DELETE /admin/announcements/:id`
- `GET /admin/content-pages`
- `GET /admin/content-pages/:key`
- `PATCH /admin/content-pages/:key`

### 2.8 审计与管理员

- `GET /admin/audit-logs`
- `GET /admin/admin-accounts`
- `POST /admin/admin-accounts`
- `PATCH /admin/admin-accounts/:id`

## 3. 前台与小程序接口

### 3.1 登录

- `POST /auth/wechat-login`

### 3.2 课表

前缀：`/courses`

- `POST /courses`
- `GET /courses`
- `GET /courses/:id`
- `PUT /courses/:id`
- `DELETE /courses/:id`

### 3.3 导入

前缀：`/import`

- `POST /import/upload`
- `GET /import/task/:id`

### 3.4 公告与内容页

- `GET /announcements/active`
- `GET /content-pages/:key`

## 4. 当前后台权限点

- `user.view`
- `user.ban`
- `course.view`
- `course.manage`
- `share.view`
- `share.manage`
- `subscription.view`
- `reminder_log.view`
- `note.view`
- `note.moderate`
- `note_share.view`
- `note_share.manage`
- `report.view`
- `report.review`
- `appeal.view`
- `appeal.review`
- `feedback.view`
- `feedback.review`
- `announcement.manage`
- `content.manage`
- `audit.view`
- `admin.manage`

## 5. 维护建议

如果后续新增后台功能，至少同步更新这几处：

1. 后端控制器
2. 后台权限定义
3. 后台路由
4. 本文档
