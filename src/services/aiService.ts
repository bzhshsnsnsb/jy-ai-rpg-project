// AI Service - 前端调用后端 API
// 所有 AI 调用都走后端，不在浏览器里直接使用 API Key

import type { Character, Job, Skill, Enemy, EnemyGroup, Status, CustomAttribute } from '../types';

// AI调用类型
export type AIOperationType =
  | 'explain-config'
  | 'check-consistency'
  | 'generate-stats'
  | 'adjust-stats'
  | 'explain-formula'
  | 'generate-skill'
  | 'check-encounter'
  | 'analyze-result';

// 优先接入AI的页面
export const AI_ENABLED_PAGES: string[] = [
  'project-rules:attributes',
  'project-rules:damage',
  'statuses',
  'skills',
  'enemygroups',
  'enemies',
  'characters',
  'jobs',
  'balance-analysis',
];

// 不接入AI的区域
export const AI_DISABLED_AREAS: string[] = [
  'database-tree',
  'inline-table-edit',
  'basic-inspector',
  'reference-relation',
  'local-validation',
  'team-stats',
  'default-victory-template',
];

// 检查当前页面是否可调用AI
export function canPageUseAI(editor: string | null, subTab: string | null): boolean {
  if (!editor) return false;

  const pageId = subTab ? `${editor}:${subTab}` : editor;

  // 检查是否在禁用区域
  if (AI_DISABLED_AREAS.some(area => pageId.includes(area))) {
    return false;
  }

  // 检查是否在启用列表中
  return AI_ENABLED_PAGES.some(enabled => pageId.includes(enabled));
}

