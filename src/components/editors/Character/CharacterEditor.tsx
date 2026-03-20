import React, { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import { useUIStore } from '../../../stores/uiStore';
import { useValidationStore } from '../../../stores/validationStore';
import type { Character, CharacterCategory, CharacterTrait, Skill } from '../../../types';
import {
  AlertTriangle,
  CheckCircle,
  Crown,
  FlaskConical,
  Plus,
  Skull,
  Trash2,
  User,
  Users,
} from 'lucide-react';

type CharacterTab = 'basic' | 'level' | 'attributes' | 'skills' | 'equipment';

const categoryConfig: { id: CharacterCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'player', label: '主角团', icon: <Users size={12} /> },
  { id: 'enemy-controlled', label: '敌方可控', icon: <Skull size={12} /> },
  { id: 'npc-battle', label: 'NPC战斗', icon: <User size={12} /> },
  { id: 'test', label: '测试角色', icon: <FlaskConical size={12} /> },
  { id: 'boss', label: 'Boss模板', icon: <Crown size={12} /> },
];

const createDefaultCharacter = (category: CharacterCategory): Character => ({
  id: `char-${Date.now()}`,
  identity: {
    name: '新角色',
    description: '',
    faction: '玩家',
    rarity: 3,
    tags: [],
  },
  category,
  jobId: undefined,
  levelConfig: {
    initial: 1,
    max: 99,
    inheritJobGrowth: true,
    overrideGrowth: false,
    growthOffsets: {},
  },
  initialAttributes: {
    initialHp: 1000,
    initialMp: 100,
    individualOffsets: {
      attack: 0,
      defense: 0,
      speed: 0,
      magicAttack: 0,
      magicDefense: 0,
      critRate: 0,
      critDamage: 0,
    },
    inheritJobGrowth: true,
  },
  skillConfig: {
    initialSkills: [],
    exclusiveSkills: [],
    disabledSkills: [],
    skillReplacements: [],
    defaultSkillBar: [],
  },
  initialEquipment: {
    weapon: undefined,
    armor: undefined,
    accessory1: undefined,
    accessory2: undefined,
    locked: false,
    exclusiveEquipment: [],
  },
  traitConfig: {
    individualTraits: [],
    passiveTalents: [],
    resourceEfficiencyOffsets: {},
  },
  combatPerformance: {
    idleAnim: 'idle',
    attackAnim: 'attack',
    hitAnim: 'hurt',
    voice: '',
    battleLogName: '',
  },
  attributes: {
    baseStats: {
      hp: 1000,
      mp: 100,
      attack: 100,
      defense: 50,
      speed: 100,
      magicAttack: 100,
      magicDefense: 50,
      critRate: 5,
      critDamage: 150,
    },
    growthRates: {
      hp: 100,
      attack: 10,
      defense: 5,
      speed: 5,
      magicAttack: 8,
      magicDefense: 5,
    },
    levelFormula: 'level * 10',
  },
  actions: {
    normalAttack: { enabled: true },
    chaseAttack: { enabled: false },
    coordinatedAttack: { enabled: false },
    defend: { enabled: true },
  },
  skills: {
    skillSlots: [
      { id: 'slot-1', slotType: 'active', unlocked: true },
      { id: 'slot-2', slotType: 'passive', unlocked: false },
    ],
    skillLevels: {},
  },
  equipment: {
    defaultEquipment: {},
    equipmentRestrictions: {},
  },
  resistances: {
    statusResistances: {},
    damageReduction: {},
    elementReduction: {},
  },
  growthUnlocks: {
    breakthroughs: [],
    awakenings: [],
    exclusiveWeapons: [],
  },
});

const validateCharacter = (character: Character | null, skillIds: Set<string>) => {
  if (!character) {
    return [];
  }

  const issues: { type: 'error' | 'warning'; field: string; message: string }[] = [];
  if (!character.identity.name.trim()) {
    issues.push({ type: 'error', field: 'name', message: '角色名称不能为空' });
  }
  if (!character.jobId) {
    issues.push({ type: 'warning', field: 'jobId', message: '还没有绑定职业' });
  }
  if ((character.levelConfig?.initial || 0) < 1) {
    issues.push({ type: 'error', field: 'level', message: '初始等级必须大于 0' });
  }
  (character.skillConfig?.initialSkills || []).forEach((skillId) => {
    if (skillId && !skillIds.has(skillId)) {
      issues.push({ type: 'error', field: 'skills', message: `技能 "${skillId}" 不存在` });
    }
  });
  return issues;
};

