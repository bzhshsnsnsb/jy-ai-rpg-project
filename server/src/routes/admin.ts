import { Router, Request, Response } from 'express';
import { requireAuth, isAuthenticated } from '../middleware/auth';
import { logService, AILogEntry } from '../services/logService';
import { callArkAI } from '../services/aiService';

const router = Router();

// 登录
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin password not configured' });
  }

  if (username === adminUsername && password === adminPassword) {
    req.session.adminAuthenticated = true;
    req.session.loginTime = new Date().toISOString();
    return res.json({ success: true, message: 'Login successful' });
  }

  res.status(401).json({ error: 'Invalid username or password' });
});

// 登出
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// 检查认证状态
router.get('/status', (req: Request, res: Response) => {
  res.json({ authenticated: isAuthenticated(req as any) });
});

// 获取 AI 日志 (需要管理员权限)
router.get('/ai/logs', requireAuth, (req: Request, res: Response) => {
  // 只返回业务调用日志（过滤掉 basic 健康检查等非业务日志）
  const allLogs = logService.getLogs(100);
  const businessLogs = allLogs.filter((log: AILogEntry) => {
    if (log.action === 'health-check' && (log.totalTokens || 0) === 0) return false;
    return true;
  });
  res.json({ logs: businessLogs.slice(0, 20) });
});

// 获取 AI 状态 (需要管理员权限)
router.get('/ai/status', requireAuth, (req: Request, res: Response) => {
  const stats = logService.getTodayStats();
  const connection = logService.getConnectionStatus();
  const lastError = logService.getLastError();

  res.json({
    connected: connection.connected,
    lastError,
    today: stats,
  });
});

// 获取 AI 详细状态 (需要管理员权限)
router.get('/ai/detailed-status', requireAuth, (req: Request, res: Response) => {
  const detailedStatus = logService.getDetailedStatus();
  res.json(detailedStatus);
});

// 获取 API Key 配置信息 (脱敏显示)
router.get('/ai/api-key-info', requireAuth, (req: Request, res: Response) => {
  const apiKey = process.env.ARK_API_KEY || '';
  const baseUrl = process.env.ARK_BASE_URL || '';
  const model = process.env.ARK_MODEL || '';

  // 脱敏处理 API Key
  let maskedApiKey = '未配置';
  if (apiKey) {
    if (apiKey.length <= 8) {
      maskedApiKey = apiKey.substring(0, 4) + '****';
    } else {
      maskedApiKey = apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 4);
    }
  }

  // 解析 baseUrl 获取域名
  let baseUrlDomain = '未配置';
  if (baseUrl) {
    try {
      const urlObj = new URL(baseUrl);
      baseUrlDomain = urlObj.hostname;
    } catch {
      baseUrlDomain = baseUrl;
    }
  }

  res.json({
    apiKeyConfigured: !!apiKey,
    maskedApiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 7) : '',
    baseUrlConfigured: !!baseUrl,
    baseUrlDomain,
    modelConfigured: !!model,
    modelName: model,
  });
});

