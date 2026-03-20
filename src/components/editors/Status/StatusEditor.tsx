import React, { useState, useMemo, useEffect } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import {
  Plus, Trash2, ChevronRight, ChevronDown, AlertTriangle, Info,
  Shield, Heart, Flame, Zap, Snowflake, Tag, Sparkles,
  ArrowUp, ArrowDown, Swords, ShieldOff, CircleAlert, Ban, RefreshCw, Layers, Sliders, Loader2
} from 'lucide-react';
import { callAI, validateBeforeAI } from '../../../services/aiService';
import type { Status, TriggerConfig } from '../../../types';

// Status categories
const statusCategories = [
  { id: 'buff', label: 'Buff', icon: ArrowUp, color: '#22c55e' },
  { id: 'debuff', label: 'Debuff', icon: ArrowDown, color: '#ef4444' },
  { id: 'control', label: '控制', icon: CircleAlert, color: '#f97316' },
  { id: 'dot', label: '持续伤害', icon: Flame, color: '#dc2626' },
  { id: 'hot', label: '持续治疗', icon: Heart, color: '#10b981' },
  { id: 'shield', label: '护盾', icon: Shield, color: '#3b82f6' },
  { id: 'mark', label: '标记', icon: Tag, color: '#eab308' },
  { id: 'special', label: '特殊', icon: Sparkles, color: '#8b5cf6' },
];

// Effect types for status
const effectTypes = [
  { id: 'attack-up', label: '攻击提升', icon: Swords },
  { id: 'defense-down', label: '防御降低', icon: ShieldOff },
  { id: 'dot-damage', label: '持续掉血', icon: Flame },
  { id: 'hot-heal', label: '持续回血', icon: Heart },
  { id: 'anti-heal', label: '禁疗', icon: Ban },
  { id: 'silence', label: '沉默', icon: Ban },
  { id: 'stun', label: '眩晕', icon: CircleAlert },
  { id: 'freeze', label: '冻结', icon: Snowflake },
  { id: 'reflect', label: '反伤', icon: RefreshCw },
  { id: 'action-gain', label: '行动条推进', icon: Zap },
  { id: 'action-lose', label: '行动条延迟', icon: Zap },
  { id: 'chase-mark', label: '追击标记', icon: Tag },
  { id: 'shield', label: '护盾', icon: Shield },
];

// Trigger events
const triggerEvents = [
  { id: 'on-apply', label: '获得时' },
  { id: 'on-turn-start', label: '回合开始' },
  { id: 'on-turn-end', label: '回合结束' },
  { id: 'on-action-start', label: '行动前' },
  { id: 'on-action-end', label: '行动后' },
  { id: 'on-damaged', label: '受击时' },
  { id: 'on-kill', label: '击杀时' },
  { id: 'on-remove', label: '移除时' },
];

// Duration types
const durationTypes = [
  { id: 'rounds', label: '回合' },
  { id: 'turns', label: '回合(独立)' },
  { id: 'permanent', label: '永久' },
  { id: 'instant', label: '瞬时' },
  { id: 'custom', label: '自定义' },
];

// Restriction types
const restrictionTypes = [
  { id: 'none', label: '无限制' },
  { id: 'attack-enemy', label: '攻击敌人' },
  { id: 'attack-any', label: '攻击任意目标' },
  { id: 'attack-ally', label: '攻击友军' },
  { id: 'cannot-act', label: '无法行动' },
];

// Conflict types
const conflictTypes = [
  { id: 'replace', label: '替换' },
  { id: 'stack', label: '叠加' },
  { id: 'block', label: '互斥' },
  { id: 'none', label: '无' },
];

// Dispel types
const dispelTypes = [
  { id: 'any', label: '任意驱散' },
  { id: 'positive', label: '正向驱散' },
  { id: 'negative', label: '负向驱散' },
  { id: 'none', label: '不可驱散' },
];

