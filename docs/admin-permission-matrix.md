# 管理员权限矩阵

最后更新：`2026-03-19`

这份文档基于当前真实代码整理，主要依据：

- [backend/src/admin/admin-permissions.decorator.ts](/E:/codebese1/backend/src/admin/admin-permissions.decorator.ts)
- [backend/src/admin/admin.controller.ts](/E:/codebese1/backend/src/admin/admin.controller.ts)
- [backend/src/admin/admin.service.ts](/E:/codebese1/backend/src/admin/admin.service.ts)
- [admin/src/App.vue](/E:/codebese1/admin/src/App.vue)
- [admin/src/router/index.ts](/E:/codebese1/admin/src/router/index.ts)

目标是让后续开发者、AI 和运维明确知道：

- 现在有哪些权限点
- 默认角色各自拥有哪些权限
- 后台页面是怎么按权限显示的
- 哪些接口需要哪个权限
- 哪些账号受保护，不能在后台误操作

## 1. 角色说明

当前后台角色共 4 类：

| 角色 | 含义 | 适用场景 |
| --- | --- | --- |
| `super_admin` | 超级管理员 | 平台负责人、系统默认主账号 |
| `operator` | 运营 | 公告、内容页、课表资产、订阅与提醒运营 |
| `moderator` | 审核员 | 笔记、举报、分享审核 |
| `support` | 客服 | 用户查询、反馈处理、基础支持 |

## 2. 权限点清单

| 权限键 | 含义 |
| --- | --- |
| `user.view` | 查看用户列表与用户详情 |
| `user.ban` | 封禁账号、笔记权限、分享权限等用户级限制 |
| `course.view` | 查看用户课表与模板课表 |
| `course.manage` | 删除课表、管理课表资产 |
| `share.view` | 查看课表分享密钥与分享记录 |
| `share.manage` | 管理课表分享状态 |
| `subscription.view` | 查看订阅提醒记录 |
| `reminder_log.view` | 查看提醒发送日志 |
| `note.view` | 查看笔记内容 |
| `note.moderate` | 审核笔记、处理笔记状态 |
| `note_share.view` | 查看笔记分享 |
| `note_share.manage` | 管理笔记分享状态 |
| `report.view` | 查看举报 |
| `report.review` | 处理举报 |
| `feedback.view` | 查看留言反馈 |
| `feedback.review` | 处理留言反馈 |
| `announcement.manage` | 管理公告 |
| `content.manage` | 管理内容页，例如“关于我们”等页面配置 |
| `audit.view` | 查看后台审计日志 |
| `admin.manage` | 管理管理员账号、角色和权限分配 |

## 3. 默认角色权限

当前后端服务中的默认权限分配如下。

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
| `feedback.view` | 是 | 是 | 否 | 是 |
| `feedback.review` | 是 | 是 | 否 | 是 |
| `announcement.manage` | 是 | 是 | 否 | 否 |
| `content.manage` | 是 | 是 | 否 | 否 |
| `audit.view` | 是 | 否 | 否 | 否 |
| `admin.manage` | 是 | 否 | 否 | 否 |

说明：

- `super_admin` 默认拥有全部权限。
- `operator` 偏运营与内容维护。
- `moderator` 偏内容审核与举报处理。
- `support` 偏客服查询与反馈处理。
- 实际生效权限以 `admin_accounts.permission_json` 为准，不仅仅看角色名。

## 4. 后台页面可见性

当前管理台路由与左侧菜单主要按权限控制显示。

| 页面 / 路由 | 菜单名称 | 所需权限 |
| --- | --- | --- |
| `/overview` | 总览 | 无额外权限，登录即可 |
| `/users` | 用户治理 | `user.view` |
| `/courses` | 课表巡检 | `course.view` |
| `/template-courses` | 模板课表 | 当前未额外限制，登录即可访问 |
| `/shares` | 课表分享 | `share.view` |
| `/subscriptions` | 订阅提醒 | `subscription.view` |
| `/reminder-logs` | 提醒日志 | `reminder_log.view` |
| `/notes` | 笔记审核 | `note.view` |
| `/note-shares` | 笔记分享 | `note_share.view` |
| `/reports` | 内容举报 | `report.view` |
| `/feedback` | 留言反馈 | `feedback.view` |
| `/announcements` | 公告运营 | `announcement.manage` |
| `/content-pages` | 页面配置 | `content.manage` |
| `/audit-logs` | 审计日志 | `audit.view` |
| `/admin-accounts` | 管理员 | `admin.manage` |

## 5. 后台接口权限映射

### 5.1 通用登录与资料

| 接口 | 权限要求 |
| --- | --- |
| `POST /admin/login` | 公开 |
| `GET /admin/profile` | 已登录 |
| `GET /admin/overview` | 已登录 |

