import React, { useState, useEffect } from 'react';
import { Activity, Sparkles, FileText, AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw, Server, Database, Zap } from 'lucide-react';

interface AILogEntry {
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
}

interface AIDetailedStatus {
  platformStatus: 'unconfigured' | 'configured' | 'validation_failed';
  modelStatus: 'untested' | 'available' | 'unavailable';
  businessStatus: 'untested' | 'normal' | 'abnormal';
  lastSuccessTime: string | null;
  lastFailureTime: string | null;
  lastFailureReason: string | null;
  averageDuration: number | null;
  rateLimit: { limited: boolean | null; resetTime: string | null; unknown: boolean };
  today: { calls: number | null; tokens: number | null; failures: number | null };
}

interface ApiKeyInfo {
  apiKeyConfigured: boolean;
  maskedApiKey: string;
  apiKeyPrefix: string;
  baseUrlConfigured: boolean;
  baseUrlDomain: string;
  modelConfigured: boolean;
  modelName: string;
}

interface TestResult {
  success: boolean;
  duration: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usageMissing: boolean;
  requestId: string;
  data?: any;
  error?: string;
}

interface HealthResult {
  status: string;
  mode: string;
  latencyMs: number;
  checks: {
    backendService: boolean;
    adminAuth: boolean;
    envApiKey: boolean;
    envBaseUrl: boolean;
    envModel: boolean;
    configComplete: boolean;
  };
  providerReachable: boolean | null;
  modelAccessible: boolean | null;
  errorCode: string | null;
  message: string;
  missingConfig?: string[];
  requestId?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    usageMissing: boolean;
  };
}