export const CharacterEditor: React.FC = () => {
  const { project, addCharacter, updateCharacter, deleteCharacter } = useProjectStore();
  const { activeEntityId, setActiveEntityId, openTab, closeTab, setDebugCharacterId } = useEditorStore();
  const { setDrawerTab } = useUIStore();
  const { setCharacterValidation } = useValidationStore();

  const [activeTab, setActiveTab] = useState<CharacterTab>('basic');
  const characters = project.characters ?? [];
  const skills = project.skills ?? [];
  const jobs = project.jobs ?? [];
  const skillIdSet = useMemo(() => new Set(skills.map((skill) => skill.id)), [skills]);

  const groupedCharacters = useMemo(() => {
    const grouped: Record<CharacterCategory, Character[]> = {
      player: [],
      'enemy-controlled': [],
      'npc-battle': [],
      test: [],
      boss: [],
    };
    characters.forEach((character) => {
      grouped[character.category || 'player'].push(character);
    });
    return grouped;
  }, [characters]);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === activeEntityId) || null,
    [activeEntityId, characters],
  );
  const selectedJob = selectedCharacter?.jobId ? jobs.find((job) => job.id === selectedCharacter.jobId) : null;
  const issues = useMemo(() => validateCharacter(selectedCharacter, skillIdSet), [selectedCharacter, skillIdSet]);

  useEffect(() => {
    if (!activeEntityId && characters.length > 0) {
      setActiveEntityId(characters[0].id);
    }
  }, [activeEntityId, characters, setActiveEntityId]);

  useEffect(() => {
    setDebugCharacterId(activeEntityId || null);
    setDrawerTab('character-log');
  }, [activeEntityId, setDebugCharacterId, setDrawerTab]);

  useEffect(() => {
    if (!selectedCharacter) {
      setCharacterValidation('', [], true);
      return;
    }
    setCharacterValidation(
      selectedCharacter.id,
      issues.map((issue) => ({ type: issue.type, field: issue.field, message: issue.message })),
      !issues.some((issue) => issue.type === 'error'),
    );
  }, [issues, selectedCharacter, setCharacterValidation]);

  const patchCharacter = (patch: Partial<Character>) => {
    if (!selectedCharacter) return;
    updateCharacter(selectedCharacter.id, { ...selectedCharacter, ...patch });
  };

  const createCharacter = (category: CharacterCategory) => {
    const next = createDefaultCharacter(category);
    addCharacter(next);
    setActiveEntityId(next.id);
    openTab({ id: next.id, type: 'characters', entityId: next.id, title: next.identity.name });
  };

  const removeCharacter = () => {
    if (!selectedCharacter) return;
    const remaining = characters.filter((character) => character.id !== selectedCharacter.id);
    deleteCharacter(selectedCharacter.id);
    closeTab(selectedCharacter.id);
    setActiveEntityId(remaining[0]?.id || null);
  };

  const updateInitialSkill = (index: number, skillId: string) => {
    if (!selectedCharacter) return;
    const nextSkills = [...(selectedCharacter.skillConfig?.initialSkills || [])];
    nextSkills[index] = skillId;
    patchCharacter({
      skillConfig: {
        ...selectedCharacter.skillConfig!,
        initialSkills: nextSkills.filter(Boolean),
      },
    });
  };

  const removeInitialSkill = (index: number) => {
    if (!selectedCharacter) return;
    patchCharacter({
      skillConfig: {
        ...selectedCharacter.skillConfig!,
        initialSkills: (selectedCharacter.skillConfig?.initialSkills || []).filter((_, itemIndex) => itemIndex !== index),
      },
    });
  };

  const appendInitialSkill = () => {
    if (!selectedCharacter) return;
    patchCharacter({
      skillConfig: {
        ...selectedCharacter.skillConfig!,
        initialSkills: [...(selectedCharacter.skillConfig?.initialSkills || []), ''],
      },
    });
  };

  return (
    <div className="h-full flex">
      <div className="w-72 shrink-0 border-r flex flex-col" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>角色注册表</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>角色总数 {characters.length}</div>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-3">
          {categoryConfig.map((category) => (
            <div key={category.id} className="rounded-lg" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {category.icon}
                  <span>{category.label}</span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {groupedCharacters[category.id].length}
                </span>
              </div>
              <div className="px-2 pb-2 space-y-1">
                {groupedCharacters[category.id].map((character) => {
                  const isSelected = selectedCharacter?.id === character.id;
                  const characterJob = character.jobId ? jobs.find((job) => job.id === character.jobId) : null;
                  const characterIssues = validateCharacter(character, skillIdSet);
                  return (
                    <button
                      key={character.id}
                      className="w-full text-left px-3 py-2 rounded border transition-colors"
                      style={{
                        background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                        borderColor: isSelected ? 'rgba(59, 130, 246, 0.45)' : 'transparent',
                        boxShadow: isSelected ? 'inset 3px 0 0 var(--color-accent)' : 'none',
                      }}
                      onClick={() => setActiveEntityId(character.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
                          {character.identity.name.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{character.identity.name}</div>
                          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {characterJob?.name || '未绑定职业'} · Lv.{character.levelConfig?.initial || 1}
                          </div>
                        </div>
                        {characterIssues.length > 0 && <AlertTriangle size={12} style={{ color: 'var(--color-warning)' }} />}
                      </div>
                    </button>
                  );
                })}
                <button
                  className="w-full flex items-center gap-1 px-3 py-2 rounded text-xs"
                  style={{ color: 'var(--color-accent)' }}
                  onClick={() => createCharacter(category.id)}
                >
                  <Plus size={12} />
                  <span>添加</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
        {!selectedCharacter ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
            选择一个角色开始编辑
          </div>
        ) : (
          <>
            <div className="flex border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              {[
                ['basic', '基础信息'],
                ['level', '等级与成长'],
                ['attributes', '初始属性'],
                ['skills', '技能配置'],
                ['equipment', '装备配置'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className="px-4 py-2 text-xs font-medium border-r"
                  style={{
                    color: activeTab === id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    background: activeTab === id ? 'var(--color-bg-secondary)' : 'transparent',
                    borderColor: 'var(--color-border)',
                  }}
                  onClick={() => setActiveTab(id as CharacterTab)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-4">
              {activeTab === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    角色名称
                    <input
                      className="input-field mt-1 w-full"
                      value={selectedCharacter.identity.name}
                      onChange={(event) => patchCharacter({ identity: { ...selectedCharacter.identity, name: event.target.value } })}
                    />
                  </label>
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    角色 ID
                    <input
                      className="input-field mt-1 w-full"
                      value={selectedCharacter.id}
                      onChange={(event) => patchCharacter({ id: event.target.value })}
                    />
                  </label>
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    阵营
                    <input
                      className="input-field mt-1 w-full"
                      value={selectedCharacter.identity.faction}
                      onChange={(event) => patchCharacter({ identity: { ...selectedCharacter.identity, faction: event.target.value } })}
                    />
                  </label>
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    职业绑定
                    <select
                      className="input-field mt-1 w-full"
                      value={selectedCharacter.jobId || ''}
                      onChange={(event) => patchCharacter({ jobId: event.target.value || undefined })}
                    >
                      <option value="">未绑定</option>
                      {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs col-span-2" style={{ color: 'var(--color-text-secondary)' }}>
                    角色简介
                    <textarea
                      className="input-field mt-1 w-full h-28 resize-none"
                      value={selectedCharacter.identity.description || ''}
                      onChange={(event) => patchCharacter({ identity: { ...selectedCharacter.identity, description: event.target.value } })}
                    />
                  </label>
                </div>
              )}

              {activeTab === 'level' && (
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    初始等级
                    <input
                      type="number"
                      className="input-field mt-1 w-full"
                      value={selectedCharacter.levelConfig?.initial || 1}
                      min={1}
                      onChange={(event) => patchCharacter({ levelConfig: { ...selectedCharacter.levelConfig!, initial: Number(event.target.value) || 1 } })}
                    />
                  </label>
                  <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    最大等级
                    <input
                      type="number"
                      className="input-field mt-1 w-full"
                      value={selectedCharacter.levelConfig?.max || 99}
                      min={1}
                      onChange={(event) => patchCharacter({ levelConfig: { ...selectedCharacter.levelConfig!, max: Number(event.target.value) || 1 } })}
                    />
                  </label>
                </div>
              )}

              {activeTab === 'attributes' && (
                <div className="grid grid-cols-4 gap-4">
                  {[
                    ['initialHp', '初始 HP'],
                    ['initialMp', '初始 MP'],
                    ['attack', '攻击修正'],
                    ['defense', '防御修正'],
                    ['speed', '速度修正'],
                    ['magicAttack', '魔攻修正'],
                    ['magicDefense', '魔防修正'],
                    ['critRate', '暴击率修正'],
                    ['critDamage', '暴击伤害修正'],
                  ].map(([field, label]) => {
                    const value = field === 'initialHp'
                      ? selectedCharacter.initialAttributes?.initialHp || 0
                      : field === 'initialMp'
                        ? selectedCharacter.initialAttributes?.initialMp || 0
                        : selectedCharacter.initialAttributes?.individualOffsets?.[field] || 0;
                    return (
                      <label key={field} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {label}
                        <input
                          type="number"
                          className="input-field mt-1 w-full"
                          value={value}
                          onChange={(event) => {
                            const numeric = Number(event.target.value) || 0;
                            if (field === 'initialHp' || field === 'initialMp') {
                              patchCharacter({
                                initialAttributes: {
                                  ...selectedCharacter.initialAttributes!,
                                  [field]: numeric,
                                },
                              });
                              return;
                            }
                            patchCharacter({
                              initialAttributes: {
                                ...selectedCharacter.initialAttributes!,
                                individualOffsets: {
                                  ...(selectedCharacter.initialAttributes?.individualOffsets || {}),
                                  [field]: numeric,
                                },
                              },
                            });
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}

              {activeTab === 'skills' && (
                <div className="space-y-3">
                  {(selectedCharacter.skillConfig?.initialSkills || []).map((skillId, index) => (
                    <div key={`${skillId}-${index}`} className="flex items-center gap-2">
                      <select
                        className="input-field flex-1"
                        value={skillId}
                        onChange={(event) => updateInitialSkill(index, event.target.value)}
                      >
                        <option value="">选择技能</option>
                        {skills.map((skill: Skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                      </select>
                      <button className="p-2 rounded" style={{ color: '#ef4444' }} onClick={() => removeInitialSkill(index)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button className="toolbar-btn" onClick={appendInitialSkill}>
                    <Plus size={12} />
                    <span>添加初始技能</span>
                  </button>
                </div>
              )}

              {activeTab === 'equipment' && (
                <div className="grid grid-cols-3 gap-4">
                  {[
                    ['weapon', '武器', 'weapon'],
                    ['armor', '防具', 'armor'],
                    ['accessory1', '饰品 1', 'accessory'],
                    ['accessory2', '饰品 2', 'accessory'],
                  ].map(([slot, label, category]) => (
                    <label key={slot} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {label}
                      <select
                        className="input-field mt-1 w-full"
                        value={(selectedCharacter.initialEquipment?.[slot as 'weapon'] as string | undefined) || ''}
                        onChange={(event) => patchCharacter({
                          initialEquipment: {
                            ...selectedCharacter.initialEquipment!,
                            [slot]: event.target.value || undefined,
                          },
                        })}
                      >
                        <option value="">未装备</option>
                        {project.equipment
                          .filter((equipment) => equipment.equipmentCategory === category)
                          .map((equipment) => <option key={equipment.id} value={equipment.id}>{equipment.name}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="w-80 shrink-0 border-l flex flex-col" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>角色预览与校验</div>
        </div>
        {selectedCharacter && (
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)', borderLeft: '3px solid var(--color-accent)' }}>
              <div className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedCharacter.identity.name}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {selectedJob?.name || '未绑定职业'} · {selectedCharacter.identity.faction || '-'}
              </div>
              {selectedCharacter.identity.description && (
                <div className="text-xs mt-3" style={{ color: 'var(--color-text-secondary)' }}>
                  {selectedCharacter.identity.description}
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)' }}>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>问题汇总</div>
              {issues.length === 0 ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: '#22c55e' }}>
                  <CheckCircle size={12} />
                  <span>当前角色没有阻塞问题</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {issues.map((issue) => (
                    <div key={`${issue.field}-${issue.message}`} className="text-xs" style={{ color: issue.type === 'error' ? '#ef4444' : '#f59e0b' }}>
                      {issue.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm"
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.35)' }}
              onClick={removeCharacter}
            >
              <Trash2 size={14} />
              <span>删除角色</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
