import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import {
  Zap, RotateCcw,
  AlertTriangle, Info, Users, Skull, History
} from 'lucide-react';

// Turn type options
const turnTypes = [
  { id: 'turn-based', label: '经典轮流制', desc: '按速度顺序依次行动' },
  { id: 'atb', label: 'ATB时间轴', desc: '速度条满了就行动' },
  { id: 'action-point', label: 'AP行动点', desc: '每回合获得AP分配行动' },
  { id: 'phase-based', label: '阶段轮换', desc: '按阶段分配行动权' },
];

// Reaction mechanisms
const reactions = [
  { id: 'counter', label: '反击', desc: '受击时一定概率反击' },
  { id: 'chase', label: '追击', desc: '击杀目标后继续行动' },
  { id: 'coordinated', label: '协同攻击', desc: '友军行动时协同进攻' },
  { id: 'support', label: '援护', desc: '友军受击时替代承受' },
  { id: 'interrupt', label: '打断', desc: '特定时机打断敌方行动' },
  { id: 'instant', label: '立即行动', desc: '满足条件立即触发' },
];

// Turn phase hooks
const phaseHooks = [
  { id: 'turn-start', label: '回合开始' },
  { id: 'before-action', label: '行动前' },
  { id: 'after-action', label: '行动后' },
  { id: 'turn-end', label: '回合结束' },
  { id: 'wave-switch', label: '波次切换' },
  { id: 'phase-change', label: '首领转阶段' },
];