export const StatusEditor: React.FC = () => {
  const { project, addStatus, updateStatus, deleteStatus } = useProjectStore();
  const { setDebugStatusId, activeEntityId, activeEditor } = useEditorStore();
  const { statuses } = project;

  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['buff', 'debuff', 'dot']));
  const [activeTab, setActiveTab] = useState<'basic' | 'lifecycle' | 'effects' | 'triggers' | 'conflict'>('basic');
  const [isAdjustingStats, setIsAdjustingStats] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync with store's activeEntityId when editor becomes active
  React.useEffect(() => {
    if (activeEditor === 'statuses' && activeEntityId) {
      const exists = statuses.some(s => s.id === activeEntityId);
      if (exists) {
        setSelectedStatusId(activeEntityId);
      } else if (statuses.length > 0) {
        setSelectedStatusId(statuses[0].id);
      }
    }
  }, [activeEditor, activeEntityId, statuses]);

  const selectedStatus = statuses.find(s => s.id === selectedStatusId);

  useEffect(() => {
    setDebugStatusId(selectedStatusId);
    return () => setDebugStatusId(null);
  }, [selectedStatusId, setDebugStatusId]);

  // Group statuses by category
  const statusesByCategory = useMemo(() => {
    const grouped: Record<string, Status[]> = {};
    statusCategories.forEach(cat => { grouped[cat.id] = []; });
    statuses.forEach(s => {
      const cat = s.category || 'special';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });
    return grouped;
  }, [statuses]);

  // Validation
  const validation = useMemo(() => {
    const issues: { type: 'error' | 'warning'; message: string }[] = [];
    if (!selectedStatus) return issues;

    if (!selectedStatus.display?.icon) issues.push({ type: 'warning', message: '缺少图标' });
    if (!selectedStatus.description) issues.push({ type: 'warning', message: '缺少描述' });
    if (!selectedStatus.display?.color) issues.push({ type: 'warning', message: '建议设置状态颜色' });
    if (selectedStatus.stacking?.type !== 'none' && (!selectedStatus.stacking?.maxStacks || selectedStatus.stacking?.maxStacks <= 1)) {
      issues.push({ type: 'warning', message: '可叠层状态应设置最大层数' });
    }
    if (selectedStatus.triggers?.length === 0) issues.push({ type: 'warning', message: '建议添加至少一个触发时机' });

    return issues;
  }, [selectedStatus]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const createNewStatus = (category: string) => {
    const newStatus: Status = {
      id: `status-${Date.now()}`,
      name: '新状态',
      description: '',
      category: category as Status['category'],
      duration: { type: 'rounds', value: 3, canRefresh: true },
      stacking: { type: 'none', maxStacks: 1, stackMultiplier: 1 },
      dispel: { priority: 0, canDispel: true, dispelType: 'any' },
      conflict: { type: 'replace', conflictingStatuses: [] },
      triggers: [],
      display: { icon: 'Shield', priority: 0, showDuration: true, color: '#888888' },
    };
    addStatus(newStatus);
    setSelectedStatusId(newStatus.id);
  };

  const updateCurrentStatus = (updates: Partial<Status>) => {
    if (selectedStatusId) {
      updateStatus(selectedStatusId, updates);
    }
  };

  // AI 调整状态数值
  const handleAdjustStats = async () => {
    if (!selectedStatus) return;

    // 本地校验
    const validation = validateBeforeAI('statuses', selectedStatus, project);
    if (!validation.valid) {
      setAiMessage({ type: 'error', text: validation.errors.join('；') });
      return;
    }

    setIsAdjustingStats(true);
    setAiMessage(null);

    try {
      const result = await callAI(
        'adjust-stats',
        {
          editor: 'statuses',
          entity: selectedStatus,
          project: project,
        },
        'detailed'
      );

      if (result.success && result.result) {
        try {
          const patch = JSON.parse(result.result);
          if (patch.changes && Array.isArray(patch.changes)) {
            const updates: Partial<Status> = {};

            patch.changes.forEach((change: any) => {
              const field = change.field;
              const newValue = change.to;
              if (field === 'duration' || field === 'Duration') {
                updates.duration = newValue;
              } else if (field === 'power' || field === 'Power') {
                updates.power = newValue;
              }
            });

            updateStatus(selectedStatusId!, updates);
            setAiMessage({ type: 'success', text: patch.summary || '数值已调整' });
          } else {
            setAiMessage({ type: 'error', text: '返回格式错误' });
          }
        } catch {
          setAiMessage({ type: 'error', text: '解析AI返回失败' });
        }
      } else {
        setAiMessage({ type: 'error', text: result.error || '调整失败' });
      }
    } catch (error) {
      setAiMessage({ type: 'error', text: error instanceof Error ? error.message : '调用失败' });
    } finally {
      setIsAdjustingStats(false);
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return statusCategories.find(c => c.id === categoryId) || statusCategories[7];
  };

  const getEffectIcon = (effectId: string) => {
    return effectTypes.find(e => e.id === effectId)?.icon || Shield;
  };

  // Validation summary
  const errorCount = validation.filter(v => v.type === 'error').length;
  const warningCount = validation.filter(v => v.type === 'warning').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top Summary Bar */}
      <div className="shrink-0 p-3 border-b" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>状态总数</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{statuses.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>当前选中</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{selectedStatus?.name || '-'}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-danger)', color: 'white' }}>
                {errorCount} 错误
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-warning)', color: 'white' }}>
                {warningCount} 警告
              </span>
            )}
            {errorCount === 0 && warningCount === 0 && selectedStatus && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-success)', color: 'white' }}>
                校验通过
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Four Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Status Registry Tree */}
        <div className="w-56 flex flex-col border-r overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>状态注册表</h3>
              <div className="flex gap-1">
                {statusCategories.slice(0, 4).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => createNewStatus(cat.id)}
                    className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
                    title={`添加${cat.label}`}
                  >
                    <Plus size={14} style={{ color: 'var(--color-accent)' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {statusCategories.map(cat => {
              const Icon = cat.icon;
              const categoryStatuses = statusesByCategory[cat.id] || [];
              const isExpanded = expandedCategories.has(cat.id);

              return (
                <div key={cat.id} className="mb-1">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-[var(--color-bg-tertiary)]"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Icon size={12} style={{ color: cat.color }} />
                    <span className="flex-1 text-left">{cat.label}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{categoryStatuses.length}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {categoryStatuses.map(status => {
                        const isSelected = selectedStatusId === status.id;
                        const statusCat = getCategoryInfo(status.category || 'special');
                        const StatusIcon = statusCat?.icon || Shield;

                        return (
                          <button
                            key={status.id}
                            onClick={() => setSelectedStatusId(status.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                              isSelected ? 'ring-1 ring-[var(--color-accent)]' : ''
                            }`}
                            style={{
                              background: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                              borderColor: 'var(--color-border)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <StatusIcon size={12} style={{ color: statusCat?.color || '#888' }} />
                              <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{status.name}</span>
                              {status.duration?.value && (
                                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{status.duration.value}T</span>
                              )}
                            </div>
                            <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              {status.id}
                            </div>
                          </button>
                        );
                      })}
                      <button
                        onClick={() => createNewStatus(cat.id)}
                        className="w-full flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-[var(--color-bg-tertiary)]"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        <Plus size={10} />
                        <span>添加</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle: Status Editor */}
        <div className="flex-1 flex flex-col overflow-hidden border-r" style={{ background: 'var(--color-bg-primary)' }}>
          {selectedStatus ? (
            <>
              {/* Tab Navigation */}
              <div className="flex border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                {[
                  { id: 'basic', label: '基础信息' },
                  { id: 'lifecycle', label: '生命周期' },
                  { id: 'effects', label: '效果块' },
                  { id: 'triggers', label: '触发时机' },
                  { id: 'conflict', label: '冲突联动' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 text-xs font-medium border-r ${activeTab === tab.id ? 'bg-[var(--color-bg-tertiary)]' : ''}`}
                    style={{
                      color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto p-4">
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    {/* Basic Info Card */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>基础信息</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>状态名称</label>
                          <input
                            type="text"
                            value={selectedStatus.name}
                            onChange={(e) => updateCurrentStatus({ name: e.target.value })}
                            className="input-field w-full mt-1"
                            placeholder="如: 攻击提升"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>状态ID</label>
                          <input
                            type="text"
                            value={selectedStatus.id}
                            disabled
                            className="input-field w-full mt-1 opacity-60"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>分类</label>
                          <select
                            value={selectedStatus.category}
                            onChange={(e) => updateCurrentStatus({ category: e.target.value as Status['category'] })}
                            className="input-field w-full mt-1"
                          >
                            {statusCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>图标</label>
                          <select
                            value={selectedStatus.display?.icon || 'Shield'}
                            onChange={(e) => updateCurrentStatus({ display: { ...selectedStatus.display!, icon: e.target.value } })}
                            className="input-field w-full mt-1"
                          >
                            {effectTypes.map(eff => (
                              <option key={eff.id} value={eff.id}>{eff.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>限制类型</label>
                          <select
                            value={selectedStatus.restriction || 'none'}
                            onChange={(e) => updateCurrentStatus({ restriction: e.target.value as any })}
                            className="input-field w-full mt-1"
                          >
                            {restrictionTypes.map(rt => (
                              <option key={rt.id} value={rt.id}>{rt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>显示优先级</label>
                          <input
                            type="number"
                            value={selectedStatus.display?.priority || 0}
                            onChange={(e) => updateCurrentStatus({ display: { ...selectedStatus.display!, priority: Number(e.target.value) } })}
                            className="input-field w-full mt-1"
                            min={0}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>描述</label>
                          <textarea
                            value={selectedStatus.description}
                            onChange={(e) => updateCurrentStatus({ description: e.target.value })}
                            className="input-field w-full mt-1 h-20 resize-none"
                            placeholder="描述此状态的效果..."
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>状态颜色</label>
                          <div className="flex gap-2 mt-1">
                            <input
                              type="color"
                              value={selectedStatus.display?.color || '#888888'}
                              onChange={(e) => updateCurrentStatus({ display: { ...selectedStatus.display!, color: e.target.value } })}
                              className="w-10 h-8 rounded cursor-pointer"
                            />
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedStatus.display?.showDuration !== false}
                                onChange={(e) => updateCurrentStatus({ display: { ...selectedStatus.display!, showDuration: e.target.checked } })}
                              />
                              <span style={{ color: 'var(--color-text-secondary)' }}>显示持续回合</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'lifecycle' && (
                  <div className="space-y-4">
                    {/* Duration Card */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>持续时间</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>持续类型</label>
                          <select
                            value={selectedStatus.duration?.type || 'rounds'}
                            onChange={(e) => updateCurrentStatus({ duration: { ...selectedStatus.duration!, type: e.target.value as any } })}
                            className="input-field w-full mt-1"
                          >
                            {durationTypes.map(dt => (
                              <option key={dt.id} value={dt.id}>{dt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>持续回合</label>
                          <input
                            type="number"
                            value={selectedStatus.duration?.value || 0}
                            onChange={(e) => updateCurrentStatus({ duration: { ...selectedStatus.duration!, value: Number(e.target.value) } })}
                            className="input-field w-full mt-1"
                            min={0}
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>可刷新</label>
                          <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStatus.duration?.canRefresh !== false}
                              onChange={(e) => updateCurrentStatus({ duration: { ...selectedStatus.duration!, canRefresh: e.target.checked } })}
                            />
                            <span style={{ color: 'var(--color-text-secondary)' }}>刷新持续时间</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Stacking Card */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>叠加配置</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>叠加类型</label>
                          <select
                            value={selectedStatus.stacking?.type || 'none'}
                            onChange={(e) => updateCurrentStatus({ stacking: { ...selectedStatus.stacking!, type: e.target.value as any } })}
                            className="input-field w-full mt-1"
                          >
                            <option value="none">不可叠加</option>
                            <option value="intensity">强度叠加</option>
                            <option value="duration">时间叠加</option>
                            <option value="both">同时叠加</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>最大层数</label>
                          <input
                            type="number"
                            value={selectedStatus.stacking?.maxStacks || 1}
                            onChange={(e) => updateCurrentStatus({ stacking: { ...selectedStatus.stacking!, maxStacks: Number(e.target.value) } })}
                            className="input-field w-full mt-1"
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>层数乘数</label>
                          <input
                            type="number"
                            value={selectedStatus.stacking?.stackMultiplier || 1}
                            onChange={(e) => updateCurrentStatus({ stacking: { ...selectedStatus.stacking!, stackMultiplier: Number(e.target.value) } })}
                            className="input-field w-full mt-1"
                            step={0.1}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dispel Card */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>驱散规则</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>可驱散</label>
                          <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStatus.dispel?.canDispel !== false}
                              onChange={(e) => updateCurrentStatus({ dispel: { ...selectedStatus.dispel!, canDispel: e.target.checked } })}
                            />
                            <span style={{ color: 'var(--color-text-secondary)' }}>允许驱散</span>
                          </label>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>驱散类型</label>
                          <select
                            value={selectedStatus.dispel?.dispelType || 'any'}
                            onChange={(e) => updateCurrentStatus({ dispel: { ...selectedStatus.dispel!, dispelType: e.target.value as any } })}
                            className="input-field w-full mt-1"
                          >
                            {dispelTypes.map(dt => (
                              <option key={dt.id} value={dt.id}>{dt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>驱散优先级</label>
                          <input
                            type="number"
                            value={selectedStatus.dispel?.priority || 0}
                            onChange={(e) => updateCurrentStatus({ dispel: { ...selectedStatus.dispel!, priority: Number(e.target.value) } })}
                            className="input-field w-full mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Remove Conditions Card */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>移除条件</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 grid grid-cols-3 gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStatus.dispel?.removeOnBattleEnd || false}
                              onChange={(e) => updateCurrentStatus({ dispel: { ...selectedStatus.dispel!, removeOnBattleEnd: e.target.checked } })}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>战斗结束移除</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStatus.dispel?.removeOnStatusOverride || false}
                              onChange={(e) => updateCurrentStatus({ dispel: { ...selectedStatus.dispel!, removeOnStatusOverride: e.target.checked } })}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>被覆盖时移除</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStatus.dispel?.removeOnActionEnd || false}
                              onChange={(e) => updateCurrentStatus({ dispel: { ...selectedStatus.dispel!, removeOnActionEnd: e.target.checked } })}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>行动结束移除</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStatus.dispel?.removeOnTurnEnd || false}
                              onChange={(e) => updateCurrentStatus({ dispel: { ...selectedStatus.dispel!, removeOnTurnEnd: e.target.checked } })}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>回合结束移除</span>
                          </label>
                        </div>
                        <div className="col-span-2 p-3 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                          <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                              type="checkbox"
                              checked={selectedStatus.dispel?.removeOnDamage?.enabled || false}
                              onChange={(e) => updateCurrentStatus({ dispel: { ...selectedStatus.dispel!, removeOnDamage: { enabled: e.target.checked, probability: selectedStatus.dispel?.removeOnDamage?.probability || 50 } } })}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>受伤时概率移除</span>
                          </label>
                          {selectedStatus.dispel?.removeOnDamage?.enabled && (
                            <div className="flex items-center gap-2 ml-6">
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>概率:</span>
                              <input
                                type="number"
                                value={selectedStatus.dispel?.removeOnDamage?.probability || 50}
                                onChange={(e) => updateCurrentStatus({ dispel: { ...selectedStatus.dispel!, removeOnDamage: { ...selectedStatus.dispel!.removeOnDamage!, probability: Number(e.target.value) } } })}
                                className="input-field w-20"
                                min={0}
                                max={100}
                              />
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>%</span>
                            </div>
                          )}
                        </div>
                        <div className="col-span-2 p-3 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                          <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                              type="checkbox"
                              checked={selectedStatus.dispel?.removeOnMapStep?.enabled || false}
                              onChange={(e) => updateCurrentStatus({ dispel: { ...selectedStatus.dispel!, removeOnMapStep: { enabled: e.target.checked, steps: selectedStatus.dispel?.removeOnMapStep?.steps || 1 } } })}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>地图步数移除 (预留)</span>
                          </label>
                          {selectedStatus.dispel?.removeOnMapStep?.enabled && (
                            <div className="flex items-center gap-2 ml-6">
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>步数:</span>
                              <input
                                type="number"
                                value={selectedStatus.dispel?.removeOnMapStep?.steps || 1}
                                onChange={(e) => updateCurrentStatus({ dispel: { ...selectedStatus.dispel!, removeOnMapStep: { ...selectedStatus.dispel!.removeOnMapStep!, steps: Number(e.target.value) } } })}
                                className="input-field w-20"
                                min={1}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'effects' && (
                  <div className="space-y-4">
                    {/* AI 调整按钮 */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>AI 数值辅助</h4>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAdjustStats()}
                          disabled={isAdjustingStats}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs"
                          style={{ background: 'var(--color-warning)', color: 'white' }}
                        >
                          {isAdjustingStats ? <Loader2 size={14} className="animate-spin" /> : <Sliders size={14} />}
                          <span>调整状态数值</span>
                        </button>
                      </div>
                      {aiMessage && (
                        <div className={`mt-2 p-2 rounded text-xs ${aiMessage.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {aiMessage.text}
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>效果块</h4>
                        <button
                          onClick={() => {
                            const newEffect = { id: `effect-${Date.now()}`, type: 'attack-up' as const, value: 10, formula: '' };
                            updateCurrentStatus({ triggers: [...(selectedStatus.triggers || []), { event: 'on-apply', effect: JSON.stringify(newEffect) }] });
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--color-accent)', color: 'white' }}
                        >
                          <Plus size={12} /> 添加效果
                        </button>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        点击"添加效果"将在"获得时"触发时机中添加一个效果块。效果块的详细配置可在触发时机标签页中编辑。
                      </div>
                      {/* Show current triggers as effect blocks */}
                      <div className="mt-4 space-y-2">
                        {(selectedStatus.triggers || []).map((trigger, idx) => {
                          let effectData = { type: 'custom', value: 0 };
                          try {
                            effectData = JSON.parse(trigger.effect);
                          } catch {}
                          const EffIcon = getEffectIcon(effectData.type);

                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-3 rounded"
                              style={{ background: 'var(--color-bg-primary)' }}
                            >
                              <EffIcon size={16} style={{ color: 'var(--color-accent)' }} />
                              <div className="flex-1">
                                <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                  {effectTypes.find(e => e.id === effectData.type)?.label || '自定义效果'}
                                </div>
                                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  数值: {effectData.value} | 触发: {triggerEvents.find(t => t.id === trigger.event)?.label || trigger.event}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const newTriggers = [...(selectedStatus.triggers || [])];
                                  newTriggers.splice(idx, 1);
                                  updateCurrentStatus({ triggers: newTriggers });
                                }}
                                className="p-1 rounded hover:bg-[var(--color-danger)]"
                              >
                                <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                              </button>
                            </div>
                          );
                        })}
                        {(selectedStatus.triggers || []).length === 0 && (
                          <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                            暂无效果块，请点击"添加效果"创建
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'triggers' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>触发时机</h4>
                        <button
                          onClick={() => {
                            updateCurrentStatus({
                              triggers: [...(selectedStatus.triggers || []), { event: 'on-apply', effect: '{"type":"custom","value":0}' }]
                            });
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--color-accent)', color: 'white' }}
                        >
                          <Plus size={12} /> 添加触发
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {triggerEvents.map(event => {
                          const hasTrigger = selectedStatus.triggers?.some(t => t.event === event.id);
                          return (
                            <button
                              key={event.id}
                              onClick={() => {
                                if (hasTrigger) {
                                  updateCurrentStatus({
                                    triggers: selectedStatus.triggers!.filter(t => t.event !== event.id)
                                  });
                                } else {
                                  updateCurrentStatus({
                                    triggers: [...(selectedStatus.triggers || []), { event: event.id as TriggerConfig['event'], effect: '{"type":"custom","value":0}' }]
                                  });
                                }
                              }}
                              className={`p-2 rounded text-xs text-left ${hasTrigger ? 'ring-1 ring-[var(--color-accent)]' : ''}`}
                              style={{
                                background: hasTrigger ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span>{event.label}</span>
                                {hasTrigger && (
                                  <span className="text-[10px]" style={{ color: 'var(--color-accent)' }}>已配置</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'conflict' && (
                  <div className="space-y-4">
                    {/* Conflict Rule Card */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>冲突规则</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>冲突类型</label>
                          <select
                            value={selectedStatus.conflict?.type || 'none'}
                            onChange={(e) => updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, type: e.target.value as any } })}
                            className="input-field w-full mt-1"
                          >
                            {conflictTypes.map(ct => (
                              <option key={ct.id} value={ct.id}>{ct.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Conflicting Statuses */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>互斥状态</h4>
                      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>与此状态互斥的其他状态，同时只能存在一个</p>
                      <div className="flex flex-wrap gap-2">
                        {(selectedStatus.conflict?.conflictingStatuses || []).map((statusId, idx) => {
                          const status = project.statuses.find(s => s.id === statusId);
                          return (
                            <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                              <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{status?.name || statusId}</span>
                              <button
                                onClick={() => {
                                  const newList = [...(selectedStatus.conflict?.conflictingStatuses || [])];
                                  newList.splice(idx, 1);
                                  updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, conflictingStatuses: newList } });
                                }}
                                className="p-0.5 hover:bg-[var(--color-danger)] rounded"
                              >
                                <Trash2 size={10} style={{ color: 'var(--color-danger)' }} />
                              </button>
                            </div>
                          );
                        })}
                        <select
                          className="input-field text-xs"
                          value=""
                          onChange={(e) => {
                            if (e.target.value && !selectedStatus.conflict?.conflictingStatuses?.includes(e.target.value)) {
                              updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, conflictingStatuses: [...(selectedStatus.conflict?.conflictingStatuses || []), e.target.value] } });
                            }
                          }}
                        >
                          <option value="">+ 添加互斥状态</option>
                          {project.statuses.filter(s => s.id !== selectedStatus.id && !selectedStatus.conflict?.conflictingStatuses?.includes(s.id)).map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Override Statuses */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>覆盖状态</h4>
                      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>应用此状态时，会移除列表中的状态</p>
                      <div className="flex flex-wrap gap-2">
                        {(selectedStatus.conflict?.overrideStatuses || []).map((statusId, idx) => {
                          const status = project.statuses.find(s => s.id === statusId);
                          return (
                            <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                              <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{status?.name || statusId}</span>
                              <button
                                onClick={() => {
                                  const newList = [...(selectedStatus.conflict?.overrideStatuses || [])];
                                  newList.splice(idx, 1);
                                  updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, overrideStatuses: newList } });
                                }}
                                className="p-0.5 hover:bg-[var(--color-danger)] rounded"
                              >
                                <Trash2 size={10} style={{ color: 'var(--color-danger)' }} />
                              </button>
                            </div>
                          );
                        })}
                        <select
                          className="input-field text-xs"
                          value=""
                          onChange={(e) => {
                            if (e.target.value && !selectedStatus.conflict?.overrideStatuses?.includes(e.target.value)) {
                              updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, overrideStatuses: [...(selectedStatus.conflict?.overrideStatuses || []), e.target.value] } });
                            }
                          }}
                        >
                          <option value="">+ 添加覆盖状态</option>
                          {project.statuses.filter(s => s.id !== selectedStatus.id && !selectedStatus.conflict?.overrideStatuses?.includes(s.id)).map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Upgrade Statuses */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>升级状态</h4>
                      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>当指定状态存在时，自动升级为此状态</p>
                      <div className="space-y-2">
                        {(selectedStatus.conflict?.upgradeStatuses || []).map((upgrade, idx) => {
                          const targetStatus = project.statuses.find(s => s.id === upgrade.target);
                          return (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>当</span>
                              <select
                                value={upgrade.target}
                                onChange={(e) => {
                                  const newList = [...(selectedStatus.conflict?.upgradeStatuses || [])];
                                  newList[idx] = { ...newList[idx], target: e.target.value };
                                  updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, upgradeStatuses: newList } });
                                }}
                                className="input-field text-xs flex-1"
                              >
                                {project.statuses.filter(s => s.id !== selectedStatus.id).map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>存在时升级</span>
                              <button
                                onClick={() => {
                                  const newList = [...(selectedStatus.conflict?.upgradeStatuses || [])];
                                  newList.splice(idx, 1);
                                  updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, upgradeStatuses: newList } });
                                }}
                                className="p-1 hover:bg-[var(--color-danger)] rounded"
                              >
                                <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                              </button>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => {
                            updateCurrentStatus({
                              conflict: {
                                ...selectedStatus.conflict!,
                                upgradeStatuses: [...(selectedStatus.conflict?.upgradeStatuses || []), { target: '', condition: '' }]
                              }
                            });
                          }}
                          className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          <Plus size={12} /> 添加升级条件
                        </button>
                      </div>
                    </div>

                    {/* Convert Statuses */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>转换状态</h4>
                      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>当指定事件触发时，转换为其他状态</p>
                      <div className="space-y-2">
                        {(selectedStatus.conflict?.convertStatuses || []).map((convert, idx) => {
                          const targetStatus = project.statuses.find(s => s.id === convert.target);
                          return (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>当</span>
                              <select
                                value={convert.trigger}
                                onChange={(e) => {
                                  const newList = [...(selectedStatus.conflict?.convertStatuses || [])];
                                  newList[idx] = { ...newList[idx], trigger: e.target.value };
                                  updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, convertStatuses: newList } });
                                }}
                                className="input-field text-xs flex-1"
                              >
                                {triggerEvents.map(te => (
                                  <option key={te.id} value={te.id}>{te.label}</option>
                                ))}
                              </select>
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>转换为</span>
                              <select
                                value={convert.target}
                                onChange={(e) => {
                                  const newList = [...(selectedStatus.conflict?.convertStatuses || [])];
                                  newList[idx] = { ...newList[idx], target: e.target.value };
                                  updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, convertStatuses: newList } });
                                }}
                                className="input-field text-xs flex-1"
                              >
                                {project.statuses.filter(s => s.id !== selectedStatus.id).map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  const newList = [...(selectedStatus.conflict?.convertStatuses || [])];
                                  newList.splice(idx, 1);
                                  updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, convertStatuses: newList } });
                                }}
                                className="p-1 hover:bg-[var(--color-danger)] rounded"
                              >
                                <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                              </button>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => {
                            updateCurrentStatus({
                              conflict: {
                                ...selectedStatus.conflict!,
                                convertStatuses: [...(selectedStatus.conflict?.convertStatuses || []), { target: '', trigger: 'on-turn-end' }]
                              }
                            });
                          }}
                          className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          <Plus size={12} /> 添加转换条件
                        </button>
                      </div>
                    </div>

                    {/* Chain Reactions */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>状态引爆联动</h4>
                      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>当其他状态被添加时，触发此状态的效果</p>
                      <div className="space-y-2">
                        {(selectedStatus.conflict?.chainReactions || []).map((chain, idx) => {
                          const triggerStatus = project.statuses.find(s => s.id === chain.triggerStatus);
                          return (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>当</span>
                              <select
                                value={chain.triggerStatus}
                                onChange={(e) => {
                                  const newList = [...(selectedStatus.conflict?.chainReactions || [])];
                                  newList[idx] = { ...newList[idx], triggerStatus: e.target.value };
                                  updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, chainReactions: newList } });
                                }}
                                className="input-field text-xs flex-1"
                              >
                                {project.statuses.filter(s => s.id !== selectedStatus.id).map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>被添加时触发</span>
                              <button
                                onClick={() => {
                                  const newList = [...(selectedStatus.conflict?.chainReactions || [])];
                                  newList.splice(idx, 1);
                                  updateCurrentStatus({ conflict: { ...selectedStatus.conflict!, chainReactions: newList } });
                                }}
                                className="p-1 hover:bg-[var(--color-danger)] rounded"
                              >
                                <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                              </button>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => {
                            updateCurrentStatus({
                              conflict: {
                                ...selectedStatus.conflict!,
                                chainReactions: [...(selectedStatus.conflict?.chainReactions || []), { triggerStatus: '', effect: '' }]
                              }
                            });
                          }}
                          className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          <Plus size={12} /> 添加引爆联动
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => {
                    if (selectedStatusId) {
                      deleteStatus(selectedStatusId);
                      setSelectedStatusId(statuses[0]?.id || null);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-xs"
                  style={{ background: 'var(--color-danger)', color: 'white' }}
                >
                  <Trash2 size={12} /> 删除状态
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="text-center">
                <Shield size={48} className="mx-auto mb-4 opacity-30" />
                <div className="text-lg mb-2">选择或创建状态</div>
                <div className="text-sm mb-4">从左侧状态注册表中选择已有状态，或点击"+"创建新状态</div>
                <button
                  onClick={() => createNewStatus('buff')}
                  className="flex items-center gap-2 px-4 py-2 rounded"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  <Plus size={16} /> 创建新状态
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview & Validation */}
        <div className="w-72 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>状态预览 & 校验</h3>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {selectedStatus ? (
              <>
                {/* Status Card Preview */}
                <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>状态卡预览</h4>
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)', borderLeft: `3px solid ${selectedStatus.display?.color || '#888'}` }}>
                    <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: (selectedStatus.display?.color || '#888') + '20' }}>
                      {React.createElement(getEffectIcon(selectedStatus.display?.icon || 'Shield') as any, { size: 20, style: { color: selectedStatus.display?.color || '#888' } })}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedStatus.name}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {selectedStatus.duration?.type === 'rounds' ? `${selectedStatus.duration?.value || 0}回合` :
                         selectedStatus.duration?.type === 'permanent' ? '永久' :
                         selectedStatus.duration?.type === 'instant' ? '瞬时' : '自定义'}
                      </div>
                    </div>
                    {selectedStatus.stacking?.type !== 'none' && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                        <Layers size={12} style={{ color: 'var(--color-accent)' }} />
                        <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>x1</span>
                      </div>
                    )}
                  </div>
                  {selectedStatus.description && (
                    <div className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {selectedStatus.description}
                    </div>
                  )}
                </div>

                {/* Stack Preview */}
                {selectedStatus.stacking?.type !== 'none' && (
                  <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                    <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>叠层预览</h4>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].slice(0, selectedStatus.stacking?.maxStacks || 3).map(stack => (
                        <div
                          key={stack}
                          className="flex-1 h-8 rounded flex items-center justify-center text-xs"
                          style={{
                            background: stack === 1 ? (selectedStatus.display?.color || '#888') + '30' : 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {stack}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                      最大 {selectedStatus.stacking?.maxStacks || 3} 层
                    </div>
                  </div>
                )}

                {/* Trigger Chain */}
                <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>触发链路</h4>
                  <div className="space-y-2">
                    {(selectedStatus.triggers || []).length > 0 ? (
                      selectedStatus.triggers!.map((trigger, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} />
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            {triggerEvents.find(t => t.id === trigger.event)?.label || trigger.event}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>暂无触发时机</div>
                    )}
                  </div>
                </div>

                {/* Risk Warnings */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>风险提示</h4>
                  <div className="space-y-2">
                    {validation.length > 0 ? (
                      validation.map((v, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {v.type === 'error' ? (
                            <AlertTriangle size={12} style={{ color: 'var(--color-danger)' }} />
                          ) : v.type === 'warning' ? (
                            <AlertTriangle size={12} style={{ color: 'var(--color-warning)' }} />
                          ) : (
                            <Info size={12} style={{ color: 'var(--color-accent)' }} />
                          )}
                          <span style={{ color: v.type === 'error' ? 'var(--color-danger)' : v.type === 'warning' ? 'var(--color-warning)' : 'var(--color-accent)' }}>
                            {v.message}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs" style={{ color: 'var(--color-success)' }}>配置完整，无风险</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                <div className="text-center text-xs">选择状态查看预览</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Log & Debug Panel */}
    </div>
  );
};
