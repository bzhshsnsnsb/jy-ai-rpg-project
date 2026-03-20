import React, { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useUIStore } from '../../../stores/uiStore';
import { BattleEngine } from '../../../engine/BattleEngine';
import { BarChart3, Filter, Play, RefreshCw, Shield, Sparkles, Sword, Users } from 'lucide-react';

type MetricTone = 'good' | 'warning' | 'danger';

interface AnalysisResult {
  winRate: number;
  avgTurns: number;
  teamWipeRate: number;
  carryShare: number;
  speedSpread: number;
  frontlineRatio: number;
  healRatio: number;
  frontlineDamageShare: number;
  backlineDamageShare: number;
  healingOverflowRate: number;
  counterScore: number;
  counterSummary: string;
  pattern: string;
  topDealer: string;
  advice: string[];
  unusedSkills: string[];
}

const inferRole = (character: any, jobMap: Map<string, any>) => {
  const job = character.jobId ? jobMap.get(character.jobId) : undefined;
  const tags = (character.identity?.tags || []).join('|');
  if (job?.role) return job.role;
  if (/坦克|前排/.test(tags)) return 'tank';
  if (/治疗/.test(tags)) return 'healer';
  if (/辅助/.test(tags)) return 'support';
  if (/控制/.test(tags)) return 'control';
  return 'damage';
};

const inferEnemyArchetype = (enemy: any) => {
  const attrs = enemy?.attributes || {};
  const attack = Number(attrs.attack || 0);
  const magicAttack = Number(attrs.magicAttack || attrs.magic || 0);
  const defense = Number(attrs.defense || 0);
  const magicDefense = Number(attrs.magicDefense || attrs.resistance || 0);
  const hp = Number(attrs.hp || 0);
  const speed = Number(attrs.speed || 0);

  if (magicAttack > attack * 1.15) return 'mage';
  if (hp > 1200 || defense + magicDefense > 180) return 'tank';
  if (speed > 110) return 'assassin';
  return 'fighter';
};

const getEncounterTargets = (encounter: any) => {
  switch (encounter?.encounterType) {
    case 'tutorial':
      return { turnRange: [3, 5], winRange: [75, 92] };
    case 'elite':
      return { turnRange: [6, 9], winRange: [45, 65] };
    case 'boss':
      return { turnRange: [8, 12], winRange: [35, 55] };
    default:
      return { turnRange: [5, 8], winRange: [55, 72] };
  }
};

const getCounterSummary = (partyRoles: string[], enemyArchetypes: string[]) => {
  let score = 55;
  const notes: string[] = [];

  if (enemyArchetypes.includes('tank')) {
    if (partyRoles.includes('mage')) {
      score += 12;
      notes.push('法系火力能穿透高护甲目标');
    } else {
      score -= 10;
      notes.push('敌方偏坦，但队伍缺少稳定法术破防点');
    }
  }

  if (enemyArchetypes.includes('mage')) {
    if (partyRoles.includes('damage') || partyRoles.includes('control')) {
      score += 8;
      notes.push('高爆发或控制位能压制敌方法系后排');
    } else {
      score -= 8;
      notes.push('敌方法系偏多，后排压制能力不足');
    }
  }

  if (enemyArchetypes.includes('assassin')) {
    if (partyRoles.includes('tank')) {
      score += 10;
      notes.push('前排能有效兜住敌方高速突进');
    } else {
      score -= 12;
      notes.push('敌方高速位较多，但己方没有稳定前排');
    }
  }

  if (enemyArchetypes.includes('fighter') && partyRoles.includes('healer')) {
    score += 6;
    notes.push('续航能力有助于处理持续对撞');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    summary: notes.length > 0 ? notes.join('；') : '当前敌我职业对位较为中性',
  };
};

const metricBadge = (value: number, min: number, max: number): MetricTone => {
  if (value >= min && value <= max) return 'good';
  if (value >= min * 0.8 && value <= max * 1.2) return 'warning';
  return 'danger';
};

