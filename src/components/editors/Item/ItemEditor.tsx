import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import { useUIStore } from '../../../stores/uiStore';
import type { Item, ItemCategory, ItemEffect } from '../../../types';
import {
  Plus, Trash2, ChevronRight, ChevronDown, AlertTriangle, Heart, UserPlus, Sparkles, FlaskRound, Scroll, Key
} from 'lucide-react';

// Item category config
const itemCategoryConfig: { id: ItemCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'recovery', label: '恢复', icon: <Heart size={12} />, color: '#22c55e' },
  { id: 'resurrection', label: '复活', icon: <UserPlus size={12} />, color: '#3b82f6' },
  { id: 'buff', label: '增益', icon: <Sparkles size={12} />, color: '#f59e0b' },
  { id: 'consumable', label: '战斗消耗品', icon: <FlaskRound size={12} />, color: '#ef4444' },
  { id: 'quest', label: '任务道具', icon: <Scroll size={12} />, color: '#8b5cf6' },
  { id: 'key', label: '关键道具', icon: <Key size={12} />, color: '#06b6d4' },
];

// Item types by category
const itemTypes: Record<ItemCategory, { id: string; label: string }[]> = {
  recovery: [
    { id: 'potion', label: '药水' }, { id: 'herb', label: '草药' }, { id: 'food', label: '食物' },
  ],
  resurrection: [
    { id: 'feather', label: '羽毛' }, { id: 'scroll', label: '卷轴' },
  ],
  buff: [
    { id: 'buff-item', label: '增益道具' }, { id: 'elixir', label: '灵药' },
  ],
  consumable: [
    { id: 'bomb', label: '炸弹' }, { id: 'trap', label: '陷阱' }, { id: 'ammo', label: '弹药' },
  ],
  quest: [
    { id: 'quest-item', label: '任务物品' }, { id: 'collectible', label: '收集品' },
  ],
  key: [
    { id: 'key-item', label: '钥匙' }, { id: 'story-item', label: '剧情物品' },
  ],
};

const rarityOptions = [
  { value: 1, label: '普通 (1)', color: '#9ca3af' },
  { value: 2, label: '优秀 (2)', color: '#22c55e' },
  { value: 3, label: '稀有 (3)', color: '#3b82f6' },
  { value: 4, label: '史诗 (4)', color: '#8b5cf6' },
  { value: 5, label: '传说 (5)', color: '#f59e0b' },
  { value: 6, label: '神话 (6)', color: '#ef4444' },
];

const createDefaultItem = (category: ItemCategory = 'recovery'): Item => ({
  id: `item-${Date.now()}`,
  name: '新道具',
  itemCategory: category,
  itemType: itemTypes[category]?.[0]?.id || 'potion',
  description: '',
  icon: '',
  useRule: { scenario: 'anytime', targetType: 'ally', usesPerBattle: 99, consumable: true },
  effects: [],
  event关联: { isKeyItem: false },
  economy: { price: 50, shopAvailable: true, rarity: 1, stackMax: 99 },
  display: {},
});

