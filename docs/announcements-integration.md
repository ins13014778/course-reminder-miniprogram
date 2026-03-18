# 公告功能对接记录

更新时间：2026-03-18
状态：已联通，已完成人工测试

## 1. 功能目标

本次公告功能对接的目标是打通以下链路：

1. 后台管理端可以新建公告
2. 后台管理端可以编辑公告
3. 后台管理端可以发布公告
4. 后台管理端可以删除公告
5. 小程序首页可以看到已发布公告

当前这条链路已经完成，并且用户已手动测试确认“公告显示正常”。

## 2. 数据来源

公告数据来自 CloudBase MySQL 表：

- `announcements`

真实表结构关键字段：

- `id`
- `title`
- `content`
- `status`
  - `draft`
  - `published`
  - `archived`
- `is_pinned`
- `published_at`
- `created_at`
- `updated_at`

说明：

- 小程序首页只读取 `status = 'published'` 的公告
- 排序优先级为：
  1. `is_pinned DESC`
  2. `COALESCE(published_at, updated_at) DESC`
  3. `id DESC`

这意味着：

- 置顶公告优先展示
- 同为置顶或同为非置顶时，最新发布的优先展示

## 3. 后端实现

相关文件：

- [announcements.controller.ts](/E:/codebese1/backend/src/announcements/announcements.controller.ts)
- [announcements.service.ts](/E:/codebese1/backend/src/announcements/announcements.service.ts)

当前已提供的接口：

### 面向小程序前端

- `GET /announcements/active`
  - 获取当前应展示的单条公告
  - 只返回已发布公告

### 面向后台管理端

- `GET /admin/announcements`
  - 获取公告列表
- `GET /admin/announcements/current`
  - 获取当前最新公告
  - 兼容旧管理页逻辑，当前仍保留
- `POST /admin/announcements`
  - 新建公告
- `PUT /admin/announcements/:id`
  - 更新公告
- `PUT /admin/announcements/current`
  - 更新当前最新公告
  - 兼容旧逻辑，当前仍保留
- `DELETE /admin/announcements/:id`
  - 删除公告

### 后端行为规则

1. `status = 'published'` 时，会写入 `publishedAt`
2. `status != 'published'` 时，会把 `publishedAt` 清空
3. 删除接口执行的是实际删除，不是软删除

## 4. 后台管理端实现

相关文件：

- [Announcements.vue](/E:/codebese1/admin/src/views/Announcements.vue)
- [index.ts](/E:/codebese1/admin/src/api/index.ts)

当前后台页面行为：

1. 左侧显示公告列表
2. 右侧显示编辑表单
3. 支持新建公告
4. 支持修改标题、正文、状态、是否置顶
5. 支持删除公告
6. 支持预览公告卡片

当前使用的状态：

- 草稿：不会在小程序首页显示
- 发布：会参与首页公告读取
- 归档：不会在小程序首页显示

## 5. 小程序前端实现

相关文件：

- [index.js](/E:/codebese1/miniprogram/pages/index/index.js)
- [index.wxml](/E:/codebese1/miniprogram/pages/index/index.wxml)

当前首页行为：

1. 页面加载时调用 `loadAnnouncement()`
2. 页面显示时再次调用 `loadAnnouncement()`
3. 读取公告 SQL：

```sql
SELECT id, title, content, is_pinned, published_at, updated_at
FROM announcements
WHERE status = 'published'
ORDER BY is_pinned DESC, COALESCE(published_at, updated_at) DESC, id DESC
LIMIT 1
```

4. 如果没有已发布公告，则首页不显示公告卡片
5. 如果有已发布公告，则显示：
  - 标题
  - 正文
  - 更新时间文字

## 6. 已验证结果

本次已验证通过的内容：

1. 后台可以创建公告
2. 后台可以发布公告
3. 后台可以删除公告
4. 发布后的公告可以被首页读取
5. 删除后的公告会从后台列表和首页展示链路中移除
6. 后台公告页刷新后能够重新读取数据库中的公告记录

用户已再次确认：

- “公告已经测试正常了”

## 7. 后续维护注意事项

1. 不要再把公告逻辑写死成“只能编辑一条 current 公告”
2. 后续如果增加“公告历史页”，应继续沿用同一张 `announcements` 表
3. 如果要支持“撤回公告”，建议优先把 `status` 改为 `archived`，而不是直接删除
4. 如果要做“定时发布”，建议基于 `published_at` 扩展，不要破坏现有排序规则
5. 后续任何 AI 接手公告功能时，优先查看本文档和真实表结构，不要只看旧文档推断

## 8. 回归建议

每次改动公告功能后，至少回归以下步骤：

1. 在后台创建一条草稿公告，确认首页不可见
2. 把该公告改为已发布，确认首页可见
3. 再创建一条非置顶已发布公告，确认置顶公告仍优先
4. 删除已发布公告，确认首页同步消失
5. 刷新后台公告页，确认列表仍能正确回显
