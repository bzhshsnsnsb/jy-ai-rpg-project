import React, { useMemo, useState } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { 
  Calculator, Zap, Heart, Shield, Flame, Plus, ChevronRight, ChevronDown,
  Play, RotateCcw, Sparkles, AlertTriangle, History
} from 'lucide-react';
import type { DamageFormula } from '../../../types';
import { evaluateFormula, getFormulaError, SUPPORTED_FORMULA_FUNCTIONS } from '../../../utils/formulaEvaluator';

// Formula type categories
const formulaCategories = [
  { id: 'damage', label: '伤害', icon: Zap, color: '#ef4444' },
  { id: 'heal', label: '治疗', icon: Heart, color: '#22c55e' },
  { id: 'shield', label: '护盾', icon: Shield, color: '#3b82f6' },
  { id: 'dot', label: '持续伤害', icon: Flame, color: '#f97316' },
  { id: 'hot', label: '持续治疗', icon: Heart, color: '#06b6d4' },
  { id: 'crit', label: '暴击修正', icon: Zap, color: '#eab308' },
  { id: 'armor-pen', label: '破甲', icon: Shield, color: '#8b5cf6' },
  { id: 'reflect', label: '反伤', icon: RotateCcw, color: '#ec4899' },
  { id: 'lifesteal', label: '吸血', icon: Heart, color: '#991b1b' },
  { id: 'special', label: '特殊', icon: Sparkles, color: '#a855f7' },
];

// Post-modifiers
const postModifiers = [
  { id: 'element', label: '元素克制', enabled: true },
  { id: 'crit', label: '暴击', enabled: true },
  { id: 'variance', label: '波动值', enabled: true },
  { id: 'armor', label: '护甲/抗性', enabled: true },
  { id: 'posture', label: '防御姿态', enabled: false },
  { id: 'shield-cut', label: '护盾截断', enabled: false },
  { id: 'pierce', label: '真伤穿透', enabled: false },
  { id: 'clamp', label: '最终上下限', enabled: true },
];

