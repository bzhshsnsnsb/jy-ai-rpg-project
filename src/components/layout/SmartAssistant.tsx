import React, { useState, useMemo } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useProjectStore } from '../../stores/projectStore';
import {
  Sparkles, ChevronDown, ChevronRight, Zap,
  CheckCircle, Brain, Loader2, X, Clock, Activity, Shield, AlertTriangle, AlertCircle, Info, ExternalLink
} from 'lucide-react';
import { callAI, canPageUseAI, type AIOperationType, type AICallResult, parseAIError, callLocalConsistencyCheck } from '../../services/aiService';

interface AISuggestion {
  id: string;
  shortDesc: string;
  fullDesc: string;
  timestamp: number;
  fromCache: boolean;
  operation: string;
  errorCount?: number;
  warningCount?: number;
  entityCount?: number;
  issues?: IssueGroup[];
}

interface IssueGroup {
  type: 'missing-field' | 'invalid-level' | 'invalid-ref' | 'missing-unit';
  label: string;
  items: string[];
}

// 快捷动作类型
interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  operation: AIOperationType;
  requiresEntity?: boolean;
  requiresAI?: boolean;
}

// 动作列表：只保留两个核心动作
const quickActions: QuickAction[] = [
  { id: 'check-consistency', label: '检查一致性', icon: <Shield size={14} />, operation: 'check-consistency', requiresAI: false },
  { id: 'generate-stats', label: 'AI生成数值', icon: <Activity size={14} />, operation: 'generate-stats', requiresEntity: true, requiresAI: true },
];

// 本地存储最近结果
const RECENT_RESULTS_KEY = 'ai-recent-results';
const MAX_RECENT_RESULTS = 3;

