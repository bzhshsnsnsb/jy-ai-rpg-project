import React, { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import { useUIStore } from '../../../stores/uiStore';
import type { BattleTestAlly, PrebattleFormation } from '../../../types';
import { AlertTriangle, BookOpen, Check, Play, Save, Shield, Trash2, Users } from 'lucide-react';

type PrebattleTab = 'party' | 'formation' | 'resources' | 'readiness';

const MAX_PARTY_SIZE = 4;
const GRID_COLS = 3;
const GRID_ROWS = 4;
const STORAGE_KEY = 'prebattle_config';
const TEMPLATE_KEY = 'prebattle_templates';

interface LineupTemplate {
  id: string;
  name: string;
  encounterId: string | null;
  party: BattleTestAlly[];
  formation: PrebattleFormation[];
  initialResources: Record<string, number>;
}

export const PrebattlePrepEditor: React.FC = () => {
  const { project } = useProjectStore();
  const { setActiveEditor, openTab } = useEditorStore();
  const { setDrawerTab } = useUIStore();

  const [activeTab, setActiveTab] = useState<PrebattleTab>('party');
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [party, setParty] = useState<BattleTestAlly[]>([]);
  const [formation, setFormation] = useState<PrebattleFormation[]>([]);
  const [initialResources, setInitialResources] = useState<Record<string, number>>({});
  const [draggingCharacterId, setDraggingCharacterId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('我的阵容');
  const [templates, setTemplates] = useState<LineupTemplate[]>([]);

  const playerCharacters = useMemo(
    () => project.characters.filter((character) => !character.category || character.category === 'player'),
    [project.characters],
  );
  const selectedEncounter = useMemo(
    () => project.enemyGroups.find((group) => group.id === selectedEncounterId) || null,
    [project.enemyGroups, selectedEncounterId],
  );

  useEffect(() => {
    const fallbackParty = playerCharacters.slice(0, MAX_PARTY_SIZE).map((character) => ({
      characterId: character.id,
      level: character.levelConfig?.initial || 1,
    }));
    const fallbackFormation = playerCharacters.slice(0, MAX_PARTY_SIZE).map((character, index) => ({
      characterId: character.id,
      x: index % 2,
      y: Math.floor(index / 2),
    }));

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<LineupTemplate>;
        setSelectedEncounterId(saved.encounterId || project.enemyGroups[0]?.id || null);
        setParty(saved.party && saved.party.length > 0 ? saved.party : fallbackParty);
        setFormation(saved.formation && saved.formation.length > 0 ? saved.formation : fallbackFormation);
        setInitialResources(saved.initialResources || {});
      } else {
        setSelectedEncounterId(project.enemyGroups[0]?.id || null);
        setParty(fallbackParty);
        setFormation(fallbackFormation);
      }
    } catch {
      setSelectedEncounterId(project.enemyGroups[0]?.id || null);
      setParty(fallbackParty);
      setFormation(fallbackFormation);
    }

    try {
      const rawTemplates = localStorage.getItem(TEMPLATE_KEY);
      if (rawTemplates) {
        setTemplates(JSON.parse(rawTemplates));
      }
    } catch {
      setTemplates([]);
    }
  }, [playerCharacters, project.enemyGroups]);

  useEffect(() => {
    const defaults: Record<string, number> = {};
    project.rules.resourceModel.resources.forEach((resource) => {
      if (initialResources[resource.id] !== undefined) return;
      defaults[resource.id] = resource.id === 'hp' ? 100 : 0;
    });
    if (Object.keys(defaults).length > 0) {
      setInitialResources((current) => ({ ...defaults, ...current }));
    }
  }, [initialResources, project.rules.resourceModel.resources]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        encounterId: selectedEncounterId,
        party,
        formation,
        initialResources,
      }),
    );
  }, [formation, initialResources, party, selectedEncounterId]);

  useEffect(() => {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
  }, [templates]);

  const getCharacter = (characterId: string) => project.characters.find((character) => character.id === characterId);
  const getJob = (jobId: string | undefined) => project.jobs.find((job) => job.id === jobId);

  const addToParty = (characterId: string) => {
    if (party.length >= MAX_PARTY_SIZE || party.some((member) => member.characterId === characterId)) {
      return;
    }

    setParty((current) => [
      ...current,
      { characterId, level: getCharacter(characterId)?.levelConfig?.initial || 1 },
    ]);
  };

  const removeFromParty = (characterId: string) => {
    setParty((current) => current.filter((member) => member.characterId !== characterId));
    setFormation((current) => current.filter((slot) => slot.characterId !== characterId));
  };

  const placeCharacter = (characterId: string, x: number, y: number) => {
    setFormation((current) => {
      const existingForCharacter = current.find((slot) => slot.characterId === characterId);
      const occupant = current.find((slot) => slot.x === x && slot.y === y);

      if (existingForCharacter && existingForCharacter.x === x && existingForCharacter.y === y) {
        return current;
      }

      let next = current.filter((slot) => slot.characterId !== characterId);
      if (occupant) {
        next = next.filter((slot) => !(slot.x === x && slot.y === y));
        if (existingForCharacter) {
          next.push({ characterId: occupant.characterId, x: existingForCharacter.x, y: existingForCharacter.y });
        }
      }
      next.push({ characterId, x, y });
      return next;
    });
  };

  const assignToCell = (x: number, y: number) => {
    const unplaced = party.find((member) => !formation.some((slot) => slot.characterId === member.characterId));
    if (!unplaced) {
      const occupying = formation.find((slot) => slot.x === x && slot.y === y);
      if (occupying) {
        setFormation((current) => current.filter((slot) => slot !== occupying));
      }
      return;
    }
    placeCharacter(unplaced.characterId, x, y);
  };

  const saveTemplate = () => {
    if (party.length === 0) return;
    const nextTemplate: LineupTemplate = {
      id: `template-${Date.now()}`,
      name: templateName.trim() || `阵容 ${templates.length + 1}`,
      encounterId: selectedEncounterId,
      party,
      formation,
      initialResources,
    };
    setTemplates((current) => [nextTemplate, ...current]);
  };

  const loadTemplate = (template: LineupTemplate) => {
    setSelectedEncounterId(template.encounterId);
    setParty(template.party);
    setFormation(template.formation);
    setInitialResources(template.initialResources);
  };

  const deleteTemplate = (templateId: string) => {
    setTemplates((current) => current.filter((template) => template.id !== templateId));
  };

  const validationIssues = useMemo(() => {
    const issues: { type: 'error' | 'warning'; message: string }[] = [];
    if (!selectedEncounterId) issues.push({ type: 'error', message: '还没有选择要挑战的遭遇' });
    if (party.length === 0) issues.push({ type: 'error', message: '至少需要 1 名出战角色' });
    if (party.length < MAX_PARTY_SIZE) issues.push({ type: 'warning', message: `当前阵容只有 ${party.length}/${MAX_PARTY_SIZE} 人` });
    if (formation.length < party.length) issues.push({ type: 'error', message: '有角色还没有放入格子' });

    const hasHealer = party.some((member) => {
      const job = getJob(getCharacter(member.characterId)?.jobId);
      return job?.role === 'healer';
    });
    if (!hasHealer && party.length >= 2) {
      issues.push({ type: 'warning', message: '当前阵容没有治疗位，续航风险较高' });
    }
    return issues;
  }, [formation, party, selectedEncounterId]);

  const launchBattleSim = () => {
    setActiveEditor('battle-sim', 'battle-sim');
    openTab({ id: 'battle-sim', type: 'battle-sim', entityId: 'battle-sim', title: '对战模拟' });
  };

  return (
    <div className="h-full flex">
      <div className="w-80 shrink-0 border-r flex flex-col" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>战前准备</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>先定遭遇，再布阵，再进入对战模拟。</div>
        </div>

        <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--color-border)' }}>
          <label className="text-xs block" style={{ color: 'var(--color-text-secondary)' }}>
            遭遇
            <select
              className="input-field mt-1 w-full"
              value={selectedEncounterId || ''}
              onChange={(event) => setSelectedEncounterId(event.target.value || null)}
            >
              <option value="">请选择遭遇</option>
              {project.enemyGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} / Lv.{group.recommendedLevel}
                </option>
              ))}
            </select>
          </label>

          {selectedEncounter && (
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                <div style={{ color: 'var(--color-text-muted)' }}>敌人数</div>
                <div style={{ color: 'var(--color-text-primary)' }}>{selectedEncounter.members.length}</div>
              </div>
              <div className="p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                <div style={{ color: 'var(--color-text-muted)' }}>危险度</div>
                <div style={{ color: 'var(--color-text-primary)' }}>{selectedEncounter.dangerLevel}</div>
              </div>
              <div className="p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                <div style={{ color: 'var(--color-text-muted)' }}>推荐等级</div>
                <div style={{ color: 'var(--color-text-primary)' }}>{selectedEncounter.recommendedLevel}</div>
              </div>
            </div>
          )}
        </div>

        <div className="p-2 border-b flex gap-1" style={{ borderColor: 'var(--color-border)' }}>
          {[
            ['party', '角色'],
            ['formation', '站位'],
            ['resources', '资源'],
            ['readiness', '预检'],
          ].map(([tabId, label]) => (
            <button
              key={tabId}
              className="flex-1 px-2 py-2 rounded text-xs"
              style={{
                background: activeTab === tabId ? 'var(--color-accent)' : 'transparent',
                color: activeTab === tabId ? '#fff' : 'var(--color-text-secondary)',
              }}
              onClick={() => setActiveTab(tabId as PrebattleTab)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 border-b space-y-2" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>阵容模板</div>
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="模板名称"
            />
            <button className="toolbar-btn" onClick={saveTemplate}>
              <Save size={12} />
              <span>保存</span>
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-auto">
            {templates.length === 0 ? (
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>还没有保存的阵容模板</div>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="p-2 rounded border" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{template.name}</div>
                      <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{template.party.length} 人 · {template.encounterId || '未绑定遭遇'}</div>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1 rounded" style={{ color: 'var(--color-accent)' }} onClick={() => loadTemplate(template)}>载入</button>
                      <button className="p-1 rounded" style={{ color: '#ef4444' }} onClick={() => deleteTemplate(template.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm"
            style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
            onClick={() => setDrawerTab('prebattle-log')}
          >
            <BookOpen size={14} />
            <span>战前调试日志</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'party' && (
            <div className="grid grid-cols-2 gap-3">
              {playerCharacters.map((character) => {
                const selected = party.some((member) => member.characterId === character.id);
                const job = getJob(character.jobId);
                return (
                  <button
                    key={character.id}
                    className="p-3 rounded-lg text-left border transition-colors"
                    style={{
                      background: selected ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-bg-secondary)',
                      borderColor: selected ? 'rgba(59, 130, 246, 0.40)' : 'var(--color-border)',
                    }}
                    onClick={() => (selected ? removeFromParty(character.id) : addToParty(character.id))}
                    draggable
                    onDragStart={() => setDraggingCharacterId(character.id)}
                    onDragEnd={() => setDraggingCharacterId(null)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{character.identity.name}</div>
                        <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{job?.name || '未绑定职业'}</div>
                      </div>
                      {selected && <Check size={14} style={{ color: '#22c55e' }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'formation' && (
            <div className="space-y-4">
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                现在支持拖拽布阵。你可以把左侧已上阵角色拖到任意格子里，已有单位会自动交换位置。
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 110px)` }}>
                {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, index) => {
                  const x = index % GRID_COLS;
                  const y = Math.floor(index / GRID_COLS);
                  const slot = formation.find((item) => item.x === x && item.y === y);
                  const character = slot ? getCharacter(slot.characterId) : null;
                  return (
                    <div
                      key={`${x}-${y}`}
                      className="h-24 rounded-lg border text-xs flex items-center justify-center"
                      style={{
                        background: slot ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-bg-secondary)',
                        borderColor: draggingCharacterId ? 'rgba(59, 130, 246, 0.35)' : 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      onClick={() => assignToCell(x, y)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggingCharacterId) {
                          placeCharacter(draggingCharacterId, x, y);
                          setDraggingCharacterId(null);
                        }
                      }}
                    >
                      {character ? (
                        <div
                          draggable
                          onDragStart={() => setDraggingCharacterId(character.id)}
                          onDragEnd={() => setDraggingCharacterId(null)}
                          className="w-full h-full flex flex-col items-center justify-center"
                        >
                          <div className="font-medium">{character.identity.name}</div>
                          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{x},{y}</div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--color-text-muted)' }}>{x},{y}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="grid grid-cols-4 gap-3">
              {project.rules.resourceModel.resources.map((resource) => (
                <label key={resource.id} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {resource.name}
                  <input
                    type="number"
                    className="input-field mt-1 w-full"
                    value={initialResources[resource.id] ?? 0}
                    onChange={(event) =>
                      setInitialResources((current) => ({
                        ...current,
                        [resource.id]: Number(event.target.value) || 0,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          )}

          {activeTab === 'readiness' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>上阵人数</div>
                  <div className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{party.length}</div>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>已布阵</div>
                  <div className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{formation.length}</div>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>当前遭遇</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedEncounter?.name || '未选择'}</div>
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                <div className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>战前检查</div>
                <div className="space-y-2">
                  {validationIssues.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#22c55e' }}>
                      <Check size={14} />
                      <span>当前配置可直接进入对战模拟</span>
                    </div>
                  ) : (
                    validationIssues.map((issue) => (
                      <div key={issue.message} className="flex items-center gap-2 text-xs" style={{ color: issue.type === 'error' ? '#ef4444' : '#f59e0b' }}>
                        <AlertTriangle size={12} />
                        <span>{issue.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded text-sm"
                  style={{ background: 'var(--color-accent)', color: '#fff', opacity: validationIssues.some((issue) => issue.type === 'error') ? 0.5 : 1 }}
                  disabled={validationIssues.some((issue) => issue.type === 'error')}
                  onClick={launchBattleSim}
                >
                  <Play size={14} />
                  <span>进入对战模拟</span>
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded text-sm"
                  style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                  onClick={saveTemplate}
                >
                  <Save size={14} />
                  <span>另存模板</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 shrink-0 border-l p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>战前摘要</div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)' }}>
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                <Users size={12} />
                <span>队伍</span>
              </div>
              <div className="text-[11px] mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                {party.length === 0 ? '还没有出战角色' : party.map((member) => getCharacter(member.characterId)?.identity.name || member.characterId).join(' / ')}
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)' }}>
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                <Shield size={12} />
                <span>布阵完成度</span>
              </div>
              <div className="text-[11px] mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                {formation.length}/{party.length} 名角色已放入格子
              </div>
            </div>

            {validationIssues.length > 0 && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <div className="text-xs font-medium mb-2">当前风险</div>
                <div className="space-y-1 text-[11px]">
                  {validationIssues.slice(0, 4).map((issue) => (
                    <div key={issue.message}>{issue.message}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
