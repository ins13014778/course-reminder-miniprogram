# 开发接手文档

最后更新：2026-03-19

这份文档给后续开发者和 AI 使用，目标不是介绍项目理念，而是帮助接手者快速进入“当前真实可开发状态”，减少被旧文档、旧实体和线上环境差异误导的概率。

## 1. 项目概况

当前项目是一个多端仓库，核心业务是“课表提醒 + 课表导入 + 分享导入 + 内容与公告运营 + 后台治理”。

目录分工：

- `miniprogram/`: 微信小程序，包含页面、工具函数和 CloudBase 云函数
- `backend/`: NestJS 后端，提供管理台 API、公告接口、提醒调度逻辑
- `admin/`: Vue 3 + Vite 后台管理台
- `docs/`: 文档
- `qa/`: 测试用例或后续测试资产可继续放这里

## 2. 当前真实运行环境

CloudBase 已确认环境：

- `envId`: `dawdawd15-8g023nsw8cb3f68a`
- `alias`: `dawdawd15`
- `region`: `ap-shanghai`

小程序配置：

- `appid`: `wx3898c6c391c39787`
- `project.config.json` 中 `cloudenv` 已指向上述 CloudBase 环境

后端本地默认端口：

- `3000`

后台本地默认端口：

- `5173`

## 3. 推荐接手顺序

接手时建议按下面顺序理解项目：

1. 先读本文件
2. 再读 [测试用例文档](./test-cases.md)
3. 查看 [公告对接记录](./announcements-integration.md)
4. 再打开代码和真实 CloudBase 环境核对

不要先相信历史 `README`、旧 SQL 草稿或早期总结文档来推断当前真实结构。

## 4. 本地启动方式

后端：

```powershell
cd E:\codebese1\backend
npm install
npm run start:dev
```

后台：

```powershell
cd E:\codebese1\admin
npm install
npm run dev
```

编译检查：

```powershell
cd E:\codebese1\backend
npm run build

cd E:\codebese1\admin
npm run build
```

## 5. 代码结构速览

### 5.1 小程序

关键目录：

- `miniprogram/pages/index/`: 首页，公告与用户主入口
- `miniprogram/pages/courses/`: 用户课表页
- `miniprogram/pages/import/`: OCR 导入与分享密钥导入
- `miniprogram/pages/notes/`: 用户笔记
- `miniprogram/pages/settings/`: 提醒设置与分享密钥生成
- `miniprogram/pages/login/`: 登录页
- `miniprogram/cloudfunctions/db-query/`: 直接执行 SQL 的云函数，现已补权限拦截
- `miniprogram/cloudfunctions/user-getOrCreate/`: 登录态用户创建/获取云函数，现已补账号封禁校验

### 5.2 后端

关键目录：

- `backend/src/admin/`: 管理台接口
- `backend/src/auth/`: 后端登录链路
- `backend/src/announcements/`: 公告接口
- `backend/src/reminders/`: 提醒调度、提醒发送、提醒生成逻辑
- `backend/src/common/entities/`: TypeORM 实体

### 5.3 后台

关键目录：

- `admin/src/App.vue`: 后台整体壳层、导航、全局字体和布局
- `admin/src/views/Overview.vue`: 总览页
- `admin/src/views/Users.vue`: 用户详情与权限治理页
- `admin/src/views/Courses.vue`: 课表巡检页
- `admin/src/views/Notes.vue`: 笔记审核页
- `admin/src/views/ShareCenter.vue`: 分享密钥控制页
- `admin/src/views/Subscriptions.vue`: 订阅提醒列表页
- `admin/src/views/Announcements.vue`: 公告管理页

## 6. 当前核心业务链路

### 6.1 登录链路

当前小程序真实使用的是 JS 版本登录链路：

- `miniprogram/pages/login/login.js`
- `miniprogram/services/auth.js`
- `miniprogram/services/database.js`
- `miniprogram/cloudfunctions/user-getOrCreate/index.js`