function getRecentResults(): AISuggestion[] {
  try {
    const stored = localStorage.getItem(RECENT_RESULTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentResult(suggestion: AISuggestion): void {
  try {
    const existing = getRecentResults();
    const updated = [suggestion, ...existing].slice(0, MAX_RECENT_RESULTS);
    localStorage.setItem(RECENT_RESULTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

// 根据当前页面获取可用的动作
function getAvailableActions(activeEditor: string | null): { check: boolean, generate: boolean, hint?: string } {
  const isEntityPage = ['characters', 'jobs', 'enemies'].includes(activeEditor || '');

  if (isEntityPage) {
    return { check: true, generate: true };
  }

  return {
    check: true,
    generate: false,
    hint: '请进入角色/职业/敌人页面使用 AI 生成数值'
  };
}

// 解析问题文本为分组
function parseIssuesToGroups(text: string): { errorCount: number; warningCount: number; entityCount: number; groups: IssueGroup[] } {
  const errorCount = (text.match(/错误/g) || []).length;
  const warningCount = (text.match(/警告|提示/g) || []).length;
  const entityCount = (text.match(/【[^】]+】/g) || []).length;

  const groups: IssueGroup[] = [];
  
  // 缺字段
  const missingFieldMatch = text.match(/缺[少漏]字段[：:]\s*([^\n]+)/);
  if (missingFieldMatch) {
    groups.push({
      type: 'missing-field',
      label: '缺字段',
      items: missingFieldMatch[1].split(/[,，、]/).filter(Boolean)
    });
  }
  
  // 无效等级
  const invalidLevelMatch = text.match(/无效等[级極][：:]\s*([^\n]+)/);
  if (invalidLevelMatch) {
    groups.push({
      type: 'invalid-level',
      label: '无效等级',
      items: invalidLevelMatch[1].split(/[,，、]/).filter(Boolean)
    });
  }
  
  // 无效引用
  const invalidRefMatch = text.match(/无效引用[：:]\s*([^\n]+)/);
  if (invalidRefMatch) {
    groups.push({
      type: 'invalid-ref',
      label: '无效引用',
      items: invalidRefMatch[1].split(/[,，、]/).filter(Boolean)
    });
  }
  
  // 单位缺失
  const missingUnitMatch = text.match(/单位缺失[：:]\s*([^\n]+)/);
  if (missingUnitMatch) {
    groups.push({
      type: 'missing-unit',
      label: '单位缺失',
      items: missingUnitMatch[1].split(/[,，、]/).filter(Boolean)
    });
  }

  return { errorCount, warningCount, entityCount, groups };
}

export const SmartAssistant: React.FC = () => {
  const { activeEditor, activeEntityId, activeSubTab } = useEditorStore();
  const { project } = useProjectStore();

  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<AICallResult | null>(null);
  const [recentResults, setRecentResults] = useState<AISuggestion[]>(getRecentResults);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  const [expandedSections, setExpandedSections] = useState({
    quickActions: true,
    currentStatus: true,
    recentResults: false,
    aiSuggestions: false,
    moreActions: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // 当前页面是否支持AI
  const pageSupportsAI = useMemo(() => {
    return canPageUseAI(activeEditor, activeSubTab);
  }, [activeEditor, activeSubTab]);

  // 获取当前实体
  const getCurrentEntity = useMemo(() => {
    if (!activeEntityId) return null;

    switch (activeEditor) {
      case 'characters':
        return project.characters.find(c => c.id === activeEntityId);
      case 'jobs':
        return project.jobs.find(j => j.id === activeEntityId);
      case 'skills':
        return project.skills.find(s => s.id === activeEntityId);
      case 'statuses':
        return project.statuses.find(s => s.id === activeEntityId);
      case 'enemies':
        return project.enemies.find(e => e.id === activeEntityId);
      case 'enemygroups':
        return project.enemyGroups.find(g => g.id === activeEntityId);
      default:
        return null;
    }
  }, [activeEditor, activeEntityId, project]);

  // 获取禁用原因
  const getDisabledReason = (action: QuickAction): string => {
    if (!action.requiresAI) return '';

    if (action.requiresEntity && !getCurrentEntity) {
      return `请先选择一个${activeEditor === 'characters' ? '角色' : activeEditor === 'jobs' ? '职业' : activeEditor === 'enemies' ? '敌人' : '实体'}`;
    }

    return '';
  };

  // 检查动作是否应该禁用
  const isActionDisabled = (action: QuickAction): boolean => {
    if (!action.requiresAI) return false;
    if (action.requiresEntity && !getCurrentEntity) return true;
    return false;
  };

  // 跳转到目标页面
  const navigateToPage = (targetPage: string) => {
    // 使用 editorStore 的 setActiveEditor
    const { setActiveEditor } = useEditorStore.getState?.() || {};
    if (setActiveEditor) {
      setActiveEditor(targetPage as any);
    }
  };

  // 执行本地校验
  const performLocalValidation = async (): Promise<string[]> => {
    try {
      const result = await callLocalConsistencyCheck(project);
      if (result.success && result.result) {
        const { errors, warnings, info } = result.result;
        const allMessages = [
          ...errors.map((e: any) => `错误: ${e.message}`),
          ...warnings.map((w: any) => `警告: ${w.message}`),
          ...info.map((i: any) => `提示: ${i.message}`),
        ];
        return allMessages;
      }
      return result.error ? [result.error] : ['检查失败'];
    } catch (e) {
      return ['本地一致性检查失败'];
    }
  };

  // 解析本地校验结果为分组
  const parseValidationResult = (messages: string[]): { errorCount: number; warningCount: number; entityCount: number; groups: IssueGroup[] } => {
    const errors = messages.filter(m => m.startsWith('错误'));
    const warnings = messages.filter(m => m.startsWith('警告'));
    const infoMessages = messages.filter(m => m.startsWith('提示'));

    // 解析消息中的字段信息
    const groups: IssueGroup[] = [];

    // 按类型分组
    const missingFieldItems: string[] = [];
    const invalidLevelItems: string[] = [];
    const invalidRefItems: string[] = [];
    const missingUnitItems: string[] = [];

    messages.forEach(msg => {
      if (msg.includes('缺少名称')) {
        missingFieldItems.push(extractEntityInfo(msg));
      } else if (msg.includes('等级无效') || msg.includes('等级无效')) {
        invalidLevelItems.push(extractEntityInfo(msg));
      } else if (msg.includes('不存在') || msg.includes('无效引用')) {
        invalidRefItems.push(extractEntityInfo(msg));
      } else if (msg.includes('单位')) {
        missingUnitItems.push(extractEntityInfo(msg));
      }
    });

    if (missingFieldItems.length > 0) {
      groups.push({ type: 'missing-field', label: '缺字段', items: missingFieldItems });
    }
    if (invalidLevelItems.length > 0) {
      groups.push({ type: 'invalid-level', label: '无效等级', items: invalidLevelItems });
    }
    if (invalidRefItems.length > 0) {
      groups.push({ type: 'invalid-ref', label: '无效引用', items: invalidRefItems });
    }
    if (missingUnitItems.length > 0) {
      groups.push({ type: 'missing-unit', label: '单位缺失', items: missingUnitItems });
    }

    return {
      errorCount: errors.length,
      warningCount: warnings.length + infoMessages.length,
      entityCount: Math.max(errors.length, warnings.length),
      groups,
    };
  };

  // 从错误消息中提取实体信息
  const extractEntityInfo = (msg: string): string => {
    // 匹配 "角色 xxx" 或 "ID=xxx" 等模式
    const match = msg.match(/[^\s=]+(?:ID=["']?([^"'\s]+)["']?|["']([^"']+)["'])/);
    if (match) {
      return match[1] || match[2] || msg.substring(0, 30);
    }
    return msg.substring(0, 30);
  };

  // 执行AI操作
  const executeAction = async (action: QuickAction) => {
    // 本地校验动作
    if (action.operation === 'check-consistency') {
      setIsLoading(true);
      setLastResult(null);
      setExpandedSections(prev => ({ ...prev, aiSuggestions: true }));

      const validationErrors = await performLocalValidation();
      setIsLoading(false);

      const parsed = parseValidationResult(validationErrors);
      const resultText = validationErrors.length === 0
        ? '配置检查通过，未发现数值不一致问题'
        : `发现 ${validationErrors.length} 个问题:\n${validationErrors.map(e => '- ' + e).join('\n')}`;

      setLastResult({
        success: validationErrors.length === 0,
        result: resultText
      });

      const suggestion: AISuggestion = {
        id: `suggestion-${Date.now()}`,
        shortDesc: validationErrors.length === 0 ? '配置检查通过' : `错误${parsed.errorCount} 警告${parsed.warningCount}`,
        fullDesc: resultText,
        timestamp: Date.now(),
        fromCache: false,
        operation: action.label,
        ...parsed,
      };
      saveRecentResult(suggestion);
      setRecentResults(getRecentResults());
      return;
    }

    // 检查动作是否可用
    if (isActionDisabled(action)) {
      if (action.requiresEntity && !getCurrentEntity) {
        setLastResult({
          success: false,
          error: `请先选择一个${activeEditor === 'characters' ? '角色' : activeEditor === 'jobs' ? '职业' : '实体'}`
        });
        setExpandedSections(prev => ({ ...prev, aiSuggestions: true }));
        return;
      }
    }

    if (action.requiresEntity && !getCurrentEntity) {
      setLastResult({
        success: false,
        error: `请先选择一个${activeEditor === 'characters' ? '角色' : activeEditor === 'jobs' ? '职业' : '实体'}`
      });
      setExpandedSections(prev => ({ ...prev, aiSuggestions: true }));
      return;
    }

    // 自定义属性页检查
    if (activeEditor === 'project-rules' && activeSubTab === 'attributes') {
      const attrs = project.rules.attributes;
      if (attrs.length === 0) {
        setLastResult({
          success: false,
          error: '请先添加至少一个自定义属性'
        });
        setExpandedSections(prev => ({ ...prev, aiSuggestions: true }));
        return;
      }
    }

    setIsLoading(true);
    setLastResult(null);
    setExpandedSections(prev => ({ ...prev, aiSuggestions: true }));

    try {
      const result = await callAI(
        action.operation,
        {
          editor: activeEditor || 'unknown',
          entity: getCurrentEntity,
          project: project,
          params: { subTab: activeSubTab }
        }
      );

      if (!result.success && result.error) {
        result.error = parseAIError(result.error);
      }

      setLastResult(result);

      if (result.success && result.result) {
        const suggestion: AISuggestion = {
          id: `suggestion-${Date.now()}`,
          shortDesc: result.result.substring(0, 50) + (result.result.length > 50 ? '...' : ''),
          fullDesc: result.result,
          timestamp: Date.now(),
          fromCache: result.fromCache || false,
          operation: action.label
        };
        saveRecentResult(suggestion);
        setRecentResults(getRecentResults());
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '调用失败';
      setLastResult({
        success: false,
        error: parseAIError(errorMsg) || '操作失败，请重试'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 切换建议展开状态
  const toggleSuggestionExpand = (id: string) => {
    setExpandedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 获取当前页面可用的动作
  const availableActions = useMemo(() => {
    return getAvailableActions(activeEditor);
  }, [activeEditor]);

  // 判断当前页面是否为实体编辑页
  const isEntityPage = ['characters', 'jobs', 'enemies'].includes(activeEditor || '');

  // 获取页面名称
  const getPageName = (page: string): string => {
    const names: Record<string, string> = {
      characters: '角色',
      jobs: '职业',
      enemies: '敌人',
      skills: '技能',
      statuses: '状态',
      'project-rules': '项目设置',
    };
    return names[page] || page;
  };

  // 获取当前状态说明
  const getCurrentStatusText = () => {
    if (!activeEditor) return '请选择一个页面';
    if (isEntityPage) return '检查一致性、AI生成数值';
    return '检查一致性';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div
        className="h-8 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
          <Sparkles size={12} style={{ color: 'var(--color-accent)' }} />
          AI助手
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {/* 1. 快捷动作 */}
        <div className="inspector-section">
          <div
            className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => toggleSection('quickActions')}
          >
            {expandedSections.quickActions ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Zap size={12} style={{ color: 'var(--color-accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>快捷动作</span>
          </div>

          {expandedSections.quickActions && (
            <div className="px-3 pb-2 space-y-2">
              {/* 两个核心动作按钮 */}
              <div className="grid grid-cols-2 gap-2">
                {/* 检查一致性 - 始终可用 */}
                <button
                  onClick={() => executeAction(quickActions[0])}
                  className="flex flex-col items-center justify-center p-2 rounded gap-1 transition-colors hover:bg-[var(--color-bg-tertiary)]"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                >
                  <span style={{ color: 'var(--color-accent)' }}>{quickActions[0].icon}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{quickActions[0].label}</span>
                </button>

                {/* 生成数值 - 根据页面可用性显示按钮或提示 */}
                {isEntityPage ? (
                  <button
                    onClick={() => executeAction(quickActions[1])}
                    className="flex flex-col items-center justify-center p-2 rounded gap-1 transition-colors hover:bg-[var(--color-bg-tertiary)]"
                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    <span style={{ color: 'var(--color-accent)' }}>{quickActions[1].icon}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{quickActions[1].label}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // 跳转到角色页面
                      const { setActiveEditor } = useEditorStore.getState?.() || {};
                      if (setActiveEditor) {
                        setActiveEditor('characters' as any);
                      }
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded gap-1 transition-colors hover:bg-[var(--color-bg-tertiary)]"
                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                    title="点击跳转到角色页面"
                  >
                    <span style={{ color: 'var(--color-accent)' }}>{quickActions[1].icon}</span>
                    <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--color-text-primary)' }}>
                      去角色页生成
                      <ExternalLink size={10} style={{ color: 'var(--color-text-muted)' }} />
                    </span>
                  </button>
                )}
              </div>

              {/* 页面指引说明 - 仅在非实体页面显示 */}
              {!isEntityPage && (
                <div className="px-2 py-1.5 rounded text-[10px] flex items-start gap-1.5" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                  <Info size={10} className="shrink-0 mt-0.5" />
                  <div>
                    <div>请进入角色/职业/敌人页面使用 AI 生成数值</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. 当前状态 */}
        <div className="inspector-section">
          <div
            className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => toggleSection('currentStatus')}
          >
            {expandedSections.currentStatus ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>当前状态</span>
          </div>

          {expandedSections.currentStatus && (
            <div className="px-3 pb-2">
              <div className="p-2 rounded text-[11px]" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                <div className="mb-1.5">
                  <span style={{ color: 'var(--color-text-muted)' }}>当前页面: </span>
                  <span className="font-medium">{getPageName(activeEditor || '')}</span>
                  {activeSubTab && <span className="text-[10px] ml-1" style={{ color: 'var(--color-text-muted)' }}>({activeSubTab})</span>}
                </div>
                <div className="mb-1.5">
                  <span style={{ color: 'var(--color-text-muted)' }}>当前可用: </span>
                  <span>{getCurrentStatusText()}</span>
                </div>
                {!isEntityPage && (
                  <div className="pt-1.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>AI生成数值: </span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      请前往角色/职业/敌人页面
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. 最近结果 */}
        <div className="inspector-section">
          <div
            className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => toggleSection('recentResults')}
          >
            {expandedSections.recentResults ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Clock size={12} style={{ color: 'var(--color-accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>最近结果</span>
            {recentResults.length > 0 && (
              <span className="badge info ml-auto">{recentResults.length}</span>
            )}
          </div>

          {expandedSections.recentResults && (
            <div className="px-3 pb-2">
              {recentResults.length > 0 ? (
                <div className="space-y-2">
                  {recentResults.map((result, index) => {
                    const parsed = result.errorCount !== undefined 
                      ? { errorCount: result.errorCount, warningCount: result.warningCount || 0, entityCount: result.entityCount || 0, groups: result.issues || [] }
                      : parseIssuesToGroups(result.fullDesc);
                    const isLatest = index === 0;
                    const isExpanded = expandedSuggestions.has(result.id);

                    return (
                      <div
                        key={result.id}
                        className="p-2 rounded cursor-pointer transition-colors hover:bg-[var(--color-bg-tertiary)]"
                        style={{ 
                          background: 'var(--color-bg-secondary)', 
                          border: isLatest ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                        }}
                        onClick={() => toggleSuggestionExpand(result.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--color-accent)' }}>{result.operation}</span>
                          <div className="flex items-center gap-1">
                            {parsed.errorCount > 0 && (
                              <span className="text-[10px] px-1 rounded flex items-center gap-0.5" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                                <X size={8} />{parsed.errorCount}
                              </span>
                            )}
                            {parsed.warningCount > 0 && (
                              <span className="text-[10px] px-1 rounded flex items-center gap-0.5" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                                <AlertTriangle size={8} />{parsed.warningCount}
                              </span>
                            )}
                            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        {/* 摘要行 */}
                        <div className="text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                          {parsed.errorCount > 0 || parsed.warningCount > 0 
                            ? `涉及 ${parsed.entityCount || 1} 个对象`
                            : result.fromCache ? '来自缓存' : '已完成'
                          }
                        </div>

                        {/* 分组问题展示 */}
                        {parsed.groups.length > 0 && isExpanded && (
                          <div className="mt-2 space-y-1">
                            {parsed.groups.map((group, gi) => (
                              <div key={gi} className="flex items-start gap-1">
                                <span className="text-[10px]" style={{ color: group.type === 'missing-field' || group.type === 'invalid-ref' ? '#ef4444' : '#fbbf24' }}>
                                  {group.type === 'missing-field' ? '缺字段' : 
                                   group.type === 'invalid-level' ? '无效等级' : 
                                   group.type === 'invalid-ref' ? '无效引用' : '单位缺失'}:
                                </span>
                                <span className="text-[10px] flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                                  {group.items.slice(0, 3).join('、')}
                                  {group.items.length > 3 && ` 等${group.items.length}项`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 完整内容展开 */}
                        {isExpanded && !parsed.groups.length && (
                          <div className="text-xs mt-1 whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
                            {result.fullDesc}
                          </div>
                        )}

                        {/* 展开指示器 */}
                        <div className="mt-1 flex items-center justify-end">
                          {isExpanded ? (
                            <ChevronDown size={10} style={{ color: 'var(--color-text-muted)' }} />
                          ) : (
                            <ChevronRight size={10} style={{ color: 'var(--color-text-muted)' }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>
                  暂无最近结果
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. AI建议 - 底部，带分割线 */}
        <div className="inspector-section" style={{ borderTop: '1px dashed var(--color-border)' }}>
          <div
            className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => toggleSection('aiSuggestions')}
          >
            {expandedSections.aiSuggestions ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Brain size={12} style={{ color: 'var(--color-warning)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>AI建议</span>
            {lastResult?.success && !lastResult.fromCache && (
              <span className="badge info ml-auto">新</span>
            )}
            {lastResult?.fromCache && (
              <span className="badge ml-auto" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>缓存</span>
            )}
          </div>

          {expandedSections.aiSuggestions && (
            <div className="px-3 pb-2">
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                  <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>AI思考中...</span>
                </div>
              ) : lastResult ? (
                <div className="space-y-2">
                  {lastResult.success ? (
                    <div className="p-3 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                      {/* 检查一致性结果展示 */}
                      {lastResult.result && typeof lastResult.result === 'string' && lastResult.result.includes('配置检查通过') ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>检查通过</span>
                          </div>
                          <div className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
                            {lastResult.result}
                          </div>
                        </>
                      ) : lastResult.result && typeof lastResult.result === 'string' && lastResult.result.includes('发现') ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--color-warning)' }}>发现问题</span>
                          </div>
                          <div className="text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
                            {lastResult.result}
                          </div>
                          {/* 定位按钮 */}
                          {lastResult.result.includes('角色') && (
                            <button
                              onClick={() => {
                                const { setActiveEditor } = useEditorStore.getState?.() || {};
                                if (setActiveEditor) setActiveEditor('characters' as any);
                              }}
                              className="mt-2 px-2 py-1 rounded text-[10px]"
                              style={{ background: 'var(--color-accent)', color: 'white' }}
                            >
                              查看角色问题
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {lastResult.fromCache ? '来自缓存' : 'AI回复'}
                            </span>
                          </div>
                          <div className="text-xs whitespace-pre-wrap line-clamp-6" style={{ color: 'var(--color-text-primary)' }}>
                            {lastResult.result}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                      <div className="flex items-start gap-2">
                        <X size={14} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 2 }} />
                        <span className="text-xs" style={{ color: 'var(--color-error)' }}>
                          {lastResult.error || '操作失败，请重试'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  当前页面暂无 AI 建议
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
