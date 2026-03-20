import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import { useUIStore } from '../../../stores/uiStore';
import type { Enemy, EnemyType, EnemySkill, EnemyDrop, PhaseShift, BehaviorPriority, HPThresholdBehavior } from '../../../types';
import { ChevronRight, Save, Plus, Trash2, AlertTriangle, Shield, Sword, Sparkles, Activity, Gift, Play, Zap, Info, Loader2 } from 'lucide-react';
import { callAI, validateBeforeAI } from '../../../services/aiService';

const Input = ({ label, value, onChange, type = 'text', min, max, step = 1, unit, placeholder, options, multiple }: any) => (
  <div className="flex items-center gap-2">
    <label className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)', width: '80px' }}>{label}</label>
    {options ? (
      multiple ? (
        <div className="flex-1 flex flex-wrap gap-1">
          {options.map((opt: any) => (
            <button
              key={opt.value}
              onClick={() => {
                const newVal = value.includes(opt.value) 
                  ? value.filter((v: string) => v !== opt.value)
                  : [...value, opt.value];
                onChange(newVal);
              }}
              className={`px-2 py-0.5 rounded text-xs border ${value.includes(opt.value) ? 'bg-[var(--color-accent)] text-white' : ''}`}
              style={{ borderColor: value.includes(opt.value) ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field flex-1">
          {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      )
    ) : (
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        min={min} max={max} step={step}
        placeholder={placeholder}
        className="input-field flex-1"
      />
    )}
    {unit && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{unit}</span>}
  </div>
);

const Section = ({ title, icon, children, collapsible = false, defaultOpen = true }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
      <div 
        className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        {collapsible && <ChevronRight size={14} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />}
        <span style={{ color: 'var(--color-accent)' }}>{icon}</span>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
      </div>
      {(!collapsible || isOpen) && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

const defaultEnemy: Partial<Enemy> = {
  id: '',
  name: '',
  description: '',
  enemyType: 'normal',
  race: '',
  faction: '',
  dangerLevel: 1,
  battlerResource: '',
  attributes: {
    level: 1,
    hp: 100,
    mp: 0,
    attack: 10,
    defense: 5,
    magicAttack: 5,
    magicDefense: 5,
    speed: 10,
    critRate: 0.05,
    critDamage: 1.5,
    elements: {},
  },
  useTemplateGrowth: false,
  dangerScore: 0,
  skills: [],
  normalAttack: '',
  activeSkills: [],
  specialSkills: [],
  ai: {
    behaviorTree: { type: 'sequence', children: [] },
    priorityTargets: [],
    skillUsage: [],
    behaviorPriority: [],
    actionFrequency: 1,
    firstTurnPreference: 'attack',
    hpThresholdBehaviors: [],
    statusTriggerBehaviors: [],
  },
  elementResistances: {},
  statusResistances: {},
  debuffRateMod: 1.0,
  immunity: [],
  absorb: {},
  reflect: {},
  weaknesses: [],
  hitMod: 1.0,
  evasionMod: 1.0,
  drops: [],
  goldMin: 0,
  goldMax: 0,
  expMin: 0,
  expMax: 0,
  firstKillReward: '',
  questDrops: [],
  idleAnimation: '',
  attackAnimation: '',
  damageAnimation: '',
  deathAnimation: '',
  soundEffects: {},
  battleLogName: '',
  phaseShift: [],
  shieldLayers: 0,
  enragedCondition: '',
  summonBehavior: undefined,
  phaseStateChanges: [],
  specialEventFlags: [],
};

const enemyTypeOptions = [
  { value: 'normal', label: '小怪' },
  { value: 'elite', label: '精英' },
  { value: 'boss', label: 'Boss' },
  { value: 'summon', label: '召唤物' },
  { value: 'test', label: '测试敌人' },
];

const actionOptions = [
  { value: 'attack', label: '攻击' },
  { value: 'skill', label: '使用技能' },
  { value: 'defend', label: '防御' },
  { value: 'item', label: '使用道具' },
  { value: 'wait', label: '待机' },
];

export const EnemyEditor: React.FC = () => {
  const { project, addEnemy, updateEnemy, deleteEnemy } = useProjectStore();
  const { setDebugEnemyId, activeEntityId, activeEditor } = useEditorStore();
  const { setDrawerTab } = useUIStore();
  const { enemies, statuses } = project;

  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<EnemyType>>(new Set(['normal', 'elite', 'boss']));
  const [activeTab, setActiveTab] = useState<'basic' | 'attributes' | 'skills' | 'traits' | 'drops' | 'combat' | 'special'>('basic');
  const [isGeneratingStats, setIsGeneratingStats] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync with store's activeEntityId when editor becomes active
  React.useEffect(() => {
    if (activeEditor === 'enemies' && activeEntityId) {
      const exists = enemies.some(e => e.id === activeEntityId);
      if (exists) {
        setSelectedEnemyId(activeEntityId);
      } else if (enemies.length > 0) {
        setSelectedEnemyId(enemies[0].id);
      }
    }
  }, [activeEditor, activeEntityId, enemies]);

  const selectedEnemy = enemies.find(e => e.id === selectedEnemyId);

  // Sync to bottom drawer
  React.useEffect(() => {
    if (selectedEnemyId) {
      setDebugEnemyId(selectedEnemyId);
      setDrawerTab('enemy-log');
    }
  }, [selectedEnemyId, setDebugEnemyId, setDrawerTab]);

  // Group enemies by type
  const enemiesByType = useMemo(() => {
    const grouped: Record<EnemyType, Enemy[]> = {
      normal: [], elite: [], boss: [], summon: [], test: [],
    };
    enemies.forEach(e => {
      const cat = e.enemyType || 'normal';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(e);
    });
    return grouped;
  }, [enemies]);

  const handleSave = () => {
    if (selectedEnemy) {
      updateEnemy(selectedEnemy.id, selectedEnemy);
    }
  };

  const handleAddNew = () => {
    const newEnemy: Enemy = {
      ...defaultEnemy,
      id: `enemy-${Date.now()}`,
      name: '新敌人',
    } as Enemy;
    addEnemy(newEnemy);
    setSelectedEnemyId(newEnemy.id);
  };

  const handleDelete = () => {
    if (selectedEnemyId) {
      deleteEnemy(selectedEnemyId);
      if (enemies.length > 1) {
        const remaining = enemies.filter(e => e.id !== selectedEnemyId);
        setSelectedEnemyId(remaining[0]?.id || null);
      }
    }
  };

  const updateEnemyField = (field: string, value: any) => {
    if (!selectedEnemy) return;
    const keys = field.split('.');
    if (keys.length === 1) {
      updateEnemy(selectedEnemy.id, { [field]: value });
    } else {
      const parent = keys.slice(0, -1).join('.');
      const child = keys[keys.length - 1];
      const current = (selectedEnemy as any)[parent];
      updateEnemy(selectedEnemy.id, { [parent]: { ...current, [child]: value } });
    }
  };

  // AI 生成敌人数值
  const handleGenerateStats = async () => {
    if (!selectedEnemy) return;

    // 本地校验
    const validation = validateBeforeAI('enemies', selectedEnemy, project);
    if (!validation.valid) {
      setAiMessage({ type: 'error', text: validation.errors.join('；') });
      return;
    }

    setIsGeneratingStats(true);
    setAiMessage(null);

    try {
      const result = await callAI(
        'generate-stats',
        {
          editor: 'enemies',
          entity: selectedEnemy,
          project: project,
          params: {
            role: selectedEnemy.enemyType || 'normal',
            style: selectedEnemy.dangerLevel ? `危险度${selectedEnemy.dangerLevel}` : '普通',
          }
        },
        'fast'
      );

      if (result.success && result.result) {
        try {
          const stats = JSON.parse(result.result);
          // 应用生成的数值
          const updates: Partial<Enemy> = {
            attributes: {
              ...selectedEnemy.attributes!,
              hp: stats.hp || selectedEnemy.attributes?.hp || 100,
              mp: stats.mp || selectedEnemy.attributes?.mp || 0,
              attack: stats.attack || selectedEnemy.attributes?.attack || 10,
              defense: stats.defense || selectedEnemy.attributes?.defense || 5,
              magicAttack: stats.magicAttack || selectedEnemy.attributes?.magicAttack || 5,
              magicDefense: stats.magicDefense || selectedEnemy.attributes?.magicDefense || 5,
              speed: stats.speed || selectedEnemy.attributes?.speed || 10,
              critRate: stats.critRate || selectedEnemy.attributes?.critRate || 0.05,
              critDamage: stats.critDamage || selectedEnemy.attributes?.critDamage || 1.5,
            },
          };
          updateEnemy(selectedEnemy.id, updates);
          setAiMessage({ type: 'success', text: stats.reason || '数值已生成' });
        } catch {
          setAiMessage({ type: 'error', text: '解析AI返回失败' });
        }
      } else {
        setAiMessage({ type: 'error', text: result.error || '生成失败' });
      }
    } catch (error) {
      setAiMessage({ type: 'error', text: error instanceof Error ? error.message : '调用失败' });
    } finally {
      setIsGeneratingStats(false);
    }
  };

  const renderBasicTab = () => (
    <>
      <Section title="敌人信息" icon={<span><Sword size={12} /></span>}>
        <div className="space-y-3">
          <Input label="名称" value={selectedEnemy?.name || ''} onChange={(v: string) => updateEnemyField('name', v)} placeholder="敌人名称" />
          <Input label="ID" value={selectedEnemy?.id || ''} onChange={(v: string) => updateEnemyField('id', v)} placeholder="唯一标识符" />
          <Input label="类型" value={selectedEnemy?.enemyType || 'normal'} onChange={(v: string) => updateEnemyField('enemyType', v)} options={enemyTypeOptions} />
          <Input label="种族" value={selectedEnemy?.race || ''} onChange={(v: string) => updateEnemyField('race', v)} placeholder="如：人类、兽族、龙族" />
          <Input label="阵营" value={selectedEnemy?.faction || ''} onChange={(v: string) => updateEnemyField('faction', v)} placeholder="如：黑暗军团、中立" />
          <Input label="危险等级" value={selectedEnemy?.dangerLevel || 1} onChange={(v: number) => updateEnemyField('dangerLevel', v)} type="number" min={1} max={10} />
          <Input label="描述" value={selectedEnemy?.description || ''} onChange={(v: string) => updateEnemyField('description', v)} placeholder="敌人描述文本" />
          <Input label="Battler资源" value={selectedEnemy?.battlerResource || ''} onChange={(v: string) => updateEnemyField('battlerResource', v)} placeholder="图像资源名称" />
        </div>
      </Section>
    </>
  );

  const renderAttributesTab = () => (
    <>
      {/* AI 生成按钮 */}
      <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>AI 数值辅助</h4>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleGenerateStats()}
            disabled={isGeneratingStats}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs"
            style={{ background: 'var(--color-accent)', color: 'white' }}
          >
            {isGeneratingStats ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
            <span>生成敌人数值</span>
          </button>
        </div>
        {aiMessage && (
          <div className={`mt-2 p-2 rounded text-xs ${aiMessage.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {aiMessage.text}
          </div>
        )}
      </div>

      <Section title="战斗属性" icon={<span><Activity size={12} /></span>}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="等级" value={selectedEnemy?.attributes?.level || 1} onChange={(v: number) => updateEnemyField('attributes.level', v)} type="number" min={1} />
          <Input label="HP" value={selectedEnemy?.attributes?.hp || 100} onChange={(v: number) => updateEnemyField('attributes.hp', v)} type="number" min={1} />
          <Input label="MP" value={selectedEnemy?.attributes?.mp || 0} onChange={(v: number) => updateEnemyField('attributes.mp', v)} type="number" min={0} />
          <Input label="攻击" value={selectedEnemy?.attributes?.attack || 10} onChange={(v: number) => updateEnemyField('attributes.attack', v)} type="number" min={0} />
          <Input label="防御" value={selectedEnemy?.attributes?.defense || 5} onChange={(v: number) => updateEnemyField('attributes.defense', v)} type="number" min={0} />
          <Input label="魔攻" value={selectedEnemy?.attributes?.magicAttack || 5} onChange={(v: number) => updateEnemyField('attributes.magicAttack', v)} type="number" min={0} />
          <Input label="魔防" value={selectedEnemy?.attributes?.magicDefense || 5} onChange={(v: number) => updateEnemyField('attributes.magicDefense', v)} type="number" min={0} />
          <Input label="速度" value={selectedEnemy?.attributes?.speed || 10} onChange={(v: number) => updateEnemyField('attributes.speed', v)} type="number" min={0} />
          <Input label="暴击率" value={selectedEnemy?.attributes?.critRate || 0.05} onChange={(v: number) => updateEnemyField('attributes.critRate', v)} type="number" min={0} max={1} step={0.01} />
          <Input label="暴击伤害" value={selectedEnemy?.attributes?.critDamage || 1.5} onChange={(v: number) => updateEnemyField('attributes.critDamage', v)} type="number" min={1} step={0.1} />
        </div>
      </Section>
      <Section title="成长与评分" icon={<span><Sparkles size={12} /></span>}>
        <div className="space-y-3">
          <Input label="模板成长" value={selectedEnemy?.useTemplateGrowth ? '是' : '否'} onChange={() => updateEnemyField('useTemplateGrowth', !selectedEnemy?.useTemplateGrowth)} />
          <Input label="危险度评分" value={selectedEnemy?.dangerScore || 0} onChange={(v: number) => updateEnemyField('dangerScore', v)} type="number" min={0} placeholder="自动计算或手动设置" />
        </div>
      </Section>
    </>
  );

  const renderSkillsTab = () => (
    <>
      <Section title="技能列表" icon={<span><Sparkles size={12} /></span>}>
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>已绑定技能</span>
            <button 
              onClick={() => {
                const newSkill: EnemySkill = { skillId: '', slot: 'normal' };
                updateEnemyField('skills', [...(selectedEnemy?.skills || []), newSkill]);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              <Plus size={10} /> 添加技能
            </button>
          </div>
          {(selectedEnemy?.skills || []).map((skill, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
              <select 
                value={skill.slot} 
                onChange={(e) => {
                  const newSkills = [...(selectedEnemy?.skills || [])];
                  newSkills[idx] = { ...skill, slot: e.target.value as any };
                  updateEnemyField('skills', newSkills);
                }}
                className="input-field text-xs w-20"
              >
                <option value="normal">普攻</option>
                <option value="active">主动</option>
                <option value="special">特殊</option>
              </select>
              <input 
                type="text" 
                value={skill.skillId}
                onChange={(e) => {
                  const newSkills = [...(selectedEnemy?.skills || [])];
                  newSkills[idx] = { ...skill, skillId: e.target.value };
                  updateEnemyField('skills', newSkills);
                }}
                className="input-field flex-1 text-xs"
                placeholder="技能ID"
              />
              <input 
                type="text" 
                value={skill.unlockCondition || ''}
                onChange={(e) => {
                  const newSkills = [...(selectedEnemy?.skills || [])];
                  newSkills[idx] = { ...skill, unlockCondition: e.target.value };
                  updateEnemyField('skills', newSkills);
                }}
                className="input-field w-32 text-xs"
                placeholder="解锁条件"
              />
              <button 
                onClick={() => {
                  const newSkills = (selectedEnemy?.skills || []).filter((_, i) => i !== idx);
                  updateEnemyField('skills', newSkills);
                }}
                className="p-1 rounded hover:bg-red-500/20"
              >
                <Trash2 size={12} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </Section>
      <Section title="行为配置" icon={<span><Zap size={12} /></span>}>
        <div className="space-y-3">
          <Input label="首回合" value={selectedEnemy?.ai?.firstTurnPreference || 'attack'} onChange={(v: string) => updateEnemyField('ai.firstTurnPreference', v)} options={actionOptions} />
          <Input label="行动频率" value={selectedEnemy?.ai?.actionFrequency || 1} onChange={(v: number) => updateEnemyField('ai.actionFrequency', v)} type="number" min={0.1} max={10} step={0.1} />
          <div className="mt-3">
            <span className="text-xs mb-2 block" style={{ color: 'var(--color-text-muted)' }}>行为优先级</span>
            {(selectedEnemy?.ai?.behaviorPriority || []).map((bp, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <select 
                  value={bp.action}
                  onChange={(e) => {
                    const newBP = [...(selectedEnemy?.ai?.behaviorPriority || [])];
                    newBP[idx] = { ...bp, action: e.target.value as any };
                    updateEnemyField('ai.behaviorPriority', newBP);
                  }}
                  className="input-field text-xs w-24"
                >
                  {actionOptions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
                <span className="text-xs">权重</span>
                <input 
                  type="number" 
                  value={bp.weight}
                  onChange={(e) => {
                    const newBP = [...(selectedEnemy?.ai?.behaviorPriority || [])];
                    newBP[idx] = { ...bp, weight: Number(e.target.value) };
                    updateEnemyField('ai.behaviorPriority', newBP);
                  }}
                  className="input-field w-16 text-xs"
                  min={0} max={100}
                />
                <input 
                  type="text" 
                  value={bp.condition || ''}
                  onChange={(e) => {
                    const newBP = [...(selectedEnemy?.ai?.behaviorPriority || [])];
                    newBP[idx] = { ...bp, condition: e.target.value };
                    updateEnemyField('ai.behaviorPriority', newBP);
                  }}
                  className="input-field flex-1 text-xs"
                  placeholder="条件(如: hp<50%)"
                />
                <button 
                  onClick={() => {
                    const newBP = (selectedEnemy?.ai?.behaviorPriority || []).filter((_, i) => i !== idx);
                    updateEnemyField('ai.behaviorPriority', newBP);
                  }}
                  className="p-1 rounded hover:bg-red-500/20"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            ))}
            <button 
              onClick={() => {
                const newBP: BehaviorPriority = { action: 'attack', weight: 50 };
                updateEnemyField('ai.behaviorPriority', [...(selectedEnemy?.ai?.behaviorPriority || []), newBP]);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ background: 'var(--color-bg-tertiary)' }}
            >
              <Plus size={10} /> 添加行为
            </button>
          </div>
        </div>
      </Section>
      <Section title="血量阈值行为" icon={<span><Activity size={12} /></span>}>
        <div className="space-y-2">
          {(selectedEnemy?.ai?.hpThresholdBehaviors || []).map((hb, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
              <span className="text-xs w-16">HP&lt;%</span>
              <input 
                type="number" 
                value={hb.hpPercent}
                onChange={(e) => {
                  const newHB = [...(selectedEnemy?.ai?.hpThresholdBehaviors || [])];
                  newHB[idx] = { ...hb, hpPercent: Number(e.target.value) };
                  updateEnemyField('ai.hpThresholdBehaviors', newHB);
                }}
                className="input-field w-16 text-xs"
                min={1} max={100}
              />
              <span className="text-xs w-16">执行</span>
              <select 
                value={hb.action}
                onChange={(e) => {
                  const newHB = [...(selectedEnemy?.ai?.hpThresholdBehaviors || [])];
                  newHB[idx] = { ...hb, action: e.target.value };
                  updateEnemyField('ai.hpThresholdBehaviors', newHB);
                }}
                className="input-field text-xs flex-1"
              >
                <option value="attack">攻击</option>
                <option value="skill">使用技能</option>
                <option value="defend">防御</option>
                <option value="wait">待机</option>
              </select>
              {hb.action === 'skill' && (
                <input 
                  type="text" 
                  value={hb.skillId || ''}
                  onChange={(e) => {
                    const newHB = [...(selectedEnemy?.ai?.hpThresholdBehaviors || [])];
                    newHB[idx] = { ...hb, skillId: e.target.value };
                    updateEnemyField('ai.hpThresholdBehaviors', newHB);
                  }}
                  className="input-field w-24 text-xs"
                  placeholder="技能ID"
                />
              )}
              <button 
                onClick={() => {
                  const newHB = (selectedEnemy?.ai?.hpThresholdBehaviors || []).filter((_, i) => i !== idx);
                  updateEnemyField('ai.hpThresholdBehaviors', newHB);
                }}
                className="p-1 rounded hover:bg-red-500/20"
              >
                <Trash2 size={12} className="text-red-400" />
              </button>
            </div>
          ))}
          <button 
            onClick={() => {
              const newHB: HPThresholdBehavior = { hpPercent: 50, action: 'skill', skillId: '' };
              updateEnemyField('ai.hpThresholdBehaviors', [...(selectedEnemy?.ai?.hpThresholdBehaviors || []), newHB]);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{ background: 'var(--color-bg-tertiary)' }}
          >
            <Plus size={10} /> 添加阈值行为
          </button>
        </div>
      </Section>
    </>
  );

  const renderTraitsTab = () => {
    const elements = ['火', '水', '风', '雷', '冰', '光', '暗', '土'];
    const statusList = statuses.map(s => ({ value: s.id, label: s.name }));
    
    return (
      <>
        <Section title="元素抗性" icon={<span><Shield size={12} /></span>}>
          <div className="grid grid-cols-4 gap-2">
            {elements.map(elem => (
              <div key={elem} className="flex items-center gap-1">
                <span className="text-xs w-8">{elem}</span>
                <input 
                  type="number" 
                  value={selectedEnemy?.elementResistances?.[elem] ?? 0}
                  onChange={(e) => updateEnemyField(`elementResistances.${elem}`, Number(e.target.value))}
                  className="input-field w-16 text-xs"
                  min={-100} max={200}
                />
                <span className="text-xs">%</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="弱点" icon={<span><AlertTriangle size={12} /></span>}>
          <div className="flex flex-wrap gap-1">
            {elements.map(elem => (
              <button
                key={elem}
                onClick={() => {
                  const weaknesses = selectedEnemy?.weaknesses || [];
                  const newWeakness = weaknesses.includes(elem)
                    ? weaknesses.filter(w => w !== elem)
                    : [...weaknesses, elem];
                  updateEnemyField('weaknesses', newWeakness);
                }}
                className={`px-2 py-0.5 rounded text-xs border ${selectedEnemy?.weaknesses?.includes(elem) ? 'bg-red-500/20 border-red-500' : ''}`}
                style={{ borderColor: selectedEnemy?.weaknesses?.includes(elem) ? 'var(--color-accent)' : 'var(--color-border)' }}
              >
                {elem}
              </button>
            ))}
          </div>
        </Section>
        <Section title="状态抗性" icon={<span><Shield size={12} /></span>}>
          <div className="space-y-2">
            {statusList.slice(0, 10).map(status => (
              <div key={status.value} className="flex items-center gap-2">
                <span className="text-xs w-20 truncate">{status.label}</span>
                <input 
                  type="number" 
                  value={selectedEnemy?.statusResistances?.[status.value] ?? 0}
                  onChange={(e) => updateEnemyField(`statusResistances.${status.value}`, Number(e.target.value))}
                  className="input-field w-16 text-xs"
                  min={-100} max={100}
                />
                <span className="text-xs">%</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="免疫/吸收/反弹" icon={<span><Shield size={12} /></span>}>
          <div className="space-y-3">
            <div>
              <span className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>免疫状态</span>
              <div className="flex flex-wrap gap-1">
                {statusList.slice(0, 10).map(status => (
                  <button
                    key={status.value}
                    onClick={() => {
                      const immunity = selectedEnemy?.immunity || [];
                      const newImmunity = immunity.includes(status.value)
                        ? immunity.filter(i => i !== status.value)
                        : [...immunity, status.value];
                      updateEnemyField('immunity', newImmunity);
                    }}
                    className={`px-2 py-0.5 rounded text-xs border ${selectedEnemy?.immunity?.includes(status.value) ? 'bg-green-500/20 border-green-500' : ''}`}
                    style={{ borderColor: selectedEnemy?.immunity?.includes(status.value) ? 'var(--color-accent)' : 'var(--color-border)' }}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>伤害吸收</span>
              <div className="flex gap-2">
                <select className="input-field text-xs w-20">
                  {elements.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <input type="number" className="input-field text-xs w-20" placeholder="%" min={1} max={100} />
                <button className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-bg-tertiary)' }}><Plus size={10} /></button>
              </div>
            </div>
          </div>
        </Section>
        <Section title="命中/闪避修正" icon={<span><Activity size={12} /></span>}>
          <div className="grid grid-cols-2 gap-3">
            <Input label="命中修正" value={selectedEnemy?.hitMod ?? 1} onChange={(v: number) => updateEnemyField('hitMod', v)} type="number" min={0.1} max={3} step={0.1} />
            <Input label="闪避修正" value={selectedEnemy?.evasionMod ?? 1} onChange={(v: number) => updateEnemyField('evasionMod', v)} type="number" min={0.1} max={3} step={0.1} />
            <Input label="Debuff率" value={selectedEnemy?.debuffRateMod ?? 1} onChange={(v: number) => updateEnemyField('debuffRateMod', v)} type="number" min={0} max={3} step={0.1} />
          </div>
        </Section>
      </>
    );
  };

  const renderDropsTab = () => (
    <>
      <Section title="掉落物品" icon={<span><Gift size={12} /></span>}>
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>掉落配置</span>
            <button 
              onClick={() => {
                const newDrop: EnemyDrop = { itemId: '', dropRate: 0 };
                updateEnemyField('drops', [...(selectedEnemy?.drops || []), newDrop]);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              <Plus size={10} /> 添加掉落
            </button>
          </div>
          {(selectedEnemy?.drops || []).map((drop, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
              <input 
                type="text" 
                value={drop.itemId}
                onChange={(e) => {
                  const newDrops = [...(selectedEnemy?.drops || [])];
                  newDrops[idx] = { ...drop, itemId: e.target.value };
                  updateEnemyField('drops', newDrops);
                }}
                className="input-field flex-1 text-xs"
                placeholder="物品ID"
              />
              <span className="text-xs">概率</span>
              <input 
                type="number" 
                value={drop.dropRate}
                onChange={(e) => {
                  const newDrops = [...(selectedEnemy?.drops || [])];
                  newDrops[idx] = { ...drop, dropRate: Number(e.target.value) };
                  updateEnemyField('drops', newDrops);
                }}
                className="input-field w-16 text-xs"
                min={0} max={100}
              />
              <span className="text-xs">%</span>
              <input 
                type="number" 
                value={drop.amountMin || 1}
                onChange={(e) => {
                  const newDrops = [...(selectedEnemy?.drops || [])];
                  newDrops[idx] = { ...drop, amountMin: Number(e.target.value) };
                  updateEnemyField('drops', newDrops);
                }}
                className="input-field w-12 text-xs"
                min={1}
              />
              <span className="text-xs">-</span>
              <input 
                type="number" 
                value={drop.amountMax || drop.amountMin || 1}
                onChange={(e) => {
                  const newDrops = [...(selectedEnemy?.drops || [])];
                  newDrops[idx] = { ...drop, amountMax: Number(e.target.value) };
                  updateEnemyField('drops', newDrops);
                }}
                className="input-field w-12 text-xs"
                min={1}
              />
              <button 
                onClick={() => {
                  const newDrops = (selectedEnemy?.drops || []).filter((_, i) => i !== idx);
                  updateEnemyField('drops', newDrops);
                }}
                className="p-1 rounded hover:bg-red-500/20"
              >
                <Trash2 size={12} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </Section>
      <Section title="经验与金币" icon={<span><Gift size={12} /></span>}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="金币最小" value={selectedEnemy?.goldMin || 0} onChange={(v: number) => updateEnemyField('goldMin', v)} type="number" min={0} />
          <Input label="金币最大" value={selectedEnemy?.goldMax || 0} onChange={(v: number) => updateEnemyField('goldMax', v)} type="number" min={0} />
          <Input label="经验最小" value={selectedEnemy?.expMin || 0} onChange={(v: number) => updateEnemyField('expMin', v)} type="number" min={0} />
          <Input label="经验最大" value={selectedEnemy?.expMax || 0} onChange={(v: number) => updateEnemyField('expMax', v)} type="number" min={0} />
          <Input label="首杀奖励" value={selectedEnemy?.firstKillReward || ''} onChange={(v: string) => updateEnemyField('firstKillReward', v)} placeholder="首杀奖励物品" />
        </div>
      </Section>
    </>
  );

  const renderCombatTab = () => (
    <>
      <Section title="战斗表现" icon={<span><Play size={12} /></span>}>
        <div className="space-y-3">
          <Input label="待机动画" value={selectedEnemy?.idleAnimation || ''} onChange={(v: string) => updateEnemyField('idleAnimation', v)} placeholder="动画资源名" />
          <Input label="攻击动画" value={selectedEnemy?.attackAnimation || ''} onChange={(v: string) => updateEnemyField('attackAnimation', v)} placeholder="动画资源名" />
          <Input label="受击动画" value={selectedEnemy?.damageAnimation || ''} onChange={(v: string) => updateEnemyField('damageAnimation', v)} placeholder="动画资源名" />
          <Input label="死亡动画" value={selectedEnemy?.deathAnimation || ''} onChange={(v: string) => updateEnemyField('deathAnimation', v)} placeholder="动画资源名" />
          <Input label="战斗日志名" value={selectedEnemy?.battleLogName || ''} onChange={(v: string) => updateEnemyField('battleLogName', v)} placeholder="战斗日志中显示的名称" />
        </div>
      </Section>
      <Section title="音效" icon={<span><Activity size={12} /></span>}>
        <div className="space-y-3">
          <Input label="攻击音效" value={selectedEnemy?.soundEffects?.attack || ''} onChange={(v: string) => updateEnemyField('soundEffects.attack', v)} placeholder="音效资源名" />
          <Input label="受击音效" value={selectedEnemy?.soundEffects?.hurt || ''} onChange={(v: string) => updateEnemyField('soundEffects.hurt', v)} placeholder="音效资源名" />
          <Input label="死亡音效" value={selectedEnemy?.soundEffects?.death || ''} onChange={(v: string) => updateEnemyField('soundEffects.death', v)} placeholder="音效资源名" />
          <Input label="技能音效" value={selectedEnemy?.soundEffects?.skill || ''} onChange={(v: string) => updateEnemyField('soundEffects.skill', v)} placeholder="音效资源名" />
        </div>
      </Section>
    </>
  );

  const renderSpecialTab = () => (
    <>
      <Section title="阶段切换" icon={<span><Activity size={12} /></span>}>
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>阶段配置</span>
            <button 
              onClick={() => {
                const newPhase: PhaseShift = { phaseNumber: 1, triggerCondition: '' };
                updateEnemyField('phaseShift', [...(selectedEnemy?.phaseShift || []), newPhase]);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              <Plus size={10} /> 添加阶段
            </button>
          </div>
          {(selectedEnemy?.phaseShift || []).map((phase, idx) => (
            <div key={idx} className="p-2 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs">阶段 {phase.phaseNumber}</span>
                <input 
                  type="text" 
                  value={phase.triggerCondition}
                  onChange={(e) => {
                    const newPhases = [...(selectedEnemy?.phaseShift || [])];
                    newPhases[idx] = { ...phase, triggerCondition: e.target.value };
                    updateEnemyField('phaseShift', newPhases);
                  }}
                  className="input-field flex-1 text-xs"
                  placeholder="触发条件 (如: hp<50%)"
                />
                <button 
                  onClick={() => {
                    const newPhases = (selectedEnemy?.phaseShift || []).filter((_, i) => i !== idx);
                    updateEnemyField('phaseShift', newPhases);
                  }}
                  className="p-1 rounded hover:bg-red-500/20"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                添加状态: <input type="text" className="input-field w-24 text-xs mx-1" placeholder="状态ID" /> 
                移除状态: <input type="text" className="input-field w-24 text-xs mx-1" placeholder="状态ID" />
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="护盾与狂暴" icon={<span><Shield size={12} /></span>}>
        <div className="space-y-3">
          <Input label="护盾层数" value={selectedEnemy?.shieldLayers || 0} onChange={(v: number) => updateEnemyField('shieldLayers', v)} type="number" min={0} />
          <Input label="狂暴条件" value={selectedEnemy?.enragedCondition || ''} onChange={(v: string) => updateEnemyField('enragedCondition', v)} placeholder="如: hp<30%" />
        </div>
      </Section>
      <Section title="召唤行为" icon={<span><Sparkles size={12} /></span>}>
        <div className="space-y-3">
          <Input label="召唤敌人ID" value={selectedEnemy?.summonBehavior?.summonEnemyId || ''} onChange={(v: string) => updateEnemyField('summonBehavior.summonEnemyId', v)} placeholder="被召唤的敌人ID" />
          <Input label="召唤数量" value={selectedEnemy?.summonBehavior?.summonCount || 1} onChange={(v: number) => updateEnemyField('summonBehavior.summonCount', v)} type="number" min={1} />
          <Input label="召唤条件" value={selectedEnemy?.summonBehavior?.summonCondition || ''} onChange={(v: string) => updateEnemyField('summonBehavior.summonCondition', v)} placeholder="如: onFirstTurn" />
          <Input label="最大召唤数" value={selectedEnemy?.summonBehavior?.maxSummons || 0} onChange={(v: number) => updateEnemyField('summonBehavior.maxSummons', v)} type="number" min={0} />
        </div>
      </Section>
      <Section title="特殊事件标记" icon={<span><AlertTriangle size={12} /></span>}>
        <div className="flex flex-wrap gap-1">
          {['boss-battle', 'legendary-battle', 'dragon-defeat-unlock', 'knight-defeat-unlock'].map(flag => (
            <button
              key={flag}
              onClick={() => {
                const flags = selectedEnemy?.specialEventFlags || [];
                const newFlags = flags.includes(flag)
                  ? flags.filter(f => f !== flag)
                  : [...flags, flag];
                updateEnemyField('specialEventFlags', newFlags);
              }}
              className={`px-2 py-0.5 rounded text-xs border ${selectedEnemy?.specialEventFlags?.includes(flag) ? 'bg-[var(--color-accent)] text-white' : ''}`}
              style={{ borderColor: selectedEnemy?.specialEventFlags?.includes(flag) ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              {flag}
            </button>
          ))}
        </div>
      </Section>
    </>
  );

  const tabs = [
    { id: 'basic', label: '基础信息' },
    { id: 'attributes', label: '属性与成长' },
    { id: 'skills', label: '技能与行为' },
    { id: 'traits', label: 'Traits/抗性' },
    { id: 'drops', label: '掉落与奖励' },
    { id: 'combat', label: '战斗表现' },
    { id: 'special', label: '特殊机制' },
  ];

  // Validation
  const validation = useMemo(() => {
    const issues: { type: 'error' | 'warning'; message: string }[] = [];
    if (!selectedEnemy) return issues;

    if (!selectedEnemy.name) issues.push({ type: 'error', message: '缺少敌人名称' });
    if (!selectedEnemy.ai?.behaviorTree) issues.push({ type: 'error', message: '未配置AI行为树' });
    if (!selectedEnemy.drops || selectedEnemy.drops.length === 0) issues.push({ type: 'warning', message: '未配置掉落物品' });
    if (!selectedEnemy.battlerResource) issues.push({ type: 'warning', message: '未设置敌人图像' });
    if (!selectedEnemy.enemyType) issues.push({ type: 'error', message: '未选择敌人类型' });

    return issues;
  }, [selectedEnemy]);

  return (
    <div className="h-full flex overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Left: Enemy list */}
      <div className="w-64 border-r shrink-0 overflow-y-auto" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>敌人列表</span>
            <button 
              onClick={handleAddNew}
              className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        {(['normal', 'elite', 'boss', 'summon', 'test'] as EnemyType[]).map(type => (
          <div key={type} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div 
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => {
                const newSet = new Set(expandedCategories);
                if (newSet.has(type)) newSet.delete(type);
                else newSet.add(type);
                setExpandedCategories(newSet);
              }}
            >
              <ChevronRight size={12} className={`transition-transform ${expandedCategories.has(type) ? 'rotate-90' : ''}`} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {type === 'normal' ? '小怪' : type === 'elite' ? '精英' : type === 'boss' ? 'Boss' : type === 'summon' ? '召唤物' : '测试'}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({enemiesByType[type].length})</span>
            </div>
            {expandedCategories.has(type) && (
              <div className="pb-1">
                {enemiesByType[type].map(enemy => (
                  <div
                    key={enemy.id}
                    className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer ${selectedEnemyId === enemy.id ? 'bg-[var(--color-bg-tertiary)]' : ''}`}
                    style={{ paddingLeft: '24px' }}
                    onClick={() => setSelectedEnemyId(enemy.id)}
                  >
                    <span className="text-xs truncate flex-1" style={{ color: selectedEnemyId === enemy.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                      {enemy.name}
                    </span>
                    {enemy.dangerLevel && <span className="text-xs px-1 rounded" style={{ background: 'var(--color-accent)', color: 'white' }}>{enemy.dangerLevel}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main: Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedEnemy ? (
          <>
            <div className="px-6 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedEnemy.name || '未命名敌人'}</h1>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>敌人编辑器 - {tabs.find(t => t.id === activeTab)?.label}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleDelete}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs hover:bg-red-500/20"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <Trash2 size={12} /> 删除
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  <Save size={12} /> 保存
                </button>
              </div>
            </div>

            {/* Validation warnings */}
            {validation.length > 0 && (
              <div className="px-6 py-2 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                {validation.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <AlertTriangle size={12} className={v.type === 'error' ? 'text-red-400' : 'text-yellow-400'} />
                    <span style={{ color: v.type === 'error' ? 'var(--color-text-error)' : 'var(--color-text-warning)' }}>{v.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab bar */}
            <div className="flex border-b px-4 gap-1 shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
              {tabs.map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id as any)}
                  className="px-4 py-2 text-xs font-medium border-b-2 transition-colors"
                  style={{ 
                    color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)', 
                    borderColor: activeTab === tab.id ? 'var(--color-accent)' : 'transparent' 
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'basic' && renderBasicTab()}
              {activeTab === 'attributes' && renderAttributesTab()}
              {activeTab === 'skills' && renderSkillsTab()}
              {activeTab === 'traits' && renderTraitsTab()}
              {activeTab === 'drops' && renderDropsTab()}
              {activeTab === 'combat' && renderCombatTab()}
              {activeTab === 'special' && renderSpecialTab()}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="text-lg mb-2">选择一个敌人开始编辑</div>
              <button 
                onClick={handleAddNew}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs mx-auto"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                <Plus size={12} /> 创建新敌人
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
