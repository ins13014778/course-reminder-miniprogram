# 管理员权限矩阵

最后更新：`2026-03-19`

本文档基于当前真实代码整理，主要参考：

- [admin-permissions.decorator.ts](/E:/codebese1/backend/src/admin/admin-permissions.decorator.ts)
- [admin.controller.ts](/E:/codebese1/backend/src/admin/admin.controller.ts)
- [admin.service.ts](/E:/codebese1/backend/src/admin/admin.service.ts)
- [router/index.ts](/E:/codebese1/admin/src/router/index.ts)
- [App.vue](/E:/codebese1/admin/src/App.vue)

## 1. 当前角色

| 角色 | 含义 |
| --- | --- |
| `super_admin` | 超级管理员 |
| `operator` | 运营 |
| `moderator` | 审核员 |
| `support` | 客服 |

## 2. 当前权限点

| 权限键 | 说明 |
| --- | --- |
| `user.view` | 查看用户列表和用户详情 |
| `user.ban` | 管理账号、笔记、分享封禁 |
| `course.view` | 查看用户课表和模板课表 |
| `course.manage` | 删除课表、管理课表资源 |
| `share.view` | 查看课表分享密钥 |
| `share.manage` | 管理课表分享状态 |
| `subscription.view` | 查看订阅提醒 |
| `reminder_log.view` | 查看提醒发送日志 |
| `note.view` | 查看笔记内容 |
| `note.moderate` | 审核笔记 |
| `note_share.view` | 查看笔记分享 |
| `note_share.manage` | 管理笔记分享状态 |
| `report.view` | 查看举报 |
| `report.review` | 处理举报 |
| `appeal.view` | 查看用户申诉 |
| `appeal.review` | 处理用户申诉 |
| `feedback.view` | 查看留言反馈 |
| `feedback.review` | 处理留言反馈 |
| `announcement.manage` | 管理公告 |
| `content.manage` | 管理内容页 |
| `audit.view` | 查看后台审计日志 |
| `admin.manage` | 管理管理员账号和权限 |

## 3. 默认角色权限

| 权限键 | super_admin | operator | moderator | support |
| --- | --- | --- | --- | --- |
| `user.view` | 是 | 否 | 否 | 是 |
| `user.ban` | 是 | 否 | 否 | 否 |
| `course.view` | 是 | 是 | 否 | 是 |
| `course.manage` | 是 | 是 | 否 | 否 |
| `share.view` | 是 | 是 | 否 | 是 |
| `share.manage` | 是 | 是 | 否 | 否 |
| `subscription.view` | 是 | 是 | 否 | 是 |
| `reminder_log.view` | 是 | 是 | 否 | 是 |
| `note.view` | 是 | 否 | 是 | 否 |
| `note.moderate` | 是 | 否 | 是 | 否 |
| `note_share.view` | 是 | 否 | 是 | 否 |
| `note_share.manage` | 是 | 否 | 是 | 否 |
| `report.view` | 是 | 否 | 是 | 否 |
| `report.review` | 是 | 否 | 是 | 否 |
| `appeal.view` | 是 | 否 | 否 | 是 |
| `appeal.review` | 是 | 否 | 否 | 是 |
| `feedback.view` | 是 | 是 | 否 | 是 |
| `feedback.review` | 是 | 是 | 否 | 是 |
| `announcement.manage` | 是 | 是 | 否 | 否 |
| `content.manage` | 是 | 是 | 否 | 否 |
| `audit.view` | 是 | 否 | 否 | 否 |
| `admin.manage` | 是 | 否 | 否 | 否 |

说明：

- `super_admin` 默认拥有全部权限
- 实际生效权限以 `admin_accounts.permission_json` 为准
- `support` 现已具备申诉查看和申诉审核权限

## 4. 后台页面与权限映射

| 页面 | 路由 | 所需权限 |
| --- | --- | --- |
| 总览 | `/overview` | 登录即可 |
| 用户管理 | `/users` | `user.view` |
| 课表巡检 | `/courses` | `course.view` |
| 模板课表 | `/template-courses` | 登录即可 |
| 课表分享 | `/shares` | `share.view` |
| 订阅提醒 | `/subscriptions` | `subscription.view` |
| 提醒日志 | `/reminder-logs` | `reminder_log.view` |
| 笔记审核 | `/notes` | `note.view` |
| 笔记分享 | `/note-shares` | `note_share.view` |
| 内容举报 | `/reports` | `report.view` |
| 用户申诉 | `/appeals` | `appeal.view` |
| 留言反馈 | `/feedback` | `feedback.view` |
| 公告运营 | `/announcements` | `announcement.manage` |
| 页面配置 | `/content-pages` | `content.manage` |
| 审计日志 | `/audit-logs` | `audit.view` |
| 管理员账号 | `/admin-accounts` | `admin.manage` |

## 5. 接口与权限映射

### 5.1 用户与课表

- `GET /admin/users` -> `user.view`
- `GET /admin/users/:id/detail` -> `user.view`
- `PATCH /admin/users/:id/permissions` -> `user.ban`
- `GET /admin/courses` -> `course.view`
- `DELETE /admin/courses/:id` -> `course.manage`

### 5.2 分享与提醒

- `GET /admin/share-keys` -> `share.view`
- `PATCH /admin/share-keys/:id/status` -> `share.manage`
- `GET /admin/subscriptions` -> `subscription.view`
- `GET /admin/reminder-logs` -> `reminder_log.view`

### 5.3 内容治理

- `GET /admin/notes` -> `note.view`
- `PATCH /admin/notes/:id/moderation` -> `note.moderate`
- `GET /admin/note-shares` -> `note_share.view`
- `PATCH /admin/note-shares/:id/status` -> `note_share.manage`
- `GET /admin/reports` -> `report.view`
- `PATCH /admin/reports/:id/review` -> `report.review`
- `GET /admin/appeals` -> `appeal.view`
- `PATCH /admin/appeals/:id/review` -> `appeal.review`
- `GET /admin/feedback` -> `feedback.view`
- `PATCH /admin/feedback/:id/review` -> `feedback.review`

### 5.4 后台运营

- `GET /admin/announcements/current` -> `announcement.manage`
- `GET /admin/announcements` -> `announcement.manage`
- `POST /admin/announcements` -> `announcement.manage`
- `PUT /admin/announcements/:id` -> `announcement.manage`
- `PUT /admin/announcements/current` -> `announcement.manage`
- `DELETE /admin/announcements/:id` -> `announcement.manage`
- `GET /admin/content-pages` -> `content.manage`
- `GET /admin/content-pages/:key` -> `content.manage`
- `PATCH /admin/content-pages/:key` -> `content.manage`
- `GET /admin/audit-logs` -> `audit.view`
- `GET /admin/admin-accounts` -> `admin.manage`
- `POST /admin/admin-accounts` -> `admin.manage`
- `PATCH /admin/admin-accounts/:id` -> `admin.manage`

## 6. 保护规则

当前系统已内置两条关键保护规则：

1. 默认超级管理员账号禁止在后台被降权或停用
2. 管理员不能在后台把自己降权或停用

对应实现位于：

- [admin.service.ts](/E:/codebese1/backend/src/admin/admin.service.ts)

## 7. 二开提醒

如果后续新增后台功能，建议同时更新：

1. 权限定义
2. 后端接口权限装饰器
3. 后台路由
4. 后台菜单
5. 本文档
