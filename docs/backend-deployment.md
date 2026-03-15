# 后端部署指南

## 方式一：CloudBase 控制台部署（推荐）

### 1. 准备代码
```bash
cd backend
npm install
npm run build
```

### 2. 登录 CloudBase 控制台
访问：https://console.cloud.tencent.com/tcb/env/index?envId=c-66-7gfze7g4075f38c7

### 3. 创建云托管服务
1. 进入「云托管」页面
2. 点击「新建服务」
3. 服务名称：course-reminder-api
4. 选择「容器镜像」部署方式

### 4. 配置 Dockerfile
已创建 backend/Dockerfile

### 5. 上传代码部署
- 选择「本地代码」
- 上传 backend 目录
- 系统会自动构建 Docker 镜像并部署

### 6. 配置环境变量
在服务配置中添加：
- DB_HOST: MySQL 数据库地址
- DB_PORT: 3306
- DB_USERNAME: root
- DB_PASSWORD: 数据库密码
- DB_DATABASE: c-66-7gfze7g4075f38c7
- JWT_SECRET: 随机密钥

### 7. 获取访问地址
部署成功后会获得服务访问地址，格式：
https://course-reminder-api-xxx.ap-shanghai.app.tcloudbase.com

## 方式二：本地测试
```bash
cd backend
npm install
npm run start:dev
```

访问：http://localhost:3000
