import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import { useUIStore } from '../../../stores/uiStore';
import type { Equipment, EquipmentCategory, EquipmentTrait, Job, Character } from '../../../types';
import {
  Plus, Trash2, ChevronRight, ChevronDown, AlertTriangle, Sword, Shield, Circle, Sparkles, FlaskConical
} from 'lucide-react';

// Equipment category config
const equipmentCategoryConfig: { id: EquipmentCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'weapon', label: '武器', icon: <Sword size={12} />, color: '#ef4444' },
  { id: 'armor', label: '防具', icon: <Shield size={12} />, color: '#3b82f6' },
  { id: 'accessory', label: '饰品', icon: <Circle size={12} />, color: '#f59e0b' },
  { id: 'exclusive', label: '专属装备', icon: <Sparkles size={12} />, color: '#8b5cf6' },
  { id: 'test', label: '测试装备', icon: <FlaskConical size={12} />, color: '#06b6d4' },
];

// Equipment types by category
const equipmentTypes: Record<EquipmentCategory, { id: string; label: string }[]> = {
  weapon: [
    { id: 'sword', label: '剑' }, { id: 'axe', label: '斧' }, { id: 'hammer', label: '锤' },
    { id: 'dagger', label: '匕首' }, { id: 'bow', label: '弓' }, { id: 'staff', label: '法杖' },
    { id: 'wand', label: '魔杖' }, { id: 'polearm', label: '长矛' },
  ],
  armor: [
    { id: 'heavy', label: '重甲' }, { id: 'medium', label: '中甲' }, { id: 'light', label: '轻甲' }, { id: 'cloth', label: '布甲' },
  ],
  accessory: [
    { id: 'ring', label: '戒指' }, { id: 'necklace', label: '项链' }, { id: 'bracelet', label: '手镯' }, { id: 'belt', label: '腰带' },
  ],
  exclusive: [
    { id: 'exclusive-weapon', label: '专属武器' }, { id: 'exclusive-armor', label: '专属防具' }, { id: 'exclusive-accessory', label: '专属饰品' },
  ],
  test: [
    { id: 'test-weapon', label: '测试武器' }, { id: 'test-armor', label: '测试防具' },
  ],
};

const statTypes = ['hp', 'mp', 'attack', 'defense', 'speed', 'critRate', 'critDamage', 'magicAttack', 'magicDefense'];
const rarityOptions = [
  { value: 1, label: '普通 (1)', color: '#9ca3af' },
  { value: 2, label: '优秀 (2)', color: '#22c55e' },
  { value: 3, label: '稀有 (3)', color: '#3b82f6' },
  { value: 4, label: '史诗 (4)', color: '#8b5cf6' },
  { value: 5, label: '传说 (5)', color: '#f59e0b' },
  { value: 6, label: '神话 (6)', color: '#ef4444' },
];

const createDefaultEquipment = (category: EquipmentCategory = 'weapon'): Equipment => ({
  id: `equip-${Date.now()}`,
  name: '新装备',
  equipmentCategory: category,
  equipmentType: equipmentTypes[category]?.[0]?.id || 'sword',
  rarity: 1,
  description: '',
  icon: '',
  stats: {},
  traits: [],
  condition: {},
  economy: { price: 100, shopAvailable: true, rarityTag: '普通' },
  combatDisplay: {},
});

