import React, { useState, useMemo, useEffect } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import type { Skill, EffectBlock, SkillCategory } from '../../../types';
import {
  Plus, Trash2, ChevronRight, ChevronDown, Save, AlertTriangle, Info,
  Sword, Sparkles, Shield, Heart, Zap, Target, Wand, Ghost, Flag,
  Flame, Shield as ShieldIcon, Users, Skull, Sliders, Loader2, Activity
} from 'lucide-react';
import { callAI, validateBeforeAI } from '../../../services/aiService';

// Skill categories
const skillCategories: { id: SkillCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'normal', label: '普攻', icon: <Sword size={12} />, color: '#6b7280' },
  { id: 'active', label: '主动', icon: <Sparkles size={12} />, color: '#3b82f6' },
  { id: 'passive', label: '被动', icon: <Shield size={12} />, color: '#22c55e' },
  { id: 'ultimate', label: '必杀', icon: <Zap size={12} />, color: '#eab308' },
  { id: 'support', label: '辅助', icon: <Heart size={12} />, color: '#ec4899' },
  { id: 'control', label: '控制', icon: <Target size={12} />, color: '#f97316' },
  { id: 'special', label: '特殊', icon: <Ghost size={12} />, color: '#8b5cf6' },
];

// Effect types
const effectTypes = [
  { id: 'damage', label: '造成伤害', icon: Sword },
  { id: 'heal', label: '治疗', icon: Heart },
  { id: 'status', label: '添加状态', icon: Sparkles },
  { id: 'remove-status', label: '移除状态', icon: ShieldIcon },
  { id: 'buff', label: '增益', icon: Shield },
  { id: 'debuff', label: '减益', icon: Flame },
  { id: 'action-gauge', label: '行动条推进', icon: Zap },
  { id: 'action-gauge-lose', label: '行动条延迟', icon: Zap },
  { id: 'displacement', label: '位移', icon: Users },
  { id: 'summon', label: '召唤', icon: Skull },
  { id: 'resource-gain', label: '资源回复', icon: Heart },
  { id: 'resource-drain', label: '资源抽取', icon: Zap },
  { id: 'chase-mark', label: '追击标记', icon: Flag },
];

// Target types
const targetTypes = [
  { id: 'single', label: '单体' },
  { id: 'aoe', label: '全体' },
  { id: 'random', label: '随机' },
  { id: 'self', label: '自身' },
  { id: 'ally', label: '友方单体' },
  { id: 'enemy', label: '敌方单体' },
  { id: 'mixed', label: '混合' },
];

// Target camps
const targetCamps = [
  { id: 'enemy', label: '敌方' },
  { id: 'ally', label: '友方' },
  { id: 'both', label: '双方' },
  { id: 'self', label: '自身' },
];

// Target conditions
const targetConditions = [
  { id: 'alive', label: '存活' },
  { id: 'dead', label: '倒地' },
  { id: 'any', label: '无条件' },
  { id: 'status', label: '有指定状态' },
];

// Hit types
const hitTypes = [
  { id: 'certain', label: '必中' },
  { id: 'physical', label: '物理' },
  { id: 'magic', label: '魔法' },
];

// Damage types
const damageTypes = [
  { id: 'physical', label: '物理伤害' },
  { id: 'magic', label: '魔法伤害' },
  { id: 'true', label: '真实伤害' },
  { id: 'heal', label: '治疗' },
];

// Resource types
const resourceTypes = [
  { id: 'mp', label: 'MP' },
  { id: 'energy', label: '能量' },
  { id: 'tp', label: 'TP' },
  { id: 'rage', label: '怒气' },
  { id: 'hp', label: 'HP' },
];

