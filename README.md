# 微信小程序课程提醒系统

一个基于 CloudBase 云开发的校园课程提醒工具，支持课程表 OCR 识别、课程管理和定时提醒。

## 项目结构

```
course-reminder/
├── miniprogram/          # 微信小程序端
├── backend/              # NestJS 后端服务
├── admin/                # Vue3 后台管理系统
├── database/             # 数据库设计文件
└── docs/                 # 项目文档
```

## 技术栈

### 小程序端
- 微信原生小程序 + TypeScript
- CloudBase SDK

### 后端
- Node.js + NestJS + TypeScript
- MySQL (CloudBase 关系型数据库)
- Redis (缓存)
- 部署到 CloudBase 云托管

### 后台管理
- Vue 3 + Vite + TypeScript
- Element Plus
- 部署到 CloudBase 静态托管

## 快速开始

### 1. 环境准备
- Node.js >= 18
- 微信开发者工具
- CloudBase 环境

### 2. 安装依赖
```bash
# 后端
cd backend && npm install

# 后台管理
cd admin && npm install
```

### 3. 配置
参考各模块的 `.env.example` 文件配置环境变量

### 4. 运行
```bash
# 后端开发
cd backend && npm run start:dev

# 后台管理开发
cd admin && npm run dev
```

## 核心功能

- ✅ 微信登录
- ✅ 课程表照片上传
- ✅ OCR 识别（可扩展）
- ✅ 课程解析和确认
- ✅ 课程管理
- ✅ 定时提醒
- ✅ 后台管理

## 部署

项目部署到 CloudBase：
- 后端：云托管（CloudRun）
- 前端：静态网站托管
- 数据库：CloudBase MySQL ✅ 已初始化

### 环境信息
- 环境ID: c-66-7gfze7g4075f38c7
- 区域: ap-shanghai
- 数据库表: ✅ users, courses, import_tasks, reminders, admins

详见 [部署文档](./docs/deployment.md)
