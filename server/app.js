const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const configRoutes = require('./routes/config');
const ruleSetRoutes = require('./routes/rule-sets');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 配置 - 限制允许的来源
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};

// 速率限制配置
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 在窗口期内最多 100 个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 中间件
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' })); // 限制请求体大小为 1MB
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api', limiter); // 仅对 API 路由应用速率限制

// 静态文件服务（生产环境）
app.use(express.static(path.join(__dirname, '../client/dist')));

// API 路由
app.use('/api', configRoutes);
app.use('/api', ruleSetRoutes);

// 生产环境 SPA 回退
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || '服务器内部错误'
  });
});

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data/configs');
const tempDir = path.join(__dirname, 'data/temp');
const ruleSetsDir = path.join(__dirname, 'data/rule-sets');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(ruleSetsDir)) {
  fs.mkdirSync(ruleSetsDir, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`🚀 Clash Config Server running at http://localhost:${PORT}`);
  console.log(`📁 Config files stored at: ${dataDir}`);
  console.log(`📁 Rule set files stored at: ${ruleSetsDir}`);
  console.log(`📁 Temp files stored at: ${tempDir}`);
});