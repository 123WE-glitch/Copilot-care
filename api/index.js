// Vercel Serverless Function 入口
const express = require('express');
const serverless = require('serverless-http');

// 导入后端应用
const { app: backendApp } = require('../src/backend/dist/index');

const app = express();

// 整合后端应用，直接使用根路径（因为 vercel.json 已经处理了 /api 前缀）
app.use('/', backendApp);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 导出为 serverless function
module.exports = serverless(app);