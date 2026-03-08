// Vercel Serverless Function 入口
const express = require('express');
const serverless = require('serverless-http');

const app = express();

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 测试路由
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// 导出为 serverless function
module.exports = serverless(app);