export const SkillEditor: React.FC = () => {
  const { project, addSkill, updateSkill, deleteSkill } = useProjectStore();
  const { setDebugSkillId, activeEntityId, activeEditor } = useEditorStore();
  const { skills } = project;

  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<SkillCategory>>(new Set(['normal', 'active', 'passive']));
  const [activeTab, setActiveTab] = useState<'basic' | 'target' | 'cost' | 'damage' | 'effects' | 'requirements' | 'animation'>('basic');
  const [isAdjustingStats, setIsAdjustingStats] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync with store's activeEntityId when editor becomes active
  React.useEffect(() => {
    if (activeEditor === 'skills' && activeEntityId) {
      const exists = skills.some(s => s.id === activeEntityId);
      if (exists) {
        setSelectedSkillId(activeEntityId);
      } else if (skills.length > 0) {
        setSelectedSkillId(skills[0].id);
      }
    }
  }, [activeEditor, activeEntityId, skills]);

  const selectedSkill = skills.find(s => s.id === selectedSkillId);

  useEffect(() => {
    setDebugSkillId(selectedSkillId);
    return () => setDebugSkillId(null);
  }, [selectedSkillId, setDebugSkillId]);

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const grouped: Record<SkillCategory, Skill[]> = {
      normal: [], active: [], passive: [], ultimate: [], support: [], control: [], special: []
    };
    skills.forEach(s => {
      const cat = s.category || 'active';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });
    return grouped;
  }, [skills]);

  // Validation
  const validation = useMemo(() => {
    const issues: { type: 'error' | 'warning'; message: string }[] = [];
    if (!selectedSkill) return issues;

    if (!selectedSkill.name) issues.push({ type: 'error', message: '缺少技能名称' });
    if (!selectedSkill.description) issues.push({ type: 'warning', message: '缺少技能描述' });
    if (!selectedSkill.icon) issues.push({ type: 'warning', message: '建议设置技能图标' });
    if (selectedSkill.type === 'active' && !selectedSkill.cost?.amount && selectedSkill.cost?.amount !== 0) {
      issues.push({ type: 'warning', message: '主动技能建议设置消耗' });
    }
    if (selectedSkill.effectBlocks?.length === 0) issues.push({ type: 'warning', message: '建议添加至少一个效果块' });
    if (selectedSkill.damageType && !selectedSkill.formulaId) issues.push({ type: 'warning', message: '有伤害类型但未设置公式' });

    return issues;
  }, [selectedSkill]);

  // Check for skill risks (missing config)
  const skillRisks = useMemo(() => {
    const risks: string[] = [];
    if (!selectedSkill) return risks;

    if (!selectedSkill.formulaId && selectedSkill.damageType) risks.push('缺少伤害公式');
    if (!selectedSkill.animation) risks.push('缺少动画配置');
    if (!selectedSkill.hitType) risks.push('缺少命中类型');
    if (selectedSkill.effectBlocks?.length === 0) risks.push('缺少效果块');
    if (!selectedSkill.targetType) risks.push('缺少目标类型');

    return risks;
  }, [selectedSkill]);

  const toggleCategory = (categoryId: SkillCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const createNewSkill = (category: SkillCategory) => {
    const newSkill: Skill = {
      id: `skill-${Date.now()}`,
      name: '新技能',
      description: '',
      category,
      type: category === 'passive' ? 'passive' : category === 'ultimate' ? 'ultimate' : 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      cost: { resourceType: 'mp', amount: 0 },
      effectBlocks: [],
      showInBar: true,
      upgradable: false,
    };
    addSkill(newSkill);
    setSelectedSkillId(newSkill.id);
  };

  const updateCurrentSkill = (updates: Partial<Skill>) => {
    if (selectedSkillId) {
      updateSkill(selectedSkillId, updates);
    }
  };

  // AI 调整技能数值
  const handleAdjustStats = async () => {
    if (!selectedSkill) return;

    // 本地校验
    const validation = validateBeforeAI('skills', selectedSkill, project);
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
          editor: 'skills',
          entity: selectedSkill,
          project: project,
        },
        'detailed'
      );

      if (result.success && result.result) {
        try {
          const patch = JSON.parse(result.result);
          if (patch.changes && Array.isArray(patch.changes)) {
            const updates: Partial<Skill> = {};

            patch.changes.forEach((change: any) => {
              const field = change.field;
              const newValue = change.to;
              if (field === 'power' || field === 'Power') {
                updates.power = newValue;
              } else if (field === 'mpCost' || field === 'mpCost') {
                updates.mpCost = newValue;
              } else if (field === 'cooldown' || field === 'Cooldown') {
                updates.cooldown = newValue;
              }
            });

            updateSkill(selectedSkillId!, updates);
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

  const getCategoryInfo = (categoryId: SkillCategory) => {
    return skillCategories.find(c => c.id === categoryId) || skillCategories[1];
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
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>技能总数</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{skills.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>当前选中</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{selectedSkill?.name || '-'}</span>
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
            {errorCount === 0 && warningCount === 0 && selectedSkill && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-success)', color: 'white' }}>
                校验通过
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Four Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Skill Registry Tree */}
        <div className="w-56 flex flex-col border-r overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>技能注册表</h3>
              <div className="flex gap-1">
                {skillCategories.slice(0, 3).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => createNewSkill(cat.id)}
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
            {skillCategories.map(cat => {
              const Icon = cat.icon;
              const categorySkills = skillsByCategory[cat.id] || [];
              const isExpanded = expandedCategories.has(cat.id);

              return (
                <div key={cat.id} className="mb-1">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-[var(--color-bg-tertiary)]"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span style={{ color: cat.color }}>{Icon}</span>
                    <span className="flex-1 text-left">{cat.label}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{categorySkills.length}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {categorySkills.map(skill => {
                        const isSelected = selectedSkillId === skill.id;
                        return (
                          <button
                            key={skill.id}
                            onClick={() => setSelectedSkillId(skill.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                              isSelected ? 'ring-1 ring-[var(--color-accent)]' : ''
                            }`}
                            style={{
                              background: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                              borderColor: 'var(--color-border)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{skill.name}</span>
                              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                {skill.cost?.amount || 0}{resourceTypes.find(r => r.id === skill.cost?.resourceType)?.label || ''}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      <button
                        onClick={() => createNewSkill(cat.id)}
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

        {/* Middle: Skill Editor */}
        <div className="flex-1 flex flex-col overflow-hidden border-r" style={{ background: 'var(--color-bg-primary)' }}>
          {selectedSkill ? (
            <>
              {/* Tab Navigation */}
              <div className="flex border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                {[
                  { id: 'basic', label: '基础信息' },
                  { id: 'target', label: '目标与范围' },
                  { id: 'cost', label: '消耗与激活' },
                  { id: 'damage', label: '伤害与公式' },
                  { id: 'effects', label: '效果块' },
                  { id: 'requirements', label: '条件与前置' },
                  { id: 'animation', label: '动画与表现' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 text-xs font-medium border-r ${activeTab === tab.id ? 'bg-[var(--color-bg-tertiary)]' : ''}`}
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
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>技能名称</label>
                          <input
                            type="text"
                            value={selectedSkill.name}
                            onChange={(e) => updateCurrentSkill({ name: e.target.value })}
                            className="input-field w-full mt-1"
                            placeholder="如: 强力斩"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>技能ID</label>
                          <input
                            type="text"
                            value={selectedSkill.id}
                            disabled
                            className="input-field w-full mt-1 opacity-60"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>技能分类</label>
                          <select
                            value={selectedSkill.category || 'active'}
                            onChange={(e) => updateCurrentSkill({ category: e.target.value as SkillCategory })}
                            className="input-field w-full mt-1"
                          >
                            {skillCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>技能类型</label>
                          <select
                            value={selectedSkill.type}
                            onChange={(e) => updateCurrentSkill({ type: e.target.value as any })}
                            className="input-field w-full mt-1"
                          >
                            <option value="active">主动技能</option>
                            <option value="passive">被动技能</option>
                            <option value="ultimate">终极技能</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>图标</label>
                          <select
                            value={selectedSkill.icon || ''}
                            onChange={(e) => updateCurrentSkill({ icon: e.target.value })}
                            className="input-field w-full mt-1"
                          >
                            <option value="">选择图标</option>
                            {effectTypes.map(eff => (
                              <option key={eff.id} value={eff.id}>{eff.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>使用场景</label>
                          <input
                            type="text"
                            value={selectedSkill.scenario?.join(',') || ''}
                            onChange={(e) => updateCurrentSkill({ scenario: e.target.value ? e.target.value.split(',') : [] })}
                            className="input-field w-full mt-1"
                            placeholder="野外,PVP,副本"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>描述</label>
                          <textarea
                            value={selectedSkill.description}
                            onChange={(e) => updateCurrentSkill({ description: e.target.value })}
                            className="input-field w-full mt-1 h-20 resize-none"
                            placeholder="描述此技能的效果..."
                          />
                        </div>
                        <div className="col-span-2 flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedSkill.upgradable || false}
                              onChange={(e) => updateCurrentSkill({ upgradable: e.target.checked })}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>可升级</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedSkill.showInBar !== false}
                              onChange={(e) => updateCurrentSkill({ showInBar: e.target.checked })}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>显示在技能栏</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'target' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>目标选择</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>目标类型</label>
                          <select
                            value={selectedSkill.targetType || 'single'}
                            onChange={(e) => updateCurrentSkill({ targetType: e.target.value as any })}
                            className="input-field w-full mt-1"
                          >
                            {targetTypes.map(tt => (
                              <option key={tt.id} value={tt.id}>{tt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>目标阵营</label>
                          <select
                            value={selectedSkill.targetCamp || 'enemy'}
                            onChange={(e) => updateCurrentSkill({ targetCamp: e.target.value as any })}
                            className="input-field w-full mt-1"
                          >
                            {targetCamps.map(tc => (
                              <option key={tc.id} value={tc.id}>{tc.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>目标数量</label>
                          <input
                            type="number"
                            value={selectedSkill.targetCount || 1}
                            onChange={(e) => updateCurrentSkill({ targetCount: Number(e.target.value) })}
                            className="input-field w-full mt-1"
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>目标条件</label>
                          <select
                            value={selectedSkill.targetConditions?.[0]?.condition || 'any'}
                            onChange={(e) => updateCurrentSkill({ targetConditions: [{ condition: e.target.value as any }] })}
                            className="input-field w-full mt-1"
                          >
                            {targetConditions.map(tc => (
                              <option key={tc.id} value={tc.id}>{tc.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedSkill.requireTargetSelection || false}
                              onChange={(e) => updateCurrentSkill({ requireTargetSelection: e.target.checked })}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>需要玩家选择目标</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'cost' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>消耗与激活</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>消耗资源</label>
                          <select
                            value={selectedSkill.cost?.resourceType || 'mp'}
                            onChange={(e) => updateCurrentSkill({ cost: { ...selectedSkill.cost!, resourceType: e.target.value } })}
                            className="input-field w-full mt-1"
                          >
                            {resourceTypes.map(rt => (
                              <option key={rt.id} value={rt.id}>{rt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>消耗数量</label>
                          <input
                            type="number"
                            value={selectedSkill.cost?.amount || 0}
                            onChange={(e) => updateCurrentSkill({ cost: { ...selectedSkill.cost!, amount: Number(e.target.value) } })}
                            className="input-field w-full mt-1"
                            min={0}
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>冷却回合</label>
                          <input
                            type="number"
                            value={selectedSkill.cooldown || 0}
                            onChange={(e) => updateCurrentSkill({ cooldown: Number(e.target.value) })}
                            className="input-field w-full mt-1"
                            min={0}
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>充能次数</label>
                          <input
                            type="number"
                            value={selectedSkill.charge || 0}
                            onChange={(e) => updateCurrentSkill({ charge: Number(e.target.value) })}
                            className="input-field w-full mt-1"
                            min={0}
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>速度修正</label>
                          <input
                            type="number"
                            value={selectedSkill.speedModifier || 0}
                            onChange={(e) => updateCurrentSkill({ speedModifier: Number(e.target.value) })}
                            className="input-field w-full mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>成功率</label>
                          <input
                            type="number"
                            value={selectedSkill.successRate || 100}
                            onChange={(e) => updateCurrentSkill({ successRate: Number(e.target.value) })}
                            className="input-field w-full mt-1"
                            min={0}
                            max={100}
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>重复次数</label>
                          <input
                            type="number"
                            value={selectedSkill.repeat || 1}
                            onChange={(e) => updateCurrentSkill({ repeat: Number(e.target.value) })}
                            className="input-field w-full mt-1"
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>命中类型</label>
                          <select
                            value={selectedSkill.hitType || 'certain'}
                            onChange={(e) => updateCurrentSkill({ hitType: e.target.value as any })}
                            className="input-field w-full mt-1"
                          >
                            {hitTypes.map(ht => (
                              <option key={ht.id} value={ht.id}>{ht.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>TP获取</label>
                          <input
                            type="number"
                            value={selectedSkill.resourceGain?.amount || 0}
                            onChange={(e) => updateCurrentSkill({ resourceGain: { type: 'tp', amount: Number(e.target.value) } })}
                            className="input-field w-full mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'damage' && (
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
                          <span>调整技能数值</span>
                        </button>
                      </div>
                      {aiMessage && (
                        <div className={`mt-2 p-2 rounded text-xs ${aiMessage.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {aiMessage.text}
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>伤害与公式</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>伤害类型</label>
                          <select
                            value={selectedSkill.damageType || 'physical'}
                            onChange={(e) => updateCurrentSkill({ damageType: e.target.value as any })}
                            className="input-field w-full mt-1"
                          >
                            {damageTypes.map(dt => (
                              <option key={dt.id} value={dt.id}>{dt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>公式模板</label>
                          <select
                            value={selectedSkill.formulaId || ''}
                            onChange={(e) => updateCurrentSkill({ formulaId: e.target.value })}
                            className="input-field w-full mt-1"
                          >
                            <option value="">选择公式</option>
                            {project.rules.damageFormulas.map(df => (
                              <option key={df.id} value={df.id}>{df.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>元素</label>
                          <select
                            value={selectedSkill.element || ''}
                            onChange={(e) => updateCurrentSkill({ element: e.target.value })}
                            className="input-field w-full mt-1"
                          >
                            <option value="">无</option>
                            {project.rules.elements.map(el => (
                              <option key={el.id} value={el.id}>{el.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>伤害波动(%)</label>
                          <input
                            type="number"
                            value={selectedSkill.variance || 0}
                            onChange={(e) => updateCurrentSkill({ variance: Number(e.target.value) })}
                            className="input-field w-full mt-1"
                            min={0}
                            max={50}
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer mt-5">
                            <input
                              type="checkbox"
                              checked={selectedSkill.critEnabled || false}
                              onChange={(e) => updateCurrentSkill({ critEnabled: e.target.checked })}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>暴击</span>
                          </label>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer mt-5">
                            <input
                              type="checkbox"
                              checked={selectedSkill.trueDamagePenetration || false}
                              onChange={(e) => updateCurrentSkill({ trueDamagePenetration: e.target.checked })}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>真伤穿透</span>
                          </label>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>伤害下限</label>
                          <input
                            type="number"
                            value={selectedSkill.damageRange?.min || 0}
                            onChange={(e) => updateCurrentSkill({ damageRange: { ...selectedSkill.damageRange!, min: Number(e.target.value) } })}
                            className="input-field w-full mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>伤害上限</label>
                          <input
                            type="number"
                            value={selectedSkill.damageRange?.max || 0}
                            onChange={(e) => updateCurrentSkill({ damageRange: { ...selectedSkill.damageRange!, max: Number(e.target.value) } })}
                            className="input-field w-full mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'effects' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>效果块</h4>
                        <button
                          onClick={() => {
                            updateCurrentSkill({
                              effectBlocks: [...(selectedSkill.effectBlocks || []), { id: `effect-${Date.now()}`, type: 'damage', params: {} }]
                            });
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--color-accent)', color: 'white' }}
                        >
                          <Plus size={12} /> 添加效果块
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(selectedSkill.effectBlocks || []).map((effect, idx) => {
                          const EffIcon = effectTypes.find(e => e.id === effect.type)?.icon || Sparkles;
                          const [isExpanded, setIsExpanded] = useState(false);
                          
                          // Render parameter fields based on effect type
                          const renderEffectParams = () => {
                            switch (effect.type) {
                              case 'damage':
                                return (
                                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>伤害值</label>
                                      <input
                                        type="number"
                                        value={(effect.params?.damage as number) || 0}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, damage: Number(e.target.value) } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>伤害类型</label>
                                      <select
                                        value={(effect.params?.damageType as string) || 'physical'}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, damageType: e.target.value } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                      >
                                        <option value="physical">物理</option>
                                        <option value="magic">魔法</option>
                                        <option value="true">真实</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>暴击加成(%)</label>
                                      <input
                                        type="number"
                                        value={(effect.params?.critBonus as number) || 0}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, critBonus: Number(e.target.value) } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                      />
                                    </div>
                                  </div>
                                );
                              case 'heal':
                                return (
                                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>治疗量</label>
                                      <input
                                        type="number"
                                        value={(effect.params?.heal as number) || 0}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, heal: Number(e.target.value) } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>溢出治疗</label>
                                      <input
                                        type="number"
                                        value={(effect.params?.overflow as number) || 0}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, overflow: Number(e.target.value) } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                      />
                                    </div>
                                    <div>
                                      <label className="flex items-center gap-1 mt-4">
                                        <input
                                          type="checkbox"
                                          checked={(effect.params?. overheal) as boolean || false}
                                          onChange={(e) => {
                                            const newEffects = [...(selectedSkill.effectBlocks || [])];
                                            newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, overheal: e.target.checked } };
                                            updateCurrentSkill({ effectBlocks: newEffects });
                                          }}
                                        />
                                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>允许溢出</span>
                                      </label>
                                    </div>
                                  </div>
                                );
                              case 'status':
                              case 'buff':
                              case 'debuff':
                                return (
                                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>状态ID</label>
                                        <input
                                          type="text"
                                          value={(effect.params?.statusId as string) || ''}
                                          onChange={(e) => {
                                            const newEffects = [...(selectedSkill.effectBlocks || [])];
                                            newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, statusId: e.target.value } };
                                            updateCurrentSkill({ effectBlocks: newEffects });
                                          }}
                                          className="input-field w-full text-xs mt-1"
                                          placeholder="如: buff-attack"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>持续回合</label>
                                        <input
                                          type="number"
                                          value={(effect.params?.duration as number) || 0}
                                          onChange={(e) => {
                                            const newEffects = [...(selectedSkill.effectBlocks || [])];
                                            newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, duration: Number(e.target.value) } };
                                            updateCurrentSkill({ effectBlocks: newEffects });
                                          }}
                                          className="input-field w-full text-xs mt-1"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>层数</label>
                                        <input
                                          type="number"
                                          value={(effect.params?.stacks as number) || 1}
                                          onChange={(e) => {
                                            const newEffects = [...(selectedSkill.effectBlocks || [])];
                                            newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, stacks: Number(e.target.value) } };
                                            updateCurrentSkill({ effectBlocks: newEffects });
                                          }}
                                          className="input-field w-full text-xs mt-1"
                                          min={1}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>效果值</label>
                                        <input
                                          type="number"
                                          value={(effect.params?.value as number) || 0}
                                          onChange={(e) => {
                                            const newEffects = [...(selectedSkill.effectBlocks || [])];
                                            newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, value: Number(e.target.value) } };
                                            updateCurrentSkill({ effectBlocks: newEffects });
                                          }}
                                          className="input-field w-full text-xs mt-1"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              case 'action-gauge':
                              case 'action-gauge-lose':
                                return (
                                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>行动条变化</label>
                                      <input
                                        type="number"
                                        value={(effect.params?.gauge as number) || 0}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, gauge: Number(e.target.value) } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>单位</label>
                                      <select
                                        value={(effect.params?.gaugeUnit as string) || 'percent'}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, gaugeUnit: e.target.value } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                      >
                                        <option value="percent">百分比</option>
                                        <option value="fixed">固定值</option>
                                      </select>
                                    </div>
                                  </div>
                                );
                              case 'displacement':
                                return (
                                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>位移方向</label>
                                      <select
                                        value={(effect.params?.direction as string) || 'front'}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, direction: e.target.value } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                      >
                                        <option value="front">前排</option>
                                        <option value="back">后排</option>
                                        <option value="left">左移</option>
                                        <option value="right">右移</option>
                                        <option value="random">随机</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>格数</label>
                                      <input
                                        type="number"
                                        value={(effect.params?.cells as number) || 1}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, cells: Number(e.target.value) } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                        min={1}
                                      />
                                    </div>
                                  </div>
                                );
                              case 'resource-gain':
                              case 'resource-drain':
                                return (
                                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>资源类型</label>
                                      <select
                                        value={(effect.params?.resourceType as string) || 'mp'}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, resourceType: e.target.value } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                      >
                                        {resourceTypes.map(rt => (
                                          <option key={rt.id} value={rt.id}>{rt.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>资源量</label>
                                      <input
                                        type="number"
                                        value={(effect.params?.amount as number) || 0}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, amount: Number(e.target.value) } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>百分比</label>
                                      <input
                                        type="number"
                                        value={(effect.params?.percent as number) || 0}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, percent: Number(e.target.value) } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                        min={0}
                                        max={100}
                                      />
                                    </div>
                                  </div>
                                );
                              case 'chase-mark':
                                return (
                                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>追击伤害(%)</label>
                                      <input
                                        type="number"
                                        value={(effect.params?.chaseDamage as number) || 100}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, chaseDamage: Number(e.target.value) } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>触发条件</label>
                                      <input
                                        type="text"
                                        value={(effect.params?.trigger as string) || ''}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, trigger: e.target.value } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                        placeholder="如: attacked"
                                      />
                                    </div>
                                  </div>
                                );
                              case 'summon':
                                return (
                                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>召唤物ID</label>
                                        <input
                                          type="text"
                                          value={(effect.params?.summonId as string) || ''}
                                          onChange={(e) => {
                                            const newEffects = [...(selectedSkill.effectBlocks || [])];
                                            newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, summonId: e.target.value } };
                                            updateCurrentSkill({ effectBlocks: newEffects });
                                          }}
                                          className="input-field w-full text-xs mt-1"
                                          placeholder="如: summon-slime"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>持续回合</label>
                                        <input
                                          type="number"
                                          value={(effect.params?.duration as number) || 3}
                                          onChange={(e) => {
                                            const newEffects = [...(selectedSkill.effectBlocks || [])];
                                            newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, duration: Number(e.target.value) } };
                                            updateCurrentSkill({ effectBlocks: newEffects });
                                          }}
                                          className="input-field w-full text-xs mt-1"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              case 'remove-status':
                                return (
                                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                    <div>
                                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>移除状态ID</label>
                                      <input
                                        type="text"
                                        value={(effect.params?.statusId as string) || ''}
                                        onChange={(e) => {
                                          const newEffects = [...(selectedSkill.effectBlocks || [])];
                                          newEffects[idx] = { ...newEffects[idx], params: { ...newEffects[idx].params, statusId: e.target.value } };
                                          updateCurrentSkill({ effectBlocks: newEffects });
                                        }}
                                        className="input-field w-full text-xs mt-1"
                                        placeholder="如: poison"
                                      />
                                    </div>
                                  </div>
                                );
                              default:
                                return null;
                            }
                          };

                          return (
                            <div
                              key={idx}
                              className="rounded overflow-hidden"
                              style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}
                            >
                              <div className="flex items-center gap-3 p-3">
                                <button
                                  onClick={() => setIsExpanded(!isExpanded)}
                                  className="p-0.5 rounded hover:bg-[var(--color-bg-tertiary)]"
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                                <EffIcon size={16} style={{ color: 'var(--color-accent)' }} />
                                <div className="flex-1">
                                  <select
                                    value={effect.type}
                                    onChange={(e) => {
                                      const newEffects = [...(selectedSkill.effectBlocks || [])];
                                      newEffects[idx] = { ...newEffects[idx], type: e.target.value as any, params: {} };
                                      updateCurrentSkill({ effectBlocks: newEffects });
                                    }}
                                    className="input-field text-xs"
                                  >
                                    {effectTypes.map(et => (
                                      <option key={et.id} value={et.id}>{et.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  onClick={() => {
                                    const newEffects = (selectedSkill.effectBlocks || []).filter((_, i) => i !== idx);
                                    updateCurrentSkill({ effectBlocks: newEffects });
                                  }}
                                  className="p-1 rounded hover:bg-[var(--color-danger)]"
                                >
                                  <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                                </button>
                              </div>
                              {isExpanded && renderEffectParams()}
                            </div>
                          );
                        })}
                        {(selectedSkill.effectBlocks || []).length === 0 && (
                          <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                            暂无效果块，请点击"添加效果块"创建
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'requirements' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>条件与前置</h4>
                      
                      {/* 武器需求 - Tag Picker */}
                      <div className="mb-4">
                        <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>武器需求</label>
                        <div className="flex flex-wrap gap-1 p-2 rounded" style={{ background: 'var(--color-bg-primary)', minHeight: '40px' }}>
                          {selectedSkill.requirements?.weaponType?.split(',').filter(Boolean).map((weapon, idx) => (
                            <span key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-accent)', color: 'white' }}>
                              {weapon.trim()}
                              <button 
                                onClick={() => {
                                  const weapons = selectedSkill.requirements?.weaponType?.split(',').filter(Boolean).filter((_, i) => i !== idx) || [];
                                  updateCurrentSkill({ requirements: { ...selectedSkill.requirements!, weaponType: weapons.join(', ') } });
                                }}
                                className="hover:text-red-200"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                const weapons = selectedSkill.requirements?.weaponType 
                                  ? `${selectedSkill.requirements.weaponType},${e.target.value}`
                                  : e.target.value;
                                updateCurrentSkill({ requirements: { ...selectedSkill.requirements!, weaponType: weapons } });
                              }
                            }}
                            className="input-field text-xs bg-transparent border-none"
                          >
                            <option value="">+ 添加武器</option>
                            <option value="sword">剑</option>
                            <option value="axe">斧</option>
                            <option value="hammer">锤</option>
                            <option value="dagger">匕首</option>
                            <option value="bow">弓</option>
                            <option value="staff">法杖</option>
                            <option value="wand">魔杖</option>
                          </select>
                        </div>
                      </div>

                      {/* 职业需求 - 结构化选择 */}
                      <div className="mb-4">
                        <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>职业需求</label>
                        <select
                          value={selectedSkill.requirements?.classRequirement || ''}
                          onChange={(e) => updateCurrentSkill({ requirements: { ...selectedSkill.requirements!, classRequirement: e.target.value } })}
                          className="input-field w-full"
                        >
                          <option value="">无职业需求</option>
                          <option value="warrior">战士</option>
                          <option value="mage">法师</option>
                          <option value="priest">牧师</option>
                          <option value="assassin">刺客</option>
                          <option value="tank">坦克</option>
                          <option value="support">辅助</option>
                        </select>
                      </div>

                      {/* 站位需求 - 预设选项 */}
                      <div className="mb-4">
                        <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>站位需求</label>
                        <div className="flex gap-2">
                          {['front', 'back', 'any'].map(pos => (
                            <label key={pos} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name="position"
                                checked={selectedSkill.requirements?.positionRequirement === pos || (!selectedSkill.requirements?.positionRequirement && pos === 'any')}
                                onChange={() => updateCurrentSkill({ requirements: { ...selectedSkill.requirements!, positionRequirement: pos === 'any' ? '' : pos } })}
                              />
                              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                {pos === 'front' ? '前排' : pos === 'back' ? '后排' : '任意'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* 状态需求 - Tag Picker */}
                      <div className="mb-4">
                        <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>状态需求</label>
                        <div className="flex flex-wrap gap-1 p-2 rounded" style={{ background: 'var(--color-bg-primary)', minHeight: '40px' }}>
                          {selectedSkill.requirements?.statusRequirement?.split(',').filter(Boolean).map((status, idx) => (
                            <span key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-success)', color: 'white' }}>
                              {status.trim()}
                              <button 
                                onClick={() => {
                                  const statuses = selectedSkill.requirements?.statusRequirement?.split(',').filter(Boolean).filter((_, i) => i !== idx) || [];
                                  updateCurrentSkill({ requirements: { ...selectedSkill.requirements!, statusRequirement: statuses.join(', ') } });
                                }}
                                className="hover:text-red-200"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                const statuses = selectedSkill.requirements?.statusRequirement 
                                  ? `${selectedSkill.requirements.statusRequirement},${e.target.value}`
                                  : e.target.value;
                                updateCurrentSkill({ requirements: { ...selectedSkill.requirements!, statusRequirement: statuses } });
                              }
                            }}
                            className="input-field text-xs bg-transparent border-none"
                          >
                            <option value="">+ 添加状态</option>
                            <option value="buff-attack">攻击强化</option>
                            <option value="buff-defense">防御强化</option>
                            <option value="buff-speed">速度强化</option>
                            <option value="poison">中毒</option>
                            <option value="burn">灼烧</option>
                            <option value="freeze">冰冻</option>
                          </select>
                        </div>
                      </div>

                      {/* 资源阈值 */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>资源阈值(类型)</label>
                          <select
                            value={selectedSkill.requirements?.resourceThreshold?.type || 'hp'}
                            onChange={(e) => updateCurrentSkill({ requirements: { ...selectedSkill.requirements!, resourceThreshold: { ...selectedSkill.requirements?.resourceThreshold!, type: e.target.value } } })}
                            className="input-field w-full mt-1"
                          >
                            {resourceTypes.map(rt => (
                              <option key={rt.id} value={rt.id}>{rt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>资源阈值(最小%)</label>
                          <input
                            type="number"
                            value={selectedSkill.requirements?.resourceThreshold?.min || 0}
                            onChange={(e) => updateCurrentSkill({ requirements: { ...selectedSkill.requirements!, resourceThreshold: { ...selectedSkill.requirements?.resourceThreshold!, min: Number(e.target.value) } } })}
                            className="input-field w-full mt-1"
                            min={0}
                            max={100}
                          />
                        </div>
                      </div>

                      {/* 连携/反应条件 - 预设选项 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>连携条件</label>
                          <select
                            value={selectedSkill.requirements?.comboCondition || ''}
                            onChange={(e) => updateCurrentSkill({ requirements: { ...selectedSkill.requirements!, comboCondition: e.target.value } })}
                            className="input-field w-full mt-1"
                          >
                            <option value="">无连携</option>
                            <option value="after-normal-attack">普攻后</option>
                            <option value="after-skill">技能后</option>
                            <option value="after-kill">击杀后</option>
                            <option value="after-crit">暴击后</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>反应条件</label>
                          <select
                            value={selectedSkill.requirements?.reactionCondition || ''}
                            onChange={(e) => updateCurrentSkill({ requirements: { ...selectedSkill.requirements!, reactionCondition: e.target.value } })}
                            className="input-field w-full mt-1"
                          >
                            <option value="">无反应</option>
                            <option value="on-hit">受击时</option>
                            <option value="on-death">濒死时</option>
                            <option value="on-turn-start">回合开始</option>
                            <option value="on-turn-end">回合结束</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'animation' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>动画与表现</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>动画</label>
                          <input
                            type="text"
                            value={selectedSkill.animation || ''}
                            onChange={(e) => updateCurrentSkill({ animation: e.target.value })}
                            className="input-field w-full mt-1"
                            placeholder="如: slash-effect"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>音效</label>
                          <input
                            type="text"
                            value={selectedSkill.soundEffect || ''}
                            onChange={(e) => updateCurrentSkill({ soundEffect: e.target.value })}
                            className="input-field w-full mt-1"
                            placeholder="如: sword-swing"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>命中表现</label>
                          <input
                            type="text"
                            value={selectedSkill.hitEffect || ''}
                            onChange={(e) => updateCurrentSkill({ hitEffect: e.target.value })}
                            className="input-field w-full mt-1"
                            placeholder="如: hit-spark"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>未命中表现</label>
                          <input
                            type="text"
                            value={selectedSkill.missEffect || ''}
                            onChange={(e) => updateCurrentSkill({ missEffect: e.target.value })}
                            className="input-field w-full mt-1"
                            placeholder="如: miss-swirl"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>战斗日志模板</label>
                          <input
                            type="text"
                            value={selectedSkill.battleLogTemplate || ''}
                            onChange={(e) => updateCurrentSkill({ battleLogTemplate: e.target.value })}
                            className="input-field w-full mt-1"
                            placeholder="{actor} 对 {target} 使用了 {skill}，造成 {damage} 点伤害"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => {
                    if (selectedSkillId) {
                      deleteSkill(selectedSkillId);
                      setSelectedSkillId(skills[0]?.id || null);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-xs"
                  style={{ background: 'var(--color-danger)', color: 'white' }}
                >
                  <Trash2 size={12} /> 删除技能
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="text-center">
                <Sparkles size={48} className="mx-auto mb-4 opacity-30" />
                <div className="text-lg mb-2">选择或创建技能</div>
                <div className="text-sm mb-4">从左侧技能注册表中选择已有技能，或点击"+"创建新技能</div>
                <button
                  onClick={() => createNewSkill('active')}
                  className="flex items-center gap-2 px-4 py-2 rounded"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  <Plus size={16} /> 创建新技能
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview & Validation */}
        <div className="w-72 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>技能预览 & 校验</h3>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {selectedSkill ? (
              <>
                {/* Skill Card Preview */}
                <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>技能卡预览</h4>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)', borderLeft: `3px solid var(--color-accent)` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded flex items-center justify-center" style={{ background: 'var(--color-accent)' + '20' }}>
                        {React.createElement(effectTypes.find(e => e.id === selectedSkill.icon)?.icon || Sparkles, { size: 24, style: { color: 'var(--color-accent)' } })}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedSkill.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {skillCategories.find(c => c.id === selectedSkill.category)?.label} · {selectedSkill.type === 'active' ? '主动' : selectedSkill.type === 'passive' ? '被动' : '终极'}
                        </div>
                      </div>
                    </div>
                    {selectedSkill.description && (
                      <div className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {selectedSkill.description}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <span>消耗: {selectedSkill.cost?.amount || 0}{resourceTypes.find(r => r.id === selectedSkill.cost?.resourceType)?.label || ''}</span>
                      {selectedSkill.cooldown ? <span> 冷却: {selectedSkill.cooldown}回合</span> : null}
                    </div>
                  </div>
                </div>

                {/* Target Preview */}
                <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>目标预览</h4>
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <div>类型: {targetTypes.find(t => t.id === selectedSkill.targetType)?.label}</div>
                    <div>阵营: {targetCamps.find(t => t.id === selectedSkill.targetCamp)?.label}</div>
                    {selectedSkill.targetCount && <div>数量: {selectedSkill.targetCount}</div>}
                  </div>
                </div>

                {/* Effect Preview */}
                <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>效果块预览</h4>
                  <div className="space-y-1">
                    {(selectedSkill.effectBlocks || []).length > 0 ? (
                      selectedSkill.effectBlocks!.map((effect, idx) => (
                        <div key={idx} className="text-xs flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} />
                          <span>{effectTypes.find(t => t.id === effect.type)?.label}</span>
                          {effect.type === 'damage' && effect.params?.damage && (
                            <span className="text-[10px]" style={{ color: 'var(--color-danger)' }}>{effect.params.damage}伤害</span>
                          )}
                          {effect.type === 'heal' && effect.params?.heal && (
                            <span className="text-[10px]" style={{ color: 'var(--color-success)' }}>+{effect.params.heal}治疗</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>暂无效果块</div>
                    )}
                  </div>
                </div>

                {/* Damage/Resource Preview */}
                <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>数值预估</h4>
                  <div className="space-y-2">
                    {/* 预计伤害 */}
                    {selectedSkill.damageType && selectedSkill.damageType !== 'heal' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>预计伤害</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
                          {selectedSkill.damageType === 'physical' ? '100-150' : selectedSkill.damageType === 'magic' ? '80-120' : '50-80'}
                          {(selectedSkill.variance || 0) > 0 && <span className="text-[10px] ml-1">({selectedSkill.variance}%波动)</span>}
                        </span>
                      </div>
                    )}
                    {/* 预计治疗 */}
                    {(selectedSkill.damageType === 'heal' || (selectedSkill.effectBlocks?.some(e => e.type === 'heal'))) && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>预计治疗</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                          {selectedSkill.effectBlocks?.find(e => e.type === 'heal')?.params?.heal || 50}-{selectedSkill.effectBlocks?.find(e => e.type === 'heal')?.params?.heal ? (selectedSkill.effectBlocks?.find(e => e.type === 'heal')?.params?.heal as number * 1.5).toFixed(0) : 75}
                        </span>
                      </div>
                    )}
                    {/* 资源消耗 */}
                    {selectedSkill.cost?.amount && selectedSkill.cost.amount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>资源消耗</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>
                          -{selectedSkill.cost.amount} {resourceTypes.find(r => r.id === selectedSkill.cost?.resourceType)?.label || ''}
                        </span>
                      </div>
                    )}
                    {/* 资源回复 */}
                    {(selectedSkill.resourceGain?.amount || 0) > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>资源回复</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                          +{selectedSkill.resourceGain?.amount} TP
                        </span>
                      </div>
                    )}
                    {/* 附加状态 */}
                    {selectedSkill.effectBlocks?.some(e => e.type === 'status' || e.type === 'buff' || e.type === 'debuff') && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <span className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>附加状态</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedSkill.effectBlocks?.filter(e => e.type === 'status' || e.type === 'buff' || e.type === 'debuff').map((effect, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 rounded text-[10px]"
                              style={{ 
                                background: effect.type === 'buff' ? 'var(--color-success)' : effect.type === 'debuff' ? 'var(--color-danger)' : 'var(--color-accent)',
                                color: 'white'
                              }}
                            >
                              {(effect.params?.statusId as string) || '未命名'}
                              {effect.params?.duration && ` (${effect.params.duration}回合)`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 行动条变化 */}
                    {selectedSkill.effectBlocks?.some(e => e.type === 'action-gauge' || e.type === 'action-gauge-lose') && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <span className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>行动条变化</span>
                        {selectedSkill.effectBlocks?.filter(e => e.type === 'action-gauge' || e.type === 'action-gauge-lose').map((effect, idx) => (
                          <div key={idx} className="text-xs flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                            <span>{effect.type === 'action-gauge' ? '推进' : '延迟'}:</span>
                            <span className={effect.type === 'action-gauge' ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}>
                              {effect.params?.gauge || 0}{effect.params?.gaugeUnit === 'percent' ? '%' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 基础信息汇总 */}
                    <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-muted)' }}>暴击</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{selectedSkill.critEnabled ? '是' : '否'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-muted)' }}>成功率</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{selectedSkill.successRate || 100}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-muted)' }}>冷却</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{selectedSkill.cooldown || 0}回合</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-muted)' }}>重复</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{selectedSkill.repeat || 1}次</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Warnings */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>风险提示</h4>
                  <div className="space-y-2">
                    {skillRisks.length > 0 ? (
                      skillRisks.map((risk, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <AlertTriangle size={12} style={{ color: 'var(--color-warning)' }} />
                          <span style={{ color: 'var(--color-warning)' }}>{risk}</span>
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
                <div className="text-center text-xs">选择技能查看预览</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
