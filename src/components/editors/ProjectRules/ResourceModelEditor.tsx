import React, { useMemo, useState } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { 
  Heart, Zap, Shield, Flame, Plus, Trash2, ChevronRight,
  AlertTriangle, Info, History
} from 'lucide-react';
import type { ResourceDefinition } from '../../../types';
import { evaluateFormula, getFormulaError, SUPPORTED_FORMULA_FUNCTIONS } from '../../../utils/formulaEvaluator';

// Resource type options
const resourceTypes = [
  { id: 'hp', label: 'HP生命', color: '#ef4444', icon: Heart },
  { id: 'mp', label: 'MP魔法', color: '#3b82f6', icon: Zap },
  { id: 'energy', label: '能量', color: '#eab308', icon: Zap },
  { id: 'rage', label: '怒气', color: '#f97316', icon: Flame },
  { id: 'custom', label: '自定义', color: '#8b5cf6', icon: Shield },
];

export const ResourceModelEditor: React.FC = () => {
  const { project, updateRules } = useProjectStore();
  const { resourceModel } = project.rules;
  const { resources } = resourceModel;
  const formulaVariables = useMemo(() => ({
    baseHp: 1000,
    baseMp: 100,
    level: 10,
    hp: 100,
    mp: 100,
    ap: 3,
    rage: 20,
    energy: 50,
  }), []);

  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(resources[0]?.id || null);
  const [simulationTurns, setSimulationTurns] = useState(5);
  const [simMode, setSimMode] = useState<'auto' | 'manual'>('auto');

  const selectedResource = resources.find(r => r.id === selectedResourceId);

  // Resource statistics
  const resourceStats = useMemo(() => {
    const total = resources.length;
    const inBattle = resources.filter(r => r.visualConfig?.showInBattle !== false).length;
    const keepAfterBattle = resources.filter(r => r.visualConfig?.keepAfterBattle).length;
    const abnormal = resources.filter(r => r.type === 'custom').length;
    return { total, inBattle, keepAfterBattle, abnormal };
  }, [resources]);

  // Validate resources
  const validation = useMemo(() => {
    const issues: { resourceId: string; type: 'error' | 'warning'; message: string }[] = [];
    resources.forEach(res => {
      if (!res.maxFormula) issues.push({ resourceId: res.id, type: 'error', message: `[${res.name}] 缺少最大值公式` });
      if (!res.visualConfig?.showText) issues.push({ resourceId: res.id, type: 'warning', message: `[${res.name}] 建议显示数值` });
      if (res.type === 'hp' && !res.visualConfig?.keepAfterBattle) issues.push({ resourceId: res.id, type: 'warning', message: `[${res.name}] 建议战后保留` });
      const maxFormulaError = getFormulaError(res.maxFormula || '', formulaVariables);
      if (maxFormulaError) {
        issues.push({ resourceId: res.id, type: 'error', message: `[${res.name}] 最大值公式错误: ${maxFormulaError}` });
      }
      if (res.regenFormula) {
        const regenFormulaError = getFormulaError(res.regenFormula, formulaVariables);
        if (regenFormulaError) {
          issues.push({ resourceId: res.id, type: 'error', message: `[${res.name}] 回复公式错误: ${regenFormulaError}` });
        }
      }
    });
    return issues;
  }, [formulaVariables, resources]);

  // Validation summary
  const errorCount = validation.filter(v => v.type === 'error').length;
  const warningCount = validation.filter(v => v.type === 'warning').length;

  // Simulate resource flow over turns
  const resourceFlow = useMemo(() => {
    if (!selectedResource) return [];
    const flow: { turn: number; value: number; max: number; change: number }[] = [];
    let currentValue = 50; // Start at 50%
    const maxValue = 1000; // Simulated max

    const max = evaluateFormula(selectedResource.maxFormula || '100', formulaVariables, maxValue);
    const regen = evaluateFormula(selectedResource.regenFormula || '0', formulaVariables, 0);
    const cost = 50; // Simulated skill cost

    for (let turn = 1; turn <= simulationTurns; turn++) {
      const change = (simMode === 'auto' ? regen : 0) - (turn % 3 === 0 ? cost : 0);
      currentValue = Math.max(0, Math.min(max, currentValue + change));
      flow.push({ turn, value: currentValue, max, change });
    }
    return flow;
  }, [formulaVariables, selectedResource, simulationTurns, simMode]);

  const updateResource = (id: string, updates: Partial<ResourceDefinition>) => {
    const newResources = resources.map(r => r.id === id ? { ...r, ...updates } : r);
    updateRules({ resourceModel: { ...resourceModel, resources: newResources } });
  };

  const addResource = () => {
    const newRes: ResourceDefinition = {
      id: `res-${Date.now()}`,
      name: '新资源',
      type: 'custom',
      maxFormula: '100',
      canOverflow: false,
      canUnderflow: false,
      visualConfig: { barColor: '#888888', barWidth: 150, showText: true, textFormat: 'current/max' as const },
    };
    updateRules({ resourceModel: { ...resourceModel, resources: [...resources, newRes] } });
    setSelectedResourceId(newRes.id);
  };

  const removeResource = (id: string) => {
    const newResources = resources.filter(r => r.id !== id);
    updateRules({ resourceModel: { ...resourceModel, resources: newResources } });
    if (selectedResourceId === id) {
      setSelectedResourceId(newResources[0]?.id || null);
    }
  };

  const getResourceIcon = (type: string) => {
    const typeInfo = resourceTypes.find(t => t.id === type);
    return typeInfo?.icon || Shield;
  };

  const getResourceColor = (type: string) => {
    const typeInfo = resourceTypes.find(t => t.id === type);
    return typeInfo?.color || '#888888';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top Summary Card */}
      <div className="shrink-0 p-3 border-b" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>资源总数</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{resourceStats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>战斗资源</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{resourceStats.inBattle}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>战后保留</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>{resourceStats.keepAfterBattle}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>异常资源</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>{resourceStats.abnormal}</span>
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

      {/* Main Content - Three Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Resource Registry Table */}
        <div className="w-64 flex flex-col border-r overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>资源注册表</h3>
              <button onClick={addResource} className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]">
                <Plus size={14} style={{ color: 'var(--color-accent)' }} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {resources.map(res => {
              const Icon = getResourceIcon(res.type);
              const color = getResourceColor(res.type);
              const isSelected = selectedResourceId === res.id;
              const hasError = validation.some(v => v.resourceId === res.id && v.type === 'error');
              const hasWarning = validation.some(v => v.resourceId === res.id && v.type === 'warning');
              
              return (
                <div
                  key={res.id}
                  onClick={() => setSelectedResourceId(res.id)}
                  className={`p-3 border-b cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-[var(--color-accent)]' : ''
                  }`}
                  style={{ 
                    background: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                    borderColor: 'var(--color-border-muted)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: color + '20' }}>
                      <Icon size={12} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{res.name}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{res.id}</div>
                    </div>
                    {hasError && <AlertTriangle size={12} style={{ color: 'var(--color-danger)' }} />}
                    {hasWarning && !hasError && <Info size={12} style={{ color: 'var(--color-warning)' }} />}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span>上限: {res.maxFormula || '未设置'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle: Resource Configuration */}
        <div className="flex-1 flex flex-col overflow-hidden border-r" style={{ background: 'var(--color-bg-primary)' }}>
          {selectedResource ? (
            <>
              <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: getResourceColor(selectedResource.type) + '20' }}>
                    {React.createElement(getResourceIcon(selectedResource.type), { size: 16, style: { color: getResourceColor(selectedResource.type) } })}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={selectedResource.name}
                      onChange={(e) => updateResource(selectedResource.id, { name: e.target.value })}
                      className="input-field text-sm font-medium"
                      style={{ background: 'transparent', border: 'none', padding: 0 }}
                    />
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{selectedResource.id}</div>
                  </div>
                  <button 
                    onClick={() => removeResource(selectedResource.id)}
                    className="p-1 rounded hover:bg-[var(--color-danger)]"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Basic Config */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>基础配置</h4>
                  <div className="mb-3 rounded p-2 text-[11px]" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}>
                    支持变量: {Object.keys(formulaVariables).join(', ')}
                    <br />
                    支持函数: {SUPPORTED_FORMULA_FUNCTIONS.join(', ')}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>资源类型</label>
                      <select
                        value={selectedResource.type}
                        onChange={(e) => updateResource(selectedResource.id, { type: e.target.value as any })}
                        className="input-field w-full mt-1"
                      >
                        {resourceTypes.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>条颜色</label>
                      <input
                        type="color"
                        value={selectedResource.visualConfig?.barColor || '#888888'}
                        onChange={(e) => updateResource(selectedResource.id, { visualConfig: { ...selectedResource.visualConfig, barColor: e.target.value } })}
                        className="w-full h-8 mt-1 rounded cursor-pointer"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>最大值公式</label>
                      <input
                        type="text"
                        value={selectedResource.maxFormula || ''}
                        onChange={(e) => updateResource(selectedResource.id, { maxFormula: e.target.value })}
                        className="input-field w-full mt-1 font-mono text-sm"
                        placeholder="如: max(baseHp * (1 + level * 0.1), 1200)"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>回复公式</label>
                      <input
                        type="text"
                        value={selectedResource.regenFormula || ''}
                        onChange={(e) => updateResource(selectedResource.id, { regenFormula: e.target.value })}
                        className="input-field w-full mt-1 font-mono text-sm"
                        placeholder="如: round(level * 0.5)"
                      />
                    </div>
                  </div>
                </div>

                {/* Boundary Rules */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>边界规则</h4>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedResource.canOverflow}
                        onChange={(e) => updateResource(selectedResource.id, { canOverflow: e.target.checked })}
                      />
                      <span style={{ color: 'var(--color-text-secondary)' }}>可溢出</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedResource.canUnderflow}
                        onChange={(e) => updateResource(selectedResource.id, { canUnderflow: e.target.checked })}
                      />
                      <span style={{ color: 'var(--color-text-secondary)' }}>可下溢(负值)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedResource.visualConfig?.keepAfterBattle}
                        onChange={(e) => updateResource(selectedResource.id, { visualConfig: { ...selectedResource.visualConfig, keepAfterBattle: e.target.checked } })}
                      />
                      <span style={{ color: 'var(--color-text-secondary)' }}>战后保留</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedResource.visualConfig?.showInBattle !== false}
                        onChange={(e) => updateResource(selectedResource.id, { visualConfig: { ...selectedResource.visualConfig, showInBattle: e.target.checked } })}
                      />
                      <span style={{ color: 'var(--color-text-secondary)' }}>战斗内显示</span>
                    </label>
                  </div>
                </div>

                {/* Display Rules */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>展示规则</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>条宽度</label>
                      <div className="number-input mt-1" style={{ width: '100%' }}>
                        <button onClick={() => updateResource(selectedResource.id, { visualConfig: { ...selectedResource.visualConfig, barWidth: (selectedResource.visualConfig?.barWidth || 150) - 20 } })}>-</button>
                        <input
                          type="number"
                          value={selectedResource.visualConfig?.barWidth || 150}
                          onChange={(e) => updateResource(selectedResource.id, { visualConfig: { ...selectedResource.visualConfig, barWidth: Number(e.target.value) } })}
                        />
                        <button onClick={() => updateResource(selectedResource.id, { visualConfig: { ...selectedResource.visualConfig, barWidth: (selectedResource.visualConfig?.barWidth || 150) + 20 } })}>+</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>文本格式</label>
                      <select
                        value={selectedResource.visualConfig?.textFormat || 'current/max'}
                        onChange={(e) => selectedResource && updateResource(selectedResource.id, { visualConfig: { ...selectedResource.visualConfig, textFormat: e.target.value as 'current/max' | 'current%' | 'raw' } })}
                        className="input-field w-full mt-1"
                      >
                        <option value="current/max">当前/最大</option>
                        <option value="current%">仅当前值</option>
                        <option value="raw">原始数值</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedResource.visualConfig?.showText !== false}
                        onChange={(e) => updateResource(selectedResource.id, { visualConfig: { ...selectedResource.visualConfig, showText: e.target.checked } })}
                      />
                      <span style={{ color: 'var(--color-text-secondary)' }}>显示数值</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Validation */}
              {validation.filter(v => v.resourceId === selectedResource.id).length > 0 && (
                <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                  {validation.filter(v => v.resourceId === selectedResource.id).map((v, i) => (
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="text-center">
                <Shield size={32} className="mx-auto mb-2 opacity-50" />
                <div className="text-sm">选择或创建资源</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Resource Flow Simulation */}
        <div className="w-80 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>资源流模拟</h3>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setSimMode('auto')}
                  className={`px-2 py-1 rounded text-xs ${simMode === 'auto' ? 'ring-1 ring-[var(--color-accent)]' : ''}`}
                  style={{ background: simMode === 'auto' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)', color: simMode === 'auto' ? 'white' : 'var(--color-text-secondary)' }}
                >
                  自动
                </button>
                <button 
                  onClick={() => setSimMode('manual')}
                  className={`px-2 py-1 rounded text-xs ${simMode === 'manual' ? 'ring-1 ring-[var(--color-accent)]' : ''}`}
                  style={{ background: simMode === 'manual' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)', color: simMode === 'manual' ? 'white' : 'var(--color-text-secondary)' }}
                >
                  手动
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {selectedResource ? (
              <>
                {/* Resource Preview Card */}
                <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: getResourceColor(selectedResource.type) + '20' }}>
                      {React.createElement(getResourceIcon(selectedResource.type), { size: 20, style: { color: getResourceColor(selectedResource.type) } })}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedResource.name}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{selectedResource.id}</div>
                    </div>
                  </div>
                  
                  {/* Bar Preview */}
                  <div className="mb-2">
                    <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-primary)', width: selectedResource.visualConfig?.barWidth || 150 }}>
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ width: '60%', background: getResourceColor(selectedResource.type) }}
                      />
                    </div>
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                    600 / 1000
                  </div>
                </div>

                {/* Flow Chart */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{simulationTurns}回合变化曲线</h4>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setSimulationTurns(t => Math.max(3, t - 1))}
                        className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
                      >
                        <ChevronRight size={12} className="rotate-180" style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{simulationTurns}T</span>
                      <button 
                        onClick={() => setSimulationTurns(t => Math.min(10, t + 1))}
                        className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
                      >
                        <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {resourceFlow.map((flow) => (
                      <div key={flow.turn} className="flex items-center gap-2">
                        <span className="text-xs w-8" style={{ color: 'var(--color-text-muted)' }}>T{flow.turn}</span>
                        <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
                          <div 
                            className="h-full transition-all"
                            style={{ 
                              width: `${(flow.value / flow.max) * 100}%`,
                              background: getResourceColor(selectedResource.type)
                            }}
                          />
                        </div>
                        <span className="text-xs w-16 text-right font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                          {Math.round(flow.value)}
                        </span>
                        {flow.change !== 0 && (
                          <span className={`text-xs w-10 text-right ${flow.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {flow.change > 0 ? '+' : ''}{flow.change}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-2 rounded text-center" style={{ background: 'var(--color-bg-secondary)' }}>
                    <div className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {Math.max(...resourceFlow.map(f => f.value))}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>峰值</div>
                  </div>
                  <div className="p-2 rounded text-center" style={{ background: 'var(--color-bg-secondary)' }}>
                    <div className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {Math.min(...resourceFlow.map(f => f.value))}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>低谷</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                <div className="text-center text-xs">选择资源查看模拟</div>
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
              资源模型配置正常，无校验问题
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
