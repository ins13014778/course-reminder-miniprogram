FROM node:18-alpine

WORKDIR /app

# 先安装所有依赖（包括 devDependencies）
COPY package*.json ./
RUN npm install

COPY . .

# 构建项目
RUN npm run build

# 移除 devDependencies 只保留生产依赖
RUN npm prune --production

EXPOSE 3000

CMD ["node", "dist/main"]