// 本地校验函数
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateBeforeAI(editor: string | null, entity: any, project: any): ValidationResult {
  const errors: string[] = [];

  if (!editor) {
    return { valid: false, errors: ['请先选择一个页面'] };
  }

  // 检查项目属性列表
  if (project?.rules?.attributes?.length === 0) {
    errors.push('请先在项目规则中添加至少一个自定义属性');
  }

  // 实体相关校验（角色页传的 entity 为 Character：identity.name / levelConfig.initial / jobId）
  if (entity) {
    const entityName = typeof entity.name === 'string' ? entity.name : entity.identity?.name;
    if (!entityName || String(entityName).trim() === '') {
      errors.push('名称不能为空');
    }

    // 角色相关校验
    if (editor === 'characters') {
      if (!entity.jobId) {
        errors.push('请选择职业');
      }
      const level = entity.level ?? entity.levelConfig?.initial;
      if (level === undefined || Number(level) < 1) {
        errors.push('等级必须大于0');
      }
    }

    // 技能相关校验
    if (editor === 'skills') {
      if (!entity.type) {
        errors.push('技能类型不能为空');
      }
    }

    // 敌人相关校验
    if (editor === 'enemies') {
      if (!entity.level || entity.level < 1) {
        errors.push('敌人等级必须大于0');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// 错误类型识别
export function parseAIError(error: string): string {
  const lowerError = error.toLowerCase();

  if (lowerError.includes('503') || lowerError.includes('service unavailable')) {
    return 'AI助手暂不可用';
  }
  if (lowerError.includes('401') || lowerError.includes('unauthorized')) {
    return 'API Key未配置';
  }
  if (lowerError.includes('403') || lowerError.includes('forbidden')) {
    return '服务未开通';
  }
  if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('failed to fetch')) {
    return '网络请求失败';
  }
  if (lowerError.includes('timeout') || lowerError.includes('超时')) {
    return '请求超时';
  }

  return 'AI助手暂不可用';
}

// 构建请求上下文
function buildRequestContext(operation: AIOperationType, context: {
  editor: string;
  entity?: any;
  project?: any;
  params?: Record<string, any>;
}): any {
  const { editor, entity, project, params } = context;

  switch (operation) {
    case 'generate-stats': {
      const name =
        typeof entity?.name === 'string' ? entity.name : entity?.identity?.name;
      const level =
        entity?.level !== undefined
          ? entity.level
          : entity?.levelConfig?.initial ?? 1;
      // 优先用 entity 里直接传进来的 job/jobRole，否则从 project.jobs 查找
      const jobFromEntity = entity?.job;
      const jobRoleFromEntity = entity?.jobRole;
      const jobFromProject = project?.jobs?.find((j: any) => j.id === entity?.jobId)?.name;
      const job = jobFromEntity || jobFromProject;
      if (!job) {
        throw new Error('职业未绑定，无法生成数值。请先在基础信息中选择职业。');
      }
      return {
        name,
        job,
        role: jobRoleFromEntity || entity?.role || entity?.identity?.tags?.[0] || '物理输出',
        level,
        growthType:
          entity?.growthType ||
          (entity?.levelConfig?.inheritJobGrowth ? 'job' : 'custom'),
        attributes: project?.rules?.attributes?.map((a: any) => ({ id: a.id, name: a.name, type: a.type })),
        style: params?.style,
        budget: params?.budget,
        editor,
      };
    }

    case 'adjust-stats': {
      // 必须传递职业信息，否则后端无法按法师/战士等模板调整
      const job = context.job ?? entity?.job ?? (project?.jobs?.find((j: any) => j.id === entity?.jobId)?.name ?? '');
      const name = context.name ?? entity?.identity?.name ?? entity?.name ?? '未命名';
      const level = context.level ?? entity?.levelConfig?.initial ?? entity?.level ?? 1;
      const currentStats = params?.currentStats ?? (entity?.stats ? entity.stats : null);
      console.log('[buildRequestContext adjust-stats] 输入:', { contextJob: context.job, entityJob: entity?.job, projectJobs: project?.jobs?.map((j: any) => j.name), foundJob: job });
      const result = {
        name,
        job,
        level,
        currentStats: currentStats || entity,
        targetRange: params?.targetRange,
        effectiveGoal: context.effectiveGoal ?? params?.targetRange,
        customGoal: context.customGoal ?? '',
        presetTarget: context.presetTarget,
        constraints: params?.constraints,
        simulationSummary: params?.simulationSummary ? {
          winRate: params.simulationSummary.winRate,
          avgTurns: params.simulationSummary.avgTurns,
          avgSurvival: params.simulationSummary.avgSurvival,
          avgDamage: params.simulationSummary.avgDamage,
          topDps: params.simulationSummary.topDps,
          weakest: params.simulationSummary.weakest,
          topSkills: params.simulationSummary.topSkills?.slice(0, 3),
        } : undefined,
        editor,
      };
      console.log('[buildRequestContext adjust-stats] 输出:', JSON.stringify({ name: result.name, job: result.job, level: result.level, effectiveGoal: result.effectiveGoal, customGoal: result.customGoal }, null, 2));
      return result;
    }

    case 'explain-config':
    case 'explain-page':
      return {
        editor,
        entity,
      };

    case 'check-consistency':
      return {
        editor,
        project: {
          attributes: project?.rules?.attributes?.map((a: any) => ({ id: a.id, name: a.name, type: a.type })),
          characters: project?.characters?.map((c: any) => ({ id: c.id, name: c.name, jobId: c.jobId, level: c.level })),
          jobs: project?.jobs?.map((j: any) => ({ id: j.id, name: j.name })),
          skills: project?.skills?.map((s: any) => ({ id: s.id, name: s.name, type: s.type })),
          enemies: project?.enemies?.map((e: any) => ({ id: e.id, name: e.name, level: e.level })),
        },
      };

    default:
      return { editor, entity, project, params };
  }
}

// 调用后端 API
async function callBackendAPI(endpoint: string, context: any): Promise<any> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API调用失败: ${error}`);
  }

  return await response.json();
}

// AI调用请求限制
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 1000; // 1秒内不能重复调用

export function canCallAI(): boolean {
  const now = Date.now();
  if (now - lastCallTime < MIN_CALL_INTERVAL) {
    return false;
  }
  lastCallTime = now;
  return true;
}

// 主AI调用函数
export interface AICallResult {
  success: boolean;
  result?: string;
  error?: string;
  fromCache?: boolean;
}

export async function callAI(
  operation: AIOperationType,
  context: {
    editor: string;
    entity?: any;
    project?: any;
    params?: Record<string, any>;
  }
): Promise<AICallResult> {
  // 检查是否可调用
  if (!canCallAI()) {
    return { success: false, error: '调用过于频繁，请稍后再试' };
  }

  // 检查页面是否支持AI
  if (!canPageUseAI(context.editor, context.params?.subTab)) {
    return { success: false, error: '当前页面不支持AI调用' };
  }

  // 先本地校验
  const validation = validateBeforeAI(context.editor, context.entity, context.project);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('；') };
  }

  // 构建请求上下文
  const requestContext = buildRequestContext(operation, context);

  // 生成数值必须带职业，禁止后端用战士兜底
  if (operation === 'generate-stats') {
    const jobName = requestContext.job != null ? String(requestContext.job).trim() : '';
    if (!jobName) {
      return {
        success: false,
        error: '职业未找到或未绑定，无法生成。请在基础信息中绑定职业，并确认该职业在项目中存在。',
      };
    }
    const entityId = context.entity?.id;
    const jobId = context.entity?.jobId;
    console.log('[callAI generate-stats] 角色ID:', entityId, '职业ID:', jobId, '职业名:', jobName, '请求 payload:', { ...requestContext, attributes: requestContext.attributes?.length });
  }

  // 根据操作类型选择接口
  let endpoint = '';
  switch (operation) {
    case 'generate-stats':
      endpoint = '/api/ai/generate-stats';
      break;
    case 'adjust-stats':
      endpoint = '/api/ai/tune-stats';
      break;
    case 'explain-config':
    case 'explain-page':
      endpoint = '/api/ai/explain-page';
      break;
    default:
      return { success: false, error: '不支持的操作类型' };
  }

  try {
    const response = await callBackendAPI(endpoint, requestContext);

    if (response.error) {
      return {
        success: false,
        error: response.error,
      };
    }

    // 统一处理响应格式
    const resultStr = JSON.stringify({
      summary: response.summary,
      patch: response.patch,
      warnings: response.warnings,
    }, null, 2);

    return { success: true, result: resultStr };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

// 本地一致性检查 - 直接调用后端
export async function callLocalConsistencyCheck(project: any): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  try {
    const response = await fetch('/api/local/check-consistency', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ project })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, result: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}