export const EquipmentEditor: React.FC = () => {
  const { project, addEquipment, updateEquipment, deleteEquipment } = useProjectStore();
  const { setDebugEquipmentId, activeEntityId, activeEditor } = useEditorStore();
  const { setDrawerTab } = useUIStore();
  const { equipment, jobs, characters } = project;

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<EquipmentCategory>>(new Set(['weapon']));
  const [activeTab, setActiveTab] = useState<'basic' | 'stats' | 'traits' | 'condition' | 'economy' | 'combat'>('basic');

  // Sync with store's activeEntityId when editor becomes active
  React.useEffect(() => {
    if (activeEditor === 'equipment' && activeEntityId) {
      const exists = equipment.some(e => e.id === activeEntityId);
      if (exists) {
        setSelectedEquipmentId(activeEntityId);
      } else if (equipment.length > 0) {
        setSelectedEquipmentId(equipment[0].id);
      }
    }
  }, [activeEditor, activeEntityId, equipment]);

  const selectedEquipment = equipment.find(e => e.id === selectedEquipmentId);

  React.useEffect(() => {
    if (selectedEquipmentId) {
      setDebugEquipmentId(selectedEquipmentId);
      setDrawerTab('equipment-log');
    }
  }, [selectedEquipmentId, setDebugEquipmentId, setDrawerTab]);

  const equipmentByCategory = useMemo(() => {
    const grouped: Record<EquipmentCategory, Equipment[]> = {
      weapon: [], armor: [], accessory: [], exclusive: [], test: [],
    };
    equipment.forEach(e => {
      const cat = e.equipmentCategory || 'weapon';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(e);
    });
    return grouped;
  }, [equipment]);

  const validation = useMemo(() => {
    const issues: { type: 'error' | 'warning'; message: string }[] = [];
    if (!selectedEquipment) return issues;
    if (!selectedEquipment.name) issues.push({ type: 'error', message: '缺少装备名称' });
    if (!selectedEquipment.equipmentType) issues.push({ type: 'error', message: '未选择装备类型' });
    if (selectedEquipment.traits?.length === 0) issues.push({ type: 'warning', message: '建议添加装备特质' });
    if (!selectedEquipment.economy?.price) issues.push({ type: 'warning', message: '未设置价格' });
    return issues;
  }, [selectedEquipment]);

  const equipmentRisks = useMemo(() => {
    const risks: string[] = [];
    if (!selectedEquipment) return risks;
    if (selectedEquipment.traits?.length === 0) risks.push('无装备特质');
    if (!selectedEquipment.economy?.price) risks.push('未设置价格');
    if (!selectedEquipment.condition?.allowedJobs?.length && !selectedEquipment.condition?.allowedCharacters?.length) {
      risks.push('无职业/角色限制（任何人都能装备）');
    }
    return risks;
  }, [selectedEquipment]);

  const toggleCategory = (catId: EquipmentCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const createNewEquipment = (category: EquipmentCategory) => {
    const newEquip = createDefaultEquipment(category);
    addEquipment(newEquip);
    setSelectedEquipmentId(newEquip.id);
  };

  const updateCurrentEquipment = (updates: Partial<Equipment>) => {
    if (selectedEquipmentId) {
      updateEquipment(selectedEquipmentId, updates);
    }
  };

  const errorCount = validation.filter(v => v.type === 'error').length;
  const warningCount = validation.filter(v => v.type === 'warning').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top Summary Bar */}
      <div className="shrink-0 p-3 border-b" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>装备总数</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{equipment.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>当前选中</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{selectedEquipment?.name || '-'}</span>
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
            {errorCount === 0 && warningCount === 0 && selectedEquipment && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-success)', color: 'white' }}>
                校验通过
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Equipment Registry Tree */}
        <div className="w-56 flex flex-col border-r overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>装备注册表</h3>
              <button onClick={() => createNewEquipment('weapon')} className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]" title="添加装备">
                <Plus size={14} style={{ color: 'var(--color-accent)' }} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {equipmentCategoryConfig.map(cat => {
              const catEquipment = equipmentByCategory[cat.id] || [];
              const isExpanded = expandedCategories.has(cat.id);

              return (
                <div key={cat.id} className="mb-1">
                  <button onClick={() => toggleCategory(cat.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-[var(--color-bg-tertiary)]" style={{ color: 'var(--color-text-primary)' }}>
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span style={{ color: cat.color }}>{cat.icon}</span>
                    <span className="flex-1 text-left">{cat.label}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{catEquipment.length}</span>
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {catEquipment.map(equip => {
                        const isSelected = selectedEquipmentId === equip.id;
                        const rarityInfo = rarityOptions.find(r => r.value === equip.rarity);
                        return (
                          <button key={equip.id} onClick={() => setSelectedEquipmentId(equip.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${isSelected ? 'ring-1 ring-[var(--color-accent)]' : ''}`}
                            style={{ background: isSelected ? 'var(--color-bg-tertiary)' : 'transparent' }}>
                            <div className="flex items-center gap-2">
                              <span style={{ color: rarityInfo?.color }}>{cat.icon}</span>
                              <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{equip.name}</span>
                            </div>
                          </button>
                        );
                      })}
                      <button onClick={() => createNewEquipment(cat.id)} className="w-full flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-[var(--color-bg-tertiary)]" style={{ color: 'var(--color-accent)' }}>
                        <Plus size={10} /> 添加
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle: Equipment Editor */}
        <div className="flex-1 flex flex-col overflow-hidden border-r" style={{ background: 'var(--color-bg-primary)' }}>
          {selectedEquipment ? (
            <>
              <div className="flex border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                {[
                  { id: 'basic', label: '基础信息' },
                  { id: 'stats', label: '参数加成' },
                  { id: 'traits', label: 'Traits' },
                  { id: 'condition', label: '装备条件' },
                  { id: 'economy', label: '经济与产出' },
                  { id: 'combat', label: '战斗表现' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 text-xs font-medium border-r ${activeTab === tab.id ? 'bg-[var(--color-bg-tertiary)]' : ''}`}
                    style={{ color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-4">
                {/* BASIC TAB */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>基础信息</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>装备名称</label>
                          <input type="text" value={selectedEquipment.name} onChange={(e) => updateCurrentEquipment({ name: e.target.value })} className="input-field w-full mt-1" placeholder="如: 铁剑" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>装备ID</label>
                          <input type="text" value={selectedEquipment.id} disabled className="input-field w-full mt-1 opacity-60" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>装备类别</label>
                          <select value={selectedEquipment.equipmentCategory} onChange={(e) => updateCurrentEquipment({ equipmentCategory: e.target.value as EquipmentCategory, equipmentType: equipmentTypes[e.target.value as EquipmentCategory]?.[0]?.id || 'sword' })} className="input-field w-full mt-1">
                            {equipmentCategoryConfig.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>装备类型</label>
                          <select value={selectedEquipment.equipmentType} onChange={(e) => updateCurrentEquipment({ equipmentType: e.target.value })} className="input-field w-full mt-1">
                            {(equipmentTypes[selectedEquipment.equipmentCategory] || []).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>稀有度</label>
                          <select value={selectedEquipment.rarity} onChange={(e) => updateCurrentEquipment({ rarity: Number(e.target.value) as any })} className="input-field w-full mt-1">
                            {rarityOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>图标</label>
                          <input type="text" value={selectedEquipment.icon || ''} onChange={(e) => updateCurrentEquipment({ icon: e.target.value })} className="input-field w-full mt-1" placeholder="图标资源ID" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>描述</label>
                          <textarea value={selectedEquipment.description || ''} onChange={(e) => updateCurrentEquipment({ description: e.target.value })} className="input-field w-full mt-1 h-20 resize-none" placeholder="装备描述..." />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STATS TAB */}
                {activeTab === 'stats' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>属性加成</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {statTypes.map(stat => (
                          <div key={stat}>
                            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{stat.toUpperCase()}</label>
                            <input type="number" value={selectedEquipment.stats?.[stat as keyof typeof selectedEquipment.stats] || 0}
                              onChange={(e) => updateCurrentEquipment({ stats: { ...selectedEquipment.stats, [stat]: Number(e.target.value) } })} className="input-field w-full mt-1 text-xs" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TRAITS TAB */}
                {activeTab === 'traits' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>装备特质</h4>
                        <button onClick={() => {
                          const newTrait: EquipmentTrait = { id: `trait-${Date.now()}`, name: '新特质', traitType: 'stat-bonus', value: {}, description: '' };
                          updateCurrentEquipment({ traits: [...(selectedEquipment.traits || []), newTrait] });
                        }} className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ background: 'var(--color-accent)', color: 'white' }}>
                          <Plus size={12} /> 添加特质
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(selectedEquipment.traits || []).map((trait, idx) => (
                          <div key={trait.id} className="p-3 rounded" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                            <div className="flex items-center gap-3 mb-2">
                              <input type="text" value={trait.name} onChange={(e) => {
                                const newTraits = [...(selectedEquipment.traits || [])];
                                newTraits[idx] = { ...newTraits[idx], name: e.target.value };
                                updateCurrentEquipment({ traits: newTraits });
                              }} className="input-field flex-1 text-xs" placeholder="特质名称" />
                              <select value={trait.traitType} onChange={(e) => {
                                const newTraits = [...(selectedEquipment.traits || [])];
                                newTraits[idx] = { ...newTraits[idx], traitType: e.target.value as any };
                                updateCurrentEquipment({ traits: newTraits });
                              }} className="input-field text-xs">
                                <option value="stat-bonus">属性加成</option>
                                <option value="element-resistance">元素抗性</option>
                                <option value="status-resistance">状态抗性</option>
                                <option value="hit-dodge-crit">命中闪避暴击</option>
                                <option value="skill-type">技能类型</option>
                                <option value="special">特殊</option>
                              </select>
                              <button onClick={() => {
                                const newTraits = (selectedEquipment.traits || []).filter((_, i) => i !== idx);
                                updateCurrentEquipment({ traits: newTraits });
                              }} className="p-1 rounded"><Trash2 size={12} style={{ color: 'var(--color-danger)' }} /></button>
                            </div>
                            <input type="text" value={Object.entries(trait.value).map(([k, v]) => `${k}:${v}`).join(', ')} onChange={(e) => {
                              const value: Record<string, number> = {};
                              e.target.value.split(',').forEach(item => { const [k, v] = item.split(':'); if (k && v) value[k.trim()] = Number(v); });
                              const newTraits = [...(selectedEquipment.traits || [])];
                              newTraits[idx] = { ...newTraits[idx], value };
                              updateCurrentEquipment({ traits: newTraits });
                            }} className="input-field w-full text-xs" placeholder="attack:10, defense:5" />
                          </div>
                        ))}
                        {(selectedEquipment.traits || []).length === 0 && (
                          <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>暂无特质</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* CONDITION TAB */}
                {activeTab === 'condition' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>装备条件</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>可装备职业</label>
                          <div className="flex flex-wrap gap-2">
                            {jobs.map(j => (
                              <label key={j.id} className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={selectedEquipment.condition?.allowedJobs?.includes(j.id) || false} onChange={(e) => {
                                  const jobs = selectedEquipment.condition?.allowedJobs || [];
                                  const newJobs = e.target.checked ? [...jobs, j.id] : jobs.filter(id => id !== j.id);
                                  updateCurrentEquipment({ condition: { ...selectedEquipment.condition!, allowedJobs: newJobs } });
                                }} />
                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{j.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>禁止职业</label>
                          <div className="flex flex-wrap gap-2">
                            {jobs.map(j => (
                              <label key={j.id} className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={selectedEquipment.condition?.forbiddenJobs?.includes(j.id) || false} onChange={(e) => {
                                  const jobs = selectedEquipment.condition?.forbiddenJobs || [];
                                  const newJobs = e.target.checked ? [...jobs, j.id] : jobs.filter(id => id !== j.id);
                                  updateCurrentEquipment({ condition: { ...selectedEquipment.condition!, forbiddenJobs: newJobs } });
                                }} />
                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{j.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>最小等级</label>
                            <input type="number" value={selectedEquipment.condition?.minLevel || 1} onChange={(e) => updateCurrentEquipment({ condition: { ...selectedEquipment.condition!, minLevel: Number(e.target.value) } })} className="input-field w-full mt-1" min={1} />
                          </div>
                          <div>
                            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>最大等级</label>
                            <input type="number" value={selectedEquipment.condition?.maxLevel || 99} onChange={(e) => updateCurrentEquipment({ condition: { ...selectedEquipment.condition!, maxLevel: Number(e.target.value) } })} className="input-field w-full mt-1" min={1} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ECONOMY TAB */}
                {activeTab === 'economy' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>经济与产出</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>售价</label>
                          <input type="number" value={selectedEquipment.economy?.price || 0} onChange={(e) => updateCurrentEquipment({ economy: { ...selectedEquipment.economy!, price: Number(e.target.value) } })} className="input-field w-full mt-1" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>收购价</label>
                          <input type="number" value={selectedEquipment.economy?.sellPrice || 0} onChange={(e) => updateCurrentEquipment({ economy: { ...selectedEquipment.economy!, sellPrice: Number(e.target.value) } })} className="input-field w-full mt-1" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>稀有度标签</label>
                          <input type="text" value={selectedEquipment.economy?.rarityTag || ''} onChange={(e) => updateCurrentEquipment({ economy: { ...selectedEquipment.economy!, rarityTag: e.target.value } })} className="input-field w-full mt-1" placeholder="如: 普通/稀有/史诗" />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={selectedEquipment.economy?.shopAvailable ?? true} onChange={(e) => updateCurrentEquipment({ economy: { ...selectedEquipment.economy!, shopAvailable: e.target.checked } })} />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>商店可售</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* COMBAT TAB */}
                {activeTab === 'combat' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>战斗表现</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>装备图标</label>
                          <input type="text" value={selectedEquipment.combatDisplay?.icon || ''} onChange={(e) => updateCurrentEquipment({ combatDisplay: { ...selectedEquipment.combatDisplay!, icon: e.target.value } })} className="input-field w-full mt-1" placeholder="图标资源ID" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>装备音效</label>
                          <input type="text" value={selectedEquipment.combatDisplay?.soundEffect || ''} onChange={(e) => updateCurrentEquipment({ combatDisplay: { ...selectedEquipment.combatDisplay!, soundEffect: e.target.value } })} className="input-field w-full mt-1" placeholder="音效资源ID" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>装备日志文本</label>
                          <input type="text" value={selectedEquipment.combatDisplay?.battleLogText || ''} onChange={(e) => updateCurrentEquipment({ combatDisplay: { ...selectedEquipment.combatDisplay!, battleLogText: e.target.value } })} className="input-field w-full mt-1" placeholder="装备时的战斗日志显示" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                <button onClick={() => {
                  if (selectedEquipmentId) {
                    deleteEquipment(selectedEquipmentId);
                    setSelectedEquipmentId(equipment[0]?.id || null);
                  }
                }} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs" style={{ background: 'var(--color-danger)', color: 'white' }}>
                  <Trash2 size={12} /> 删除装备
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="text-center">
                <Sword size={48} className="mx-auto mb-4 opacity-30" />
                <div className="text-lg mb-2">选择或创建装备</div>
                <button onClick={() => createNewEquipment('weapon')} className="flex items-center gap-2 px-4 py-2 rounded" style={{ background: 'var(--color-accent)', color: 'white' }}>
                  <Plus size={16} /> 创建新装备
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview & Validation */}
        <div className="w-72 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>装备预览 & 校验</h3>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {selectedEquipment ? (
              <>
                <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>装备卡预览</h4>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)', borderLeft: `3px solid ${rarityOptions.find(r => r.value === selectedEquipment.rarity)?.color || 'var(--color-accent)'}` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded flex items-center justify-center" style={{ background: (rarityOptions.find(r => r.value === selectedEquipment.rarity)?.color || 'var(--color-accent)') + '20' }}>
                        <Sword size={24} style={{ color: rarityOptions.find(r => r.value === selectedEquipment.rarity)?.color || 'var(--color-accent)' }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedEquipment.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {equipmentCategoryConfig.find(c => c.id === selectedEquipment.equipmentCategory)?.label} · {equipmentTypes[selectedEquipment.equipmentCategory]?.find(t => t.id === selectedEquipment.equipmentType)?.label || selectedEquipment.equipmentType}
                        </div>
                      </div>
                    </div>
                    {selectedEquipment.description && <div className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{selectedEquipment.description}</div>}
                  </div>
                </div>

                <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>属性加成</h4>
                  <div className="space-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {Object.entries(selectedEquipment.stats || {}).filter(([, v]) => v !== 0).map(([stat, val]) => (
                      <div key={stat} className="flex justify-between"><span>{stat}</span><span style={{ color: val > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{val > 0 ? '+' : ''}{val}</span></div>
                    ))}
                    {Object.keys(selectedEquipment.stats || {}).filter(k => (selectedEquipment.stats as any)[k] !== 0).length === 0 && <span style={{ color: 'var(--color-text-muted)' }}>无属性加成</span>}
                  </div>
                </div>

                <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>特质</h4>
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {(selectedEquipment.traits || []).length > 0 ? selectedEquipment.traits!.map(t => t.name).join(', ') : '无特质'}
                  </div>
                </div>

                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>风险提示</h4>
                  <div className="space-y-2">
                    {equipmentRisks.length > 0 ? equipmentRisks.map((risk, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <AlertTriangle size={12} style={{ color: 'var(--color-warning)' }} />
                        <span style={{ color: 'var(--color-warning)' }}>{risk}</span>
                      </div>
                    )) : <div className="text-xs" style={{ color: 'var(--color-success)' }}>配置完整，无风险</div>}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                <div className="text-center text-xs">选择装备查看预览</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