export const DamageFormulaEditor: React.FC = () => {
  const { project, updateRules } = useProjectStore();
  const { damageFormulas } = project.rules;
  const formulaVariables = useMemo(() => ({
    attack: 1000,
    defense: 500,
    magic: 850,
    resistance: 320,
    heal: 600,
    level: 50,
    skillPower: 150,
    critRate: 15,
    critDamage: 150,
    targetCount: 1,
    variance: 10,
    elementBonus: 20,
  }), []);

  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(damageFormulas[0]?.id || null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['damage', 'heal']));
  const [fixedSeed, setFixedSeed] = useState<number | null>(null);

  // Formula statistics
  const formulaStats = useMemo(() => {
    const total = damageFormulas.length;
    const variables = new Set<string>();
    let errorCount = 0;

    damageFormulas.forEach(f => {
      const matches = f.formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      matches.forEach(v => variables.add(v));
      if (!f.formula || f.formula.trim() === '' || getFormulaError(f.formula, formulaVariables)) errorCount++;
    });

    return {
      total,
      variableCount: variables.size,
      errorCount,
    };
  }, [damageFormulas, formulaVariables]);

  const formulaValidation = useMemo(() => {
    return damageFormulas.flatMap((formula) => {
      const items: { formulaId: string; type: 'error' | 'warning'; message: string }[] = [];
      if (!formula.formula.trim()) {
        items.push({ formulaId: formula.id, type: 'error', message: `[${formula.name}] 缺少公式表达式` });
      } else {
        const error = getFormulaError(formula.formula, formulaVariables);
        if (error) {
          items.push({ formulaId: formula.id, type: 'error', message: `[${formula.name}] 公式错误: ${error}` });
        }
      }

      formula.branches.forEach((branch, index) => {
        if (!branch.formula.trim()) {
          items.push({ formulaId: formula.id, type: 'warning', message: `[${formula.name}] 分支 ${index + 1} 缺少公式` });
          return;
        }
        const branchError = getFormulaError(branch.formula, formulaVariables);
        if (branchError) {
          items.push({ formulaId: formula.id, type: 'error', message: `[${formula.name}] 分支 ${index + 1} 错误: ${branchError}` });
        }
      });

      return items;
    });
  }, [damageFormulas, formulaVariables]);

  // Test bench state
  const [testConfig, setTestConfig] = useState({
    attackerAttack: 1000,
    attackerLevel: 50,
    skillPower: 150,
    targetDefense: 500,
    targetResistance: 300,
    targetCount: 1,
    critRate: 15,
    critDamage: 150,
    elementBonus: 0,
    variance: 10,
  });
  const [testResults, setTestResults] = useState<{
    base: number;
    afterSkill: number;
    afterElement: number;
    afterCrit: number;
    afterArmor: number;
    afterVariance: number;
    final: number;
    hitRate: number;
    critRate: number;
    minDmg: number;
    maxDmg: number;
    expectedDmg: number;
    seed?: number;
  } | null>(null);

  const selectedFormula = damageFormulas.find(f => f.id === selectedFormulaId);

  // Group formulas by category
  const formulasByCategory = useMemo(() => {
    const grouped: Record<string, DamageFormula[]> = {};
    damageFormulas.forEach(f => {
      const category = f.id.includes('phys') || f.id.includes('mag') ? 'damage' :
                      f.id.includes('heal') ? 'heal' :
                      f.id.includes('shield') ? 'shield' :
                      f.id.includes('dot') ? 'dot' :
                      f.id.includes('hot') ? 'hot' : 'special';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(f);
    });
    return grouped;
  }, [damageFormulas]);

  // Run test
  const runTest = (useFixedSeed: boolean = false) => {
    const { attackerAttack, skillPower, targetDefense, targetResistance, targetCount, critRate, critDamage, elementBonus, variance } = testConfig;
    const activeFormula = selectedFormula?.formula || 'attack';
    const context = {
      ...formulaVariables,
      attack: attackerAttack,
      defense: targetDefense,
      magic: attackerAttack,
      resistance: targetResistance,
      heal: attackerAttack,
      skillPower,
      targetCount,
      critRate,
      critDamage,
      elementBonus,
      variance,
    };

    // Base damage from current formula
    const base = evaluateFormula(activeFormula, context, attackerAttack);

    // After skill multiplier
    const afterSkill = base;

    // After element bonus
    const afterElement = afterSkill * (1 + elementBonus / 100);

    // After crit
    const isCrit = (useFixedSeed && fixedSeed
      ? (Math.sin(fixedSeed + 1) * 10000) % 100
      : Math.random() * 100) < critRate;
    const afterCrit = afterElement * (isCrit ? critDamage / 100 : 1);

    // After armor
    const armorFactor = selectedFormula?.id.includes('mag')
      ? targetResistance / (targetResistance + 1000)
      : targetDefense / (targetDefense + 1000);
    const afterArmor = afterCrit * (1 - Math.min(armorFactor, 0.9));

    // After variance
    const varianceRandom = useFixedSeed && fixedSeed
      ? ((Math.sin(fixedSeed + 2) * 10000) % 1)
      : Math.random();
    const varianceFactor = 1 + (varianceRandom - 0.5) * (variance / 100) * 2;
    const afterVariance = afterArmor * varianceFactor;

    // Final (with target count penalty)
    const final = afterVariance / Math.sqrt(targetCount);

    setTestResults({
      base,
      afterSkill,
      afterElement,
      afterCrit,
      afterArmor,
      afterVariance,
      final: Math.round(final),
      hitRate: 95, // Simplified
      critRate: isCrit ? 100 : 0,
      minDmg: Math.round(afterArmor * (1 - variance / 100)),
      maxDmg: Math.round(afterArmor * (1 + variance / 100)),
      expectedDmg: Math.round(afterArmor * (1 - variance / 200)),
      seed: useFixedSeed && fixedSeed ? fixedSeed : undefined,
    });
  };

  // Run 100 tests
  const runBatchTest = (useFixedSeed: boolean = false) => {
    const results: number[] = [];
    const seed = fixedSeed || 12345;

    for (let i = 0; i < 100; i++) {
      const { attackerAttack, skillPower, targetDefense, targetResistance, targetCount, critRate, critDamage, elementBonus, variance } = testConfig;
      const context = {
        ...formulaVariables,
        attack: attackerAttack,
        defense: targetDefense,
        magic: attackerAttack,
        resistance: targetResistance,
        heal: attackerAttack,
        skillPower,
        targetCount,
        critRate,
        critDamage,
        elementBonus,
        variance,
      };
      const base = evaluateFormula(selectedFormula?.formula || 'attack', context, attackerAttack);

      const isCrit = useFixedSeed
        ? (Math.sin(seed + i) * 10000) % 100 < critRate
        : Math.random() * 100 < critRate;
      const afterCrit = base * (isCrit ? critDamage / 100 : 1);
      const armorFactor = selectedFormula?.id.includes('mag')
        ? targetResistance / (targetResistance + 1000)
        : targetDefense / (targetDefense + 1000);
      const afterArmor = afterCrit * (1 - Math.min(armorFactor, 0.9));

      const varianceRandom = useFixedSeed
        ? ((Math.sin(seed + i + 0.5) * 10000) % 1)
        : Math.random();
      const varianceFactor = 1 + (varianceRandom - 0.5) * (variance / 100) * 2;
      const final = afterArmor * varianceFactor / Math.sqrt(targetCount);
      results.push(Math.round(final));
    }
    results.sort((a, b) => a - b);
    setTestResults(prev => prev ? ({
      ...prev,
      minDmg: results[0],
      maxDmg: results[99],
      expectedDmg: Math.round(results.reduce((a, b) => a + b, 0) / 100),
      final: results[Math.floor(results.length / 2)],
      seed: useFixedSeed ? seed : undefined,
    }) : null);
  };

  const updateFormula = (id: string, updates: Partial<DamageFormula>) => {
    const newFormulas = damageFormulas.map(f => f.id === id ? { ...f, ...updates } : f);
    updateRules({ damageFormulas: newFormulas });
  };

  const addFormula = (category: string) => {
    const newFormula: DamageFormula = {
      id: `${category}-${Date.now()}`,
      name: `新${formulaCategories.find(c => c.id === category)?.label || '公式'}`,
      formula: 'attack * skillPower / 100',
      branches: [],
    };
    updateRules({ damageFormulas: [...damageFormulas, newFormula] });
    setSelectedFormulaId(newFormula.id);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Helper functions removed - using inline in JSX

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top Summary Card */}
      <div className="shrink-0 p-3 border-b" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>公式总数</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{formulaStats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>引用变量</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{formulaStats.variableCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>固定种子</span>
            <input
              type="number"
              value={fixedSeed || ''}
              onChange={(e) => setFixedSeed(e.target.value ? Number(e.target.value) : null)}
              className="input-field w-20 text-xs"
              placeholder="随机"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>最近测试</span>
            {testResults ? (
              <span className="text-sm font-mono" style={{ color: 'var(--color-danger)' }}>{testResults.final}</span>
            ) : (
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>-</span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {formulaStats.errorCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-danger)', color: 'white' }}>
                {formulaStats.errorCount} 错误
              </span>
            )}
            {formulaStats.errorCount === 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-success)', color: 'white' }}>
                校验通过
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Three Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Formula Asset Tree */}
        <div className="w-56 flex flex-col border-r overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>公式资产</h3>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {formulaCategories.map(cat => {
              const Icon = cat.icon;
              const formulas = formulasByCategory[cat.id] || [];
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
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formulas.length}</span>
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {formulas.map(formula => (
                        <button
                          key={formula.id}
                          onClick={() => setSelectedFormulaId(formula.id)}
                          className={`w-full text-left px-2 py-1 rounded text-xs transition-all ${
                            selectedFormulaId === formula.id ? 'ring-1 ring-[var(--color-accent)]' : ''
                          }`}
                          style={{ 
                            background: selectedFormulaId === formula.id ? 'var(--color-bg-tertiary)' : 'transparent',
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          <div className="truncate">{formula.name}</div>
                          <div className="text-[10px] truncate font-mono" style={{ color: 'var(--color-text-muted)' }}>
                            {formula.formula.substring(0, 20)}...
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={() => addFormula(cat.id)}
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

        {/* Middle: Formula Editor */}
        <div className="flex-1 flex flex-col overflow-hidden border-r" style={{ background: 'var(--color-bg-primary)' }}>
          {selectedFormula ? (
            <>
              <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={selectedFormula.name}
                    onChange={(e) => updateFormula(selectedFormula.id, { name: e.target.value })}
                    className="input-field text-sm font-medium flex-1"
                    style={{ background: 'transparent', border: 'none', padding: 0 }}
                  />
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                    {selectedFormula.id}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Formula Input */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>公式表达式</h4>
                  <div className="mb-3 rounded p-2 text-[11px]" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}>
                    支持变量: {Object.keys(formulaVariables).join(', ')}
                    <br />
                    支持函数: {SUPPORTED_FORMULA_FUNCTIONS.join(', ')}
                  </div>
                  <textarea
                    value={selectedFormula.formula}
                    onChange={(e) => updateFormula(selectedFormula.id, { formula: e.target.value })}
                    className="w-full h-24 p-3 rounded font-mono text-sm resize-none"
                    style={{ 
                      background: 'var(--color-bg-primary)', 
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-accent)',
                    }}
                    placeholder="attack * (1 - defense / (defense + 1000))"
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {['attack', 'defense', 'skillPower', 'level', 'targetCount'].map(v => (
                      <span 
                        key={v}
                        className="px-2 py-0.5 rounded text-[10px] cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
                        style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent)' }}
                        onClick={() => updateFormula(selectedFormula.id, { formula: selectedFormula.formula + ` ${v}` })}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Input Variables */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>前置输入变量</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>攻击者攻击力</label>
                      <input
                        type="number"
                        value={testConfig.attackerAttack}
                        onChange={(e) => setTestConfig({ ...testConfig, attackerAttack: Number(e.target.value) })}
                        className="input-field w-full mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>攻击者等级</label>
                      <input
                        type="number"
                        value={testConfig.attackerLevel}
                        onChange={(e) => setTestConfig({ ...testConfig, attackerLevel: Number(e.target.value) })}
                        className="input-field w-full mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>技能系数</label>
                      <input
                        type="number"
                        value={testConfig.skillPower}
                        onChange={(e) => setTestConfig({ ...testConfig, skillPower: Number(e.target.value) })}
                        className="input-field w-full mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>目标数量</label>
                      <input
                        type="number"
                        value={testConfig.targetCount}
                        onChange={(e) => setTestConfig({ ...testConfig, targetCount: Number(e.target.value) })}
                        className="input-field w-full mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Post Modifiers */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>后置修正</h4>
                  <div className="flex flex-wrap gap-2">
                    {postModifiers.map(mod => (
                      <button
                        key={mod.id}
                        className={`px-3 py-1 rounded text-xs transition-all`}
                        style={{ 
                          background: mod.enabled ? 'var(--color-accent)' : 'var(--color-bg-primary)',
                          color: mod.enabled ? 'white' : 'var(--color-text-secondary)',
                          border: `1px solid ${mod.enabled ? 'var(--color-accent)' : 'var(--color-border)'}`
                        }}
                      >
                        {mod.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {formulaValidation.filter(v => v.formulaId === selectedFormula.id).length > 0 && (
                <div className="p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.10)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <h4 className="text-xs font-medium mb-2" style={{ color: '#ef4444' }}>公式校验</h4>
                  <div className="space-y-1">
                    {formulaValidation.filter(v => v.formulaId === selectedFormula.id).map((item, index) => (
                      <div key={`${item.message}-${index}`} className="text-xs" style={{ color: item.type === 'error' ? '#ef4444' : '#f59e0b' }}>
                        {item.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="text-center">
                <Calculator size={32} className="mx-auto mb-2 opacity-50" />
                <div className="text-sm">选择或创建公式</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Result Breakdown & Test Bench */}
        <div className="w-80 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>结果拆解 & 测试</h3>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Test Config */}
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
              <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>测试配置</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>目标防御</label>
                  <input
                    type="number"
                    value={testConfig.targetDefense}
                    onChange={(e) => setTestConfig({ ...testConfig, targetDefense: Number(e.target.value) })}
                    className="input-field w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>目标抗性</label>
                  <input
                    type="number"
                    value={testConfig.targetResistance}
                    onChange={(e) => setTestConfig({ ...testConfig, targetResistance: Number(e.target.value) })}
                    className="input-field w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>暴击率%</label>
                  <input
                    type="number"
                    value={testConfig.critRate}
                    onChange={(e) => setTestConfig({ ...testConfig, critRate: Number(e.target.value) })}
                    className="input-field w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>暴击伤害%</label>
                  <input
                    type="number"
                    value={testConfig.critDamage}
                    onChange={(e) => setTestConfig({ ...testConfig, critDamage: Number(e.target.value) })}
                    className="input-field w-full mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>波动值%</label>
                  <input
                    type="number"
                    value={testConfig.variance}
                    onChange={(e) => setTestConfig({ ...testConfig, variance: Number(e.target.value) })}
                    className="input-field w-full mt-1"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => runTest(!!fixedSeed)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded text-xs"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  <Play size={12} /> 单次测试
                </button>
                <button
                  onClick={() => runBatchTest(!!fixedSeed)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded text-xs"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                >
                  <RotateCcw size={12} /> 100次
                </button>
              </div>
            </div>

            {/* Result Breakdown */}
            {testResults && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>伤害拆解</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--color-text-muted)' }}>基础伤害</span>
                    <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{Math.round(testResults.base)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--color-text-muted)' }}>技能倍率后</span>
                    <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{Math.round(testResults.afterSkill)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--color-text-muted)' }}>元素修正后</span>
                    <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{Math.round(testResults.afterElement)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--color-text-muted)' }}>暴击后</span>
                    <span className="font-mono" style={{ color: testResults.critRate > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>
                      {Math.round(testResults.afterCrit)} {testResults.critRate > 0 && '⚡'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--color-text-muted)' }}>护甲修正后</span>
                    <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{Math.round(testResults.afterArmor)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--color-text-muted)' }}>波动值后</span>
                    <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{Math.round(testResults.afterVariance)}</span>
                  </div>
                  <div className="h-px my-2" style={{ background: 'var(--color-border)' }} />
                  <div className="flex justify-between text-sm font-medium">
                    <span style={{ color: 'var(--color-text-primary)' }}>最终伤害</span>
                    <span className="font-mono text-lg" style={{ color: 'var(--color-danger)' }}>{testResults.final}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                    <div className="text-sm font-mono" style={{ color: 'var(--color-success)' }}>{testResults.minDmg}</div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>最小</div>
                  </div>
                  <div className="text-center p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                    <div className="text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>{testResults.expectedDmg}</div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>期望</div>
                  </div>
                  <div className="text-center p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                    <div className="text-sm font-mono" style={{ color: 'var(--color-danger)' }}>{testResults.maxDmg}</div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>最大</div>
                  </div>
                  {testResults.seed !== undefined && (
                    <div className="col-span-3 text-center p-1 rounded text-[10px]" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}>
                      种子: {testResults.seed}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Log Panel */}
      <div className="shrink-0 border-t" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <History size={12} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>公式日志</span>
        </div>
        <div className="max-h-32 overflow-auto p-2">
          {formulaStats.errorCount > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle size={10} style={{ color: 'var(--color-danger)' }} />
                <span style={{ color: 'var(--color-danger)' }}>{formulaStats.errorCount} 个公式存在错误</span>
              </div>
            </div>
          ) : (
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              伤害公式配置正常，共 {formulaStats.total} 个公式，引用 {formulaStats.variableCount} 个变量
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
