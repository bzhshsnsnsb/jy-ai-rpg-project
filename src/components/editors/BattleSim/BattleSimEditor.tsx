import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useUIStore } from '../../../stores/uiStore';
import { BattleEngine, type SimulationConfig, type SimulationResult, type ActorState, type BattleLogEntry } from '../../../engine/BattleEngine';
import type { BattleTestAlly, PrebattleFormation } from '../../../types';
import { Play, Pause, SkipForward, RotateCcw, Sword, Shield, Zap, Heart, AlertTriangle, Save, FolderOpen } from 'lucide-react';

// Grid constants
const GRID_COLS = 3;
const GRID_ROWS = 4;

// Speed options
const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
];

export const BattleSimEditor: React.FC = () => {
  const { project } = useProjectStore();
  const { setDrawerTab } = useUIStore();

  // State
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [party, setParty] = useState<BattleTestAlly[]>([]);
  const [formation, setFormation] = useState<PrebattleFormation[]>([]);
  const [speed, setSpeed] = useState<number>(1);
  const [autoBattle, setAutoBattle] = useState<boolean>(true);
  const [battleEngine, setBattleEngine] = useState<BattleEngine | null>(null);
  const [battleState, setBattleState] = useState<{
    allies: ActorState[];
    enemies: ActorState[];
    actionQueue: any[];
    currentTurn: number;
    currentRound: number;
    currentActor: ActorState | null;
    isRunning: boolean;
    isPaused: boolean;
    winner: 'ally' | 'enemy' | 'draw' | null;
    battleLog: BattleLogEntry[];
  } | null>(null);
  const [lastActionResult, setLastActionResult] = useState<any>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [battleMode, setBattleMode] = useState<'setup' | 'running' | 'finished'>('setup');
  const [savedTestConfigs, setSavedTestConfigs] = useState<Record<string, { party: BattleTestAlly[]; formation: PrebattleFormation[] }>>({});

  // Load prebattle config from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('prebattle_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.encounterId) {
          setSelectedEncounterId(config.encounterId);
        }
        if (config.party && Array.isArray(config.party)) {
          setParty(config.party);
        }
        if (config.formation && Array.isArray(config.formation)) {
          setFormation(config.formation);
        }
      }

      // Load saved test configs
      const savedTestConfigsJson = localStorage.getItem('battle_test_configs');
      if (savedTestConfigsJson) {
        setSavedTestConfigs(JSON.parse(savedTestConfigsJson));
      }
    } catch (e) {
      console.error('Failed to load prebattle config:', e);
    }
  }, []);

  // Get selected encounter
  const selectedEncounter = useMemo(() => {
    return project.enemyGroups.find(e => e.id === selectedEncounterId);
  }, [project.enemyGroups, selectedEncounterId]);

  // Filter available characters (player category or undefined)
  const playerCharacters = useMemo(() => {
    return project.characters.filter(c => !c.category || c.category === 'player');
  }, [project.characters]);

  // Get character by ID
  const getCharacter = (id: string) => project.characters.find(c => c.id === id);
  const getEnemy = (id: string) => project.enemies.find(e => e.id === id);

  // Add character to party
  const addToParty = (characterId: string) => {
    if (party.length >= 4) return;
    if (party.some(p => p.characterId === characterId)) return;

    const newAlly: BattleTestAlly = {
      characterId,
      level: getCharacter(characterId)?.levelConfig?.initial || 1,
    };

    // Auto-add to formation - find first empty position
    const newParty = [...party, newAlly];
    const occupiedPositions = formation.map(f => `${f.x},${f.y}`);
    let newPosition: { x: number; y: number } | null = null;

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (!occupiedPositions.includes(`${x},${y}`)) {
          newPosition = { x, y };
          break;
        }
      }
      if (newPosition) break;
    }

    if (newPosition) {
      setFormation([...formation, { characterId, ...newPosition }]);
    }
    setParty(newParty);
  };

  // Remove character from party
  const removeFromParty = (characterId: string) => {
    setParty(party.filter(p => p.characterId !== characterId));
    setFormation(formation.filter(f => f.characterId !== characterId));
  };

  // Start battle
  const startBattle = useCallback(() => {
    if (!selectedEncounter || party.length === 0) {
      alert('请选择遭遇和角色');
      return;
    }

    const config: SimulationConfig = {
      party,
      formation,
      resources: {},
      encounter: selectedEncounter,
      characters: project.characters,
      enemies: project.enemies,
      speed,
      autoBattle,
    };

    const engine = new BattleEngine(config);
    setBattleEngine(engine);
    setBattleState(engine.getState());
    setBattleMode('running');
    setSimulationResult(null);
  }, [selectedEncounter, party, formation, project.characters, project.enemies, speed, autoBattle]);

  // Step execution
  const stepBattle = useCallback(() => {
    if (!battleEngine || battleMode !== 'running') return;

    const result = battleEngine.step();
    if (result) {
      setBattleState(battleEngine.getState());
      setLastActionResult(result);

      if (result.isBattleEnd) {
        setSimulationResult(battleEngine.getResult());
        setBattleMode('finished');
      }
    }
  }, [battleEngine, battleMode]);

  // Auto-run
  useEffect(() => {
    if (!battleEngine || !autoBattle || battleMode !== 'running') return;
    if (battleState?.isPaused) return;

    const interval = setInterval(() => {
      const result = battleEngine.step();
      setBattleState(battleEngine.getState());
      setLastActionResult(result);

      if (result?.isBattleEnd) {
        setSimulationResult(battleEngine.getResult());
        setBattleMode('finished');
        clearInterval(interval);
      }
    }, 500 / speed);

    return () => clearInterval(interval);
  }, [battleEngine, autoBattle, battleMode, speed, battleState?.isPaused]);

  // Pause/Resume
  const togglePause = () => {
    if (!battleEngine) return;
    if (battleState?.isPaused) {
      battleEngine.resume();
    } else {
      battleEngine.pause();
    }
    setBattleState(battleEngine.getState());
  };

  // Reset battle
  const resetBattle = () => {
    setBattleEngine(null);
    setBattleState(null);
    setSimulationResult(null);
    setBattleMode('setup');
    setLastActionResult(null);
  };

  // Save test configuration
  const saveTestConfig = (configName: string = 'default') => {
    if (party.length === 0) return;

    const newConfigs = {
      ...savedTestConfigs,
      [configName]: { party, formation },
    };
    setSavedTestConfigs(newConfigs);
    localStorage.setItem('battle_test_configs', JSON.stringify(newConfigs));
  };

  // Load test configuration
  const loadTestConfig = (configName: string = 'default') => {
    const config = savedTestConfigs[configName];
    if (config) {
      setParty(config.party);
      setFormation(config.formation);
    }
  };

  // Auto-save on party/formation change
  useEffect(() => {
    if (battleMode === 'setup' && party.length > 0) {
      const config = {
        encounterId: selectedEncounterId,
        party,
        formation,
      };
      localStorage.setItem('prebattle_config', JSON.stringify(config));
    }
  }, [party, formation, selectedEncounterId, battleMode]);

  // Render Enhanced AT Bar
  const renderATBar = () => {
    if (!battleState) return null;

    const queueItems = battleState.actionQueue.slice(0, 12);
    const currentActorId = battleState.currentActor?.id;

    return (
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto" style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="text-xs font-medium shrink-0 mr-2" style={{ color: 'var(--color-text-secondary)' }}>AT:</div>
        {queueItems.map((item, index) => {
          const actor = item.actorType === 'ally'
            ? battleState.allies.find(a => a.id === item.actorId)
            : battleState.enemies.find(e => e.id === item.actorId);

          if (!actor) return null;

          const isCurrentActor = currentActorId === item.actorId && index === 0;
          const speedPercent = Math.min(100, (item.speed / 150) * 100);
          const hasSpeedChange = item.originalSpeed && item.originalSpeed !== item.speed;
          const speedDelta = hasSpeedChange ? item.speed - item.originalSpeed : 0;

          return (
            <div
              key={`${item.actorId}-${index}`}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs shrink-0 relative ${isCurrentActor ? 'ring-2 ring-offset-1' : ''}`}
              style={{
                background: actor.type === 'ally' ? 'var(--color-accent)' : '#ef4444',
                color: 'white',
                boxShadow: isCurrentActor ? (actor.type === 'ally' ? '0 0 8px var(--color-accent)' : '0 0 8px #ef4444') : 'none',
                ringColor: actor.type === 'ally' ? 'var(--color-accent)' : '#ef4444',
                border: item.isExtraTurn ? '2px solid #fbbf24' : item.isChase ? '2px solid #a855f7' : item.isDelayed ? '2px solid #6b7280' : undefined,
              }}
              title={`${actor.name} - 速度: ${item.speed}${item.action ? ' - 动作: ' + item.action : ''}${item.isExtraTurn ? ' - 额外行动' : ''}${item.isChase ? ' - 追击' : ''}`}
            >
              {/* Speed indicator bar */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b"
                style={{ background: `rgba(255,255,255,${speedPercent / 100})` }}
              />

              {/* Extra turn / Chase / Delayed badge */}
              {(item.isExtraTurn || item.isChase || item.isDelayed) && (
                <span className="text-[8px] bg-white/30 px-1 rounded shrink-0" title={item.isExtraTurn ? '额外行动' : item.isChase ? '追击' : '延迟'}>
                  {item.isExtraTurn ? '➕' : item.isChase ? '⚡' : '⏳'}
                </span>
              )}

              {/* Speed change indicator */}
              {hasSpeedChange && (
                <span className="text-[8px] shrink-0" style={{ color: speedDelta > 0 ? '#4ade80' : '#f87171' }} title={`速度变化: ${item.originalSpeed} → ${item.speed}`}>
                  {speedDelta > 0 ? '↑' : '↓'}
                </span>
              )}

              {/* Avatar circle */}
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                {actor.name.slice(0, 1)}
              </div>

              {/* Name */}
              <span className="truncate max-w-[60px]">{actor.name}</span>

              {/* Position badge */}
              {index < 3 && (
                <span className="text-[9px] bg-white/20 px-1 rounded">{index + 1}</span>
              )}

              {/* Action indicator */}
              {item.action && (
                <span className="text-[8px] opacity-75">
                  {item.action === 'attack' ? '⚔' : item.action === 'skill' ? '✨' : item.action === 'heal' ? '💚' : item.action === 'defend' ? '🛡' : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render Battlefield Grid
  const renderBattlefield = () => {
    if (!battleState) {
      // Setup mode - show empty grid
      return (
        <div className="flex-1 flex">
          {/* Ally Grid */}
          <div className="flex-1 p-4">
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>我方</div>
            <div 
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}
            >
              {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, index) => {
                const x = index % GRID_COLS;
                const y = Math.floor(index / GRID_COLS);
                const ally = party.find((_, i) => {
                  const f = formation[i];
                  return f && f.x === x && f.y === y;
                });
                const character = ally ? getCharacter(ally.characterId) : null;

                return (
                  <div
                    key={`ally-${index}`}
                    className={`aspect-square rounded flex items-center justify-center text-xs ${character ? '' : 'border-dashed'}`}
                    style={{
                      background: character ? 'var(--color-bg-tertiary)' : 'transparent',
                      border: character ? '1px solid var(--color-border)' : '1px dashed var(--color-border)',
                      color: character ? 'var(--color-text-primary)' : 'var(--color-text-disabled)',
                    }}
                  >
                    {character ? character.identity.name.slice(0, 2) : `${x},${y}`}
                  </div>
                );
              })}
            </div>
          </div>

          {/* VS Divider */}
          <div className="w-8 flex items-center justify-center">
            <div className="text-lg font-bold" style={{ color: 'var(--color-text-muted)' }}>VS</div>
          </div>

          {/* Enemy Grid */}
          <div className="flex-1 p-4">
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>敌方</div>
            <div 
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}
            >
              {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, index) => {
                const x = index % GRID_COLS;
                const y = Math.floor(index / GRID_COLS);
                const enemy = selectedEncounter?.members.find(m => m.x === x && m.y === y);
                const enemyData = enemy ? getEnemy(enemy.enemyId) : null;

                return (
                  <div
                    key={`enemy-${index}`}
                    className={`aspect-square rounded flex items-center justify-center text-xs ${enemyData ? '' : 'border-dashed'}`}
                    style={{
                      background: enemyData ? '#fef2f2' : 'transparent',
                      border: enemyData ? '1px solid #fecaca' : '1px dashed var(--color-border)',
                      color: enemyData ? '#991b1b' : 'var(--color-text-disabled)',
                    }}
                  >
                    {enemyData ? enemyData.name.slice(0, 2) : `${x},${y}`}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Running mode - show actual battle state
    return (
      <div className="flex-1 flex">
        {/* Ally Grid */}
        <div className="flex-1 p-4">
          <div className="text-xs font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <span>我方</span>
            <span className="text-[10px]">({battleState.allies.filter(a => a.isAlive).length}/{battleState.allies.length})</span>
          </div>
          <div 
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}
          >
            {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, index) => {
              const x = index % GRID_COLS;
              const y = Math.floor(index / GRID_COLS);
              const ally = battleState.allies.find(a => a.position.x === x && a.position.y === y);

              if (!ally) {
                return (
                  <div
                    key={`ally-${index}`}
                    className="aspect-square rounded border-dashed"
                    style={{ border: '1px dashed var(--color-border)' }}
                  />
                );
              }

              const isCurrentActor = battleState.currentActor?.id === ally.id;
              const hpPercent = (ally.hp / ally.maxHp) * 100;

              return (
                <div
                  key={`ally-${index}`}
                  className={`aspect-square rounded p-1 flex flex-col ${isCurrentActor ? 'ring-2' : ''}`}
                  style={{
                    background: ally.isAlive ? 'var(--color-bg-tertiary)' : '#1a1a1a',
                    boxShadow: isCurrentActor ? '0 0 0 2px var(--color-accent)' : 'none',
                    opacity: ally.isAlive ? 1 : 0.5,
                  }}
                >
                  <div className="text-[10px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {ally.name}
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--color-accent)', color: 'white' }}>
                      {ally.name.slice(0, 1)}
                    </div>
                  </div>
                  <div className="h-1 rounded overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
                    <div className="h-full transition-all" style={{ 
                      width: `${hpPercent}%`, 
                      background: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#f59e0b' : '#ef4444' 
                    }} />
                  </div>
                  <div className="text-[8px] text-center" style={{ color: 'var(--color-text-secondary)' }}>
                    {ally.hp}/{ally.maxHp}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* VS Divider */}
        <div className="w-8 flex items-center justify-center">
          <div className="text-lg font-bold" style={{ color: 'var(--color-text-muted)' }}>VS</div>
        </div>

        {/* Enemy Grid */}
        <div className="flex-1 p-4">
          <div className="text-xs font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <span>敌方</span>
            <span className="text-[10px]">({battleState.enemies.filter(e => e.isAlive).length}/{battleState.enemies.length})</span>
          </div>
          <div 
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}
          >
            {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, index) => {
              const x = index % GRID_COLS;
              const y = Math.floor(index / GRID_COLS);
              const enemy = battleState.enemies.find(e => e.position.x === x && e.position.y === y);

              if (!enemy) {
                return (
                  <div
                    key={`enemy-${index}`}
                    className="aspect-square rounded border-dashed"
                    style={{ border: '1px dashed var(--color-border)' }}
                  />
                );
              }

              const isCurrentActor = battleState.currentActor?.id === enemy.id;
              const hpPercent = (enemy.hp / enemy.maxHp) * 100;

              return (
                <div
                  key={`enemy-${index}`}
                  className={`aspect-square rounded p-1 flex flex-col ${isCurrentActor ? 'ring-2' : ''}`}
                  style={{
                    background: enemy.isAlive ? '#fef2f2' : '#1a1a1a',
                    ringColor: isCurrentActor ? '#ef4444' : 'transparent',
                    opacity: enemy.isAlive ? 1 : 0.5,
                  }}
                >
                  <div className="text-[10px] font-medium truncate" style={{ color: '#991b1b' }}>
                    {enemy.name}
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: '#ef4444', color: 'white' }}>
                      {enemy.name.slice(0, 1)}
                    </div>
                  </div>
                  <div className="h-1 rounded overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
                    <div className="h-full transition-all" style={{ 
                      width: `${hpPercent}%`, 
                      background: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#f59e0b' : '#ef4444' 
                    }} />
                  </div>
                  <div className="text-[8px] text-center" style={{ color: '#991b1b' }}>
                    {enemy.hp}/{enemy.maxHp}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render Setup Panel (Left)
  const renderSetupPanel = () => (
    <div className="w-64 border-r shrink-0 flex flex-col" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>战斗配置</h3>
      </div>

      {/* Encounter Selection */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>选择遭遇</label>
        <select
          className="w-full px-2 py-1.5 rounded text-sm"
          style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          value={selectedEncounterId || ''}
          onChange={(e) => setSelectedEncounterId(e.target.value || null)}
        >
          <option value="">-- 选择遭遇战 --</option>
          {project.enemyGroups.map(eg => (
            <option key={eg.id} value={eg.id}>
              {eg.name} (Lv.{eg.recommendedLevel}, 敌{eg.members?.length || 0})
            </option>
          ))}
        </select>
        {selectedEncounter && (
          <div className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <div>推荐等级: {selectedEncounter.recommendedLevel}</div>
            <div>危险度: {selectedEncounter.dangerLevel}</div>
            <div>敌人数量: {selectedEncounter.members?.length || 0}</div>
          </div>
        )}
      </div>

      {/* Party Selection */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          出战角色 ({party.length}/4)
        </div>
        <div className="space-y-1 max-h-48 overflow-auto">
          {playerCharacters.length === 0 ? (
            <div className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
              暂无可出战角色<br />
              <span className="text-[10px]">请在角色管理中添加"主角团"分类的角色</span>
            </div>
          ) : (
            playerCharacters.map(char => {
              const inParty = party.some(p => p.characterId === char.id);
              const isDisabled = battleMode === 'running' || (party.length >= 4 && !inParty);
              return (
                <button
                  key={char.id}
                  className={`w-full p-2 rounded text-left text-xs transition-all ${inParty ? '' : 'hover:ring-1 hover:ring-[var(--color-accent)]'}`}
                  style={{
                    background: inParty ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
                    border: inParty ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    opacity: isDisabled && !inParty ? 0.5 : 1,
                    cursor: isDisabled && !inParty ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => inParty ? removeFromParty(char.id) : addToParty(char.id)}
                  disabled={isDisabled}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-text-primary)' }}>{char.identity.name}</span>
                    {inParty ? (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-accent)', color: 'white' }}>己方</span>
                    ) : (
                      <span className="text-green-500 text-xs">+</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Speed & Auto */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>速度</div>
        <div className="flex gap-1 mb-2">
          {SPEED_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`flex-1 py-1 rounded text-xs ${speed === opt.value ? '' : 'opacity-50'}`}
              style={{ 
                background: speed === opt.value ? 'var(--color-accent)' : 'var(--color-bg-primary)',
                color: speed === opt.value ? 'white' : 'var(--color-text-primary)',
              }}
              onClick={() => setSpeed(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
          <input 
            type="checkbox" 
            checked={autoBattle}
            onChange={(e) => setAutoBattle(e.target.checked)}
            className="rounded"
          />
          <span>自动战斗</span>
        </label>
      </div>

      {/* Test Config Save/Load */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>测试阵容</div>
        <div className="flex gap-2">
          <button
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
            onClick={() => saveTestConfig('default')}
            disabled={party.length === 0}
            title="保存当前阵容"
          >
            <Save size={12} />
            <span>保存</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
            onClick={() => loadTestConfig('default')}
            disabled={!savedTestConfigs['default']}
            title="加载已保存阵容"
          >
            <FolderOpen size={12} />
            <span>加载</span>
          </button>
        </div>
        {savedTestConfigs['default'] && (
          <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            已保存: {savedTestConfigs['default'].party.length}人阵容
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 mt-auto">
        {battleMode === 'setup' ? (
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm"
            style={{ background: 'var(--color-accent)', color: 'white' }}
            onClick={startBattle}
            disabled={!selectedEncounter || party.length === 0}
          >
            <Play size={14} />
            <span>开始战斗</span>
          </button>
        ) : battleMode === 'running' ? (
          <div className="flex gap-2">
            <button
              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded text-xs"
              style={{ background: battleState?.isPaused ? '#22c55e' : '#f59e0b', color: 'white' }}
              onClick={togglePause}
            >
              {battleState?.isPaused ? <Play size={12} /> : <Pause size={12} />}
              <span>{battleState?.isPaused ? '继续' : '暂停'}</span>
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded text-xs"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
              onClick={stepBattle}
              disabled={!autoBattle}
            >
              <SkipForward size={12} />
              <span>单步</span>
            </button>
          </div>
        ) : (
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm"
            style={{ background: 'var(--color-accent)', color: 'white' }}
            onClick={resetBattle}
          >
            <RotateCcw size={14} />
            <span>重新开始</span>
          </button>
        )}
      </div>
    </div>
  );

  // Render Enhanced Right Inspector ("当前回合检视器")
  const renderInspector = () => {
    if (!battleState) {
      return (
        <div className="w-72 border-l shrink-0 p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-primary)' }}>战报</div>
          <div className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            开始战斗后显示详情
          </div>
        </div>
      );
    }

    const currentActor = battleState.currentActor;

    return (
      <div className="w-72 border-l shrink-0 flex flex-col" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>当前回合检视器</div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            T{battleState.currentTurn} R{battleState.currentRound}
          </div>
        </div>

        {/* Current Actor Info */}
        {currentActor && (
          <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: currentActor.type === 'ally' ? 'var(--color-accent)' : '#ef4444', color: 'white' }}
              >
                {currentActor.name.slice(0, 1)}
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{currentActor.name}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {currentActor.type === 'ally' ? '我方' : '敌方'} · Lv.{currentActor.level}
                </div>
              </div>
            </div>

            {/* HP Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--color-text-secondary)' }}>HP</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{currentActor.hp}/{currentActor.maxHp}</span>
              </div>
              <div className="h-2 rounded overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(currentActor.hp / currentActor.maxHp) * 100}%`,
                    background: currentActor.hp / currentActor.maxHp > 0.5 ? '#22c55e' : currentActor.hp / currentActor.maxHp > 0.25 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </div>
            </div>

            {/* MP Bar */}
            {currentActor.maxMp > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--color-text-secondary)' }}>MP</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{currentActor.mp}/{currentActor.maxMp}</span>
                </div>
                <div className="h-2 rounded overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(currentActor.mp / currentActor.maxMp) * 100}%`,
                      background: '#3b82f6'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                <Sword size={10} className="text-red-500" />
                <span>攻: {currentActor.attributes.attack}</span>
              </div>
              <div className="flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                <Shield size={10} className="text-blue-500" />
                <span>防: {currentActor.attributes.defense}</span>
              </div>
              <div className="flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                <Zap size={10} className="text-yellow-500" />
                <span>速: {currentActor.attributes.speed}</span>
              </div>
              <div className="flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                <Heart size={10} className="text-pink-500" />
                <span>暴: {currentActor.attributes.critRate}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Last Action Result - Detailed Breakdown */}
        {lastActionResult && (
          <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {lastActionResult.action === 'attack' ? '攻击' :
               lastActionResult.action === 'skill' ? '技能' :
               lastActionResult.action === 'heal' ? '治疗' :
               lastActionResult.action === 'defend' ? '防御' : '行动'}详情
            </div>

            {/* Target */}
            {lastActionResult.target && (
              <div className="mb-2 p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>目标</div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: lastActionResult.target.type === 'ally' ? 'var(--color-accent)' : '#ef4444', color: 'white' }}
                  >
                    {lastActionResult.target.name.slice(0, 1)}
                  </div>
                  <div className="text-xs">
                    <div style={{ color: 'var(--color-text-primary)' }}>{lastActionResult.target.name}</div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>
                      HP: {lastActionResult.target.hp}/{lastActionResult.target.maxHp}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hit/Crit/Resistance Modifiers */}
            {lastActionResult.damage && (
              <div className="mb-2 p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>命中/暴击/闪避</div>
                <div className="flex gap-3 mt-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span style={{ color: lastActionResult.isHit === false ? '#ef4444' : 'var(--color-text-secondary)' }}>
                      命中: {lastActionResult.hitChance || 95}%
                    </span>
                    {lastActionResult.isHit === false && <span className="text-red-500">(未命中)</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <span style={{ color: lastActionResult.isCrit ? '#f59e0b' : 'var(--color-text-secondary)' }}>
                      暴击: {lastActionResult.critChance || 5}%
                    </span>
                    {lastActionResult.isCrit && <span className="text-yellow-500">(暴击!)</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      闪避: {lastActionResult.resistanceChance || 5}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Damage Breakdown */}
            {lastActionResult.damage && (
              <div className="mb-2 p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>伤害拆解</div>
                <div className="space-y-1 mt-1 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-secondary)' }}>原始伤害</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{lastActionResult.damage.rawDamage}</span>
                  </div>
                  {lastActionResult.damage.defenseReduction > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-text-secondary)' }}>防御减伤</span>
                      <span style={{ color: '#ef4444' }}>-{lastActionResult.damage.defenseReduction}</span>
                    </div>
                  )}
                  {lastActionResult.isCrit && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-text-secondary)' }}>暴击加成</span>
                      <span style={{ color: '#f59e0b' }}>+{Math.round(lastActionResult.damage.rawDamage * 0.5)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium border-t pt-1" style={{ borderColor: 'var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-primary)' }}>最终伤害</span>
                    <span style={{ color: '#ef4444' }}>{lastActionResult.damage.finalDamage}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Healing Breakdown */}
            {lastActionResult.healing && (
              <div className="mb-2 p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>治疗量</div>
                <div className="flex justify-between text-xs mt-1">
                  <span style={{ color: 'var(--color-text-secondary)' }}>恢复生命</span>
                  <span style={{ color: '#22c55e' }}>+{lastActionResult.healing}</span>
                </div>
              </div>
            )}

            {/* Status Application */}
            {lastActionResult.statusEffects && lastActionResult.statusEffects.length > 0 && (
              <div className="mb-2 p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>状态施加</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {lastActionResult.statusEffects.map((status: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-xs"
                      style={{ background: '#fef3c7', color: '#92400e' }}
                    >
                      {status.name} ({status.turnsRemaining}回合)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Battle Summary */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>战斗统计</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>我方存活</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{battleState.allies.filter(a => a.isAlive).length}/{battleState.allies.length}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>敌方存活</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{battleState.enemies.filter(e => e.isAlive).length}/{battleState.enemies.length}</span>
            </div>
          </div>
        </div>

        {/* Recent Log */}
        <div className="flex-1 p-3 overflow-auto">
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>最近行动</div>
          <div className="space-y-1">
            {battleState.battleLog.slice(-8).reverse().map((log, index) => {
              const isEvent = log.eventType || log.action === 'battle_start' || log.action === 'battle_end';
              
              // 确定日志样式
              const getEventStyle = () => {
                switch (log.eventType) {
                  case 'victory':
                    return { bg: '#f0fdf4', border: '3px solid #22c55e', icon: '🏆' };
                  case 'defeat':
                    return { bg: '#fef2f2', border: '3px solid #ef4444', icon: '💀' };
                  case 'wave':
                  case 'wave-switch':
                    return { bg: '#eff6ff', border: '3px solid #3b82f6', icon: '🌊' };
                  case 'spawn':
                  case 'midway-spawn':
                    return { bg: '#fdf4ff', border: '3px solid #a855f7', icon: '👹' };
                  case 'battle-event':
                    return { bg: '#fff7ed', border: '3px solid #f59e0b', icon: '⚡' };
                  case 'judgement':
                    return { bg: '#fafafa', border: '3px solid #6b7280', icon: '⚖️' };
                  default:
                    return { bg: 'var(--color-bg-primary)', border: 'none', icon: '' };
                }
              };
              const eventStyle = getEventStyle();
              
              return (
                <div
                  key={index}
                  className="text-[10px] p-1.5 rounded"
                  style={{
                    background: isEvent ? eventStyle.bg : 'var(--color-bg-primary)',
                    borderLeft: eventStyle.border
                  }}
                >
                  <span className="text-[var(--color-text-muted)]">[{log.turn}-{log.round}]</span>{' '}
                  {eventStyle.icon && <span>{eventStyle.icon} </span>}
                  {!isEvent && (
                    <span style={{ color: log.actorType === 'ally' ? 'var(--color-text-primary)' : '#991b1b' }}>
                      {log.actorName}
                    </span>
                  )}
                  <span style={{ color: isEvent ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)' }}>
                    {' '}{log.message}
                  </span>
                  {log.judgementDetails && (
                    <div className="text-[9px] mt-1 pl-2" style={{ color: 'var(--color-text-muted)' }}>
                      判定依据: {log.judgementDetails.condition} · {log.judgementDetails.trigger}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render Battle Result
  const renderResult = () => {
    if (!simulationResult) return null;

    return (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="w-96 p-6 rounded-lg" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
          <div className="text-center mb-4">
            <div 
              className="text-3xl font-bold mb-2"
              style={{ 
                color: simulationResult.winner === 'ally' ? '#22c55e' : simulationResult.winner === 'enemy' ? '#ef4444' : '#f59e0b'
              }}
            >
              {simulationResult.winner === 'ally' ? '胜利！' : simulationResult.winner === 'enemy' ? '失败' : '平局'}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              用时: {simulationResult.totalTurns} 回合 · {simulationResult.totalRounds} 轮
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-text-secondary)' }}>我方存活</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{simulationResult.survivingAllies}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-text-secondary)' }}>敌方存活</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{simulationResult.survivingEnemies}</span>
            </div>
          </div>

          {/* Damage Stats */}
          <div className="mb-4">
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>伤害统计</div>
            <div className="space-y-1 max-h-32 overflow-auto">
              {Object.entries(simulationResult.damageDealt).map(([id, damage]) => {
                const actor = battleState?.allies.find(a => a.id === id) || battleState?.enemies.find(e => e.id === id);
                return (
                  <div key={id} className="flex justify-between text-xs">
                    <span style={{ color: 'var(--color-text-secondary)' }}>{actor?.name || id}</span>
                    <span style={{ color: '#ef4444' }}>造成 {damage}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Healing Stats */}
          {Object.keys(simulationResult.healingDone).length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>治疗统计</div>
              <div className="space-y-1">
                {Object.entries(simulationResult.healingDone).map(([id, healing]) => {
                  const actor = battleState?.allies.find(a => a.id === id);
                  return (
                    <div key={id} className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text-secondary)' }}>{actor?.name || id}</span>
                      <span style={{ color: '#22c55e' }}>治疗 {healing}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm"
            style={{ background: 'var(--color-accent)', color: 'white' }}
            onClick={resetBattle}
          >
            <RotateCcw size={14} />
            <span>再来一局</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b shrink-0" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <Sword size={16} style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>战斗模拟</span>
        </div>
        <div className="flex items-center gap-2">
          {battleMode !== 'setup' && (
            <button
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
              onClick={() => setDrawerTab('combat-log')}
            >
              <AlertTriangle size={12} />
              <span>战斗日志</span>
            </button>
          )}
        </div>
      </div>

      {/* AT Bar */}
      {battleMode === 'running' && renderATBar()}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Setup Panel */}
        {renderSetupPanel()}

        {/* Center: Battlefield */}
        {renderBattlefield()}

        {/* Right: Inspector */}
        {renderInspector()}
      </div>

      {/* Result Overlay */}
      {renderResult()}
    </div>
  );
};
