import axios from 'axios';
import { clampStats } from '../utils/clampStats';

// 缓存配置
const CACHE_TTL_MS = 5 * 60 * 1000; // 5分钟
interface CacheEntry {
  result: AIResponse;
  timestamp: number;
}
const responseCache = new Map<string, CacheEntry>();

// 生成缓存 key（必须包含 job 以避免法师/战士命中同一缓存）
function generateCacheKey(operation: string, context: any): string {
  const minimalContext = operation === 'generate-stats'
    ? { n: context.name, j: context.job, r: context.role, l: context.level, g: context.growthType, s: context.style }
    : operation === 'tune-stats'
      ? { n: context.name, j: context.job, l: context.level, stats: context.currentStats, t: context.targetRange || context.effectiveGoal }
      : context;
  return `${operation}:${JSON.stringify(minimalContext)}`;
}

// 获取缓存
function getCachedResult(operation: string, context: any): AIResponse | null {
  const key = generateCacheKey(operation, context);
  const entry = responseCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return { ...entry.result, fromCache: true };
  }
  return null;
}

// 设置缓存
function setCachedResult(operation: string, context: any, result: AIResponse): void {
  const key = generateCacheKey(operation, context);
  responseCache.set(key, { result, timestamp: Date.now() });
}

// 每次调用时从 process.env 读取，避免模块加载顺序导致未加载 .env
function getArkConfig() {
  return {
    ARK_API_KEY: process.env.ARK_API_KEY,
    ARK_MODEL: process.env.ARK_MODEL,
    ARK_BASE_URL: process.env.ARK_BASE_URL,
  };
}

export interface AIResponse {
  summary: string;
  patch?: any;
  warnings?: string[];
  error?: string;
  fromCache?: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// 解析 API 错误为具体信息
function parseApiError(error: any, baseUrl?: string, model?: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.error?.message || data?.message || error.message;

    if (!error.response) {
      return `网络连接失败，请检查 API 地址 (${baseUrl || '未配置'}) 是否正确`;
    }

    switch (status) {
      case 401:
        return 'API Key 无效或已过期，请检查 ARK_API_KEY 配置';
      case 403:
        return 'API Key 权限不足，请确认 API Key 具有访问权限';
      case 404:
        return `模型不存在或不可用，请检查 ARK_MODEL 配置 (当前: ${model || '未配置'})`;
      case 422:
        return `模型参数错误，请检查 ARK_MODEL 配置是否正确`;
      case 429:
        return 'API 调用次数已达限制，请稍后重试';
      case 500:
        return 'API 服务器内部错误，请稍后重试';
      case 503:
        return 'API 服务暂时不可用，请稍后重试';
      default:
        return `API 调用失败 (${status}): ${message}`;
    }
  }

  if (error.code === 'ECONNABORTED') {
    return 'API 响应超时 (60秒)，请稍后重试';
  }

  return error.message || '未知错误';
}