const toneStyle: Record<MetricTone, { bg: string; text: string }> = {
  good: { bg: 'rgba(34, 197, 94, 0.10)', text: '#22c55e' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' },
  danger: { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' },
};

export const BalanceAnalysisEditor: React.FC = () => {
  const { project } = useProjectStore();
  const { setDrawerTab } = useUIStore();
  const encounters = useMemo(() => project.enemyGroups, [project.enemyGroups]);
  const characters = useMemo(
    () => project.characters.filter((character) => !character.category || character.category === 'player'),
    [project.characters],
  );
  const jobMap = useMemo(() => new Map(project.jobs.map((job) => [job.id, job])), [project.jobs]);

  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [party, setParty] = useState<string[]>([]);
  const [count, setCount] = useState(50);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (characters.length === 0 || party.length > 0) return;
    setParty(characters.slice(0, 4).map((character) => character.id));
    setEncounterId(encounters[0]?.id || null);
  }, [characters, encounters, party.length]);

  const selectedEncounter = useMemo(
    () => encounters.find((encounter) => encounter.id === encounterId) || null,
    [encounterId, encounters],
  );

  const profiles = useMemo(() => {
    return party.map((id) => {
      const character = characters.find((item) => item.id === id)!;
      const base = character.attributes?.baseStats || {};
      const hp = Number(base.hp ?? character.initialAttributes?.initialHp ?? 100);
      const defense = Number(base.defense ?? 5);
      const magicDefense = Number(base.magicDefense ?? base.resistance ?? 5);
      const speed = Number(base.speed ?? 10);
      const healPower = Number(base.healPower ?? base.heal ?? 0);
      const role = inferRole(character, jobMap);
      return {
        id,
        name: character.identity.name,
        role,
        speed,
        healPower,
        effectiveHp: Math.round(hp * (1 + (defense + magicDefense * 0.65) / 220)),
        frontline: role === 'tank' || /前排|坦克/.test((character.identity.tags || []).join('|')),
      };
    });
  }, [characters, jobMap, party]);

  const runAnalysis = async () => {
    if (!selectedEncounter || profiles.length === 0) {
      setNotice('先选择一个遭遇和至少 1 名角色。');
      return;
    }

    setRunning(true);
    setNotice(null);

    const formation = profiles.map((profile, index) => ({
      characterId: profile.id,
      level: 1,
      x: index % 2,
      y: Math.floor(index / 2),
    }));

    const totals = new Map<string, { damage: number; healing: number; damageTaken: number }>();
    const usedSkills = new Set<string>();
    let wins = 0;
    let turns = 0;
    let wipes = 0;
    let totalDamageTaken = 0;
    let totalOverheal = 0;

    for (let index = 0; index < count; index += 1) {
      const engine = new BattleEngine({
        party: formation.map(({ characterId, level }) => ({ characterId, level })),
        formation: formation.map(({ characterId, x, y }) => ({ characterId, x, y })),
        resources: {},
        encounter: selectedEncounter,
        characters: project.characters,
        enemies: project.enemies,
        speed: 1,
        autoBattle: true,
      });

      const simulation = engine.runFullBattle();
      if (simulation.winner === 'ally') wins += 1;
      if (simulation.survivingAllies === 0) wipes += 1;
      turns += simulation.totalTurns;
      totalDamageTaken += Object.values(simulation.damageTaken).reduce((sum, value) => sum + value, 0);
      totalOverheal += Object.values(simulation.overhealingDone || {}).reduce((sum, value) => sum + value, 0);

      Object.keys(simulation.skillsUsed || {}).forEach((skillId) => usedSkills.add(skillId));
      profiles.forEach((profile) => {
        const row = totals.get(profile.id) || { damage: 0, healing: 0, damageTaken: 0 };
        row.damage += simulation.damageDealt[profile.id] || 0;
        row.healing += simulation.healingDone[profile.id] || 0;
        row.damageTaken += simulation.damageTaken[profile.id] || 0;
        totals.set(profile.id, row);
      });
    }

    const ranked = profiles
      .map((profile) => ({ ...profile, ...(totals.get(profile.id) || { damage: 0, healing: 0, damageTaken: 0 }) }))
      .sort((left, right) => right.damage - left.damage);

    const totalDamage = ranked.reduce((sum, item) => sum + item.damage, 0);
    const totalHealing = ranked.reduce((sum, item) => sum + item.healing, 0);
    const frontline = ranked.filter((item) => item.frontline);
    const backline = ranked.filter((item) => !item.frontline);
    const frontlineRatio =
      frontline.length > 0 && backline.length > 0
        ? frontline.reduce((sum, item) => sum + item.effectiveHp, 0) / frontline.length /
          (backline.reduce((sum, item) => sum + item.effectiveHp, 0) / backline.length)
        : 0;
    const frontlineDamageShare = totalDamageTaken > 0
      ? frontline.reduce((sum, item) => sum + item.damageTaken, 0) / totalDamageTaken
      : 0;
    const backlineDamageShare = totalDamageTaken > 0
      ? backline.reduce((sum, item) => sum + item.damageTaken, 0) / totalDamageTaken
      : 0;
    const speedSpread =
      profiles.length > 1
        ? Math.max(...profiles.map((profile) => profile.speed)) / Math.max(1, Math.min(...profiles.map((profile) => profile.speed)))
        : 1;
    const healRatio = totalDamageTaken > 0 ? totalHealing / totalDamageTaken : 0;
    const healingOverflowRate = totalHealing + totalOverheal > 0 ? totalOverheal / (totalHealing + totalOverheal) : 0;
    const carryShare = totalDamage > 0 ? (ranked[0]?.damage || 0) / totalDamage * 100 : 0;

    const enemyArchetypes = (selectedEncounter.members || [])
      .map((member) => project.enemies.find((enemy) => enemy.id === member.enemyId))
      .filter(Boolean)
      .map((enemy) => inferEnemyArchetype(enemy));
    const partyRoles = profiles.map((profile) => profile.role);
    const counterInfo = getCounterSummary(partyRoles, enemyArchetypes);

    const learnedSkills = new Set<string>();
    profiles.forEach((profile) => {
      const character = project.characters.find((item) => item.id === profile.id);
      (character?.skillConfig?.initialSkills || []).forEach((skillId) => learnedSkills.add(skillId));
    });

    const advice = [
      wins / count < 0.55 ? '胜率偏低，优先补前排或降低敌人前 3 回合爆发。' : null,
      wipes / count > 0.25 ? '团灭率过高，建议检查敌群首轮节奏和治疗承接。' : null,
      speedSpread > 1.55 ? '速度差过大，建议压缩速度成长差，避免先手链统治。' : null,
      carryShare > 50 ? '输出过度集中在单核，考虑补副 C 或控制位。' : null,
      healRatio < 0.18 && selectedEncounter.encounterType !== 'tutorial' ? '回复覆盖偏低，精英战和 Boss 战建议保留治疗或强辅助位。' : null,
      frontlineRatio > 0 && frontlineRatio < 1.6 ? '前排和后排耐久差太小，站位价值不够明显。' : null,
      backlineDamageShare > 0.45 ? '后排承伤占比过高，需要更稳的前排或更强的控制承接。' : null,
      healingOverflowRate > 0.35 ? '治疗溢出偏高，当前奶量有浪费，建议把部分治疗能力改成增益或控制。' : null,
      counterInfo.score < 45 ? `职业克制偏弱：${counterInfo.summary}` : null,
    ].filter(Boolean) as string[];

    setResult({
      winRate: (wins / count) * 100,
      avgTurns: turns / count,
      teamWipeRate: (wipes / count) * 100,
      carryShare,
      speedSpread,
      frontlineRatio,
      healRatio: healRatio * 100,
      frontlineDamageShare: frontlineDamageShare * 100,
      backlineDamageShare: backlineDamageShare * 100,
      healingOverflowRate: healingOverflowRate * 100,
      counterScore: counterInfo.score,
      counterSummary: counterInfo.summary,
      pattern:
        carryShare > 50
          ? '单核爆发'
          : healRatio > 0.28 && turns / count > 9
            ? '持久消耗'
            : speedSpread > 1.4
              ? '先手压制'
              : '均衡战棋',
      topDealer: ranked[0]?.name || '-',
      advice,
      unusedSkills: Array.from(learnedSkills).filter((skillId) => !usedSkills.has(skillId)),
    });

    setRunning(false);
  };

  const exportAnalysis = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ encounter: selectedEncounter?.name, party, count, result }, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `balance-analysis-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const badge = (value: number, min: number, max: number) => {
    const tone = metricBadge(value, min, max);
    const style = toneStyle[tone];
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.text }}>
        {tone === 'good' ? '健康' : tone === 'warning' ? '观察' : '危险'}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="h-10 flex items-center justify-between px-4 border-b shrink-0" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <BarChart3 size={16} style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>数值平衡分析</span>
        </div>
        <button className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }} onClick={() => setDrawerTab('analysis-log')}>
          <Sparkles size={12} />
          <span>分析日志</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r shrink-0 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <Filter size={14} style={{ color: 'var(--color-accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>分析配置</span>
            </div>
            <label className="block text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              遭遇
              <select
                className="w-full px-2 py-2 rounded text-sm mt-1"
                style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                value={encounterId || ''}
                onChange={(event) => {
                  setResult(null);
                  setEncounterId(event.target.value || null);
                }}
              >
                <option value="">请选择遭遇</option>
                {encounters.map((encounter) => <option key={encounter.id} value={encounter.id}>{encounter.name} / Lv.{encounter.recommendedLevel}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 50, 200].map((item) => (
                <button
                  key={item}
                  className="py-2 rounded text-xs border"
                  style={{
                    background: count === item ? 'var(--color-accent)' : 'var(--color-bg-primary)',
                    color: count === item ? '#fff' : 'var(--color-text-primary)',
                    borderColor: count === item ? 'transparent' : 'var(--color-border)',
                  }}
                  onClick={() => {
                    setResult(null);
                    setCount(item);
                  }}
                >
                  {item} 次
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} style={{ color: 'var(--color-accent)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>出战角色 ({party.length}/4)</span>
            </div>
            <div className="space-y-2 max-h-72 overflow-auto">
              {characters.map((character) => {
                const selected = party.includes(character.id);
                return (
                  <button
                    key={character.id}
                    className="w-full text-left p-2 rounded border"
                    style={{
                      background: selected ? 'rgba(59, 130, 246, 0.10)' : 'var(--color-bg-primary)',
                      borderColor: selected ? 'rgba(59, 130, 246, 0.40)' : 'var(--color-border)',
                    }}
                    onClick={() => {
                      setResult(null);
                      setParty((current) =>
                        current.includes(character.id)
                          ? current.filter((id) => id !== character.id)
                          : current.length >= 4
                            ? current
                            : [...current, character.id],
                      );
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{character.identity.name}</span>
                      <span className="text-[10px]" style={{ color: selected ? '#60a5fa' : 'var(--color-text-muted)' }}>
                        {selected ? '已选' : inferRole(character, jobMap)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 mt-auto space-y-3">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm" style={{ background: 'var(--color-accent)', color: '#fff' }} disabled={running} onClick={runAnalysis}>
              {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              <span>{running ? '分析中...' : '开始分析'}</span>
            </button>
            {notice && <div className="rounded p-3 text-xs" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>{notice}</div>}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {!result ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-xl" style={{ color: 'var(--color-text-muted)' }}>
                <BarChart3 size={54} className="mx-auto mb-4 opacity-50" />
                <div className="text-xl mb-3" style={{ color: 'var(--color-text-primary)' }}>策略 RPG 数值体检</div>
                <div className="text-sm">这里会同时看胜率、回合节奏、前后排承伤分布、治疗溢出和职业克制，不只判断能不能打赢。</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: '胜率', value: `${result.winRate.toFixed(1)}%`, tone: result.winRate >= 55 ? '#22c55e' : '#ef4444', icon: <Sword size={15} /> },
                  { label: '平均回合', value: result.avgTurns.toFixed(1), tone: '#3b82f6', icon: <BarChart3 size={15} /> },
                  { label: '团灭率', value: `${result.teamWipeRate.toFixed(1)}%`, tone: result.teamWipeRate <= 20 ? '#22c55e' : '#ef4444', icon: <Shield size={15} /> },
                  { label: '战斗画像', value: result.pattern, tone: '#a855f7', icon: <Sparkles size={15} /> },
                ].map((card) => (
                  <div key={card.label} className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{card.label}</span>
                      <span style={{ color: card.tone }}>{card.icon}</span>
                    </div>
                    <div className="text-2xl font-semibold" style={{ color: card.tone }}>{card.value}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>SRPG 设计基线</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '胜率带', value: `${result.winRate.toFixed(1)}%`, target: `${getEncounterTargets(selectedEncounter).winRange[0]}% - ${getEncounterTargets(selectedEncounter).winRange[1]}%`, note: '关卡要可过，但不能无脑碾压。', badge: badge(result.winRate, getEncounterTargets(selectedEncounter).winRange[0], getEncounterTargets(selectedEncounter).winRange[1]) },
                    { label: '战斗节奏', value: `${result.avgTurns.toFixed(1)} 回合`, target: `${getEncounterTargets(selectedEncounter).turnRange[0]} - ${getEncounterTargets(selectedEncounter).turnRange[1]} 回合`, note: '战棋普通战不宜拖成慢性磨血。', badge: badge(result.avgTurns, getEncounterTargets(selectedEncounter).turnRange[0], getEncounterTargets(selectedEncounter).turnRange[1]) },
                    { label: '前排纵深', value: `${result.frontlineRatio.toFixed(2)}x`, target: '1.60x - 2.20x', note: '前排应明显比后排更耐打。', badge: badge(result.frontlineRatio, 1.6, 2.2) },
                    { label: '速度离散度', value: `${result.speedSpread.toFixed(2)}x`, target: '1.15x - 1.45x', note: '速度差太大时会抬高先手价值。', badge: badge(result.speedSpread, 1.15, 1.45) },
                    { label: '输出集中度', value: `${result.carryShare.toFixed(1)}%`, target: '28% - 45%', note: '单核可存在，但不该压死其他位。', badge: badge(result.carryShare, 28, 45) },
                    { label: '治疗占比', value: `${result.healRatio.toFixed(1)}%`, target: '18% - 35%', note: '过低像对撞，过高会拖回合。', badge: badge(result.healRatio, 18, 35) },
                    { label: '前排承伤', value: `${result.frontlineDamageShare.toFixed(1)}%`, target: '55% - 75%', note: '战棋站位应该让前排承担更多伤害。', badge: badge(result.frontlineDamageShare, 55, 75) },
                    { label: '后排承伤', value: `${result.backlineDamageShare.toFixed(1)}%`, target: '25% - 45%', note: '后排被切到太多时需要补控制或前排。', badge: badge(result.backlineDamageShare, 25, 45) },
                    { label: '治疗溢出', value: `${result.healingOverflowRate.toFixed(1)}%`, target: '0% - 25%', note: '溢出过高代表治疗预算浪费。', badge: badge(result.healingOverflowRate, 0, 25) },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg border" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.label}</div>
                        {item.badge}
                      </div>
                      <div className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.value}</div>
                      <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>目标: {item.target}</div>
                      <div className="text-[11px] mt-2" style={{ color: 'var(--color-text-secondary)' }}>{item.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <div className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>职业克制</div>
                  <div className="text-3xl font-semibold" style={{ color: result.counterScore >= 60 ? '#22c55e' : result.counterScore >= 45 ? '#f59e0b' : '#ef4444' }}>
                    {result.counterScore}
                  </div>
                  <div className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>{result.counterSummary}</div>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <div className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>策划建议</div>
                  <div className="space-y-2">
                    {result.advice.length > 0 ? result.advice.map((item) => (
                      <div key={item} className="text-xs p-2 rounded" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>{item}</div>
                    )) : (
                      <div className="text-xs p-2 rounded" style={{ background: 'rgba(34, 197, 94, 0.10)', color: '#22c55e' }}>当前阵容落在较健康的策略带内，可以继续微调角色特色。</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 border-l shrink-0 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>策划摘要</span>
          </div>
          {result ? (
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.10)', color: '#3b82f6' }}>
                <div className="text-xs font-medium">当前最强输出</div>
                <div className="text-sm mt-1">{result.topDealer}</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)' }}>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>职业对位说明</div>
                <div className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{result.counterSummary}</div>
              </div>
              {result.unusedSkills.length > 0 && (
                <div className="p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                  <div className="text-xs font-medium">未触发技能</div>
                  <div className="text-[11px] mt-1">{result.unusedSkills.join(' / ')}</div>
                </div>
              )}
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} onClick={exportAnalysis}>
                <Sparkles size={14} />
                <span>导出分析结果</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                运行分析后，这里会给出更偏战棋策划视角的阵容建议。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
