# API 接口文档

最后更新：`2026-03-20`

本文档基于当前仓库真实代码整理，覆盖已落地且已接入的主要接口。后台统一前缀为 `/admin`。

## 1. 鉴权说明

### 1.1 小程序用户接口

- 登录接口：`POST /auth/wechat-login`
- 请求体：`{ code }`

### 1.2 管理后台接口

- 登录接口：`POST /admin/login`
- 登录成功后使用：`Authorization: Bearer <token>`

后台接口同时受以下两层控制：

- 角色控制
- 细粒度权限控制

## 2. 后台接口

### 2.1 认证与概览

- `POST /admin/login`
- `GET /admin/profile`
- `GET /admin/overview`

### 2.2 用户与课表

- `GET /admin/users`
- `GET /admin/users/:id/detail`
- `PATCH /admin/users/:id/permissions`
- `POST /admin/users/batch-permissions`
- `GET /admin/courses`
- `DELETE /admin/courses/:id`
- `GET /admin/template-courses`

说明：

- `GET /admin/users/:id/detail` 会返回用户课表、笔记、分享信息，以及违规统计和违规档案
- `POST /admin/users/batch-permissions` 用于批量封禁 / 解封

### 2.3 分享、订阅与提醒

- `GET /admin/share-keys`
- `PATCH /admin/share-keys/:id/status`
- `PATCH /admin/share-keys/batch-status`
- `GET /admin/subscriptions`
- `GET /admin/reminder-logs`
- `GET /admin/reminder-logs/summary`
- `POST /admin/reminder-logs/retry`

说明：

- `GET /admin/reminder-logs/summary` 返回提醒失败、重试次数、重点异常汇总
- `POST /admin/reminder-logs/retry` 对失败日志发起手动重试

### 2.4 笔记、笔记分享与举报

- `GET /admin/notes`
- `PATCH /admin/notes/:id/moderation`
- `PATCH /admin/notes/batch-moderation`
- `GET /admin/note-shares`
- `PATCH /admin/note-shares/:id/status`
- `PATCH /admin/note-shares/batch-status`
- `GET /admin/reports`
- `PATCH /admin/reports/:id/review`
- `PATCH /admin/reports/batch-review`

说明：

- 支持单条和批量内容治理
- 举报批量处理可联动下架原笔记或封禁分享

### 2.5 高风险二次确认

- `POST /admin/high-risk-actions/challenge`

说明：

- 用于生成高风险操作确认码
- 某些接口在封禁、降权、批量治理时需要携带：
  - `confirmationId`
  - `confirmationCode`

### 2.6 用户申诉

- `GET /admin/appeals`
- `PATCH /admin/appeals/:id/review`

说明：

- 仅 `pending` 状态允许审核
- `approved` 会自动解除对应限制
- `rejected` 会保留当前限制

### 2.7 留言反馈

- `GET /admin/feedback`
- `PATCH /admin/feedback/:id/review`

### 2.8 公告与内容页

- `GET /admin/announcements/current`
- `GET /admin/announcements`
- `POST /admin/announcements`
- `PUT /admin/announcements/:id`
- `PUT /admin/announcements/current`
- `DELETE /admin/announcements/:id`
- `GET /admin/content-pages`
- `GET /admin/content-pages/:key`
- `PATCH /admin/content-pages/:key`

### 2.9 审计与管理员

- `GET /admin/audit-logs`
- `GET /admin/admin-accounts`
- `POST /admin/admin-accounts`
- `PATCH /admin/admin-accounts/:id`

## 3. 小程序与前台接口

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

## 4. 小程序云函数说明

小程序部分还使用云函数：

- [db-query/index.js](/E:/codebese1/miniprogram/cloudfunctions/db-query/index.js)
- [user-getOrCreate/index.js](/E:/codebese1/miniprogram/cloudfunctions/user-getOrCreate/index.js)

说明：

- 通知中心的公告、反馈、申诉读取依赖 `db-query`
- 账号封禁后允许继续读取申诉、反馈、公告相关数据，以支持查看回执和发起申诉

## 5. 当前后台权限点

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

## 6. 维护建议

如果后续新增后台功能，至少同步更新：

1. 控制器与服务
2. 后台 API 封装
3. 权限定义
4. 本文档