// 调用火山引擎 ARK API
export async function callArkAI(prompt: string, systemPrompt?: string): Promise<{ result: string; usage: TokenUsage }> {
  const { ARK_API_KEY, ARK_MODEL, ARK_BASE_URL } = getArkConfig();
  if (!ARK_API_KEY || !ARK_MODEL || !ARK_BASE_URL) {
    throw new Error('ARK API 配置缺失，请检查 .env 文件中的 ARK_API_KEY、ARK_MODEL、ARK_BASE_URL');
  }

  const messages: any[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  try {
    const response = await axios.post(
      `${ARK_BASE_URL}/chat/completions`,
      {
        model: ARK_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ARK_API_KEY}`,
        },
        timeout: 60000,
      }
    );

    const data = response.data;
    const result = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      result,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      }
    };
  } catch (error: any) {
    throw new Error(parseApiError(error, ARK_BASE_URL, ARK_MODEL));
  }
}

// 解析 AI 返回的 JSON
export function parseAIJSON(response: string): AIResponse {
  try {
    // 尝试提取 JSON 块
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                     response.match(/```\n([\s\S]*?)\n```/) ||
                     [null, response];
    
    const jsonStr = jsonMatch[1] || response;
    const parsed = JSON.parse(jsonStr.trim());
    
    return {
      summary: parsed.summary || '',
      patch: parsed.patch || parsed.changes || null,
      warnings: parsed.warnings || [],
    };
  } catch (e) {
    // 如果解析失败，返回原始内容作为 summary
    return {
      summary: response,
      patch: null,
      warnings: ['Failed to parse AI response as JSON'],
    };
  }
}

// 生成角色数值（必须基于当前职业，禁止默认战士）
export async function generateStats(context: {
  name: string;
  job?: string;
  role?: string;
  level?: number;
  growthType?: string;
  attributes?: any[];
  style?: string;
  budget?: string;
}): Promise<AIResponse> {
  const job = context.job != null ? String(context.job).trim() : '';
  if (!job) {
    const err = '职业不能为空，生成必须基于当前职业，请先在基础信息中绑定职业。';
    console.log('[generateStats] 拒绝生成: 职业缺失', { name: context.name, level: context.level });
    return { summary: '', patch: null, warnings: [], error: err };
  }

  console.log('[generateStats] 请求', { name: context.name, job, level: context.level, role: context.role });

  // 缓存检查
  const cached = getCachedResult('generate-stats', context);
  if (cached) {
    console.log('[generateStats] 命中缓存', { job });
    return cached;
  }

  // 精简输入字段
  const minimalContext = {
    n: context.name,
    j: context.job,
    r: context.role,
    l: context.level,
    g: context.growthType,
    s: context.style,
  };

  const prompt = `生成角色数值，只返回JSON。
【关键】必须严格按照以下职业 j 生成数值：
- 战士(warrior)：高HP、高物攻、高物防、低MP、低魔攻，角色定位 role=${context.role}
- 法师(mage)：低HP、低物攻、高MP、高魔攻、高魔防，角色定位 role=${context.role}
- 牧师(priest)：中等HP、高MP、治疗加成、低攻击，角色定位 role=${context.role}
- 刺客(assassin)：低HP、高暴击、高速度、低防御，角色定位 role=${context.role}
禁止使用战士模板生成法师/牧师/刺客，也禁止用战士数值替代其他职业。

返回格式：
{"summary":"...","patch":{"hp":0,"mp":0,"attack":0,"defense":0,"speed":0,"magicAttack":0,"magicDefense":0,"healPower":0,"critRate":0,"critDamage":0},"warnings":[]}
角色：${JSON.stringify(minimalContext)}`;
  console.log('[generateStats] prompt 角色上下文', minimalContext);

  try {
    const { result, usage } = await callArkAI(prompt);
    const parsed = parseAIJSON(result);

    // 数值边界保护
    const clampedPatch = parsed.patch ? clampStats(parsed.patch) : null;
    console.log('[generateStats] 原始响应:', parsed.patch);
    console.log('[generateStats] 边界修正:', clampedPatch);

    const finalResult = { ...parsed, patch: { ...clampedPatch, _usage: usage } };
    setCachedResult('generate-stats', context, finalResult);
    console.log('[generateStats] 响应绑定', { job, summary: finalResult.summary, patchKeys: parsed.patch ? Object.keys(parsed.patch) : [] });
    return finalResult;
  } catch (error: any) {
    return {
      summary: '',
      patch: null,
      warnings: [],
      error: error.message || 'AI call failed',
    };
  }
}

// 调整数值（必须传递职业以保留职业模板）
export async function tuneStats(context: {
  name?: string;
  job?: string;
  level?: number;
  currentStats: any;
  targetRange?: string;
  effectiveGoal?: string;
  constraints?: string;
  simulationSummary?: any;
}): Promise<AIResponse> {
  const job = context.job || '';
  console.log('[tuneStats] 完整请求上下文:', JSON.stringify({
    name: context.name,
    job: context.job,
    jobRaw: typeof context.job,
    level: context.level,
    currentStats: context.currentStats,
    customGoal: (context as any).customGoal,
    effectiveGoal: context.effectiveGoal,
    targetRange: context.targetRange,
    presetTarget: (context as any).presetTarget,
  }, null, 2));
  console.log('[tuneStats] 请求', {
    name: context.name,
    job,
    level: context.level,
    customGoal: (context as any).customGoal,
    effectiveGoal: context.effectiveGoal || context.targetRange,
  });

  // 缓存检查
  const cached = getCachedResult('tune-stats', context);
  if (cached) {
    console.log('[tuneStats] 命中缓存', { job });
    return cached;
  }

  // 精简输入：只保留数值字段
  const numericStats: Record<string, number> = {};
  if (context.currentStats) {
    for (const [key, value] of Object.entries(context.currentStats)) {
      if (typeof value === 'number') {
        numericStats[key] = value;
      }
    }
  }

  // 职业定位约束（必须保留职业模板）
  const jobConstraint = job ? `
【关键】职业定位约束（必须遵守）：
- 战士：HP 1200+, 物攻 110+, 物防 80+, MP 80, 魔攻 30
- 法师：HP 600, MP 150+, 魔攻 120+, 魔防 70+, 物攻 30
- 牧师：HP 700, MP 120+, 治疗加成, 魔攻 60
- 刺客：HP 550, 速度 120+, 暴击 15+, 物攻 130, 物防 25
当前职业：${job}，不得套用其他职业模板。` : '';

  const prompt = `你是回合制RPG数值助手。只返回JSON，不要解释。
${jobConstraint}
当前角色：${context.name || '未命名'} 职业：${job || '未设置'} 等级：${context.level || 1}
当前数值：${JSON.stringify(numericStats)}
调整目标：${context.effectiveGoal || context.targetRange || '均衡发展'}

要求：
1. 保留职业定位，不得改成其他职业模板
2. 只返回最终 patch（绝对值），不返回增减
3. 禁止负数：hp>=1, mp>=0, attack>=0, defense>=0, speed>=0, magicAttack>=0, magicDefense>=0, healPower>=0
4. critRate 范围 0-100
5. critDamage 最低 100

返回格式：{"summary":"...","patch":{"hp":0,"mp":0,"attack":0,"defense":0,"speed":0,"magicAttack":0,"magicDefense":0,"healPower":0,"critRate":0,"critDamage":0},"warnings":[]}`;

  console.log('[tuneStats] prompt:', prompt.substring(0, 200) + '...');

  try {
    const { result, usage } = await callArkAI(prompt);
    const parsed = parseAIJSON(result);

    // 数值边界保护
    const clampedPatch = parsed.patch ? clampStats(parsed.patch) : null;
    console.log('[tuneStats] 原始响应:', parsed.patch);
    console.log('[tuneStats] 边界修正:', clampedPatch);

    const finalResult = { ...parsed, patch: { ...clampedPatch, _usage: usage } };
    setCachedResult('tune-stats', context, finalResult);
    console.log('[tuneStats] 响应', { job, summary: finalResult.summary });
    return finalResult;
  } catch (error: any) {
    return {
      summary: '',
      patch: null,
      warnings: [],
      error: error.message || 'AI call failed',
    };
  }
}

// 解释页面配置
export async function explainPage(context: {
  editor: string;
  entity?: any;
}): Promise<AIResponse> {
  const prompt = `请解释当前${context.editor}页面的配置含义。只返回JSON格式：
{
  "summary": "解释摘要",
  "patch": {
    "descriptions": [
      {"field": "字段名", "description": "说明"}
    ]
  },
  "warnings": []
}
实体数据: ${JSON.stringify(context.entity)}`;

  try {
    const { result, usage } = await callArkAI(prompt);
    const parsed = parseAIJSON(result);
    return { ...parsed, patch: { ...parsed.patch, _usage: usage } };
  } catch (error: any) {
    return {
      summary: '',
      patch: null,
      warnings: [],
      error: error.message || 'AI call failed',
    };
  }
}