### 5.2 用户与课表

| 接口 | 权限要求 |
| --- | --- |
| `GET /admin/users` | `user.view` |
| `GET /admin/users/:id/detail` | `user.view` |
| `PATCH /admin/users/:id/permissions` | `user.ban` |
| `GET /admin/courses` | `course.view` |
| `DELETE /admin/courses/:id` | `course.manage` |
| `GET /admin/template-courses` | `course.view` |

### 5.3 分享、订阅与提醒

| 接口 | 权限要求 |
| --- | --- |
| `GET /admin/share-keys` | `share.view` |
| `PATCH /admin/share-keys/:id/status` | `share.manage` |
| `GET /admin/subscriptions` | `subscription.view` |
| `GET /admin/reminder-logs` | `reminder_log.view` |

### 5.4 笔记、分享与举报

| 接口 | 权限要求 |
| --- | --- |
| `GET /admin/notes` | `note.view` |
| `PATCH /admin/notes/:id/moderation` | `note.moderate` |
| `GET /admin/note-shares` | `note_share.view` |
| `PATCH /admin/note-shares/:id/status` | `note_share.manage` |
| `GET /admin/reports` | `report.view` |
| `PATCH /admin/reports/:id/review` | `report.review` |

### 5.5 反馈、公告与内容页

| 接口 | 权限要求 |
| --- | --- |
| `GET /admin/feedback` | `feedback.view` |
| `PATCH /admin/feedback/:id/review` | `feedback.review` |
| `GET /admin/announcements/current` | `announcement.manage` |
| `GET /admin/announcements` | `announcement.manage` |
| `POST /admin/announcements` | `announcement.manage` |
| `PUT /admin/announcements/:id` | `announcement.manage` |
| `PUT /admin/announcements/current` | `announcement.manage` |
| `DELETE /admin/announcements/:id` | `announcement.manage` |
| `GET /admin/content-pages` | `content.manage` |
| `GET /admin/content-pages/:key` | `content.manage` |
| `PATCH /admin/content-pages/:key` | `content.manage` |

### 5.6 审计与管理员管理

| 接口 | 权限要求 |
| --- | --- |
| `GET /admin/audit-logs` | `audit.view` |
| `GET /admin/admin-accounts` | `admin.manage` |
| `POST /admin/admin-accounts` | `admin.manage` |
| `PATCH /admin/admin-accounts/:id` | `admin.manage` |

## 6. 权限分配建议

建议按下面的思路配账号：

| 角色 | 建议授权方式 |
| --- | --- |
| `super_admin` | 保持全量权限，只给平台负责人 |
| `operator` | 只给运营、内容维护、公告管理相关人员 |
| `moderator` | 只给审核人员，避免授予用户封禁和管理员管理 |
| `support` | 只给客服和答疑人员，避免授予删除、封禁和管理员管理 |

如果需要更细的颗粒度，优先修改 `permission_json`，不要为了一个临时岗位去新增很多角色常量。

## 7. 受保护账号规则

当前后端已经内置两条非常重要的保护逻辑：

1. 系统默认超级管理员账号不可在后台直接修改。
2. 管理员不能在后台把自己降权，也不能停用自己。

对应逻辑位于：

- [backend/src/admin/admin.service.ts](/E:/codebese1/backend/src/admin/admin.service.ts)

当前行为说明：

- 如果目标账号被识别为系统默认超级管理员，`PATCH /admin/admin-accounts/:id` 会直接拒绝。
- 如果当前登录管理员尝试修改自己的角色，或把自己改成 `disabled`，接口会直接拒绝。
- 正确做法是保留主超级管理员账号不动，只新增其他管理员账号。

## 8. 开发与二开注意事项

后续如果继续新增后台能力，建议同时更新这 4 处：

1. [backend/src/admin/admin-permissions.decorator.ts](/E:/codebese1/backend/src/admin/admin-permissions.decorator.ts)
2. [backend/src/admin/admin.controller.ts](/E:/codebese1/backend/src/admin/admin.controller.ts) 或相关模块控制器
3. [admin/src/router/index.ts](/E:/codebese1/admin/src/router/index.ts)
4. [admin/src/App.vue](/E:/codebese1/admin/src/App.vue)

如果新增了权限点，但没有同步更新路由和菜单，常见现象是：

- 页面存在，但菜单不显示
- 账号有接口权限，但前端被路由守卫拦回 `/overview`
- 管理员误以为“功能丢了”

## 9. 推荐搭配阅读

- [docs/api-reference.md](/E:/codebese1/docs/api-reference.md)
- [docs/release-checklist.md](/E:/codebese1/docs/release-checklist.md)
- [docs/developer-handoff.md](/E:/codebese1/docs/developer-handoff.md)
