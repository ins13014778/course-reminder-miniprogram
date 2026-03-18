# 课表提醒项目

这是一个基于 CloudBase 的多端项目，当前包含：

- `miniprogram/`: 微信小程序
- `backend/`: NestJS API 与后台管理接口
- `admin/`: Vue 3 + Vite 后台管理台
- `docs/`: 项目文档与测试文档

## 推荐先看

后续接手或二开时，优先阅读这两份文档：

- [开发接手文档](./docs/developer-handoff.md)
- [测试用例文档](./docs/test-cases.md)

## 本地启动

后端 API：

```powershell
cd E:\codebese1\backend
npm install
npm run start:dev
```

后台管理页：

```powershell
cd E:\codebese1\admin
npm install
npm run dev
```

访问地址：

- Admin: `http://localhost:5173`
- Backend API: `http://localhost:3000`

## 当前重点能力

- 用户登录与资料存储
- 课表导入、编辑、分享导入
- 订阅提醒
- 公告发布
- 后台治理能力
  - 查看用户详情与完整课表
  - 账号封禁
  - 笔记权限封禁
  - 分享密钥权限封禁
  - 违规笔记下架 / 恢复
  - 分享密钥禁用 / 恢复

## 说明

仓库里存在一些历史文档和早期结构说明，它们不一定与当前线上 CloudBase 真实状态完全一致。涉及数据库、云函数、权限和提醒逻辑时，请以 [开发接手文档](./docs/developer-handoff.md) 为准，再结合真实 CloudBase 环境核对。
