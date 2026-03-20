import React, { useState } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import { useUIStore } from '../../../stores/uiStore';
import type { EnemyGroup, Enemy, EncounterType, WaveConfig, BattleEvent, VictoryCondition, DefeatCondition, GroupMember, WaveTriggerType, EventTriggerType, EventScopeType } from '../../../types';
import { Trash2, Plus, ChevronDown, ChevronRight, GripVertical, User, AlertTriangle, Shield, Zap, Crown, BookOpen, Play, Save, Settings, Info } from 'lucide-react';

const encounterTypeLabels: Record<EncounterType, string> = {
  normal: '普通遭遇',
  elite: '精英战',
  boss: 'Boss战',
  tutorial: '教学战',
  test: '测试遭遇',
};

const encounterTypeIcons: Record<EncounterType, React.ReactNode> = {
  normal: <User size={14} />,
  elite: <Shield size={14} />,
  boss: <Crown size={14} />,
  tutorial: <BookOpen size={14} />,
  test: <Settings size={14} />,
};

export const EnemyGroupEditor: React.FC = () => {
  const { project, addEnemyGroup, updateEnemyGroup, deleteEnemyGroup } = useProjectStore();
  const { setDebugEnemyGroupId, activeEntityId, activeEditor } = useEditorStore();
  const { setDrawerTab } = useUIStore();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<EncounterType>>(new Set(['normal', 'elite', 'boss']));
  const [activeTab, setActiveTab] = useState<'basic' | 'placement' | 'waves' | 'events' | 'conditions' | 'battletest'>('basic');

  // Sync with store's activeEntityId when editor becomes active
  React.useEffect(() => {
    if (activeEditor === 'enemies' && activeEntityId) {
      const exists = project.enemyGroups.some(g => g.id === activeEntityId);
      if (exists) {
        setSelectedGroupId(activeEntityId);
      } else if (project.enemyGroups.length > 0) {
        setSelectedGroupId(project.enemyGroups[0].id);
      }
    }
  }, [activeEditor, activeEntityId, project.enemyGroups]);

  const selectedGroup = project.enemyGroups.find(g => g.id === selectedGroupId);

  // Get enemies for selection
  const availableEnemies = project.enemies;

  const handleCreateGroup = (type: EncounterType) => {
    const id = `encounter_${Date.now()}`;
    const newGroup: EnemyGroup = {
      id,
      name: `新${encounterTypeLabels[type]}`,
      encounterType: type,
      description: '',
      recommendedLevel: 1,
      dangerLevel: 1,
      members: [],
      waves: [],
      reinforcements: [],
      events: [],
      victoryConditions: [{ id: `vc_${Date.now()}`, type: 'defeatAll', description: '击败所有敌人', params: {}, isWin: true }],
      defeatConditions: [{ id: `dc_${Date.now()}`, type: 'allyDeath', description: '任意队友死亡' }],
    };
    addEnemyGroup(newGroup);
    setSelectedGroupId(id);
  };

  const handleDeleteGroup = (id: string) => {
    if (confirm('确定要删除这个遭遇吗？')) {
      deleteEnemyGroup(id);
      if (selectedGroupId === id) {
        setSelectedGroupId(project.enemyGroups.length > 0 ? project.enemyGroups[0].id : null);
      }
    }
  };

  const updateGroup = (updates: Partial<EnemyGroup>) => {
    if (selectedGroupId) {
      updateEnemyGroup(selectedGroupId, updates);
    }
  };

  const addMember = () => {
    if (!selectedGroup || availableEnemies.length === 0) return;
    const newMember: GroupMember = {
      enemyId: availableEnemies[0].id,
      x: 3,
      y: 2,
      isBoss: false,
    };
    updateGroup({ members: [...selectedGroup.members, newMember] });
  };

  const removeMember = (index: number) => {
    if (!selectedGroup) return;
    const newMembers = [...selectedGroup.members];
    newMembers.splice(index, 1);
    updateGroup({ members: newMembers });
  };

  const updateMember = (index: number, updates: Partial<GroupMember>) => {
    if (!selectedGroup) return;
    const newMembers = [...selectedGroup.members];
    newMembers[index] = { ...newMembers[index], ...updates };
    updateGroup({ members: newMembers });
  };

  const addWave = () => {
    if (!selectedGroup) return;
    const newWave: WaveConfig = {
      waveNumber: selectedGroup.waves.length + 1,
      spawns: [],
      triggerCondition: '',
      description: '',
    };
    updateGroup({ waves: [...selectedGroup.waves, newWave] });
  };

  const addEvent = () => {
    if (!selectedGroup) return;
    const newEvent: BattleEvent = {
      id: `event_${Date.now()}`,
      name: '新事件',
      type: 'dialogue',
      triggerCondition: '',
      span: 'turn',
      content: {},
      enabled: true,
    };
    updateGroup({ events: [...selectedGroup.events, newEvent] });
  };

  const removeEvent = (index: number) => {
    if (!selectedGroup) return;
    const newEvents = [...selectedGroup.events];
    newEvents.splice(index, 1);
    updateGroup({ events: newEvents });
  };

  const addVictoryCondition = () => {
    if (!selectedGroup) return;
    const newCondition: VictoryCondition = {
      id: `vc_${Date.now()}`,
      type: 'defeatAll',
      description: '',
      params: {},
      isWin: true,
    };
    updateGroup({ victoryConditions: [...selectedGroup.victoryConditions, newCondition] });
  };

  const removeVictoryCondition = (index: number) => {
    if (!selectedGroup) return;
    const newConditions = [...selectedGroup.victoryConditions];
    newConditions.splice(index, 1);
    updateGroup({ victoryConditions: newConditions });
  };

  const addDefeatCondition = () => {
    if (!selectedGroup) return;
    const newCondition: DefeatCondition = {
      id: `dc_${Date.now()}`,
      type: 'allyDeath',
      description: '',
    };
    updateGroup({ defeatConditions: [...selectedGroup.defeatConditions, newCondition] });
  };

  const removeDefeatCondition = (index: number) => {
    if (!selectedGroup) return;
    const newConditions = [...selectedGroup.defeatConditions];
    newConditions.splice(index, 1);
    updateGroup({ defeatConditions: newConditions });
  };

  const openDebugLog = () => {
    if (selectedGroupId) {
      setDebugEnemyGroupId(selectedGroupId);
      setDrawerTab('enemygroup-log');
    }
  };

  // Group enemies by encounter type for sidebar
  const groupedEncounters = {
    normal: project.enemyGroups.filter(g => g.encounterType === 'normal'),
    elite: project.enemyGroups.filter(g => g.encounterType === 'elite'),
    boss: project.enemyGroups.filter(g => g.encounterType === 'boss'),
    tutorial: project.enemyGroups.filter(g => g.encounterType === 'tutorial'),
    test: project.enemyGroups.filter(g => g.encounterType === 'test'),
  };

  return (
    <div className="h-full flex">
      {/* Left Sidebar: Encounter List */}
      <div className="w-56 border-r flex flex-col" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
        <div className="p-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>敌群/遭遇</span>
          <div className="relative group">
            <button className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]" title="新建遭遇">
              <Plus size={14} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
            <div className="absolute right-0 top-full mt-1 py-1 rounded shadow-lg z-10 min-w-[120px] hidden group-hover:block" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
              {(Object.keys(encounterTypeLabels) as EncounterType[]).map(type => (
                <button
                  key={type}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-bg-tertiary)]"
                  style={{ color: 'var(--color-text-primary)' }}
                  onClick={() => handleCreateGroup(type)}
                >
                  {encounterTypeIcons[type]}
                  <span>{encounterTypeLabels[type]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {(Object.keys(encounterTypeLabels) as EncounterType[]).map(type => {
            const encounters = groupedEncounters[type];
            const isExpanded = expandedCategories.has(type);
            return (
              <div key={type}>
                <button
                  className="w-full flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-tertiary)' }}
                  onClick={() => {
                    const newSet = new Set(expandedCategories);
                    if (isExpanded) newSet.delete(type);
                    else newSet.add(type);
                    setExpandedCategories(newSet);
                  }}
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {encounterTypeIcons[type]}
                  <span>{encounterTypeLabels[type]}</span>
                  <span className="ml-auto text-[10px]">{encounters.length}</span>
                </button>
                {isExpanded && (
                  <div className="ml-3 mt-1 space-y-1">
                    {encounters.length > 0 ? encounters.map(g => (
                      <button
                        key={g.id}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left ${
                          selectedGroupId === g.id ? '' : ''
                        }`}
                        style={{ 
                          background: selectedGroupId === g.id ? 'var(--color-accent)' : 'transparent',
                          color: selectedGroupId === g.id ? 'white' : 'var(--color-text-primary)',
                        }}
                        onClick={() => setSelectedGroupId(g.id)}
                      >
                        <span className="truncate flex-1">{g.name}</span>
                        <span className="text-[10px] opacity-70">👥{g.members?.length || 0}</span>
                      </button>
                    )) : (
                      <div className="px-2 py-1 text-xs italic" style={{ color: 'var(--color-text-disabled)' }}>无</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedGroup ? (
          <>
            {/* Tab Bar */}
            <div 
              className="h-10 flex items-center gap-1 px-2 border-b shrink-0"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
            >
              {([
                { id: 'basic', label: '基础信息', icon: <Settings size={12} /> },
                { id: 'placement', label: '敌人摆放', icon: <User size={12} /> },
                { id: 'waves', label: '波次与增援', icon: <Zap size={12} /> },
                { id: 'events', label: '战斗事件', icon: <AlertTriangle size={12} /> },
                { id: 'conditions', label: '胜负条件', icon: <Shield size={12} /> },
                { id: 'battletest', label: 'Battle Test', icon: <Play size={12} /> },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs"
                  style={{ 
                    background: activeTab === tab.id ? 'var(--color-accent)' : 'transparent',
                    color: activeTab === tab.id ? 'white' : 'var(--color-text-secondary)',
                  }}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1">
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onClick={openDebugLog}
                  title="打开敌群调试日志"
                >
                  <AlertTriangle size={12} />
                  <span>调试</span>
                </button>
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/10"
                  onClick={() => handleDeleteGroup(selectedGroup.id)}
                  title="删除遭遇"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>遭遇ID</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 rounded text-sm"
                        style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                        value={selectedGroup.id}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>遭遇类型</label>
                      <select
                        className="w-full px-2 py-1.5 rounded text-sm"
                        style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                        value={selectedGroup.encounterType}
                        onChange={(e) => updateGroup({ encounterType: e.target.value as EncounterType })}
                      >
                        {(Object.keys(encounterTypeLabels) as EncounterType[]).map(type => (
                          <option key={type} value={type}>{encounterTypeLabels[type]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>遭遇名称</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 rounded text-sm"
                      style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                      value={selectedGroup.name}
                      onChange={(e) => updateGroup({ name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>描述</label>
                    <textarea
                      className="w-full px-2 py-1.5 rounded text-sm resize-none"
                      rows={3}
                      style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                      value={selectedGroup.description || ''}
                      onChange={(e) => updateGroup({ description: e.target.value })}
                      placeholder="描述这个遭遇的背景故事..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>推荐等级</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1.5 rounded text-sm"
                        style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                        value={selectedGroup.recommendedLevel || 1}
                        onChange={(e) => updateGroup({ recommendedLevel: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>危险度</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1.5 rounded text-sm"
                        style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                        value={selectedGroup.dangerLevel || 1}
                        onChange={(e) => updateGroup({ dangerLevel: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>背景图</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 rounded text-sm"
                      style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                      value={selectedGroup.background || ''}
                      onChange={(e) => updateGroup({ background: e.target.value })}
                      placeholder="background/battleforest.png"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>地面纹理</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 rounded text-sm"
                      style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                      value={selectedGroup.groundTexture || ''}
                      onChange={(e) => updateGroup({ groundTexture: e.target.value })}
                      placeholder="ground/grass.png"
                    />
                  </div>
                </div>
              )}

              {/* Enemy Placement Tab */}
              {activeTab === 'placement' && (
                <div className="space-y-4">
                  {/* Enemy Count Limit & Wave/Event Links */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      敌人摆放{' '}
                      <span className="text-xs" style={{ color: selectedGroup.members?.length || 0 >= 12 ? '#f59e0b' : 'var(--color-text-secondary)' }}>
                        （当前 {selectedGroup.members?.length || 0}/12）
                      </span>
                      {(selectedGroup.members?.length || 0) >= 12 && (
                        <span className="ml-2 text-xs" style={{ color: '#f59e0b' }}>已达到上限</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Wave/Event Link Hints */}
                      {(selectedGroup.waves?.length || 0) > 0 && (
                        <button
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                          onClick={() => setActiveTab('waves')}
                          title="跳转到波次配置"
                        >
                          <Zap size={10} />
                          <span>{selectedGroup.waves.length} 波次</span>
                        </button>
                      )}
                      {(selectedGroup.events?.length || 0) > 0 && (
                        <button
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                          onClick={() => setActiveTab('events')}
                          title="跳转到战斗事件"
                        >
                          <AlertTriangle size={10} />
                          <span>{selectedGroup.events.length} 事件</span>
                        </button>
                      )}
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                        style={{ background: 'var(--color-accent)', color: 'white' }}
                        onClick={addMember}
                        disabled={(selectedGroup.members?.length || 0) >= 12}
                      >
                        <Plus size={12} />
                        <span>添加敌人</span>
                      </button>
                    </div>
                  </div>

                  {(!selectedGroup.members || selectedGroup.members.length === 0) ? (
                    <div className="p-8 text-center rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-disabled)' }}>
                      点击「添加敌人」开始配置阵容
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroup.members.map((member, index) => {
                        const enemy = project.enemies.find(e => e.id === member.enemyId);
                        const isMidSpawn = member.midBattleSpawn;
                        return (
                          <div
                            key={index}
                            className={`flex items-center gap-2 p-2 rounded transition-all ${isMidSpawn ? 'border-l-4' : ''}`}
                            style={{
                              background: isMidSpawn ? 'rgba(245, 158, 11, 0.1)' : 'var(--color-bg-tertiary)',
                              borderColor: isMidSpawn ? '#f59e0b' : 'var(--color-border)',
                              border: '1px solid',
                              cursor: 'grab',
                            }}
                          >
                            <GripVertical size={14} style={{ color: 'var(--color-text-disabled)', cursor: 'grab' }} />
                            <select
                              className="px-2 py-1 rounded text-sm flex-1"
                              style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                              value={member.enemyId}
                              onChange={(e) => updateMember(index, { enemyId: e.target.value })}
                            >
                              {availableEnemies.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              className="w-16 px-2 py-1 rounded text-sm text-center"
                              style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                              value={member.x}
                              onChange={(e) => updateMember(index, { x: parseInt(e.target.value) || 0 })}
                              placeholder="X"
                              min={0}
                              max={2}
                            />
                            <span style={{ color: 'var(--color-text-secondary)' }}>,</span>
                            <input
                              type="number"
                              className="w-16 px-2 py-1 rounded text-sm text-center"
                              style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                              value={member.y}
                              onChange={(e) => updateMember(index, { y: parseInt(e.target.value) || 0 })}
                              placeholder="Y"
                              min={0}
                              max={3}
                            />
                            <label className="flex items-center gap-1 text-xs" style={{ color: member.isBoss ? '#ef4444' : 'var(--color-text-secondary)' }}>
                              <input
                                type="checkbox"
                                checked={member.isBoss}
                                onChange={(e) => updateMember(index, { isBoss: e.target.checked })}
                              />
                              <span>{member.isBoss ? 'Boss' : ''}</span>
                            </label>
                            <label className={`flex items-center gap-1 text-xs ${isMidSpawn ? 'font-medium' : ''}`} style={{ color: isMidSpawn ? '#f59e0b' : 'var(--color-text-secondary)' }}>
                              <input
                                type="checkbox"
                                checked={member.midBattleSpawn || false}
                                onChange={(e) => updateMember(index, { midBattleSpawn: e.target.checked })}
                              />
                              <span>{isMidSpawn ? '半途出现' : ''}</span>
                            </label>
                            <button
                              className="p-1 rounded hover:bg-red-500/20"
                              onClick={() => removeMember(index)}
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Formation Preview */}
                  <div className="mt-4">
                    <div className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>阵容预览（3列 x 4行，前2排为前排）</div>
                    <div className="grid grid-cols-3 gap-1 w-40 h-52 p-2 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                      {Array.from({ length: 12 }).map((_, i) => {
                        const x = i % 3;
                        const y = Math.floor(i / 3);
                        const member = selectedGroup.members?.find(m => m.x === x && m.y === y);
                        const isFrontRow = y < 2;
                        return (
                          <div
                            key={i}
                            className="rounded flex items-center justify-center text-[10px] relative"
                            style={{
                              background: member
                                ? member.midBattleSpawn
                                  ? 'rgba(245, 158, 11, 0.3)'
                                  : member.isBoss
                                    ? '#ef4444'
                                    : 'var(--color-accent)'
                                : 'var(--color-bg-primary)',
                              border: member ? '2px solid' : '1px solid',
                              borderColor: member
                                ? member.isBoss
                                  ? '#dc2626'
                                  : member.midBattleSpawn
                                    ? '#f59e0b'
                                    : '#2563eb'
                                : 'var(--color-border)',
                              color: member ? 'white' : 'var(--color-text-disabled)',
                              opacity: member ? 1 : 0.5,
                            }}
                            title={member ? `${project.enemies.find(e => e.id === member.enemyId)?.name || ''}${member.isBoss ? ' (Boss)' : ''}${member.midBattleSpawn ? ' (半途出现)' : ''}` : `空位 (${x}, ${y})`}
                          >
                            {member ? (
                              <span className="truncate px-1">{project.enemies.find(e => e.id === member.enemyId)?.name.slice(0, 3) || ''}</span>
                            ) : (
                              <span className="text-[8px]">{x},{y}</span>
                            )}
                            {isFrontRow && !member && (
                              <span className="absolute -top-1 -right-1 text-[8px] px-0.5 rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-disabled)' }}>前</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Formation Summary */}
                  <div className="mt-4 p-3 rounded" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>阵位摘要</div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedGroup.members?.filter(m => (m.y || 0) < 2).length || 0}</div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>前排</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedGroup.members?.filter(m => (m.y || 0) >= 2).length || 0}</div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>后排</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{12 - (selectedGroup.members?.length || 0)}</div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>空位</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium" style={{ color: selectedGroup.members?.some(m => m.isBoss) ? '#ef4444' : 'var(--color-text-primary)' }}>{selectedGroup.members?.filter(m => m.isBoss).length || 0}</div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>Boss</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Waves Tab */}
              {activeTab === 'waves' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>波次与增援</div>
                    <button
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                      style={{ background: 'var(--color-accent)', color: 'white' }}
                      onClick={addWave}
                    >
                      <Plus size={12} />
                      <span>添加波次</span>
                    </button>
                  </div>

                  {(!selectedGroup.waves || selectedGroup.waves.length === 0) ? (
                    <div className="p-8 text-center rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-disabled)' }}>
                      点击「添加波次」配置增援
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedGroup.waves.map((wave, waveIndex) => {
                        const triggerType = wave.triggerConfig?.type || 'turnEnd';
                        return (
                          <div key={waveIndex} className="p-3 rounded" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium px-2 py-0.5 rounded" style={{ background: 'var(--color-accent)', color: 'white' }}>波次 {wave.waveNumber}</span>
                              <input
                                type="text"
                                className="flex-1 px-2 py-1 rounded text-xs"
                                style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                value={wave.description || ''}
                                onChange={(e) => {
                                  const newWaves = [...selectedGroup.waves];
                                  newWaves[waveIndex] = { ...wave, description: e.target.value };
                                  updateGroup({ waves: newWaves });
                                }}
                                placeholder="波次描述..."
                              />
                            </div>

                            {/* Structured Trigger Configuration */}
                            <div className="mb-3 p-2 rounded" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>触发条件</div>
                              <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>类型</label>
                                  <select
                                    className="w-full px-2 py-1 rounded text-xs"
                                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                    value={triggerType}
                                    onChange={(e) => {
                                      const newWaves = [...selectedGroup.waves];
                                      newWaves[waveIndex] = {
                                        ...wave,
                                        triggerConfig: {
                                          type: e.target.value as WaveTriggerType,
                                          targetId: wave.triggerConfig?.targetId,
                                          threshold: wave.triggerConfig?.threshold,
                                          value: wave.triggerConfig?.value,
                                        }
                                      };
                                      updateGroup({ waves: newWaves });
                                    }}
                                  >
                                    <option value="turnEnd">回合结束时</option>
                                    <option value="turn">指定回合</option>
                                    <option value="enemyHp">敌人血量</option>
                                    <option value="actorHp">角色血量</option>
                                    <option value="switch">开关</option>
                                    <option value="custom">自定义</option>
                                  </select>
                                </div>

                                {(triggerType === 'turn' || triggerType === 'turnEnd') && (
                                  <div>
                                    <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>回合数</label>
                                    <input
                                      type="number"
                                      className="w-full px-2 py-1 rounded text-xs"
                                      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                      value={wave.triggerConfig?.value || 1}
                                      onChange={(e) => {
                                        const newWaves = [...selectedGroup.waves];
                                        newWaves[waveIndex] = {
                                          ...wave,
                                          triggerConfig: {
                                            ...wave.triggerConfig,
                                            type: triggerType,
                                            value: parseInt(e.target.value) || 1,
                                          }
                                        };
                                        updateGroup({ waves: newWaves });
                                      }}
                                      min={1}
                                    />
                                  </div>
                                )}

                                {(triggerType === 'enemyHp' || triggerType === 'actorHp') && (
                                  <>
                                    <div>
                                      <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>目标</label>
                                      <select
                                        className="w-full px-2 py-1 rounded text-xs"
                                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                        value={wave.triggerConfig?.targetId || ''}
                                        onChange={(e) => {
                                          const newWaves = [...selectedGroup.waves];
                                          newWaves[waveIndex] = {
                                            ...wave,
                                            triggerConfig: {
                                              ...wave.triggerConfig,
                                              type: triggerType,
                                              targetId: e.target.value,
                                            }
                                          };
                                          updateGroup({ waves: newWaves });
                                        }}
                                      >
                                        <option value="">任意</option>
                                        {triggerType === 'enemyHp' && selectedGroup.members?.map((m, i) => {
                                          const enemy = project.enemies.find(e => e.id === m.enemyId);
                                          return <option key={i} value={m.enemyId}>{enemy?.name || m.enemyId}</option>;
                                        })}
                                        {triggerType === 'actorHp' && project.characters.map(c => (
                                          <option key={c.id} value={c.id}>{c.identity.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>血量%</label>
                                      <input
                                        type="number"
                                        className="w-full px-2 py-1 rounded text-xs"
                                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                        value={wave.triggerConfig?.threshold || 50}
                                        onChange={(e) => {
                                          const newWaves = [...selectedGroup.waves];
                                          newWaves[waveIndex] = {
                                            ...wave,
                                            triggerConfig: {
                                              ...wave.triggerConfig,
                                              type: triggerType,
                                              threshold: parseInt(e.target.value) || 50,
                                            }
                                          };
                                          updateGroup({ waves: newWaves });
                                        }}
                                        min={0}
                                        max={100}
                                      />
                                    </div>
                                  </>
                                )}

                                {triggerType === 'switch' && (
                                  <div>
                                    <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>开关值</label>
                                    <input
                                      type="number"
                                      className="w-full px-2 py-1 rounded text-xs"
                                      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                      value={wave.triggerConfig?.value || 0}
                                      onChange={(e) => {
                                        const newWaves = [...selectedGroup.waves];
                                        newWaves[waveIndex] = {
                                          ...wave,
                                          triggerConfig: {
                                            ...wave.triggerConfig,
                                            type: triggerType,
                                            value: parseInt(e.target.value) || 0,
                                          }
                                        };
                                        updateGroup({ waves: newWaves });
                                      }}
                                    />
                                  </div>
                                )}

                                {triggerType === 'custom' && (
                                  <div className="col-span-2">
                                    <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>自定义条件</label>
                                    <input
                                      type="text"
                                      className="w-full px-2 py-1 rounded text-xs"
                                      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                      value={wave.triggerConfig?.customCondition || ''}
                                      onChange={(e) => {
                                        const newWaves = [...selectedGroup.waves];
                                        newWaves[waveIndex] = {
                                          ...wave,
                                          triggerConfig: {
                                            ...wave.triggerConfig,
                                            type: triggerType,
                                            customCondition: e.target.value,
                                          }
                                        };
                                        updateGroup({ waves: newWaves });
                                      }}
                                      placeholder="e.g., turn >= 3 && enemy.0.hp < 50"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Legacy condition field (for reference) */}
                              <div className="mt-2">
                                <input
                                  type="text"
                                  className="w-full px-2 py-1 rounded text-[10px]"
                                  style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-disabled)' }}
                                  value={wave.triggerCondition || ''}
                                  readOnly
                                  placeholder="自动生成的条件表达式..."
                                />
                              </div>
                            </div>

                            <div className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>增援敌人 ({wave.spawns?.length || 0})</div>
                            {wave.spawns?.map((spawn, spawnIndex) => {
                              const enemy = project.enemies.find(e => e.id === spawn.enemyId);
                              return (
                                <div key={spawnIndex} className="flex items-center gap-2 mb-1">
                                  <select
                                    className="flex-1 px-2 py-1 rounded text-xs"
                                    style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                    value={spawn.enemyId}
                                    onChange={(e) => {
                                      const newWaves = [...selectedGroup.waves];
                                      newWaves[waveIndex].spawns[spawnIndex] = { ...spawn, enemyId: e.target.value };
                                      updateGroup({ waves: newWaves });
                                    }}
                                  >
                                    {availableEnemies.map(e => (
                                      <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    className="w-12 px-1 py-1 rounded text-xs"
                                    style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                    value={spawn.x}
                                    onChange={(e) => {
                                      const newWaves = [...selectedGroup.waves];
                                      newWaves[waveIndex].spawns[spawnIndex] = { ...spawn, x: parseInt(e.target.value) || 0 };
                                      updateGroup({ waves: newWaves });
                                    }}
                                    placeholder="X"
                                  />
                                  <input
                                    type="number"
                                    className="w-12 px-1 py-1 rounded text-xs"
                                    style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                    value={spawn.y}
                                    onChange={(e) => {
                                      const newWaves = [...selectedGroup.waves];
                                      newWaves[waveIndex].spawns[spawnIndex] = { ...spawn, y: parseInt(e.target.value) || 0 };
                                      updateGroup({ waves: newWaves });
                                    }}
                                    placeholder="Y"
                                  />
                                  <button
                                    className="p-1 rounded hover:bg-red-500/20"
                                    onClick={() => {
                                      const newWaves = [...selectedGroup.waves];
                                      newWaves[waveIndex].spawns.splice(spawnIndex, 1);
                                      updateGroup({ waves: newWaves });
                                    }}
                                  >
                                    <Trash2 size={12} className="text-red-400" />
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs mt-1"
                              style={{ color: 'var(--color-accent)' }}
                              onClick={() => {
                                const newWaves = [...selectedGroup.waves];
                                newWaves[waveIndex].spawns.push({ enemyId: availableEnemies[0]?.id || '', x: 0, y: 0, isBoss: false });
                                updateGroup({ waves: newWaves });
                              }}
                            >
                              <Plus size={10} />
                              <span>添加增援</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Battle Events Tab */}
              {activeTab === 'events' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>战斗事件</div>
                    <button
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                      style={{ background: 'var(--color-accent)', color: 'white' }}
                      onClick={addEvent}
                    >
                      <Plus size={12} />
                      <span>添加事件</span>
                    </button>
                  </div>

                  {(!selectedGroup.events || selectedGroup.events.length === 0) ? (
                    <div className="p-8 text-center rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-disabled)' }}>
                      点击「添加事件」配置战斗事件
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedGroup.events.map((event, eventIndex) => {
                        const eventTriggerType = event.triggerConfig?.type || 'turnEnd';
                        const eventScope = event.scopeConfig?.scope || event.span || 'battle';
                        return (
                          <div key={eventIndex} className="p-3 rounded" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="text"
                                className="flex-1 px-2 py-1 rounded text-sm"
                                style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                value={event.name || ''}
                                onChange={(e) => {
                                  const newEvents = [...selectedGroup.events];
                                  newEvents[eventIndex] = { ...event, name: e.target.value };
                                  updateGroup({ events: newEvents });
                                }}
                                placeholder="事件名称"
                              />
                              <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                <input
                                  type="checkbox"
                                  checked={event.enabled !== false}
                                  onChange={(e) => {
                                    const newEvents = [...selectedGroup.events];
                                    newEvents[eventIndex] = { ...event, enabled: e.target.checked };
                                    updateGroup({ events: newEvents });
                                  }}
                                />
                                <span>启用</span>
                              </label>
                              <button
                                className="p-1 rounded hover:bg-red-500/20"
                                onClick={() => removeEvent(eventIndex)}
                              >
                                <Trash2 size={14} className="text-red-400" />
                              </button>
                            </div>

                            {/* Event Type */}
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>事件类型</label>
                                <select
                                  className="w-full px-2 py-1 rounded text-xs"
                                  style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                  value={event.type}
                                  onChange={(e) => {
                                    const newEvents = [...selectedGroup.events];
                                    newEvents[eventIndex] = { ...event, type: e.target.value as BattleEvent['type'] };
                                    updateGroup({ events: newEvents });
                                  }}
                                >
                                  <option value="dialogue">台词</option>
                                  <option value="cutscene">过场动画</option>
                                  <option value="environmental">环境变化</option>
                                  <option value="reinforce">增援</option>
                                  <option value="transform">变身</option>
                                  <option value="forceAction">强制行动</option>
                                  <option value="background">切换背景</option>
                                  <option value="phase">切换阶段</option>
                                  <option value="trigger">触发器</option>
                                  <option value="custom">自定义</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>作用范围</label>
                                <select
                                  className="w-full px-2 py-1 rounded text-xs"
                                  style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                  value={eventScope}
                                  onChange={(e) => {
                                    const newEvents = [...selectedGroup.events];
                                    newEvents[eventIndex] = {
                                      ...event,
                                      span: e.target.value as BattleEvent['span'],
                                      scopeConfig: {
                                        scope: e.target.value as EventScopeType,
                                        turnNumber: event.scopeConfig?.turnNumber,
                                        momentId: event.scopeConfig?.momentId,
                                      }
                                    };
                                    updateGroup({ events: newEvents });
                                  }}
                                >
                                  <option value="battle">全局 (Battle)</option>
                                  <option value="turn">回合 (Turn)</option>
                                  <option value="moment">瞬间 (Moment)</option>
                                </select>
                              </div>
                            </div>

                            {/* Trigger Configuration */}
                            {eventScope === 'turn' && (
                              <div className="mb-2">
                                <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>触发回合</label>
                                <input
                                  type="number"
                                  className="w-full px-2 py-1 rounded text-xs"
                                  style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                  value={event.scopeConfig?.turnNumber || 1}
                                  onChange={(e) => {
                                    const newEvents = [...selectedGroup.events];
                                    newEvents[eventIndex] = {
                                      ...event,
                                      scopeConfig: {
                                        ...event.scopeConfig,
                                        scope: 'turn',
                                        turnNumber: parseInt(e.target.value) || 1,
                                      }
                                    };
                                    updateGroup({ events: newEvents });
                                  }}
                                  min={1}
                                />
                              </div>
                            )}

                            <div className="p-2 rounded mb-2" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                              <div className="text-[10px] font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>触发条件</div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>类型</label>
                                  <select
                                    className="w-full px-2 py-1 rounded text-xs"
                                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                    value={eventTriggerType}
                                    onChange={(e) => {
                                      const newEvents = [...selectedGroup.events];
                                      newEvents[eventIndex] = {
                                        ...event,
                                        triggerConfig: {
                                          type: e.target.value as EventTriggerType,
                                          targetId: event.triggerConfig?.targetId,
                                          threshold: event.triggerConfig?.threshold,
                                          value: event.triggerConfig?.value,
                                        }
                                      };
                                      updateGroup({ events: newEvents });
                                    }}
                                  >
                                    <option value="turnEnd">回合结束时</option>
                                    <option value="turn">指定回合</option>
                                    <option value="enemyHp">敌人血量</option>
                                    <option value="actorHp">角色血量</option>
                                    <option value="onDeath">死亡时</option>
                                    <option value="onSpawn">出现时</option>
                                    <option value="switch">开关</option>
                                    <option value="custom">自定义</option>
                                  </select>
                                </div>

                                {(eventTriggerType === 'turn' || eventTriggerType === 'turnEnd') && (
                                  <div>
                                    <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>回合数</label>
                                    <input
                                      type="number"
                                      className="w-full px-2 py-1 rounded text-xs"
                                      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                      value={event.triggerConfig?.value || 1}
                                      onChange={(e) => {
                                        const newEvents = [...selectedGroup.events];
                                        newEvents[eventIndex] = {
                                          ...event,
                                          triggerConfig: {
                                            ...event.triggerConfig,
                                            type: eventTriggerType,
                                            value: parseInt(e.target.value) || 1,
                                          }
                                        };
                                        updateGroup({ events: newEvents });
                                      }}
                                      min={1}
                                    />
                                  </div>
                                )}

                                {(eventTriggerType === 'enemyHp' || eventTriggerType === 'actorHp') && (
                                  <>
                                    <div>
                                      <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>目标</label>
                                      <select
                                        className="w-full px-2 py-1 rounded text-xs"
                                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                        value={event.triggerConfig?.targetId || ''}
                                        onChange={(e) => {
                                          const newEvents = [...selectedGroup.events];
                                          newEvents[eventIndex] = {
                                            ...event,
                                            triggerConfig: {
                                              ...event.triggerConfig,
                                              type: eventTriggerType,
                                              targetId: e.target.value,
                                            }
                                          };
                                          updateGroup({ events: newEvents });
                                        }}
                                      >
                                        <option value="">任意</option>
                                        {eventTriggerType === 'enemyHp' && selectedGroup.members?.map((m, i) => {
                                          const enemy = project.enemies.find(e => e.id === m.enemyId);
                                          return <option key={i} value={m.enemyId}>{enemy?.name || m.enemyId}</option>;
                                        })}
                                        {eventTriggerType === 'actorHp' && project.characters.map(c => (
                                          <option key={c.id} value={c.id}>{c.identity.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>血量%</label>
                                      <input
                                        type="number"
                                        className="w-full px-2 py-1 rounded text-xs"
                                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                        value={event.triggerConfig?.threshold || 50}
                                        onChange={(e) => {
                                          const newEvents = [...selectedGroup.events];
                                          newEvents[eventIndex] = {
                                            ...event,
                                            triggerConfig: {
                                              ...event.triggerConfig,
                                              type: eventTriggerType,
                                              threshold: parseInt(e.target.value) || 50,
                                            }
                                          };
                                          updateGroup({ events: newEvents });
                                        }}
                                        min={0}
                                        max={100}
                                      />
                                    </div>
                                  </>
                                )}

                                {(eventTriggerType === 'onDeath' || eventTriggerType === 'onSpawn') && (
                                  <div>
                                    <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>目标</label>
                                    <select
                                      className="w-full px-2 py-1 rounded text-xs"
                                      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                      value={event.triggerConfig?.targetId || ''}
                                      onChange={(e) => {
                                        const newEvents = [...selectedGroup.events];
                                        newEvents[eventIndex] = {
                                          ...event,
                                          triggerConfig: {
                                            ...event.triggerConfig,
                                            type: eventTriggerType,
                                            targetId: e.target.value,
                                          }
                                        };
                                        updateGroup({ events: newEvents });
                                      }}
                                    >
                                      <option value="">任意</option>
                                      {eventTriggerType === 'onDeath' && selectedGroup.members?.map((m, i) => {
                                        const enemy = project.enemies.find(e => e.id === m.enemyId);
                                        return <option key={i} value={m.enemyId}>{enemy?.name || m.enemyId}</option>;
                                      })}
                                      {eventTriggerType === 'onSpawn' && project.characters.map(c => (
                                        <option key={c.id} value={c.id}>{c.identity.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {eventTriggerType === 'switch' && (
                                  <div>
                                    <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>开关值</label>
                                    <input
                                      type="number"
                                      className="w-full px-2 py-1 rounded text-xs"
                                      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                      value={event.triggerConfig?.value || 0}
                                      onChange={(e) => {
                                        const newEvents = [...selectedGroup.events];
                                        newEvents[eventIndex] = {
                                          ...event,
                                          triggerConfig: {
                                            ...event.triggerConfig,
                                            type: eventTriggerType,
                                            value: parseInt(e.target.value) || 0,
                                          }
                                        };
                                        updateGroup({ events: newEvents });
                                      }}
                                    />
                                  </div>
                                )}

                                {eventTriggerType === 'custom' && (
                                  <div className="col-span-2">
                                    <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>自定义条件</label>
                                    <input
                                      type="text"
                                      className="w-full px-2 py-1 rounded text-xs"
                                      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                      value={event.triggerConfig?.customCondition || ''}
                                      onChange={(e) => {
                                        const newEvents = [...selectedGroup.events];
                                        newEvents[eventIndex] = {
                                          ...event,
                                          triggerConfig: {
                                            ...event.triggerConfig,
                                            type: eventTriggerType,
                                            customCondition: e.target.value,
                                          }
                                        };
                                        updateGroup({ events: newEvents });
                                      }}
                                      placeholder="e.g., turn >= 5 && enemy.boss.hp < 30"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <textarea
                              className="w-full px-2 py-1 rounded text-xs resize-none"
                              rows={2}
                              style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                              value={JSON.stringify(event.content || {}, null, 2)}
                              onChange={(e) => {
                                try {
                                  const newEvents = [...selectedGroup.events];
                                  newEvents[eventIndex] = { ...event, content: JSON.parse(e.target.value) };
                                  updateGroup({ events: newEvents });
                                } catch {}
                              }}
                              placeholder="事件内容 (JSON)"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Victory/Defeat Conditions Tab */}
              {activeTab === 'conditions' && (
                <div className="space-y-6">
                  {/* Victory Conditions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>胜利条件</div>
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                        style={{ background: 'var(--color-accent)', color: 'white' }}
                        onClick={addVictoryCondition}
                      >
                        <Plus size={12} />
                        <span>添加胜利条件</span>
                      </button>
                    </div>
                    <div className="space-y-2">
                      {/* 说明: 遭遇战可覆盖项目规则的默认胜负条件 */}
                      <div className="flex items-center gap-2 p-2 rounded text-xs" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}>
                        <Info size={12} />
                        <span>此为遭遇战局部规则。留空则继承项目规则默认值。</span>
                      </div>
                      {selectedGroup.victoryConditions?.map((condition, index) => (
                        <div key={condition.id} className="flex items-center gap-2 p-2 rounded" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--color-accent)', color: 'white' }}>自定义</span>
                          <select
                            className="px-2 py-1 rounded text-sm flex-1"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={condition.type}
                            onChange={(e) => {
                              const newConditions = [...selectedGroup.victoryConditions];
                              newConditions[index] = { ...condition, type: e.target.value as VictoryCondition['type'] };
                              updateGroup({ victoryConditions: newConditions });
                            }}
                          >
                            <option value="defeatAll">击败所有敌人</option>
                            <option value="defeatBoss">击杀首领</option>
                            <option value="surviveTurns">存活N回合</option>
                            <option value="escort">护送目标</option>
                            <option value="protect">保护目标</option>
                            <option value="custom">自定义</option>
                          </select>
                          {condition.type === 'surviveTurns' && (
                            <input
                              type="number"
                              className="w-16 px-2 py-1 rounded text-sm"
                              style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                              value={condition.value || 0}
                              onChange={(e) => {
                                const newConditions = [...selectedGroup.victoryConditions];
                                newConditions[index] = { ...condition, value: parseInt(e.target.value) };
                                updateGroup({ victoryConditions: newConditions });
                              }}
                              placeholder="回合数"
                            />
                          )}
                          <input
                            type="text"
                            className="flex-1 px-2 py-1 rounded text-sm"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={condition.description || ''}
                            onChange={(e) => {
                              const newConditions = [...selectedGroup.victoryConditions];
                              newConditions[index] = { ...condition, description: e.target.value };
                              updateGroup({ victoryConditions: newConditions });
                            }}
                            placeholder="描述"
                          />
                          <button
                            className="p-1 rounded hover:bg-red-500/20"
                            onClick={() => removeVictoryCondition(index)}
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Defeat Conditions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>失败条件</div>
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                        style={{ background: 'var(--color-accent)', color: 'white' }}
                        onClick={addDefeatCondition}
                      >
                        <Plus size={12} />
                        <span>添加失败条件</span>
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedGroup.defeatConditions?.map((condition, index) => (
                        <div key={condition.id} className="flex items-center gap-2 p-2 rounded" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                          <select
                            className="px-2 py-1 rounded text-sm flex-1"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={condition.type}
                            onChange={(e) => {
                              const newConditions = [...selectedGroup.defeatConditions];
                              newConditions[index] = { ...condition, type: e.target.value as DefeatCondition['type'] };
                              updateGroup({ defeatConditions: newConditions });
                            }}
                          >
                            <option value="allyDeath">队友死亡</option>
                            <option value="bossDeath">首领死亡</option>
                            <option value="turnExceed">回合超过</option>
                            <option value="custom">自定义</option>
                          </select>
                          {condition.type === 'turnExceed' && (
                            <input
                              type="number"
                              className="w-16 px-2 py-1 rounded text-sm"
                              style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                              value={condition.value || 0}
                              onChange={(e) => {
                                const newConditions = [...selectedGroup.defeatConditions];
                                newConditions[index] = { ...condition, value: parseInt(e.target.value) };
                                updateGroup({ defeatConditions: newConditions });
                              }}
                              placeholder="回合数"
                            />
                          )}
                          <input
                            type="text"
                            className="flex-1 px-2 py-1 rounded text-sm"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={condition.description || ''}
                            onChange={(e) => {
                              const newConditions = [...selectedGroup.defeatConditions];
                              newConditions[index] = { ...condition, description: e.target.value };
                              updateGroup({ defeatConditions: newConditions });
                            }}
                            placeholder="描述"
                          />
                          <button
                            className="p-1 rounded hover:bg-red-500/20"
                            onClick={() => removeDefeatCondition(index)}
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rewards Override */}
                  <div>
                    <div className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>奖励覆盖</div>
                    <div className="p-3 rounded space-y-2" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>金币最小</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 rounded text-sm"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={selectedGroup.defaultRewardOverride?.goldMin || 0}
                            onChange={(e) => updateGroup({ 
                              defaultRewardOverride: { 
                                ...selectedGroup.defaultRewardOverride, 
                                goldMin: parseInt(e.target.value) || 0,
                                goldMax: selectedGroup.defaultRewardOverride?.goldMax || 0,
                                expMin: selectedGroup.defaultRewardOverride?.expMin || 0,
                                expMax: selectedGroup.defaultRewardOverride?.expMax || 0,
                                items: selectedGroup.defaultRewardOverride?.items || [],
                              } 
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>金币最大</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 rounded text-sm"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={selectedGroup.defaultRewardOverride?.goldMax || 0}
                            onChange={(e) => updateGroup({ 
                              defaultRewardOverride: { 
                                ...selectedGroup.defaultRewardOverride, 
                                goldMin: selectedGroup.defaultRewardOverride?.goldMin || 0,
                                goldMax: parseInt(e.target.value) || 0,
                                expMin: selectedGroup.defaultRewardOverride?.expMin || 0,
                                expMax: selectedGroup.defaultRewardOverride?.expMax || 0,
                                items: selectedGroup.defaultRewardOverride?.items || [],
                              } 
                            })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>经验最小</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 rounded text-sm"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={selectedGroup.defaultRewardOverride?.expMin || 0}
                            onChange={(e) => updateGroup({ 
                              defaultRewardOverride: { 
                                ...selectedGroup.defaultRewardOverride, 
                                goldMin: selectedGroup.defaultRewardOverride?.goldMin || 0,
                                goldMax: selectedGroup.defaultRewardOverride?.goldMax || 0,
                                expMin: parseInt(e.target.value) || 0,
                                expMax: selectedGroup.defaultRewardOverride?.expMax || 0,
                                items: selectedGroup.defaultRewardOverride?.items || [],
                              } 
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>经验最大</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 rounded text-sm"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={selectedGroup.defaultRewardOverride?.expMax || 0}
                            onChange={(e) => updateGroup({ 
                              defaultRewardOverride: { 
                                ...selectedGroup.defaultRewardOverride, 
                                goldMin: selectedGroup.defaultRewardOverride?.goldMin || 0,
                                goldMax: selectedGroup.defaultRewardOverride?.goldMax || 0,
                                expMin: selectedGroup.defaultRewardOverride?.expMin || 0,
                                expMax: parseInt(e.target.value) || 0,
                                items: selectedGroup.defaultRewardOverride?.items || [],
                              } 
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Battle Test Tab */}
              {activeTab === 'battletest' && (
                <div className="flex gap-4">
                  <div className="flex-1 space-y-4 max-w-2xl">
                    <div className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-primary)' }}>Battle Test 配置</div>

                    {/* Test Party Configuration */}
                    <div className="p-4 rounded" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>测试角色 ({selectedGroup.battleTestConfig?.allyTeam.length || 0}/4)</div>
                        <button
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--color-accent)', color: 'white' }}
                          onClick={() => {
                            if (!selectedGroup.battleTestConfig) {
                              updateGroup({
                                battleTestConfig: {
                                  allyTeam: [],
                                  initialResources: { hp: 100, mp: 50 },
                                }
                              });
                            } else if (selectedGroup.battleTestConfig.allyTeam.length < 4) {
                              updateGroup({
                                battleTestConfig: {
                                  ...selectedGroup.battleTestConfig,
                                  allyTeam: [...selectedGroup.battleTestConfig.allyTeam, { characterId: project.characters[0]?.id || '', level: 1 }]
                                }
                              });
                            }
                          }}
                          disabled={(selectedGroup.battleTestConfig?.allyTeam.length || 0) >= 4}
                        >
                          <Plus size={12} />
                          <span>添加角色</span>
                        </button>
                      </div>

                      {(!selectedGroup.battleTestConfig?.allyTeam || selectedGroup.battleTestConfig.allyTeam.length === 0) ? (
                        <div className="p-4 text-center text-xs rounded" style={{ color: 'var(--color-text-disabled)' }}>
                          点击「添加角色」开始配置测试阵容
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedGroup.battleTestConfig?.allyTeam.map((ally, index) => {
                            const character = project.characters.find(c => c.id === ally.characterId);
                            const job = project.jobs.find(j => j.id === character?.jobId);
                            const weapon = project.equipment.find(e => e.id === character?.equipment?.weapon);
                            const armor = project.equipment.find(e => e.id === character?.equipment?.armor);
                            const accessory = project.equipment.find(e => e.id === character?.equipment?.accessory);

                            return (
                              <div key={index} className="p-3 rounded" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                  <select
                                    className="flex-1 px-2 py-1 rounded text-sm"
                                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                    value={ally.characterId}
                                    onChange={(e) => {
                                      const newTeam = [...selectedGroup.battleTestConfig!.allyTeam];
                                      newTeam[index] = { ...ally, characterId: e.target.value };
                                      updateGroup({ battleTestConfig: { ...selectedGroup.battleTestConfig!, allyTeam: newTeam } });
                                    }}
                                  >
                                    {project.characters.map(c => (
                                      <option key={c.id} value={c.id}>{c.identity.name}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    className="w-16 px-2 py-1 rounded text-sm text-center"
                                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                    value={ally.level}
                                    onChange={(e) => {
                                      const newTeam = [...selectedGroup.battleTestConfig!.allyTeam];
                                      newTeam[index] = { ...ally, level: parseInt(e.target.value) || 1 };
                                      updateGroup({ battleTestConfig: { ...selectedGroup.battleTestConfig!, allyTeam: newTeam } });
                                    }}
                                    min={1}
                                    max={99}
                                    placeholder="等级"
                                  />
                                  <button
                                    className="p-1 rounded hover:bg-red-500/20"
                                    onClick={() => {
                                      const newTeam = [...selectedGroup.battleTestConfig!.allyTeam];
                                      newTeam.splice(index, 1);
                                      updateGroup({ battleTestConfig: { ...selectedGroup.battleTestConfig!, allyTeam: newTeam } });
                                    }}
                                  >
                                    <Trash2 size={14} className="text-red-400" />
                                  </button>
                                </div>

                                {/* Character Summary */}
                                {character && (
                                  <div className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{character.identity.name}</span>
                                      <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--color-accent)', color: 'white' }}>Lv.{ally.level}</span>
                                      {job && <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>{job.name}</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span>装备:</span>
                                      {weapon && <span className="text-[10px]" style={{ color: '#f59e0b' }}>{weapon.name}</span>}
                                      {armor && <span className="text-[10px]" style={{ color: '#3b82f6' }}>{armor.name}</span>}
                                      {accessory && <span className="text-[10px]" style={{ color: '#8b5cf6' }}>{accessory.name}</span>}
                                      {!weapon && !armor && !accessory && <span className="text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>无</span>}
                                    </div>
                                    {character.skills && Object.keys(character.skills).length > 0 && (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span>技能:</span>
                                        {Object.entries(character.skills).slice(0, 3).map(([skillId, skill]) => {
                                          const skillData = project.skills.find(s => s.id === skillId);
                                          return skillData ? (
                                            <span key={skillId} className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                              {skillData.name}
                                            </span>
                                          ) : null;
                                        })}
                                        {Object.keys(character.skills).length > 3 && (
                                          <span className="text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>+{Object.keys(character.skills).length - 3}更多</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Initial Resources Configuration */}
                    <div className="p-4 rounded" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                      <div className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>初始资源</div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>HP</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 rounded text-sm"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={selectedGroup.battleTestConfig?.initialResources?.hp || 100}
                            onChange={(e) => updateGroup({
                              battleTestConfig: {
                                ...selectedGroup.battleTestConfig,
                                initialResources: {
                                  ...selectedGroup.battleTestConfig?.initialResources,
                                  hp: parseInt(e.target.value) || 100,
                                }
                              }
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>MP</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 rounded text-sm"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={selectedGroup.battleTestConfig?.initialResources?.mp || 50}
                            onChange={(e) => updateGroup({
                              battleTestConfig: {
                                ...selectedGroup.battleTestConfig,
                                initialResources: {
                                  ...selectedGroup.battleTestConfig?.initialResources,
                                  mp: parseInt(e.target.value) || 50,
                                }
                              }
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>AP</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 rounded text-sm"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={selectedGroup.battleTestConfig?.initialResources?.ap || 0}
                            onChange={(e) => updateGroup({
                              battleTestConfig: {
                                ...selectedGroup.battleTestConfig,
                                initialResources: {
                                  ...selectedGroup.battleTestConfig?.initialResources,
                                  ap: parseInt(e.target.value) || 0,
                                }
                              }
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>怒气</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 rounded text-sm"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={selectedGroup.battleTestConfig?.initialResources?.rage || 0}
                            onChange={(e) => updateGroup({
                              battleTestConfig: {
                                ...selectedGroup.battleTestConfig,
                                initialResources: {
                                  ...selectedGroup.battleTestConfig?.initialResources,
                                  rage: parseInt(e.target.value) || 0,
                                }
                              }
                            })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded text-sm"
                        style={{ background: 'var(--color-accent)', color: 'white' }}
                        onClick={() => {
                          alert('Battle Test 功能开发中...');
                        }}
                      >
                        <Play size={14} />
                        <span>开始测试</span>
                      </button>
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded text-sm"
                        style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                        onClick={() => {
                          if (selectedGroup.battleTestConfig) {
                            localStorage.setItem(`battletest_${selectedGroup.id}`, JSON.stringify(selectedGroup.battleTestConfig));
                            alert('配置已保存！');
                          }
                        }}
                      >
                        <Save size={14} />
                        <span>保存配置</span>
                      </button>
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded text-xs"
                        style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                        onClick={() => {
                          const saved = localStorage.getItem(`battletest_${selectedGroup.id}`);
                          if (saved) {
                            try {
                              const config = JSON.parse(saved);
                              updateGroup({ battleTestConfig: config });
                              alert('配置已加载！');
                            } catch {
                              alert('加载失败');
                            }
                          } else {
                            alert('没有已保存的配置');
                          }
                        }}
                      >
                        <Settings size={14} />
                        <span>加载配置</span>
                      </button>
                    </div>
                  </div>

                  {/* Encounter Summary Panel */}
                  <div className="w-64 shrink-0">
                    <div className="p-4 rounded sticky top-0" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                      <div className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>遭遇摘要</div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-secondary)' }}>遭遇名称</span>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedGroup.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-secondary)' }}>遭遇类型</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--color-accent)', color: 'white' }}>
                            {encounterTypeLabels[selectedGroup.encounterType]}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-secondary)' }}>敌人数</span>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedGroup.members?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-secondary)' }}>波次数</span>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedGroup.waves?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-secondary)' }}>事件数</span>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedGroup.events?.length || 0}</span>
                        </div>
                        <div className="border-t my-2" style={{ borderColor: 'var(--color-border)' }}></div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-secondary)' }}>推荐等级</span>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedGroup.recommendedLevel || 1}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-secondary)' }}>危险度</span>
                          <span className="font-medium" style={{ color: selectedGroup.dangerLevel && selectedGroup.dangerLevel >= 4 ? '#ef4444' : selectedGroup.dangerLevel && selectedGroup.dangerLevel >= 2 ? '#f59e0b' : 'var(--color-text-primary)' }}>
                            {selectedGroup.dangerLevel || 1}
                          </span>
                        </div>
                        <div className="border-t my-2" style={{ borderColor: 'var(--color-border)' }}></div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--color-text-secondary)' }}>测试角色</span>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedGroup.battleTestConfig?.allyTeam.length || 0}/4</span>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="mt-4 p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                        <div className="text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>阵容分布</div>
                        <div className="flex gap-1">
                          <div className="flex-1 text-center">
                            <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {selectedGroup.members?.filter(m => (m.y || 0) < 2).length || 0}
                            </div>
                            <div className="text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>前排</div>
                          </div>
                          <div className="flex-1 text-center">
                            <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {selectedGroup.members?.filter(m => (m.y || 0) >= 2).length || 0}
                            </div>
                            <div className="text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>后排</div>
                          </div>
                          <div className="flex-1 text-center">
                            <div className="text-sm font-medium" style={{ color: selectedGroup.members?.some(m => m.isBoss) ? '#ef4444' : 'var(--color-text-primary)' }}>
                              {selectedGroup.members?.filter(m => m.isBoss).length || 0}
                            </div>
                            <div className="text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>Boss</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-disabled)' }}>
            选择左侧敌群或创建新的遭遇
          </div>
        )}
      </div>
    </div>
  );
};
