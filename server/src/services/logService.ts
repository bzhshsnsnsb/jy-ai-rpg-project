export interface AILogEntry {
  id: string;
  requestId: string;
  timestamp: string;
  action: string;
  page: string;
  duration: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  success: boolean;
  error?: string;
  usageMissing?: boolean;
  request?: any;
  response?: any;
}

class LogService {
  private logs: AILogEntry[] = [];
  private maxLogs = 100;

  addLog(entry: Omit<AILogEntry, 'id' | 'timestamp' | 'requestId'>): AILogEntry {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const log: AILogEntry = {
      ...entry,
      requestId,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    return log;
  }

  getLogs(limit = 20): AILogEntry[] {
    return this.logs.slice(0, limit);
  }

  /** 计入「今日调用」的业务动作（不含仅配置检查的 basic 健康检查等） */
  private isBusinessCall(log: AILogEntry): boolean {
    if (log.action === 'health-check' && (log.totalTokens || 0) === 0) return false;
    return true;
  }

  getTodayStats(): { calls: number; tokens: number; failures: number } {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = this.logs.filter(l => l.timestamp.startsWith(today));
    const business = todayLogs.filter(l => this.isBusinessCall(l));
    return {
      calls: business.length,
      tokens: business.reduce((sum, l) => sum + l.totalTokens, 0),
      failures: business.filter(l => !l.success).length,
    };
  }

  getLastError(): string | null {
    const failed = this.logs.find(l => !l.success);
    return failed?.error || null;
  }

  getConnectionStatus(): { connected: boolean; lastError: string | null } {
    return {
      connected: !!process.env.ARK_API_KEY && !!process.env.ARK_MODEL,
      lastError: this.getLastError(),
    };
  }

  getLastSuccessTime(): string | null {
    const success = this.logs.find(l => l.success);
    return success?.timestamp || null;
  }

  getLastFailureTime(): string | null {
    const failed = this.logs.find(l => !l.success);
    return failed?.timestamp || null;
  }

  getLastFailureReason(): string | null {
    const failed = this.logs.find(l => !l.success);
    return failed?.error || null;
  }

  getAverageDuration(): number | null {
    const successLogs = this.logs.filter(l => l.success);
    if (successLogs.length === 0) return null;
    const total = successLogs.reduce((sum, l) => sum + l.duration, 0);
    return Math.round(total / successLogs.length);
  }

  getRateLimitStatus(): { limited: boolean | null; resetTime: string | null; unknown: boolean } {
    const platformConfigured = !!(process.env.ARK_API_KEY && process.env.ARK_MODEL && process.env.ARK_BASE_URL);
    const hasSuccess = this.logs.some(l => l.success);

    // 只有平台连接和模型调用都成功时才显示真实限流状态
    if (!platformConfigured || !hasSuccess) {
      return { limited: null, resetTime: null, unknown: true };
    }

    const recentLogs = this.logs.slice(0, 10);
    const recentFailures = recentLogs.filter(l => !l.success);
    const rateLimited = recentFailures.some(f =>
      f.error?.includes('rate limit') || f.error?.includes('429')
    );

    return {
      limited: rateLimited,
      resetTime: rateLimited ? new Date(Date.now() + 60000).toISOString() : null,
      unknown: false,
    };
  }

  getPlatformStatus(): 'unconfigured' | 'configured' | 'validation_failed' {
    const hasApiKey = !!process.env.ARK_API_KEY;
    const hasBaseUrl = !!process.env.ARK_BASE_URL;
    const hasModel = !!process.env.ARK_MODEL;

    if (!hasApiKey || !hasBaseUrl || !hasModel) {
      return 'unconfigured';
    }

    // 检查最近是否有校验失败的记录
    const recentFailures = this.logs.slice(0, 5);
    const hasAuthError = recentFailures.some(f =>
      f.error?.includes('API Key') ||
      f.error?.includes('401') ||
      f.error?.includes('403') ||
      f.error?.includes('无效') ||
      f.error?.includes('权限')
    );

    return hasAuthError ? 'validation_failed' : 'configured';
  }

  getModelStatus(): 'untested' | 'available' | 'unavailable' {
    const successLogs = this.logs.filter(l => l.success);
    if (successLogs.length === 0) return 'untested';

    // 检查最近是否有模型相关的失败
    const recentFailures = this.logs.slice(0, 5).filter(l => !l.success);
    const hasModelError = recentFailures.some(f =>
      f.error?.includes('模型') ||
      f.error?.includes('model') ||
      f.error?.includes('404') ||
      f.error?.includes('不可用')
    );

    return hasModelError ? 'unavailable' : 'available';
  }

  getBusinessStatus(): 'untested' | 'normal' | 'abnormal' {
    // 只有当 API Key、Base URL、模型都配置完整后才返回具体状态，否则返回 untested
    const hasApiKey = !!process.env.ARK_API_KEY;
    const hasBaseUrl = !!process.env.ARK_BASE_URL;
    const hasModel = !!process.env.ARK_MODEL;

    if (!hasApiKey || !hasBaseUrl || !hasModel) {
      return 'untested';
    }

    const successLogs = this.logs.filter(l => l.success);
    if (successLogs.length === 0) return 'untested';

    // 业务接口通过最近的失败记录判断
    const recentFailures = this.logs.slice(0, 5).filter(l => !l.success);
    const hasBusinessError = recentFailures.some(f =>
      f.error?.includes('业务') ||
      f.error?.includes('服务') ||
      f.error?.includes('服务器')
    );

    return hasBusinessError ? 'abnormal' : 'normal';
  }

  getDetailedStatus(): {
    platformStatus: 'unconfigured' | 'configured' | 'validation_failed';
    modelStatus: 'untested' | 'available' | 'unavailable';
    businessStatus: 'untested' | 'normal' | 'abnormal';
    lastSuccessTime: string | null;
    lastFailureTime: string | null;
    lastFailureReason: string | null;
    averageDuration: number | null;
    rateLimit: { limited: boolean | null; resetTime: string | null; unknown: boolean };
    today: { calls: number | null; tokens: number | null; failures: number | null };
  } {
    const successLogs = this.logs.filter(l => l.success);
    const hasAnySuccess = successLogs.length > 0;

    const todayStats = this.getTodayStats();

    // 始终返回统计数据，无数据时返回 null
    return {
      platformStatus: this.getPlatformStatus(),
      modelStatus: this.getModelStatus(),
      businessStatus: this.getBusinessStatus(),
      lastSuccessTime: this.getLastSuccessTime(),
      lastFailureTime: this.getLastFailureTime(),
      lastFailureReason: hasAnySuccess ? this.getLastFailureReason() : null,
      averageDuration: this.getAverageDuration(),
      rateLimit: this.getRateLimitStatus(),
      today: {
        calls: todayStats.calls > 0 ? todayStats.calls : null,
        tokens: todayStats.tokens > 0 ? todayStats.tokens : null,
        failures: todayStats.failures > 0 ? todayStats.failures : null,
      },
    };
  }
}

export const logService = new LogService();
