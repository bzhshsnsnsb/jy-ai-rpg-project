declare module 'express-session' {
  interface SessionData {
    adminAuthenticated?: boolean;
    loginTime?: string;
  }
}

import path from 'path';
import dotenv from 'dotenv';

// 必须在 import 任何使用 process.env 的模块之前加载 .env
const serverEnv = path.join(__dirname, '..', '.env');
const rootEnv = path.join(process.cwd(), 'server', '.env');
const cwdEnv = path.join(process.cwd(), '.env');
dotenv.config({ path: serverEnv });
if (!process.env.ARK_API_KEY) dotenv.config({ path: rootEnv });
if (!process.env.ARK_API_KEY) dotenv.config({ path: cwdEnv });

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import aiRoutes from './routes/ai';
import adminRoutes from './routes/admin';
import localRoutes from './routes/local';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Session 配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 路由
app.use('/api/ai', aiRoutes);
app.use('/api/local', localRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
