# Clash Configurator - Dockerfile
# 多阶段构建：前端构建 + 生产镜像

# ============================================
# 阶段1: 构建前端
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client

# 复制前端依赖文件
COPY client/package*.json ./

# 安装依赖
RUN npm ci

# 复制前端源码
COPY client/ ./

# 构建前端
RUN npm run build

# ============================================
# 阶段2: 生产镜像
# ============================================
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production

# 复制后端依赖文件
COPY server/package*.json ./server/

# 安装生产依赖
WORKDIR /app/server
RUN npm ci --only=production

# 复制前端构建产物
COPY --from=frontend-builder /app/client/dist ../client/dist

# 复制后端源码
COPY server/ ./

# 创建数据目录
RUN mkdir -p data/configs data/rule-sets data/temp

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/configs || exit 1

# 启动命令
CMD ["node", "app.js"]