# CloudBase 部署指南

## 环境信息
- 环境ID: c-66-7gfze7g4075f38c7
- 区域: ap-shanghai
- 静态托管域名: c-66-7gfze7g4075f38c7-1316672218.tcloudbaseapp.com

## 部署步骤

### 1. 初始化数据库
使用 CloudBase MySQL 数据库：
```bash
# 在 CloudBase 控制台创建 MySQL 实例
# 导入数据库结构
mysql -h <数据库地址> -u root -p < database/schema.sql
```

### 2. 部署后端到云托管
```bash
cd backend
# 使用 CloudBase MCP 工具部署
npx mcporter call cloudbase.manageCloudRun action=deploy serviceName=course-reminder-api
```

### 3. 部署小程序
- 在微信开发者工具中打开 miniprogram 目录
- 配置后端 API 地址
- 上传代码

### 4. 部署后台管理系统
```bash
cd admin
npm run build
# 部署到静态托管
```

## 下一步
1. 配置数据库连接
2. 部署后端服务
3. 配置小程序 API 地址
