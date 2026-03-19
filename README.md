# Clash Configurator

[![Static Badge](https://img.shields.io/badge/github-Clash--Configurator-181717?style=flat&logo=github&logoColor=white)
](https://github.com/shenbourne/Clash-Configurator)
[![Static Badge](https://img.shields.io/badge/docker-shenbourne%2Fclash--configurator-2496ED?style=flat&logo=docker&logoColor=white)](https://hub.docker.com/repository/docker/shenbourne/clash-configurator)

一个基于 Vue 3 + Express 的 Clash 配置可视化生成和编辑器。

## ✨ 功能特性

- ✅ **配置管理**: 创建、编辑、删除、导入、导出 Clash 配置文件
- ✅ **代理节点管理**: 支持 SS、SSR、VMess、Trojan、VLESS、Hysteria、SOCKS5、HTTP 等协议
- ✅ **代理组配置**: 支持手动选择、自动测速、故障转移、负载均衡等类型
- ✅ **规则编辑**: 支持域名、IP、GEOSITE、进程等多种规则类型
- ✅ **DNS 配置**: 完整的 DNS 配置选项，包括 Fake-IP、fallback 等
- ✅ **高级配置**: Sniffer、TUN、统一延迟等高级选项
- ✅ **YAML 预览**: 实时预览生成的配置文件
- ✅ **导入导出**: 支持 YAML 文件导入导出

## 📦 Docker 部署

### 使用 Docker Compose（推荐）

```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

```yaml
# docker-compose.yml

services:
  clash-configurator:
    image: clash-configurator:latest
    container_name: clash-configurator
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - CORS_ORIGIN=*
    volumes:
      # 配置文件
      - ./data/configs:/app/server/data/configs
      # 规则集
      - ./data/rule-sets:/app/server/data/rule-sets
      # 临时文件
      - ./data/temp:/app/server/data/temp
    restart: unless-stopped
```

服务将在 `http://localhost:3000` 启动。

### 使用 Docker 命令

```bash
# 构建镜像
docker build -t clash-configurator:latest .

# 运行容器
docker run -d \
  --name clash-configurator \
  -p 3000:3000 \
  -v $(pwd)/data/configs:/app/server/data/configs \
  -v $(pwd)/data/rule-sets:/app/server/data/rule-sets \
  -v $(pwd)/data/temp:/app/server/data/temp \
  -e CORS_ORIGIN=* \
  clash-configurator:latest
```

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3000 | 服务监听端口 |
| `CORS_ORIGIN` | `*` | CORS 允许的来源，多个来源用逗号分隔 |
| `NODE_ENV` | production | 运行环境 |

### 数据持久化

Docker 部署时，以下目录需要挂载以保证数据持久化：

- `./data/configs` - Clash 配置文件存储
- `./data/rule-sets` - 规则集文件存储
- `./data/temp` - 临时文件存储

## 🧰 使用说明

### 1. 创建配置

点击「新建配置」按钮，输入配置名称即可创建一个新的 Clash 配置文件。

### 2. 编辑配置

点击配置卡片进入编辑页面，可以配置以下内容：

- **基础配置**: 端口、运行模式、日志级别等
- **代理节点**: 添加和管理代理服务器
- **代理组**: 配置代理组的类型和包含的节点
- **规则**: 配置分流规则
- **DNS**: 配置 DNS 解析选项
- **高级配置**: Sniffer、TUN 等高级选项

### 3. 导入配置

点击「导入配置」按钮，选择 YAML 格式的 Clash 配置文件即可导入。

### 4. 导出配置

在配置列表或编辑页面点击「导出」按钮，即可下载 YAML 配置文件。

## 🚀 快速开始

### 安装依赖

```bash
# 安装所有依赖
npm run install:all

# 或者分别安装
npm install
cd server && npm install
cd ../client && npm install
```

### 开发模式

```bash
# 同时启动前后端开发服务器
npm run dev

# 或者分别启动
npm run dev:server  # 后端服务 http://localhost:3000
npm run dev:client  # 前端服务 http://localhost:5173
```

### 生产构建

```bash
# 构建前端
npm run build

# 启动生产服务器
npm start
```

## ⚙️ 技术栈

### 前端
- Vue 3 + Vite
- Pinia (状态管理)
- Vue Router (路由)
- Element Plus (UI 组件库)
- Axios (HTTP 客户端)

### 后端
- Express.js
- js-yaml (YAML 解析)
- 本地文件存储

## ⛓️ API 接口

### 配置管理
- `GET /api/configs` - 获取配置列表
- `POST /api/configs` - 创建配置
- `GET /api/configs/:id` - 获取配置详情
- `PUT /api/configs/:id` - 更新配置
- `DELETE /api/configs/:id` - 删除配置
- `POST /api/configs/import` - 导入配置
- `GET /api/configs/:id/export` - 导出配置

### 代理节点
- `GET /api/configs/:id/proxies` - 获取代理列表
- `POST /api/configs/:id/proxies` - 添加代理
- `PUT /api/configs/:id/proxies/:name` - 更新代理
- `DELETE /api/configs/:id/proxies/:name` - 删除代理

### 代理组
- `GET /api/configs/:id/groups` - 获取代理组列表
- `POST /api/configs/:id/groups` - 添加代理组
- `PUT /api/configs/:id/groups/:name` - 更新代理组
- `DELETE /api/configs/:id/groups/:name` - 删除代理组

### 规则
- `GET /api/configs/:id/rules` - 获取规则列表
- `PUT /api/configs/:id/rules` - 更新规则列表

### 规则集管理
- `GET /api/rule-sets` - 获取规则集列表
- `POST /api/rule-sets` - 创建规则集
- `GET /api/rule-sets/:id` - 获取规则集详情
- `PUT /api/rule-sets/:id` - 更新规则集
- `DELETE /api/rule-sets/:id` - 删除规则集
- `GET /api/rule-sets/:id/export` - 导出规则集为 YAML
- `GET /api/rule-sets/tags` - 获取规则集标签列表

### DNS
- `GET /api/configs/:id/dns` - 获取 DNS 配置
- `PUT /api/configs/:id/dns` - 更新 DNS 配置

## 📜 许可证

本项目采用 GNU AGPLv3 协议开源。