export const AIAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'test' | 'logs' | 'config'>('status');
  const [status, setStatus] = useState<AIDetailedStatus | null>(null);
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [logs, setLogs] = useState<AILogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'error'>('all');
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testType, setTestType] = useState<'connect' | 'generate' | 'tune'>('connect');
  const [healthResult, setHealthResult] = useState<HealthResult | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    fetchDetailedStatus();
    fetchLogs();
    fetchApiKeyInfo();
  }, []);

  const fetchApiKeyInfo = async () => {
    try {
      const res = await fetch('/api/admin/ai/api-key-info', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setApiKeyInfo(data);
      }
    } catch (e) {
      console.error('Failed to fetch API key info', e);
    }
  };

  const fetchDetailedStatus = async () => {
    try {
      // 并行获取详细状态和服务端配置检查结果
      const [statusRes, healthRes] = await Promise.all([
        fetch('/api/admin/ai/detailed-status', { credentials: 'include' }),
        fetch('/api/admin/ai/health?mode=basic', { credentials: 'include' })
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();

        // 合并服务端配置检查结果
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          // 使用服务端的配置验证结果更新状态
          if (healthData.checks && !healthData.checks.configComplete) {
            statusData.platformStatus = 'unconfigured';
            statusData.businessStatus = 'untested';
          }
          // 附加健康检查信息用于显示
          statusData.healthCheck = healthData;
        }

        setStatus(statusData);
      }
    } catch (e) {
      console.error('Failed to fetch status', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/ai/logs', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch logs', e);
    }
  };

  const runHealthTest = async (mode: 'basic' | 'deep' = 'basic') => {
    setHealthLoading(true);
    setHealthResult(null);
    const startTime = Date.now();

    try {
      const res = await fetch(`/api/admin/ai/health?mode=${mode}`, {
        credentials: 'include',
      });
      const data = await res.json();
      const duration = Date.now() - startTime;

      setHealthResult({
        ...data,
        latencyMs: duration,
      });
    } catch (e: any) {
      setHealthResult({
        status: 'error',
        mode,
        latencyMs: Date.now() - startTime,
        checks: {
          backendService: false,
          adminAuth: false,
          envApiKey: false,
          envBaseUrl: false,
          envModel: false,
          configComplete: false,
        },
        providerReachable: false,
        modelAccessible: false,
        errorCode: 'CLIENT_ERROR',
        message: e.message || '未知错误（无 message）',
        requestId: '',
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          usageMissing: true,
        },
      });
    } finally {
      setHealthLoading(false);
    }
  };

  const runTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    const startTime = Date.now();

    try {
      // 测试生成和调整前，先检查配置
      if (testType !== 'connect') {
        const healthRes = await fetch('/api/admin/ai/health?mode=basic', {
          credentials: 'include',
        });
        const healthData = await healthRes.json();

        if (!healthData.checks?.configComplete && healthData.missingConfig?.length > 0) {
          setTestResult({
            success: false,
            duration: Date.now() - startTime,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            usageMissing: true,
            requestId: '',
            error: healthData.missingConfig.join('; ') + ' - ' + healthData.message,
          });
          setTestLoading(false);
          return;
        }
      }

      const context = JSON.parse(testInput || '{}');
      let endpoint = '/api/ai/';
      switch (testType) {
        case 'generate':
          endpoint += 'generate-stats';
          break;
        case 'tune':
          endpoint += 'tune-stats';
          break;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ context }),
      });

      const data = await res.json();
      const duration = Date.now() - startTime;
      const success = res.ok && !data.error;
      const usage = data.usage;

      setTestResult({
        success,
        duration,
        inputTokens: usage?.inputTokens || 0,
        outputTokens: usage?.outputTokens || 0,
        totalTokens: usage?.totalTokens || 0,
        usageMissing: usage?.usageMissing ?? true,
        requestId: data.requestId || '',
        data,
        error: data.error,
      });

      fetchLogs();
      fetchDetailedStatus();
    } catch (e: any) {
      setTestResult({
        success: false,
        duration: Date.now() - startTime,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        usageMissing: true,
        requestId: '',
        error: e.message,
      });
    } finally {
      setTestLoading(false);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const tabs = [
    { id: 'status', label: '状态', icon: <Activity size={14} /> },
    { id: 'config', label: '配置', icon: <Server size={14} /> },
    { id: 'test', label: '测试', icon: <Sparkles size={14} /> },
    { id: 'logs', label: '日志', icon: <FileText size={14} /> },
  ];

  const defaultContext = {
    name: '测试角色',
    job: '战士',
    level: 10,
    role: '物理输出',
    growthType: '均衡',
    editor: 'characters',
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex shrink-0 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-2 px-4 py-2 text-sm transition-colors"
            style={{
              color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {activeTab === 'status' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Server size={18} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>平台连接</span>
                </div>
                <div className="flex items-center gap-2">
                  {status?.platformStatus === 'configured' ? (
                    <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                  ) : status?.platformStatus === 'validation_failed' ? (
                    <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
                  ) : (
                    <XCircle size={20} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                  <span style={{
                    color: status?.platformStatus === 'configured' ? 'var(--color-success)' :
                           status?.platformStatus === 'validation_failed' ? 'var(--color-warning)' :
                           'var(--color-text-muted)'
                  }}>
                    {status?.platformStatus === 'configured' ? '已配置' :
                     status?.platformStatus === 'validation_failed' ? '校验失败' : '未配置'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>模型调用</span>
                </div>
                <div className="flex items-center gap-2">
                  {status?.modelStatus === 'available' ? (
                    <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                  ) : status?.modelStatus === 'unavailable' ? (
                    <XCircle size={20} style={{ color: 'var(--color-error)' }} />
                  ) : (
                    <Clock size={20} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                  <span style={{
                    color: status?.modelStatus === 'available' ? 'var(--color-success)' :
                           status?.modelStatus === 'unavailable' ? 'var(--color-error)' :
                           'var(--color-text-muted)'
                  }}>
                    {status?.modelStatus === 'available' ? '可用' :
                     status?.modelStatus === 'unavailable' ? '不可用' : '--'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Database size={18} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>业务接口</span>
                </div>
                <div className="flex items-center gap-2">
                  {status?.businessStatus === 'normal' ? (
                    <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                  ) : status?.businessStatus === 'abnormal' ? (
                    <XCircle size={20} style={{ color: 'var(--color-error)' }} />
                  ) : (
                    <Clock size={20} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                  <span style={{
                    color: status?.businessStatus === 'normal' ? 'var(--color-success)' :
                           status?.businessStatus === 'abnormal' ? 'var(--color-error)' :
                           'var(--color-text-muted)'
                  }}>
                    {status?.businessStatus === 'normal' ? '正常' :
                     status?.businessStatus === 'abnormal' ? '异常' : '--'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>最近成功时间</p>
                <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {status?.lastSuccessTime ? formatTime(status.lastSuccessTime) : '--'}
                </p>
              </div>
              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>最近失败时间</p>
                <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {status?.lastFailureTime ? formatTime(status.lastFailureTime) : '--'}
                </p>
              </div>
            </div>

            {status?.lastFailureReason && (
              <div className="p-4 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
                  <span className="font-medium" style={{ color: 'var(--color-error)' }}>最近失败原因</span>
                </div>
                <p style={{ color: 'var(--color-text-secondary)' }}>{status.lastFailureReason}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>平均响应时长</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {status?.averageDuration !== undefined && status?.averageDuration !== null ? `${status.averageDuration}ms` : '--'}
                </p>
              </div>
              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>今日调用次数</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {status?.today?.calls !== undefined && status?.today?.calls !== null ? status.today.calls : '--'}
                </p>
              </div>
              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>今日总 Token</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {status?.today?.tokens !== undefined && status?.today?.tokens !== null ? status.today.tokens.toLocaleString() : '--'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>当前限流状态</p>
                <div className="flex items-center gap-2">
                  {status?.platformStatus === 'unconfigured' ? (
                    <>
                      <Clock size={20} style={{ color: 'var(--color-text-muted)' }} />
                      <span style={{ color: 'var(--color-text-muted)' }}>未知</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        (需先完成配置)
                      </span>
                    </>
                  ) : status?.rateLimit?.unknown ? (
                    <>
                      <Clock size={20} style={{ color: 'var(--color-text-muted)' }} />
                      <span style={{ color: 'var(--color-text-muted)' }}>未初始化</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        (需先完成测试)
                      </span>
                    </>
                  ) : status?.rateLimit?.limited ? (
                    <>
                      <XCircle size={20} style={{ color: 'var(--color-error)' }} />
                      <span style={{ color: 'var(--color-error)' }}>受限</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        (预计 {formatTime(status.rateLimit.resetTime)} 恢复)
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                      <span style={{ color: 'var(--color-success)' }}>正常</span>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>今日失败次数</p>
                <p className="text-2xl font-bold" style={{ color: status?.today?.failures ? 'var(--color-error)' : 'var(--color-text-primary)' }}>
                  {status?.today?.failures !== undefined && status?.today?.failures !== null ? status.today.failures : '--'}
                </p>
              </div>
            </div>

            <button
              onClick={fetchDetailedStatus}
              className="px-4 py-2 rounded text-sm flex items-center gap-2"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              <RefreshCw size={14} />
              刷新状态
            </button>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* API Key 显示 */}
              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Server size={18} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>API Key 配置</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>API Key</p>
                      <p className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {apiKeyInfo?.apiKeyConfigured ? apiKeyInfo.maskedApiKey : '未配置'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {apiKeyInfo?.apiKeyConfigured ? (
                        <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
                      ) : (
                        <XCircle size={18} style={{ color: 'var(--color-error)' }} />
                      )}
                      <span style={{ color: apiKeyInfo?.apiKeyConfigured ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {apiKeyInfo?.apiKeyConfigured ? '已配置' : '未配置'}
                      </span>
                    </div>
                  </div>

                  {apiKeyInfo?.apiKeyPrefix && (
                    <div className="text-xs px-3" style={{ color: 'var(--color-text-muted)' }}>
                      前缀: {apiKeyInfo.apiKeyPrefix}****
                    </div>
                  )}
                </div>
              </div>

              {/* Base URL 显示 */}
              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Database size={18} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>API 端点</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Base URL</p>
                      <p className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {apiKeyInfo?.baseUrlConfigured ? apiKeyInfo.baseUrlDomain : '未配置'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {apiKeyInfo?.baseUrlConfigured ? (
                        <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
                      ) : (
                        <XCircle size={18} style={{ color: 'var(--color-error)' }} />
                      )}
                      <span style={{ color: apiKeyInfo?.baseUrlConfigured ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {apiKeyInfo?.baseUrlConfigured ? '已配置' : '未配置'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Model 显示 */}
              <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={18} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>模型配置</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>模型名称</p>
                      <p className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {apiKeyInfo?.modelConfigured ? apiKeyInfo.modelName : '未配置'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {apiKeyInfo?.modelConfigured ? (
                        <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
                      ) : (
                        <XCircle size={18} style={{ color: 'var(--color-error)' }} />
                      )}
                      <span style={{ color: apiKeyInfo?.modelConfigured ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {apiKeyInfo?.modelConfigured ? '已配置' : '未配置'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={fetchApiKeyInfo}
              className="px-4 py-2 rounded text-sm flex items-center gap-2"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              <RefreshCw size={14} />
              刷新配置
            </button>

            <div className="p-3 rounded text-xs" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-text-secondary)' }}>
              <p>注意: API Key 已脱敏显示。如需修改配置，请编辑服务器环境变量文件 (.env)</p>
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div className="flex gap-4 h-full" style={{ minHeight: '500px' }}>
            <div className="w-64 flex flex-col gap-4 shrink-0">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setTestType('connect'); runHealthTest('basic'); }}
                  disabled={healthLoading}
                  className="px-3 py-2 rounded text-sm text-left"
                  style={{
                    background: testType === 'connect' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                    color: testType === 'connect' ? '#fff' : 'var(--color-text-secondary)',
                    opacity: healthLoading ? 0.7 : 1,
                  }}
                >
                  测试连接
                </button>
                <button
                  onClick={() => { setTestType('generate'); setTestInput(JSON.stringify(defaultContext, null, 2)); }}
                  className="px-3 py-2 rounded text-sm text-left"
                  style={{
                    background: testType === 'generate' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                    color: testType === 'generate' ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  测试生成角色数值
                </button>
                <button
                  onClick={() => { setTestType('tune'); setTestInput(JSON.stringify({ currentStats: defaultContext, targetRange: '降低攻击 10%' }, null, 2)); }}
                  className="px-3 py-2 rounded text-sm text-left"
                  style={{
                    background: testType === 'tune' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                    color: testType === 'tune' ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  测试调整当前数值
                </button>
              </div>

              {testType !== 'connect' && (
                <div className="flex-1 flex flex-col">
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>输入 JSON</label>
                  <textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    className="flex-1 w-full p-3 rounded text-sm font-mono resize-none"
                    style={{
                      background: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)',
                    }}
                    placeholder={JSON.stringify(defaultContext, null, 2)}
                  />

                  <button
                    onClick={runTest}
                    disabled={testLoading}
                    className="px-4 py-2 rounded text-sm flex items-center justify-center gap-2 mt-2"
                    style={{ background: 'var(--color-accent)', color: '#fff', opacity: testLoading ? 0.7 : 1 }}
                  >
                    {testLoading ? '测试中...' : '发送测试'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-auto">
              {testType === 'connect' && (
                <div className="space-y-4">
                  {healthLoading && (
                    <p style={{ color: 'var(--color-text-muted)' }}>检查中...</p>
                  )}

                  {!healthLoading && !healthResult && (
                    <p style={{ color: 'var(--color-text-muted)' }}>点击「测试连接」开始检查</p>
                  )}

                  {healthResult && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {healthResult.status === 'healthy' ? (
                          <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                        ) : healthResult.status === 'degraded' ? (
                          <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
                        ) : (
                          <XCircle size={20} style={{ color: 'var(--color-error)' }} />
                        )}
                        <span style={{
                          color: healthResult.status === 'healthy' ? 'var(--color-success)' :
                                 healthResult.status === 'degraded' ? 'var(--color-warning)' : 'var(--color-error)'
                        }}>
                          {healthResult.status === 'healthy' ? '健康' :
                           healthResult.status === 'degraded' ? '降级' : '异常'}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>({healthResult.latencyMs}ms)</span>
                      </div>

                      <div className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                        <p>后端服务: {healthResult.checks?.backendService ? '正常' : '异常'}</p>
                        <p>API Key: {healthResult.checks?.envApiKey ? '已配置' : '未配置'}</p>
                        <p>Base URL: {healthResult.checks?.envBaseUrl ? '已配置' : '未配置'}</p>
                        <p>模型配置: {healthResult.checks?.envModel ? '已配置' : '未配置'}</p>
                        <p>配置完整: {healthResult.checks?.configComplete ? '是' : '否'}</p>
                        {healthResult.missingConfig && healthResult.missingConfig.length > 0 && (
                          <p style={{ color: 'var(--color-warning)' }}>
                            缺失配置: {healthResult.missingConfig.join(', ')}
                          </p>
                        )}
                        {healthResult.mode === 'deep' && (
                          <>
                            <p>上游连通: {healthResult.providerReachable === true ? '可达' : healthResult.providerReachable === false ? '不可达' : '--'}</p>
                            <p>模型可用: {healthResult.modelAccessible === true ? '可用' : healthResult.modelAccessible === false ? '不可用' : '--'}</p>
                          </>
                        )}
                      </div>

                      {healthResult.message && healthResult.message !== 'OK' && (
                        <p className="text-sm" style={{ color: 'var(--color-error)' }}>{healthResult.message}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(testType === 'generate' || testType === 'tune') && testLoading && (
                <div className="p-4 rounded flex items-center gap-2" style={{ background: 'var(--color-bg-secondary)' }}>
                  <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                  <span style={{ color: 'var(--color-text-secondary)' }}>测试中...</span>
                </div>
              )}

              {(testType === 'generate' || testType === 'tune') && !testLoading && !testResult && (
                <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                  <p style={{ color: 'var(--color-text-muted)' }}>点击「发送测试」查看结果</p>
                </div>
              )}

              {(testResult || healthResult) && (
                <div className="space-y-4">
                  {/* 摘要区域 */}
                  <div className="p-4 rounded shrink-0" style={{ background: 'var(--color-bg-secondary)' }}>
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>测试摘要</h3>
                    {testResult ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {testResult.success ? (
                            <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                          ) : (
                            <XCircle size={20} style={{ color: 'var(--color-error)' }} />
                          )}
                          <span style={{ color: testResult.success ? 'var(--color-success)' : 'var(--color-error)' }}>
                            {testResult.success ? '成功' : '失败'}
                          </span>
                          <span style={{ color: 'var(--color-text-muted)' }}>耗时: {testResult.duration}ms</span>
                          {testResult.requestId && (
                            <span className="text-xs font-mono ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                              {testResult.requestId}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Input: </span>
                            <span>{testResult.inputTokens}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Output: </span>
                            <span>{testResult.outputTokens}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Total: </span>
                            <span>{testResult.totalTokens}</span>
                            {testResult.usageMissing && (
                              <span style={{ color: 'var(--color-warning)', marginLeft: '4px' }}>*</span>
                            )}
                          </div>
                        </div>
                        {testResult.error && (
                          <p className="text-sm" style={{ color: 'var(--color-error)' }}>{testResult.error}</p>
                        )}
                      </div>
                    ) : healthResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {healthResult.status === 'healthy' ? (
                            <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
                          ) : healthResult.status === 'degraded' ? (
                            <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                          ) : (
                            <XCircle size={18} style={{ color: 'var(--color-error)' }} />
                          )}
                          <span style={{
                            color: healthResult.status === 'healthy' ? 'var(--color-success)' :
                                   healthResult.status === 'degraded' ? 'var(--color-warning)' : 'var(--color-error)'
                          }}>
                            {healthResult.status === 'healthy' ? '健康' :
                             healthResult.status === 'degraded' ? '降级' : '异常'}
                          </span>
                          <span style={{ color: 'var(--color-text-muted)' }}>({healthResult.latencyMs}ms)</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Input: </span>
                            <span>{healthResult.usage?.inputTokens ?? '--'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Output: </span>
                            <span>{healthResult.usage?.outputTokens ?? '--'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Total: </span>
                            <span>{healthResult.usage?.totalTokens ?? '--'}</span>
                          </div>
                        </div>
                        {healthResult.message && healthResult.message !== 'OK' && (
                          <p className="text-sm" style={{ color: 'var(--color-error)' }}>{healthResult.message}</p>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* 提取后的结果卡片 - 仅成功时显示 patch */}
                  {testResult?.success && testResult?.data?.patch && (
                    <div className="p-4 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
                      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>提取后的结果</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          <thead>
                            <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                              <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-muted)' }}>字段</th>
                              <th className="px-3 py-2 text-right" style={{ color: 'var(--color-text-muted)' }}>建议值</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(testResult.data.patch).map(([key, value]) => (
                              <tr key={key} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                                <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>{key}</td>
                                <td className="px-3 py-2 text-right" style={{ color: 'var(--color-success)' }}>{String(value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {testResult.data.summary && (
                        <div className="mt-3 p-2 rounded text-xs" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                          {testResult.data.summary}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 原始响应 JSON - 默认折叠 */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <details className="w-full">
                      <summary className="cursor-pointer text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        原始响应 JSON
                      </summary>
                      <pre
                        className="p-3 rounded text-xs overflow-auto font-mono"
                        style={{
                          background: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {testResult?.data ? JSON.stringify(testResult.data, null, 2) : '点击"发送测试"查看结果'}
                      </pre>
                    </details>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>调用记录</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setLogFilter('all')}
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      background: logFilter === 'all' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                      color: logFilter === 'all' ? '#fff' : 'var(--color-text-secondary)',
                    }}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setLogFilter('success')}
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      background: logFilter === 'success' ? 'var(--color-success)' : 'var(--color-bg-tertiary)',
                      color: logFilter === 'success' ? '#fff' : 'var(--color-text-secondary)',
                    }}
                  >
                    成功
                  </button>
                  <button
                    onClick={() => setLogFilter('error')}
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      background: logFilter === 'error' ? 'var(--color-error)' : 'var(--color-bg-tertiary)',
                      color: logFilter === 'error' ? '#fff' : 'var(--color-text-secondary)',
                    }}
                  >
                    失败
                  </button>
                </div>
              </div>
              <button
                onClick={fetchLogs}
                className="px-3 py-1 rounded text-xs flex items-center gap-1"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
              >
                <RefreshCw size={12} />
                刷新
              </button>
            </div>

            {(() => {
              const filteredLogs = logs.filter(log => {
                if (logFilter === 'all') return true;
                return logFilter === 'success' ? log.success : !log.success;
              });

              if (filteredLogs.length === 0) {
                return <p className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>--</p>;
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-muted)' }}>时间</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-muted)' }}>动作</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-muted)' }}>来源页面</th>
                        <th className="px-3 py-2 text-center" style={{ color: 'var(--color-text-muted)' }}>状态</th>
                        <th className="px-3 py-2 text-right" style={{ color: 'var(--color-text-muted)' }}>耗时</th>
                        <th className="px-3 py-2 text-right" style={{ color: 'var(--color-text-muted)' }}>Input</th>
                        <th className="px-3 py-2 text-right" style={{ color: 'var(--color-text-muted)' }}>Output</th>
                        <th className="px-3 py-2 text-right" style={{ color: 'var(--color-text-muted)' }}>Total</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-muted)' }}>Request ID</th>
                        <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-muted)' }}>错误信息</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map(log => (
                        <tr
                          key={log.id}
                          className="border-b"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
                        >
                          <td className="px-3 py-2">{formatTime(log.timestamp)}</td>
                          <td className="px-3 py-2">
                            {log.action === 'generate-stats' && '生成数值'}
                            {log.action === 'tune-stats' && '调整数值'}
                            {log.action === 'health-check' && (log.totalTokens > 0 ? '深度健康检查' : '基础健康检查')}
                          </td>
                          <td className="px-3 py-2">{log.page}</td>
                          <td className="px-3 py-2 text-center">
                            {log.success ? (
                              <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--color-success)' }}>
                                成功
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-error)' }}>
                                失败
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{log.duration}ms</td>
                          <td className="px-3 py-2 text-right">{log.inputTokens}</td>
                          <td className="px-3 py-2 text-right">{log.outputTokens}</td>
                          <td className="px-3 py-2 text-right">
                            {log.totalTokens}
                            {log.usageMissing && <span style={{ color: 'var(--color-warning)', marginLeft: '4px' }}>*</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {log.requestId || '-'}
                          </td>
                          <td className="px-3 py-2" style={{ color: log.error ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                            {log.error || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
