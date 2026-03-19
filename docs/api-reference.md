# API 接口文档

最后更新：`2026-03-19`

本文档基于当前 `backend/src` 控制器整理，覆盖已开源接口，不包含业务数据。

## 1. 鉴权说明

### 1.1 小程序用户接口

- 小程序登录走 `POST /auth/wechat-login`
- 请求体：`{ code }`

### 1.2 后台接口

- 后台登录：`POST /admin/login`
- 登录成功后使用 `Authorization: Bearer <token>`

后台接口同时支持：

- 角色控制
- 细粒度权限控制

## 2. 后台管理接口

前缀：`/admin`

### 2.1 认证

- `POST /admin/login`
- `GET /admin/profile`
- `GET /admin/overview`

### 2.2 用户治理

- `GET /admin/users`
- `GET /admin/users/:id/detail`
- `PATCH /admin/users/:id/permissions`

### 2.3 课表管理

- `GET /admin/courses`
- `DELETE /admin/courses/:id`
- `GET /admin/template-courses`

### 2.4 分享与提醒

- `GET /admin/share-keys`
- `PATCH /admin/share-keys/:id/status`
- `GET /admin/subscriptions`
- `GET /admin/reminder-logs`

### 2.5 笔记与举报

- `GET /admin/notes`
- `PATCH /admin/notes/:id/moderation`
- `GET /admin/note-shares`
- `PATCH /admin/note-shares/:id/status`
- `GET /admin/reports`
- `PATCH /admin/reports/:id/review`

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

### 3.4 公告

- `GET /announcements/active`

### 3.5 内容页

- `GET /content-pages/:key`

## 4. 权限设计摘要

后台当前支持的细粒度权限包括：

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
- `feedback.view`
- `feedback.review`
- `announcement.manage`
- `content.manage`
- `audit.view`
- `admin.manage`

## 5. 文档边界

本文档是接口清单和权限摘要，不逐个展开 DTO 字段。

如果后续要对外发布 OpenAPI，建议下一步补：

- 请求体示例
- 响应体示例
- 错误码
- 权限矩阵