export const ItemEditor: React.FC = () => {
  const { project, addItem, updateItem, deleteItem } = useProjectStore();
  const { setDebugItemId, activeEntityId, activeEditor } = useEditorStore();
  const { setDrawerTab } = useUIStore();
  const { items } = project;

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<ItemCategory>>(new Set(['recovery']));
  const [activeTab, setActiveTab] = useState<'basic' | 'usage' | 'effects' | 'event' | 'economy'>('basic');

  // Sync with store's activeEntityId when editor becomes active
  React.useEffect(() => {
    if (activeEditor === 'items' && activeEntityId) {
      const exists = items.some(i => i.id === activeEntityId);
      if (exists) {
        setSelectedItemId(activeEntityId);
      } else if (items.length > 0) {
        setSelectedItemId(items[0].id);
      }
    }
  }, [activeEditor, activeEntityId, items]);

  const selectedItem = items.find(i => i.id === selectedItemId);

  React.useEffect(() => {
    if (selectedItemId) {
      setDebugItemId(selectedItemId);
      setDrawerTab('item-log');
    }
  }, [selectedItemId, setDebugItemId, setDrawerTab]);

  const itemsByCategory = useMemo(() => {
    const grouped: Record<ItemCategory, Item[]> = {
      recovery: [], resurrection: [], buff: [], consumable: [], quest: [], key: [],
    };
    items.forEach(i => {
      const cat = i.itemCategory || 'recovery';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(i);
    });
    return grouped;
  }, [items]);

  const validation = useMemo(() => {
    const issues: { type: 'error' | 'warning'; message: string }[] = [];
    if (!selectedItem) return issues;
    if (!selectedItem.name) issues.push({ type: 'error', message: '缺少道具名称' });
    if (!selectedItem.itemType) issues.push({ type: 'error', message: '未选择道具类型' });
    if (selectedItem.effects?.length === 0) issues.push({ type: 'warning', message: '建议添加道具效果' });
    if (!selectedItem.economy?.price) issues.push({ type: 'warning', message: '未设置价格' });
    return issues;
  }, [selectedItem]);

  const itemRisks = useMemo(() => {
    const risks: string[] = [];
    if (!selectedItem) return risks;
    if (selectedItem.effects?.length === 0) risks.push('无道具效果');
    if (!selectedItem.economy?.price) risks.push('未设置价格');
    if (!selectedItem.economy?.shopAvailable && !selectedItem.event关联?.isKeyItem) risks.push('未在商店出售且非关键道具');
    return risks;
  }, [selectedItem]);

  const toggleCategory = (catId: ItemCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const createNewItem = (category: ItemCategory) => {
    const newItem = createDefaultItem(category);
    addItem(newItem);
    setSelectedItemId(newItem.id);
  };

  const updateCurrentItem = (updates: Partial<Item>) => {
    if (selectedItemId) {
      updateItem(selectedItemId, updates);
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
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>道具总数</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{items.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>当前选中</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{selectedItem?.name || '-'}</span>
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
            {errorCount === 0 && warningCount === 0 && selectedItem && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-success)', color: 'white' }}>
                校验通过
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Item Registry Tree */}
        <div className="w-56 flex flex-col border-r overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>道具注册表</h3>
              <button onClick={() => createNewItem('recovery')} className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]" title="添加道具">
                <Plus size={14} style={{ color: 'var(--color-accent)' }} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {itemCategoryConfig.map(cat => {
              const catItems = itemsByCategory[cat.id] || [];
              const isExpanded = expandedCategories.has(cat.id);

              return (
                <div key={cat.id} className="mb-1">
                  <button onClick={() => toggleCategory(cat.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-[var(--color-bg-tertiary)]" style={{ color: 'var(--color-text-primary)' }}>
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span style={{ color: cat.color }}>{cat.icon}</span>
                    <span className="flex-1 text-left">{cat.label}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{catItems.length}</span>
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {catItems.map(item => {
                        const isSelected = selectedItemId === item.id;
                        return (
                          <button key={item.id} onClick={() => setSelectedItemId(item.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${isSelected ? 'ring-1 ring-[var(--color-accent)]' : ''}`}
                            style={{ background: isSelected ? 'var(--color-bg-tertiary)' : 'transparent' }}>
                            <div className="flex items-center gap-2">
                              <span style={{ color: cat.color }}>{cat.icon}</span>
                              <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{item.name}</span>
                            </div>
                          </button>
                        );
                      })}
                      <button onClick={() => createNewItem(cat.id)} className="w-full flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-[var(--color-bg-tertiary)]" style={{ color: 'var(--color-accent)' }}>
                        <Plus size={10} /> 添加
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle: Item Editor */}
        <div className="flex-1 flex flex-col overflow-hidden border-r" style={{ background: 'var(--color-bg-primary)' }}>
          {selectedItem ? (
            <>
              <div className="flex border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                {[
                  { id: 'basic', label: '基础信息' },
                  { id: 'usage', label: '使用规则' },
                  { id: 'effects', label: '效果块' },
                  { id: 'event', label: '事件关联' },
                  { id: 'economy', label: '经济与掉落' },
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
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>道具名称</label>
                          <input type="text" value={selectedItem.name} onChange={(e) => updateCurrentItem({ name: e.target.value })} className="input-field w-full mt-1" placeholder="如: 小回复药" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>道具ID</label>
                          <input type="text" value={selectedItem.id} disabled className="input-field w-full mt-1 opacity-60" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>道具类别</label>
                          <select value={selectedItem.itemCategory} onChange={(e) => updateCurrentItem({ itemCategory: e.target.value as ItemCategory, itemType: itemTypes[e.target.value as ItemCategory]?.[0]?.id || 'potion' })} className="input-field w-full mt-1">
                            {itemCategoryConfig.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>道具类型</label>
                          <select value={selectedItem.itemType} onChange={(e) => updateCurrentItem({ itemType: e.target.value })} className="input-field w-full mt-1">
                            {(itemTypes[selectedItem.itemCategory] || []).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>图标</label>
                          <input type="text" value={selectedItem.icon || ''} onChange={(e) => updateCurrentItem({ icon: e.target.value })} className="input-field w-full mt-1" placeholder="图标资源ID" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>可堆叠数</label>
                          <input type="number" value={selectedItem.economy?.stackMax || 99} onChange={(e) => updateCurrentItem({ economy: { ...selectedItem.economy!, stackMax: Number(e.target.value) } })} className="input-field w-full mt-1" min={1} />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>描述</label>
                          <textarea value={selectedItem.description || ''} onChange={(e) => updateCurrentItem({ description: e.target.value })} className="input-field w-full mt-1 h-20 resize-none" placeholder="道具描述..." />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* USAGE TAB */}
                {activeTab === 'usage' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>使用规则</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>使用场景</label>
                          <select value={selectedItem.useRule.scenario} onChange={(e) => updateCurrentItem({ useRule: { ...selectedItem.useRule!, scenario: e.target.value as any } })} className="input-field w-full mt-1">
                            <option value="battle">战斗内</option>
                            <option value="menu">菜单内</option>
                            <option value="anytime">任意时机</option>
                            <option value="none">不可直接使用</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>目标类型</label>
                          <select value={selectedItem.useRule.targetType} onChange={(e) => updateCurrentItem({ useRule: { ...selectedItem.useRule!, targetType: e.target.value as any } })} className="input-field w-full mt-1">
                            <option value="self">自身</option>
                            <option value="ally">友军</option>
                            <option value="enemy">敌人</option>
                            <option value="all-ally">全体友军</option>
                            <option value="all-enemy">全体敌人</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>每战斗使用次数</label>
                          <input type="number" value={selectedItem.useRule.usesPerBattle || 99} onChange={(e) => updateCurrentItem({ useRule: { ...selectedItem.useRule!, usesPerBattle: Number(e.target.value) } })} className="input-field w-full mt-1" min={1} />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>冷却回合</label>
                          <input type="number" value={selectedItem.useRule.cooldown || 0} onChange={(e) => updateCurrentItem({ useRule: { ...selectedItem.useRule!, cooldown: Number(e.target.value) } })} className="input-field w-full mt-1" min={0} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedItem.useRule.consumable} onChange={(e) => updateCurrentItem({ useRule: { ...selectedItem.useRule!, consumable: e.target.checked } })} />
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>消耗性道具（使用后消失）</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* EFFECTS TAB */}
                {activeTab === 'effects' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>道具效果</h4>
                        <button onClick={() => {
                          const newEffect: ItemEffect = { id: `effect-${Date.now()}`, effectType: 'heal-hp', value: 0 };
                          updateCurrentItem({ effects: [...(selectedItem.effects || []), newEffect] });
                        }} className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ background: 'var(--color-accent)', color: 'white' }}>
                          <Plus size={12} /> 添加效果
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(selectedItem.effects || []).map((effect, idx) => (
                          <div key={effect.id} className="p-3 rounded" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <select value={effect.effectType} onChange={(e) => {
                                const newEffects = [...(selectedItem.effects || [])];
                                newEffects[idx] = { ...newEffects[idx], effectType: e.target.value as any };
                                updateCurrentItem({ effects: newEffects });
                              }} className="input-field flex-1 text-xs">
                                <option value="heal-hp">恢复HP</option>
                                <option value="heal-mp">恢复MP</option>
                                <option value="add-status">增加状态</option>
                                <option value="remove-status">移除状态</option>
                                <option value="add-resource">增加资源</option>
                                <option value="temp-buff">临时Buff</option>
                                <option value="trigger-event">触发事件</option>
                              </select>
                              <input type="number" value={typeof effect.value === 'number' ? effect.value : 0} onChange={(e) => {
                                const newEffects = [...(selectedItem.effects || [])];
                                newEffects[idx] = { ...newEffects[idx], value: Number(e.target.value) };
                                updateCurrentItem({ effects: newEffects });
                              }} className="input-field w-20 text-xs" placeholder="值" />
                              <button onClick={() => {
                                const newEffects = (selectedItem.effects || []).filter((_, i) => i !== idx);
                                updateCurrentItem({ effects: newEffects });
                              }} className="p-1 rounded"><Trash2 size={12} style={{ color: 'var(--color-danger)' }} /></button>
                            </div>
                            {(effect.effectType === 'add-status' || effect.effectType === 'remove-status') && (
                              <input type="text" value={effect.statusId || ''} onChange={(e) => {
                                const newEffects = [...(selectedItem.effects || [])];
                                newEffects[idx] = { ...newEffects[idx], statusId: e.target.value };
                                updateCurrentItem({ effects: newEffects });
                              }} className="input-field w-full text-xs" placeholder="状态ID" />
                            )}
                          </div>
                        ))}
                        {(selectedItem.effects || []).length === 0 && (
                          <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>暂无效果</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* EVENT TAB */}
                {activeTab === 'event' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>事件关联</h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={selectedItem.event关联.isKeyItem} onChange={(e) => updateCurrentItem({ event关联: { ...selectedItem.event关联!, isKeyItem: e.target.checked } })} />
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>关键道具（剧情必需）</span>
                        </label>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>关联事件ID</label>
                          <input type="text" value={selectedItem.event关联.eventId || ''} onChange={(e) => updateCurrentItem({ event关联: { ...selectedItem.event关联!, eventId: e.target.value } })} className="input-field w-full mt-1" placeholder="事件ID" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>解锁地图</label>
                          <input type="text" value={selectedItem.event关联.unlockMap || ''} onChange={(e) => updateCurrentItem({ event关联: { ...selectedItem.event关联!, unlockMap: e.target.value } })} className="input-field w-full mt-1" placeholder="地图ID" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>剧情条件</label>
                          <input type="text" value={selectedItem.event关联.storyCondition || ''} onChange={(e) => updateCurrentItem({ event关联: { ...selectedItem.event关联!, storyCondition: e.target.value } })} className="input-field w-full mt-1" placeholder="剧情条件描述" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ECONOMY TAB */}
                {activeTab === 'economy' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>经济与掉落</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>售价</label>
                          <input type="number" value={selectedItem.economy?.price || 0} onChange={(e) => updateCurrentItem({ economy: { ...selectedItem.economy!, price: Number(e.target.value) } })} className="input-field w-full mt-1" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>收购价</label>
                          <input type="number" value={selectedItem.economy?.sellPrice || 0} onChange={(e) => updateCurrentItem({ economy: { ...selectedItem.economy!, sellPrice: Number(e.target.value) } })} className="input-field w-full mt-1" />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>稀有度</label>
                          <select value={selectedItem.economy?.rarity || 1} onChange={(e) => updateCurrentItem({ economy: { ...selectedItem.economy!, rarity: Number(e.target.value) as any } })} className="input-field w-full mt-1">
                            {rarityOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={selectedItem.economy?.shopAvailable ?? true} onChange={(e) => updateCurrentItem({ economy: { ...selectedItem.economy!, shopAvailable: e.target.checked } })} />
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>商店可售</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                <button onClick={() => {
                  if (selectedItemId) {
                    deleteItem(selectedItemId);
                    setSelectedItemId(items[0]?.id || null);
                  }
                }} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs" style={{ background: 'var(--color-danger)', color: 'white' }}>
                  <Trash2 size={12} /> 删除道具
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="text-center">
                <FlaskRound size={48} className="mx-auto mb-4 opacity-30" />
                <div className="text-lg mb-2">选择或创建道具</div>
                <button onClick={() => createNewItem('recovery')} className="flex items-center gap-2 px-4 py-2 rounded" style={{ background: 'var(--color-accent)', color: 'white' }}>
                  <Plus size={16} /> 创建新道具
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview & Validation */}
        <div className="w-72 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>道具预览 & 校验</h3>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {selectedItem ? (
              <>
                <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>道具卡预览</h4>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)', borderLeft: `3px solid ${rarityOptions.find(r => r.value === selectedItem.economy?.rarity)?.color || 'var(--color-accent)'}` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded flex items-center justify-center" style={{ background: (rarityOptions.find(r => r.value === selectedItem.economy?.rarity)?.color || 'var(--color-accent)') + '20' }}>
                        <FlaskRound size={24} style={{ color: rarityOptions.find(r => r.value === selectedItem.economy?.rarity)?.color || 'var(--color-accent)' }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedItem.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {itemCategoryConfig.find(c => c.id === selectedItem.itemCategory)?.label} · {itemTypes[selectedItem.itemCategory]?.find(t => t.id === selectedItem.itemType)?.label || selectedItem.itemType}
                        </div>
                      </div>
                    </div>
                    {selectedItem.description && <div className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{selectedItem.description}</div>}
                  </div>
                </div>

                <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>使用规则</h4>
                  <div className="space-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <div className="flex justify-between"><span>使用场景</span><span>{selectedItem.useRule.scenario === 'battle' ? '战斗内' : selectedItem.useRule.scenario === 'menu' ? '菜单内' : selectedItem.useRule.scenario === 'anytime' ? '任意' : '不可直接使用'}</span></div>
                    <div className="flex justify-between"><span>目标</span><span>{selectedItem.useRule.targetType === 'self' ? '自身' : selectedItem.useRule.targetType === 'ally' ? '友军' : selectedItem.useRule.targetType === 'enemy' ? '敌人' : '全体'}</span></div>
                    <div className="flex justify-between"><span>每战次数</span><span>{selectedItem.useRule.usesPerBattle || 99}</span></div>
                    <div className="flex justify-between"><span>消耗性</span><span style={{ color: selectedItem.useRule.consumable ? 'var(--color-success)' : 'var(--color-warning)' }}>{selectedItem.useRule.consumable ? '是' : '否'}</span></div>
                  </div>
                </div>

                <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>效果摘要</h4>
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {(selectedItem.effects || []).length > 0 ? selectedItem.effects!.map(e => {
                      const typeLabels: Record<string, string> = { 'heal-hp': '恢复HP', 'heal-mp': '恢复MP', 'add-status': '增加状态', 'remove-status': '移除状态', 'add-resource': '增加资源', 'temp-buff': '临时Buff', 'trigger-event': '触发事件' };
                      return `${typeLabels[e.effectType] || e.effectType}: ${typeof e.value === 'number' ? e.value : 0}`;
                    }).join(', ') : '无效果'}
                  </div>
                </div>

                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>风险提示</h4>
                  <div className="space-y-2">
                    {itemRisks.length > 0 ? itemRisks.map((risk, i) => (
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
                <div className="text-center text-xs">选择道具查看预览</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