注意：

- 不要只改 `backend/src/auth/` 就以为登录治理生效了
- 小程序真实登录更关键的是 `user-getOrCreate` 云函数

### 6.2 课表导入链路

主要入口：

- `miniprogram/pages/import/import.js`

支持：

- OCR 导入
- 默认模板导入
- 分享密钥导入

### 6.3 分享密钥链路

生成入口：

- `miniprogram/pages/settings/settings.js`

导入入口：

- `miniprogram/pages/import/import.js`

后台治理：

- `admin/src/views/ShareCenter.vue`
- `backend/src/admin/admin.service.ts`

### 6.4 笔记链路

用户页：

- `miniprogram/pages/notes/notes.js`

后台审核：

- `admin/src/views/Notes.vue`
- `PATCH /admin/notes/:id/moderation`

### 6.5 提醒链路

后端提醒逻辑：

- `backend/src/reminders/reminders.service.ts`
- `backend/src/reminders/reminder.scheduler.ts`
- `backend/src/reminders/message-sender.service.ts`

设置页入口：

- `miniprogram/pages/settings/settings.js`

当前提醒逻辑已补齐：

- 根据 `SEMESTER_START_DATE` 计算当前周次
- 根据课程 `start_week` / `end_week` 过滤
- 支持 `remind_weekends`
- 通过 `reminders` 表做去重和发送状态记录

### 6.6 公告链路

管理台：

- `admin/src/views/Announcements.vue`

后端：

- `backend/src/announcements/announcements.controller.ts`
- `backend/src/announcements/announcements.service.ts`

前台读取：

- `miniprogram/pages/index/index.js`

公告功能已接通并经过人工验证。

## 7. 当前后台治理能力

当前后台已具备：

- 查看用户列表
- 查看用户详情
- 查看用户完整课表
- 查看用户笔记
- 查看用户分享密钥
- 查看用户提醒订阅
- 账号封禁
- 笔记权限封禁
- 分享密钥权限封禁
- 支持封禁若干天
- 支持永久封禁
- 单条违规笔记下架 / 恢复
- 单个分享密钥禁用 / 恢复

关键文件：

- [Users.vue](/E:/codebese1/admin/src/views/Users.vue)
- [Notes.vue](/E:/codebese1/admin/src/views/Notes.vue)
- [ShareCenter.vue](/E:/codebese1/admin/src/views/ShareCenter.vue)
- [admin.controller.ts](/E:/codebese1/backend/src/admin/admin.controller.ts)
- [admin.service.ts](/E:/codebese1/backend/src/admin/admin.service.ts)

## 8. 当前数据库关键表

以下是当前开发最常涉及的表，不是完整字典，而是接手时最需要先知道的表。

### 8.1 `users`

关键字段：

- `id`
- `openid`
- `nickname`
- `signature`
- `avatar_url`
- `school`
- `major`
- `grade`
- `account_status`
- `account_ban_reason`
- `account_banned_until`
- `note_status`
- `note_ban_reason`
- `note_banned_until`
- `share_status`
- `share_ban_reason`
- `share_banned_until`

说明：

- 账号封禁、笔记权限封禁、分享密钥权限封禁都在这张表上

### 8.2 `courses`

关键字段：

- `id`
- `user_id`
- `course_name`
- `teacher`
- `location`
- `weekday`
- `start_section`
- `end_section`
- `start_time`
- `end_time`
- `start_week`
- `end_week`

### 8.3 `notes`

关键字段：

- `id`
- `user_id`
- `content`
- `image_url`
- `status`
- `moderation_reason`
- `moderated_at`

说明：

- `status = 'visible'` 表示前台可见
- `status = 'blocked'` 表示后台已下架

### 8.4 `schedule_share_keys`

关键字段：

- `id`
- `user_id`
- `share_key`
- `is_active`
- `status`
- `ban_reason`
- `banned_at`
- `last_imported_at`

说明：

