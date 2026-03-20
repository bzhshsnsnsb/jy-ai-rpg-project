import { Router } from 'express';
import { generateStats, tuneStats } from '../services/aiService';
import { logService } from '../services/logService';

const router = Router();

// 生成角色数值
router.post('/generate-stats', async (req, res) => {
  const startTime = Date.now();
  const { context } = req.body;

  try {
    const result = await generateStats(context);
    const duration = Date.now() - startTime;
    const usage = result.patch?._usage;
    const totalTokens = usage?.totalTokens || 0;
    const usageMissing = !usage || totalTokens === 0;

    const logEntry = logService.addLog({
      action: 'generate-stats',
      page: context.editor || 'unknown',
      duration,
      inputTokens: usage?.promptTokens || 0,
      outputTokens: usage?.completionTokens || 0,
      totalTokens,
      usageMissing,
      success: !result.error,
      error: result.error,
      request: context,
      response: result,
    });

    res.json({
      ...result,
      fromCache: result.fromCache,
      requestId: logEntry.requestId,
      duration,
      usage: usage ? {
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        usageMissing: false,
      } : {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        usageMissing: true,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const logEntry = logService.addLog({
      action: 'generate-stats',
      page: context?.editor || 'unknown',
      duration,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      usageMissing: true,
      success: false,
      error: error.message,
      request: context,
    });

    res.status(500).json({
      summary: '',
      patch: null,
      warnings: [],
      error: error.message,
      requestId: logEntry.requestId,
      duration,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        usageMissing: true,
      },
    });
  }
});

// 调整数值
router.post('/tune-stats', async (req, res) => {
  const startTime = Date.now();
  const { context } = req.body;

  try {
    const result = await tuneStats(context);
    const duration = Date.now() - startTime;
    const usage = result.patch?._usage;
    const totalTokens = usage?.totalTokens || 0;
    const usageMissing = !usage || totalTokens === 0;

    const logEntry = logService.addLog({
      action: 'tune-stats',
      page: context.currentStats?.editor || 'unknown',
      duration,
      inputTokens: usage?.promptTokens || 0,
      outputTokens: usage?.completionTokens || 0,
      totalTokens,
      usageMissing,
      success: !result.error,
      error: result.error,
      request: context,
      response: result,
    });

    res.json({
      ...result,
      fromCache: result.fromCache,
      requestId: logEntry.requestId,
      duration,
      usage: usage ? {
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        usageMissing: false,
      } : {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        usageMissing: true,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const logEntry = logService.addLog({
      action: 'tune-stats',
      page: context?.currentStats?.editor || 'unknown',
      duration,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      usageMissing: true,
      success: false,
      error: error.message,
      request: context,
    });

    res.status(500).json({
      summary: '',
      patch: null,
      warnings: [],
      error: error.message,
      requestId: logEntry.requestId,
      duration,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        usageMissing: true,
      },
    });
  }
});

// 解释页面配置 - 已移除
export default router;