// AI 健康检查端点
router.get('/ai/health', requireAuth, async (req: Request, res: Response) => {
  const mode = (req.query.mode as string) || 'basic';
  const startTime = Date.now();

  const hasApiKey = !!process.env.ARK_API_KEY;
  const hasBaseUrl = !!process.env.ARK_BASE_URL;
  const hasModel = !!process.env.ARK_MODEL;

  const checks = {
    backendService: true,
    adminAuth: true,
    envApiKey: hasApiKey,
    envBaseUrl: hasBaseUrl,
    envModel: hasModel,
    configComplete: hasApiKey && hasBaseUrl && hasModel,
  };

  const configComplete = checks.configComplete;

  // 构建缺失配置列表
  const missingConfig: string[] = [];
  if (!hasApiKey) missingConfig.push('ARK_API_KEY');
  if (!hasBaseUrl) missingConfig.push('ARK_BASE_URL');
  if (!hasModel) missingConfig.push('MODEL');

  // 构建具体错误信息
  let errorMessage = '';
  if (!hasApiKey) {
    errorMessage = 'ARK_API_KEY missing';
  } else if (!hasBaseUrl) {
    errorMessage = 'ARK_BASE_URL missing';
  } else if (!hasModel) {
    errorMessage = 'MODEL missing';
  }

  // deep 模式下发起实际请求测试
  let providerReachable = false;
  let modelAccessible = false;
  let errorCode = null;
  let message = 'OK';
  let usage = null;
  let requestId = '';
  let success = false;

  if (mode === 'deep' && configComplete) {
    try {
      const testResult = await callArkAI('Hello', 'Reply with "OK"');
      const latencyMs = Date.now() - startTime;
      usage = {
        inputTokens: testResult.usage.promptTokens,
        outputTokens: testResult.usage.completionTokens,
        totalTokens: testResult.usage.totalTokens,
        usageMissing: false,
      };

      if (testResult.result && testResult.result.toLowerCase().includes('ok')) {
        providerReachable = true;
        modelAccessible = true;
        message = 'AI service is reachable and responding';
        success = true;
      } else {
        message = 'AI responded but content unexpected';
      }

      // 记录日志
      const logEntry = logService.addLog({
        action: 'health-check',
        page: 'admin',
        duration: latencyMs,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        usageMissing: false,
        success,
        error: success ? undefined : message,
      });
      requestId = logEntry.requestId;

      res.json({
        status: 'healthy',
        mode,
        latencyMs,
        checks,
        providerReachable,
        modelAccessible,
        errorCode,
        message,
        missingConfig: [],
        requestId,
        usage,
      });
      return;
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      providerReachable = false;
      modelAccessible = false;
      success = false;

      // 解析错误码
      if (error.message.includes('401') || error.message.includes('API Key') || error.message.includes('无效')) {
        errorCode = 'AUTH_ERROR';
        message = 'API Key 无效或已过期';
      } else if (error.message.includes('403') || error.message.includes('权限')) {
        errorCode = 'FORBIDDEN';
        message = 'API Key 权限不足';
      } else if (error.message.includes('404') || error.message.includes('模型')) {
        errorCode = 'MODEL_NOT_FOUND';
        message = '模型不存在或不可用';
      } else if (error.message.includes('429') || error.message.includes('限制')) {
        errorCode = 'RATE_LIMITED';
        message = 'API 调用次数已达限制';
      } else if (error.message.includes('ECONNABORTED') || error.message.includes('超时')) {
        errorCode = 'TIMEOUT';
        message = 'API 响应超时';
      } else if (error.message.includes('网络') || error.message.includes('连接')) {
        errorCode = 'NETWORK_ERROR';
        message = error.message;
      } else {
        errorCode = 'UNKNOWN';
        message = error.message || '未知错误（无 message）';
      }

      // 记录日志
      const logEntry = logService.addLog({
        action: 'health-check',
        page: 'admin',
        duration: latencyMs,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        usageMissing: true,
        success: false,
        error: message,
      });
      requestId = logEntry.requestId;

      res.json({
        status: 'unhealthy',
        mode,
        latencyMs,
        checks,
        providerReachable,
        modelAccessible,
        errorCode,
        message,
        missingConfig,
        requestId,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          usageMissing: true,
        },
      });
      return;
    }
  }

  // basic 模式：仅读配置，不向大模型发请求 —— 不写入调用日志，避免刷新后台即刷出一条「调用」
  const latencyMs = Date.now() - startTime;
  const status = configComplete ? 'healthy' : 'degraded';
  success = configComplete;
  requestId = `health-basic-${Date.now()}`;

  res.json({
    status,
    mode,
    latencyMs,
    checks,
    providerReachable: null,
    modelAccessible: null,
    errorCode: configComplete ? null : 'CONFIG_INCOMPLETE',
    message: configComplete ? 'Configuration complete' : errorMessage || 'Missing required environment variables',
    missingConfig,
    requestId,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      usageMissing: true,
    },
  });
});

export default router;