- 用户层面的分享权限在 `users.share_status`
- 单个密钥的停用状态在这里

### 8.5 `user_subscriptions`

关键字段：

- `id`
- `user_id`
- `template_id`
- `page_path`
- `remind_minutes`
- `remind_weekends`
- `remaining_count`
- `status`
- `last_subscribed_at`

### 8.6 `reminders`

关键字段：

- `id`
- `user_id`
- `course_id`
- `remind_time`
- `status`
- `error_msg`

说明：

- 用于提醒去重、发送状态跟踪和失败记录

## 9. 云函数现状

当前与权限和登录最相关的云函数：

- `db-query`
- `user-getOrCreate`
- `login`

其中：

- `db-query` 已加入账号、笔记权限、分享权限的真实拦截
- `user-getOrCreate` 已加入账号封禁校验

如果后续修改了这两个函数，本地代码改完还不够，必须重新部署到 CloudBase。

建议命令：

```powershell
npx mcporter call cloudbase.auth action=set_env envId=dawdawd15-8g023nsw8cb3f68a --output json
npx mcporter call cloudbase.updateFunctionCode name=db-query functionRootPath='E:\codebese1\miniprogram\cloudfunctions' --output json
npx mcporter call cloudbase.updateFunctionCode name=user-getOrCreate functionRootPath='E:\codebese1\miniprogram\cloudfunctions' --output json
```

## 10. 二开时最容易踩的坑

### 10.1 不要只改后端 API

这个项目不是所有业务都走 `backend/`。

很多小程序能力直接通过 `db-query` 云函数写数据库，所以：

- 如果只改 `backend/`，用户端可能完全不受影响
- 涉及登录、笔记、分享密钥、导入、课表写入时，要同时看小程序和云函数

### 10.2 不要只看 TypeORM 实体猜线上结构

虽然当前实体已经比之前更接近线上真实结构，但涉及生产修改前，仍建议先对真实 CloudBase 表结构做一次核对。

### 10.3 不要忽略 CloudBase 线上状态

涉及数据库表、云函数、提醒逻辑时，建议先执行：

```powershell
npx mcporter describe cloudbase
npx mcporter call cloudbase.auth action=status --output json
npx mcporter call cloudbase.auth action=set_env envId=dawdawd15-8g023nsw8cb3f68a --output json
npx mcporter call cloudbase.executeReadOnlySQL "sql=SHOW TABLES" --output json
```

### 10.4 小程序真实使用的是 JS 文件

仓库里有一些 TS 文件，但当前小程序实际跑的很多入口是 JS 版本。

优先检查：

- `pages/login/login.js`
- `pages/notes/notes.js`
- `pages/settings/settings.js`
- `pages/import/import.js`

## 11. 当前已完成的阶段性成果

截至 2026-03-19，已经落地并验证过的关键能力：

- 公告后台发布、删除、前台显示
- 提醒功能数据库补齐与逻辑修复
- 后台字体和整体布局重整
- 用户详情页与完整课表查看
- 账号封禁、笔记权限封禁、分享密钥权限封禁
- 违规笔记下架 / 恢复
- 分享密钥禁用 / 恢复
- 小程序登录与数据库写入侧权限拦截

## 12. 后续推荐扩展方向

如果继续二开，建议优先做这些：

1. 管理员登录与操作审计
2. 封禁日志表
3. 云函数 SQL 白名单化，减少任意 SQL 风险
4. 提醒发送日志查询页
5. 公告历史与定时发布
6. 后台分页、筛选增强、导出

## 13. 最后建议

后续开发最重要的一点不是“先写代码”，而是先确认这次要改的链路到底跑在：

- 小程序页面
- 云函数
- 后端 API
- 后台管理台
- 还是 CloudBase 真实数据结构

这个项目最大的历史问题不是代码写不出来，而是“本地认知”和“线上真实状态”经常不一致。先核实，再开发，效率会更高，回归成本也更低。