export const TurnModelEditor: React.FC = () => {
  const { project, updateRules } = useProjectStore();
  const { turnModel } = project.rules;
  const { characters, enemies } = project;

  const [previewTurn, setPreviewTurn] = useState(1);
  const [skipTurnReward, setSkipTurnReward] = useState(false);

  // Get sample entities from project or use defaults
  const sampleEntities = useMemo(() => {
    const chars = characters.length > 0 ? characters.slice(0, 2).map((c, i) => ({
      id: c.id,
      name: c.identity?.name || `角色${i + 1}`,
      type: 'hero' as const,
      speed: c.attributes?.baseStats?.speed || 100 - i * 10,
    })) : [
      { id: 'hero1', name: '英雄A', type: 'hero' as const, speed: 100 },
      { id: 'hero2', name: '英雄B', type: 'hero' as const, speed: 90 },
    ];

    const enms = enemies.length > 0 ? enemies.slice(0, 2).map((e, i) => ({
      id: e.id,
      name: e.name || `敌人${i + 1}`,
      type: 'enemy' as const,
      speed: e.attributes?.speed ?? 80 - i * 10,
    })) : [
      { id: 'enemy1', name: '怪物A', type: 'enemy' as const, speed: 80 },
      { id: 'enemy2', name: '怪物B', type: 'enemy' as const, speed: 70 },
    ];

    return [...chars, ...enms];
  }, [characters, enemies]);

  const [previewSpeed, setPreviewSpeed] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    sampleEntities.forEach(e => { initial[e.id] = e.speed; });
    return initial;
  });

  // Validate turn model
  const validation = useMemo(() => {
    const issues: { type: 'error' | 'warning'; message: string }[] = [];
    if (!turnModel.speedCalculation) issues.push({ type: 'warning', message: '未设置速度计算公式' });
    if (turnModel.type === 'atb' && !turnModel.atbGaugeMax) issues.push({ type: 'error', message: 'ATB模式需要设置ATB上限' });
    if (turnModel.type === 'action-point' && !turnModel.actionPointPerTurn) issues.push({ type: 'error', message: 'AP模式需要设置每回合AP' });
    if (sampleEntities.length < 2) issues.push({ type: 'warning', message: '建议添加至少2个单位以测试行动顺序' });
    return issues;
  }, [turnModel, sampleEntities]);

  // Simulate action order preview
  const actionOrder = useMemo(() => {
    const entities = sampleEntities.map(e => ({
      ...e,
      speed: previewSpeed[e.id] ?? e.speed,
    }));
    return entities.sort((a, b) => b.speed - a.speed);
  }, [sampleEntities, previewSpeed]);

  const updateTurnModel = (updates: Partial<typeof turnModel>) => {
    updateRules({ turnModel: { ...turnModel, ...updates } });
  };

  const toggleReaction = (reactionId: string) => {
    const current = turnModel.reactions || {};
    updateTurnModel({
      reactions: {
        ...current,
        [reactionId]: { 
          ...current[reactionId as keyof typeof current], 
          enabled: !current[reactionId as keyof typeof current]?.enabled,
          priority: current[reactionId as keyof typeof current]?.priority ?? 5
        }
      }
    });
  };

  const updateReactionPriority = (reactionId: string, priority: number) => {
    const current = turnModel.reactions || {};
    updateTurnModel({
      reactions: {
        ...current,
        [reactionId]: {
          ...current[reactionId as keyof typeof current],
          enabled: current[reactionId as keyof typeof current]?.enabled ?? false,
          priority
        }
      }
    });
  };

  const togglePhaseHook = (hookId: string) => {
    const current = turnModel.phaseHooks || [];
    const exists = current.find(h => h.id === hookId);
    if (exists) {
      updateTurnModel({ phaseHooks: current.map(h => h.id === hookId ? { ...h, enabled: !h.enabled } : h) });
    } else {
      updateTurnModel({ phaseHooks: [...current, { id: hookId, enabled: true, handlers: [] }] });
    }
  };

  // Get turn type label
  const getTurnTypeLabel = () => {
    const type = turnTypes.find(t => t.id === turnModel.type);
    return type?.label || '未选择';
  };

  // Validation summary
  const errorCount = validation.filter(v => v.type === 'error').length;
  const warningCount = validation.filter(v => v.type === 'warning').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top Summary Card */}
      <div className="shrink-0 p-3 border-b" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>回合类型</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{getTurnTypeLabel()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>速度主属性</span>
            <span className="text-sm font-mono" style={{ color: 'var(--color-accent)' }}>{turnModel.speedCalculation || 'speed'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>跳过回合收益</span>
            <button
              onClick={() => setSkipTurnReward(!skipTurnReward)}
              className={`px-2 py-0.5 rounded text-xs ${skipTurnReward ? 'ring-1 ring-[var(--color-accent)]' : ''}`}
              style={{ background: skipTurnReward ? 'var(--color-accent)' : 'var(--color-bg-primary)', color: skipTurnReward ? 'white' : 'var(--color-text-secondary)' }}
            >
              {skipTurnReward ? '启用' : '禁用'}
            </button>
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
            {errorCount === 0 && warningCount === 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-success)', color: 'white' }}>
                校验通过
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Configuration Panel */}
        <div className="w-1/2 flex flex-col overflow-hidden border-r" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Turn Type */}
            <div>
              <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>基础模型</h3>
              <div className="grid grid-cols-2 gap-2">
                {turnTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => updateTurnModel({ type: type.id as any })}
                    className={`p-3 rounded-lg text-left transition-all ${
                      turnModel.type === type.id 
                        ? 'ring-2 ring-[var(--color-accent)]' 
                        : 'hover:bg-[var(--color-bg-tertiary)]'
                    }`}
                    style={{ 
                      background: turnModel.type === type.id ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                      border: `1px solid ${turnModel.type === type.id ? 'var(--color-accent)' : 'var(--color-border)'}`
                    }}
                  >
                    <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{type.label}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Configuration */}
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>行动顺序</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>速度计算公式</label>
                  <input
                    type="text"
                    value={turnModel.speedCalculation || ''}
                    onChange={(e) => updateTurnModel({ speedCalculation: e.target.value })}
                    className="input-field w-full mt-1"
                    placeholder="如: speed + level * 2"
                  />
                </div>
                {turnModel.type === 'atb' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>ATB上限</label>
                      <div className="number-input mt-1" style={{ width: '100%' }}>
                        <button onClick={() => updateTurnModel({ atbGaugeMax: (turnModel.atbGaugeMax || 100) - 10 })}>-</button>
                        <input
                          type="number"
                          value={turnModel.atbGaugeMax || 100}
                          onChange={(e) => updateTurnModel({ atbGaugeMax: Number(e.target.value) })}
                        />
                        <button onClick={() => updateTurnModel({ atbGaugeMax: (turnModel.atbGaugeMax || 100) + 10 })}>+</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Tick间隔(ms)</label>
                      <div className="number-input mt-1" style={{ width: '100%' }}>
                        <button onClick={() => updateTurnModel({ tickInterval: (turnModel.tickInterval || 100) - 20 })}>-</button>
                        <input
                          type="number"
                          value={turnModel.tickInterval || 100}
                          onChange={(e) => updateTurnModel({ tickInterval: Number(e.target.value) })}
                        />
                        <button onClick={() => updateTurnModel({ tickInterval: (turnModel.tickInterval || 100) + 20 })}>+</button>
                      </div>
                    </div>
                  </div>
                )}
                {turnModel.type === 'action-point' && (
                  <div>
                    <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>每回合AP</label>
                    <div className="number-input mt-1" style={{ width: 120 }}>
                      <button onClick={() => updateTurnModel({ actionPointPerTurn: (turnModel.actionPointPerTurn || 3) - 1 })}>-</button>
                      <input
                        type="number"
                        value={turnModel.actionPointPerTurn || 3}
                        onChange={(e) => updateTurnModel({ actionPointPerTurn: Number(e.target.value) })}
                      />
                      <button onClick={() => updateTurnModel({ actionPointPerTurn: (turnModel.actionPointPerTurn || 3) + 1 })}>+</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reactions */}
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>反应与插队</h3>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>优先级: 1最高</span>
              </div>
              <div className="space-y-2">
                {reactions.map(reaction => {
                  const config = turnModel.reactions?.[reaction.id as keyof typeof turnModel.reactions];
                  const enabled = config?.enabled;
                  const priority = config?.priority ?? 5;
                  return (
                    <div
                      key={reaction.id}
                      className={`p-2 rounded text-xs transition-all ${enabled ? 'ring-1 ring-[var(--color-accent)]' : ''}`}
                      style={{ 
                        background: enabled ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
                        border: `1px solid ${enabled ? 'var(--color-accent)' : 'var(--color-border)'}`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleReaction(reaction.id)}
                          className="flex-1 text-left"
                        >
                          <div style={{ color: 'var(--color-text-primary)' }}>{reaction.label}</div>
                          <div style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{reaction.desc}</div>
                        </button>
                        {enabled && (
                          <div className="flex items-center gap-1 ml-2">
                            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>优先级</span>
                            <select
                              value={priority}
                              onChange={(e) => updateReactionPriority(reaction.id, Number(e.target.value))}
                              className="input-field text-xs py-0.5"
                              style={{ width: 50 }}
                            >
                              {[1,2,3,4,5,6,7,8,9,10].map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase Hooks */}
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>回合事件钩子</h3>
              <div className="flex flex-wrap gap-2">
                {phaseHooks.map(hook => {
                  const hookConfig = turnModel.phaseHooks?.find(h => h.id === hook.id);
                  const enabled = hookConfig?.enabled;
                  return (
                    <button
                      key={hook.id}
                      onClick={() => togglePhaseHook(hook.id)}
                      className={`px-3 py-1.5 rounded text-xs transition-all ${
                        enabled ? 'ring-1 ring-[var(--color-accent)]' : ''
                      }`}
                      style={{ 
                        background: enabled ? 'var(--color-accent)' : 'var(--color-bg-primary)',
                        color: enabled ? 'white' : 'var(--color-text-secondary)'
                      }}
                    >
                      {hook.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Validation Messages */}
          {validation.length > 0 && (
            <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
              {validation.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {v.type === 'error' ? (
                    <AlertTriangle size={12} style={{ color: 'var(--color-danger)' }} />
                  ) : (
                    <Info size={12} style={{ color: 'var(--color-warning)' }} />
                  )}
                  <span style={{ color: v.type === 'error' ? 'var(--color-danger)' : 'var(--color-warning)' }}>{v.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Preview Panel */}
        <div className="w-1/2 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>实时预览</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPreviewTurn(t => t + 1)}
                  className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
                  title="下一回合"
                >
                  <RotateCcw size={12} style={{ color: 'var(--color-text-secondary)' }} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {/* Action Order Preview */}
            <div className="mb-4">
              <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>当前回合 #{previewTurn} 行动顺序</h4>
              <div className="space-y-2">
                {actionOrder.map((entity, idx) => (
                  <div
                    key={entity.id}
                    className="flex items-center gap-3 p-2 rounded"
                    style={{ background: 'var(--color-bg-secondary)' }}
                  >
                    <span className="text-xs font-mono w-4" style={{ color: 'var(--color-text-muted)' }}>#{idx + 1}</span>
                    {entity.type === 'hero' ? (
                      <Users size={14} style={{ color: 'var(--color-success)' }} />
                    ) : (
                      <Skull size={14} style={{ color: 'var(--color-danger)' }} />
                    )}
                    <span className="text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>{entity.name}</span>
                    <div className="flex items-center gap-2">
                      <Zap size={10} style={{ color: 'var(--color-warning)' }} />
                      <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{entity.speed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Speed Adjustment Sliders - 使用sampleEntities以包含所有单位 */}
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
              <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>调整速度 (实时预览)</h4>
              <div className="space-y-3">
                {sampleEntities.map(entity => (
                  <div key={entity.id} className="flex items-center gap-2">
                    <span className="text-xs w-16 truncate" style={{ color: 'var(--color-text-muted)' }}>{entity.name}</span>
                    <input
                      type="range"
                      min={10}
                      max={200}
                      value={previewSpeed[entity.id] ?? entity.speed}
                      onChange={(e) => setPreviewSpeed({ ...previewSpeed, [entity.id]: Number(e.target.value) })}
                      className="flex-1"
                      style={{ accentColor: 'var(--color-accent)' }}
                    />
                    <span className="text-xs w-8 text-right font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                      {previewSpeed[entity.id] ?? entity.speed}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ATB Progress Bar (for ATB mode) */}
            {turnModel.type === 'atb' && (
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>ATB进度条</h4>
                <div className="space-y-2">
                  {actionOrder.map(entity => {
                    const progress = Math.min(100, ((previewSpeed[entity.id] ?? entity.speed) / 150) * 100);
                    return (
                      <div key={entity.id} className="flex items-center gap-2">
                        <span className="text-xs w-16 truncate" style={{ color: 'var(--color-text-muted)' }}>{entity.name}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progress}%`,
                              background: entity.type === 'hero' ? 'var(--color-success)' : 'var(--color-danger)'
                            }}
                          />
                        </div>
                        <span className="text-xs w-8 text-right font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                          {Math.round(progress)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Log & Validation Panel */}
      <div className="shrink-0 border-t" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <History size={12} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>日志 & 校验</span>
        </div>
        <div className="max-h-32 overflow-auto p-2">
          {validation.length > 0 ? (
            <div className="space-y-1">
              {validation.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {v.type === 'error' ? (
                    <AlertTriangle size={10} style={{ color: 'var(--color-danger)' }} />
                  ) : (
                    <Info size={10} style={{ color: 'var(--color-warning)' }} />
                  )}
                  <span style={{ color: v.type === 'error' ? 'var(--color-danger)' : 'var(--color-warning)' }}>{v.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              回合模型配置正常，无校验问题
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
