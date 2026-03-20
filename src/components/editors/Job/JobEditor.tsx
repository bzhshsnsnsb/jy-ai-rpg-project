import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import { useUIStore } from '../../../stores/uiStore';
import type { Job, JobType, JobRole, ExperienceCurve, LearnableSkill, JobTrait, EquipmentPermission, GrowthType } from '../../../types';
import {
  Plus, Trash2, ChevronRight, ChevronDown, Save, AlertTriangle, Info,
  Sword, Shield, Zap, Heart, Sparkles, Users, Target, Award, Package, Activity, Loader2
} from 'lucide-react';
import { callAI, validateBeforeAI } from '../../../services/aiService';

// Job type config - icon as component so we can use React.createElement(Icon, props)
type IconComponent = React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
const jobTypeConfig: { id: JobType; label: string; icon: IconComponent; color: string }[] = [
  { id: 'warrior', label: '战士', icon: Sword, color: '#ef4444' },
  { id: 'mage', label: '法师', icon: Sparkles, color: '#3b82f6' },
  { id: 'priest', label: '牧师', icon: Heart, color: '#22c55e' },
  { id: 'assassin', label: '刺客', icon: Zap, color: '#8b5cf6' },
  { id: 'tank', label: '坦克', icon: Shield, color: '#f59e0b' },
  { id: 'support', label: '辅助', icon: Users, color: '#ec4899' },
  { id: 'special', label: '特殊', icon: Award, color: '#06b6d4' },
];

// Role config
const roleConfig: { id: JobRole; label: string }[] = [
  { id: 'damage', label: '输出' },
  { id: 'tank', label: '坦克' },
  { id: 'healer', label: '治疗' },
  { id: 'support', label: '辅助' },
  { id: 'control', label: '控制' },
  { id: 'hybrid', label: '混合' },
];

// Weapon types
const weaponTypes = [
  { id: 'sword', label: '剑' },
  { id: 'axe', label: '斧' },
  { id: 'hammer', label: '锤' },
  { id: 'dagger', label: '匕首' },
  { id: 'bow', label: '弓' },
  { id: 'staff', label: '法杖' },
  { id: 'wand', label: '魔杖' },
  { id: 'polearm', label: '长矛' },
];

// Armor types
const armorTypes = [
  { id: 'heavy', label: '重甲' },
  { id: 'medium', label: '中甲' },
  { id: 'light', label: '轻甲' },
  { id: 'cloth', label: '布甲' },
];

// Accessory types
const accessoryTypes = [
  { id: 'ring', label: '戒指' },
  { id: 'necklace', label: '项链' },
  { id: 'bracelet', label: '手镯' },
  { id: 'belt', label: '腰带' },
];

// Position tendencies
const positionTendencies = [
  { id: 'front', label: '前排' },
  { id: 'back', label: '后排' },
  { id: 'middle', label: '中排' },
  { id: 'any', label: '任意' },
];

// Stat types
const statTypes = ['hp', 'mp', 'attack', 'defense', 'speed', 'critRate', 'critDamage', 'magicAttack', 'magicDefense'];

// 经验曲线图组件：等级 1~99 累计经验可视化
const CHART_WIDTH = 560;
const CHART_HEIGHT = 180;
const PAD = { top: 12, right: 12, bottom: 24, left: 48 };

const ExperienceCurveChart: React.FC<{
  curve?: ExperienceCurve;
  calculateExp: (level: number, curve?: ExperienceCurve) => number;
}> = ({ curve, calculateExp }) => {
  // 直接计算，不缓存，确保参数变化时重新渲染
  const levels = Array.from({ length: 99 }, (_, i) => i + 1);
  if (!curve) {
    return (
      <div className="flex items-center justify-center rounded text-xs" style={{ height: CHART_HEIGHT, color: 'var(--color-text-muted)' }}>
        配置经验曲线参数后显示图表
      </div>
    );
  }

  const pts = levels.map(level => ({ level, exp: calculateExp(level, curve) }));
  const maxExp = Math.max(1, ...pts.map(p => p.exp));
  const w = CHART_WIDTH - PAD.left - PAD.right;
  const h = CHART_HEIGHT - PAD.top - PAD.bottom;
  const pathStr = pts
    .map((p, i) => {
      const x = PAD.left + (i / (pts.length - 1 || 1)) * w;
      const y = PAD.top + h - (p.exp / maxExp) * h;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const gradientId = `expCurveGradient-${curve.baseValue}-${curve.extraValue}-${curve.accelerationA}-${curve.accelerationB}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => ({
    value: Math.round(maxExp * r),
    y: PAD.top + h - r * h,
  }));

  return (
    <div className="overflow-x-auto">
      <svg width={CHART_WIDTH} height={CHART_HEIGHT} className="min-w-0">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 网格线 */}
        {yTicks.slice(1, -1).map((t, i) => (
          <line
            key={i}
            x1={PAD.left}
            y1={t.y}
            x2={CHART_WIDTH - PAD.right}
            y2={t.y}
            stroke="var(--color-border)"
            strokeDasharray="4 2"
            strokeOpacity="0.6"
          />
        ))}
        {[10, 30, 50, 70, 90].map((level, i) => {
          const x = PAD.left + (level / 99) * w;
          return (
            <line
              key={i}
              x1={x}
              y1={PAD.top}
              x2={x}
              y2={CHART_HEIGHT - PAD.bottom}
              stroke="var(--color-border)"
              strokeDasharray="4 2"
              strokeOpacity="0.6"
            />
          );
        })}
        {/* Y 轴刻度 */}
        {yTicks.map((t, i) => (
          <text
            key={i}
            x={PAD.left - 6}
            y={t.y + 4}
            textAnchor="end"
            className="fill-current text-[10px]"
            style={{ fill: 'var(--color-text-muted)' }}
          >
            {t.value >= 1e6 ? `${(t.value / 1e6).toFixed(1)}M` : t.value >= 1e3 ? `${(t.value / 1e3).toFixed(0)}k` : t.value}
          </text>
        ))}
        {/* X 轴刻度 */}
        {[1, 25, 50, 75, 99].map(lvl => {
          const x = PAD.left + ((lvl - 1) / 98) * w;
          return (
            <text
              key={lvl}
              x={x}
              y={CHART_HEIGHT - 6}
              textAnchor="middle"
              className="fill-current text-[10px]"
              style={{ fill: 'var(--color-text-muted)' }}
            >
              Lv.{lvl}
            </text>
          );
        })}
        {/* 面积填充 + 折线 */}
        <path
          d={`${pathStr} L ${PAD.left + w} ${PAD.top + h} L ${PAD.left} ${PAD.top + h} Z`}
          fill={`url(#${gradientId})`}
        />
        <path
          d={pathStr}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export const JobEditor: React.FC = () => {
  const { project, addJob, updateJob, deleteJob } = useProjectStore();
  const { setDebugJobId, activeEntityId, activeEditor } = useEditorStore();
  const { setDrawerTab } = useUIStore();
  const { jobs, skills } = project;

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<JobType>>(new Set(['warrior', 'mage', 'priest', 'assassin']));
  const [activeTab, setActiveTab] = useState<'basic' | 'experience' | 'growth' | 'skills' | 'traits' | 'equipment'>('basic');
  const [isGeneratingStats, setIsGeneratingStats] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync with store's activeEntityId when editor becomes active
  React.useEffect(() => {
    if (activeEditor === 'jobs' && activeEntityId) {
      const exists = jobs.some(j => j.id === activeEntityId);
      if (exists) {
        setSelectedJobId(activeEntityId);
      } else if (jobs.length > 0) {
        setSelectedJobId(jobs[0].id);
      }
    }
  }, [activeEditor, activeEntityId, jobs]);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Sync selected job to bottom drawer
  React.useEffect(() => {
    if (selectedJobId) {
      setDebugJobId(selectedJobId);
      setDrawerTab('job-log');
    }
  }, [selectedJobId, setDebugJobId, setDrawerTab]);

  // Group jobs by type
  const jobsByType = useMemo(() => {
    const grouped: Record<JobType, Job[]> = {
      warrior: [], mage: [], priest: [], assassin: [], tank: [], support: [], special: []
    };
    jobs.forEach(j => {
      const type = j.jobType || 'special';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(j);
    });
    return grouped;
  }, [jobs]);

  // Validation
  const validation = useMemo(() => {
    const issues: { type: 'error' | 'warning'; message: string }[] = [];
    if (!selectedJob) return issues;

    if (!selectedJob.name) issues.push({ type: 'error', message: '缺少职业名称' });
    if (!selectedJob.description) issues.push({ type: 'warning', message: '缺少职业描述' });
    if (!selectedJob.growth?.experienceCurve) issues.push({ type: 'warning', message: '缺少经验曲线配置' });
    if (selectedJob.learnableSkills?.length === 0) issues.push({ type: 'warning', message: '建议添加可学习技能' });
    if (selectedJob.traits?.length === 0) issues.push({ type: 'warning', message: '建议添加职业特性' });
    if (!selectedJob.equipmentPermissions?.weaponTypes?.length) issues.push({ type: 'error', message: '缺少装备权限' });

    return issues;
  }, [selectedJob]);

  // Risk detection
  const jobRisks = useMemo(() => {
    const risks: string[] = [];
    if (!selectedJob) return risks;

    if (!selectedJob.growth?.experienceCurve) risks.push('缺少经验曲线');
    if (!selectedJob.growth?.statGrowth) risks.push('缺少成长曲线');
    if (!selectedJob.equipmentPermissions?.weaponTypes?.length) risks.push('缺少装备权限');
    if (selectedJob.learnableSkills?.length === 0) risks.push('缺少可学习技能');
    
    // Check for skill learning gaps
    if (selectedJob.learnableSkills?.length > 1) {
      const levels = selectedJob.learnableSkills.map(s => s.learnLevel).sort((a, b) => a - b);
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] - levels[i-1] > 10) risks.push(`技能学习空窗: Lv${levels[i-1]}到Lv${levels[i]}`);
      }
    }

    return risks;
  }, [selectedJob]);

  const toggleType = (typeId: JobType) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  };

  const createNewJob = (type: JobType) => {
    const newJob: Job = {
      id: `job-${Date.now()}`,
      name: '新职业',
      jobType: type,
      role: 'damage',
      description: '',
      defaultWeaponTendency: 'sword',
      defaultPositionTendency: 'front',
      growth: {
        statGrowth: {
          hp: [100, 110, 120, 130, 140],
          mp: [50, 55, 60, 65, 70],
          attack: [10, 12, 14, 16, 18],
          defense: [5, 6, 7, 8, 9],
          speed: [5, 5, 6, 6, 7],
        },
        levelCap: 99,
        experienceCurve: { baseValue: 100, extraValue: 50, accelerationA: 10, accelerationB: 5 },
        growthType: 'balanced',
      },
      learnableSkills: [],
      traits: [],
      equipmentPermissions: {
        weaponTypes: ['sword'],
        armorTypes: ['medium'],
        accessoryTypes: ['ring'],
      },
      tree: [],
      passives: [],
      weaponAdaptations: [],
      synergies: [],
    };
    addJob(newJob);
    setSelectedJobId(newJob.id);
  };

  const updateCurrentJob = (updates: Partial<Job>) => {
    if (selectedJobId) {
      updateJob(selectedJobId, updates);
    }
  };

  // AI 生成职业数值
  const handleGenerateStats = async () => {
    if (!selectedJob) return;

    // 本地校验
    const validation = validateBeforeAI('jobs', selectedJob, project);
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
          editor: 'jobs',
          entity: selectedJob,
          project: project,
          params: {
            role: selectedJob.role || 'damage',
            style: selectedJob.growth?.growthType || 'balanced',
          }
        },
        'fast'
      );

      if (result.success && result.result) {
        try {
          const stats = JSON.parse(result.result);
          // 应用生成的成长曲线
          const updates: Partial<Job> = {
            growth: {
              ...selectedJob.growth!,
              statGrowth: {
                hp: stats.hpGrowth || [100, 50, 30],
                attack: stats.attackGrowth || [10, 5, 3],
                defense: stats.defenseGrowth || [5, 3, 2],
                speed: stats.speedGrowth || [5, 3, 2],
                magicAttack: stats.magicAttackGrowth || [10, 5, 3],
                magicDefense: stats.magicDefenseGrowth || [5, 3, 2],
              }
            }
          };
          updateJob(selectedJobId!, updates);
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

  // Calculate experience for level
  const calculateExp = (level: number, curve?: ExperienceCurve) => {
    if (!curve) return 0;
    const { baseValue, extraValue, accelerationA, accelerationB } = curve;
    return Math.floor(baseValue + extraValue * level + accelerationA * Math.pow(level, 2) + accelerationB * Math.pow(level, 3));
  };

  // Calculate stat at level
  const calculateStat = (growth: number[], level: number, levelCap: number) => {
    if (!growth || growth.length === 0) return 0;
    const idx = Math.min(Math.floor((level - 1) / (levelCap / growth.length)), growth.length - 1);
    return growth[idx] || 0;
  };

  const errorCount = validation.filter(v => v.type === 'error').length;
  const warningCount = validation.filter(v => v.type === 'warning').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top Summary Bar */}
      <div className="shrink-0 p-3 border-b" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>职业总数</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{jobs.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>当前选中</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{selectedJob?.name || '-'}</span>
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
            {errorCount === 0 && warningCount === 0 && selectedJob && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-success)', color: 'white' }}>
                校验通过
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Four Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Job Registry Tree */}
        <div className="w-56 flex flex-col border-r overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>职业注册表</h3>
              <button
                onClick={() => createNewJob('warrior')}
                className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
                title="添加职业"
              >
                <Plus size={14} style={{ color: 'var(--color-accent)' }} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {jobTypeConfig.map(type => {
              const Icon = type.icon;
              const typeJobs = jobsByType[type.id] || [];
              const isExpanded = expandedTypes.has(type.id);

              return (
                <div key={type.id} className="mb-1">
                  <button
                    onClick={() => toggleType(type.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-[var(--color-bg-tertiary)]"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span style={{ color: type.color }}><Icon size={12} /></span>
                    <span className="flex-1 text-left">{type.label}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{typeJobs.length}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {typeJobs.map(job => {
                        const isSelected = selectedJobId === job.id;
                        const jobTypeInfo = jobTypeConfig.find(t => t.id === job.jobType);
                        const roleInfo = roleConfig.find(r => r.id === job.role);
                        return (
                          <button
                            key={job.id}
                            onClick={() => setSelectedJobId(job.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${isSelected ? 'ring-1 ring-[var(--color-accent)]' : ''}`}
                            style={{
                              background: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                              borderColor: 'var(--color-border)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{job.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                {roleInfo?.label || '未设定'}
                              </span>
                              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                {job.learnableSkills?.length || 0}技能
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      <button
                        onClick={() => createNewJob(type.id)}
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

        {/* Middle: Job Editor */}
        <div className="flex-1 flex flex-col overflow-hidden border-r" style={{ background: 'var(--color-bg-primary)' }}>
          {selectedJob ? (
            <>
              {/* Tab Navigation */}
              <div className="flex border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                {[
                  { id: 'basic', label: '基础信息' },
                  { id: 'experience', label: '经验曲线' },
                  { id: 'growth', label: '成长曲线' },
                  { id: 'skills', label: '可学习技能' },
                  { id: 'traits', label: 'Traits' },
                  { id: 'equipment', label: '装备权限' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 text-xs font-medium border-r ${activeTab === tab.id ? 'bg-[var(--color-bg-tertiary)]' : ''}`}
                    style={{
                      color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto p-4">
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>基础信息</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>职业名称</label>
                          <input
                            type="text"
                            value={selectedJob.name}
                            onChange={(e) => updateCurrentJob({ name: e.target.value })}
                            className="input-field w-full mt-1"
                            placeholder="如: 战士"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>职业ID</label>
                          <input
                            type="text"
                            value={selectedJob.id}
                            disabled
                            className="input-field w-full mt-1 opacity-60"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>职业类型</label>
                          <select
                            value={selectedJob.jobType || 'warrior'}
                            onChange={(e) => updateCurrentJob({ jobType: e.target.value as JobType })}
                            className="input-field w-full mt-1"
                          >
                            {jobTypeConfig.map(t => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>定位</label>
                          <select
                            value={selectedJob.role || 'damage'}
                            onChange={(e) => updateCurrentJob({ role: e.target.value as JobRole })}
                            className="input-field w-full mt-1"
                          >
                            {roleConfig.map(r => (
                              <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>默认武器倾向</label>
                          <select
                            value={selectedJob.defaultWeaponTendency || ''}
                            onChange={(e) => updateCurrentJob({ defaultWeaponTendency: e.target.value })}
                            className="input-field w-full mt-1"
                          >
                            <option value="">无倾向</option>
                            {weaponTypes.map(w => (
                              <option key={w.id} value={w.id}>{w.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>默认站位倾向</label>
                          <select
                            value={selectedJob.defaultPositionTendency || 'any'}
                            onChange={(e) => updateCurrentJob({ defaultPositionTendency: e.target.value })}
                            className="input-field w-full mt-1"
                          >
                            {positionTendencies.map(p => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>描述</label>
                          <textarea
                            value={selectedJob.description || ''}
                            onChange={(e) => updateCurrentJob({ description: e.target.value })}
                            className="input-field w-full mt-1 h-20 resize-none"
                            placeholder="描述此职业的特点..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'experience' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>经验曲线配置</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Base Value (基础值)</label>
                          <input
                            type="number"
                            value={selectedJob.growth?.experienceCurve?.baseValue || 100}
                            onChange={(e) => updateCurrentJob({
                              growth: {
                                ...selectedJob.growth!,
                                experienceCurve: { ...selectedJob.growth!.experienceCurve!, baseValue: Number(e.target.value) }
                              }
                            })}
                            className="input-field w-full mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Extra Value (额外值)</label>
                          <input
                            type="number"
                            value={selectedJob.growth?.experienceCurve?.extraValue || 50}
                            onChange={(e) => updateCurrentJob({
                              growth: {
                                ...selectedJob.growth!,
                                experienceCurve: { ...selectedJob.growth!.experienceCurve!, extraValue: Number(e.target.value) }
                              }
                            })}
                            className="input-field w-full mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Acceleration A (二次项)</label>
                          <input
                            type="number"
                            value={selectedJob.growth?.experienceCurve?.accelerationA || 10}
                            onChange={(e) => updateCurrentJob({
                              growth: {
                                ...selectedJob.growth!,
                                experienceCurve: { ...selectedJob.growth!.experienceCurve!, accelerationA: Number(e.target.value) }
                              }
                            })}
                            className="input-field w-full mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Acceleration B (三次项)</label>
                          <input
                            type="number"
                            value={selectedJob.growth?.experienceCurve?.accelerationB || 5}
                            onChange={(e) => updateCurrentJob({
                              growth: {
                                ...selectedJob.growth!,
                                experienceCurve: { ...selectedJob.growth!.experienceCurve!, accelerationB: Number(e.target.value) }
                              }
                            })}
                            className="input-field w-full mt-1"
                          />
                        </div>
                      </div>

                      {/* Experience Preview Chart - 曲线图可视化 */}
                      <div className="p-3 rounded mb-3" style={{ background: 'var(--color-bg-primary)' }}>
                        <h5 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>经验曲线图</h5>
                        <ExperienceCurveChart curve={selectedJob.growth?.experienceCurve} calculateExp={calculateExp} />
                      </div>
                      <div className="p-3 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                        <h5 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>经验需求预览</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ color: 'var(--color-text-muted)' }}>
                                <th className="text-left py-1">等级</th>
                                <th className="text-right py-1">累计经验</th>
                                <th className="text-right py-1">升级所需</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99].map(lvl => {
                                const total = calculateExp(lvl, selectedJob.growth?.experienceCurve);
                                const prev = calculateExp(lvl - 1, selectedJob.growth?.experienceCurve);
                                return (
                                  <tr key={lvl} style={{ color: 'var(--color-text-secondary)' }}>
                                    <td className="py-1">Lv.{lvl}</td>
                                    <td className="text-right">{total.toLocaleString()}</td>
                                    <td className="text-right">{(total - prev).toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Quick Generate Buttons */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => updateCurrentJob({
                            growth: {
                              ...selectedJob.growth!,
                              experienceCurve: { baseValue: 100, extraValue: 30, accelerationA: 5, accelerationB: 2 }
                            }
                          })}
                          className="px-3 py-1.5 rounded text-xs"
                          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                        >
                          平缓曲线
                        </button>
                        <button
                          onClick={() => updateCurrentJob({
                            growth: {
                              ...selectedJob.growth!,
                              experienceCurve: { baseValue: 100, extraValue: 50, accelerationA: 10, accelerationB: 5 }
                            }
                          })}
                          className="px-3 py-1.5 rounded text-xs"
                          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                        >
                          标准曲线
                        </button>
                        <button
                          onClick={() => updateCurrentJob({
                            growth: {
                              ...selectedJob.growth!,
                              experienceCurve: { baseValue: 100, extraValue: 80, accelerationA: 15, accelerationB: 10 }
                            }
                          })}
                          className="px-3 py-1.5 rounded text-xs"
                          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                        >
                          陡峭曲线
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'growth' && (
                  <div className="space-y-4">
                    {/* AI 生成数值按钮 */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
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
                          <span>生成职业数值</span>
                        </button>
                      </div>
                      {aiMessage && (
                        <div className={`mt-2 p-2 rounded text-xs ${aiMessage.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {aiMessage.text}
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>属性成长曲线</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>等级上限</span>
                          <input
                            type="number"
                            value={selectedJob.growth?.levelCap || 99}
                            onChange={(e) => updateCurrentJob({
                              growth: { ...selectedJob.growth!, levelCap: Number(e.target.value) }
                            })}
                            className="input-field w-16 text-xs"
                            min={1}
                            max={200}
                          />
                        </div>
                      </div>

                      {/* Growth Type Slider */}
                      <div className="mb-4 p-3 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                        <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>成长类型</label>
                        <div className="flex items-center gap-4">
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>早熟</span>
                          <input
                            type="range"
                            min={0}
                            max={2}
                            step={1}
                            value={selectedJob.growth?.growthType === 'early' ? 0 : selectedJob.growth?.growthType === 'late' ? 2 : 1}
                            onChange={(e) => {
                              const types: GrowthType[] = ['early', 'balanced', 'late'];
                              updateCurrentJob({
                                growth: { ...selectedJob.growth!, growthType: types[Number(e.target.value)] }
                              });
                            }}
                            className="flex-1"
                          />
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>晚熟</span>
                        </div>
                      </div>

                      {/* Stat Growth Inputs */}
                      <div className="grid grid-cols-3 gap-3">
                        {statTypes.slice(0, 6).map(stat => (
                          <div key={stat}>
                            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{stat.toUpperCase()} 成长</label>
                            <input
                              type="text"
                              value={selectedJob.growth?.statGrowth?.[stat]?.join(', ') || ''}
                              onChange={(e) => {
                                const values = e.target.value.split(',').map(Number).filter(n => !isNaN(n));
                                updateCurrentJob({
                                  growth: {
                                    ...selectedJob.growth!,
                                    statGrowth: { ...selectedJob.growth!.statGrowth, [stat]: values }
                                  }
                                });
                              }}
                              className="input-field w-full mt-1 text-xs"
                              placeholder="10, 12, 14, 16, 18"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Level 1-99 Preview */}
                      <div className="mt-4 p-3 rounded" style={{ background: 'var(--color-bg-primary)' }}>
                        <h5 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>等级成长预览 (HP/攻击)</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ color: 'var(--color-text-muted)' }}>
                                <th className="text-left py-1">等级</th>
                                <th className="text-right py-1">HP</th>
                                <th className="text-right py-1">攻击</th>
                                <th className="text-right py-1">防御</th>
                                <th className="text-right py-1">速度</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[1, 20, 40, 60, 80, 99].map(lvl => {
                                const levelCap = selectedJob.growth?.levelCap || 99;
                                const hp = calculateStat(selectedJob.growth?.statGrowth?.hp || [], lvl, levelCap);
                                const atk = calculateStat(selectedJob.growth?.statGrowth?.attack || [], lvl, levelCap);
                                const def = calculateStat(selectedJob.growth?.statGrowth?.defense || [], lvl, levelCap);
                                const spd = calculateStat(selectedJob.growth?.statGrowth?.speed || [], lvl, levelCap);
                                return (
                                  <tr key={lvl} style={{ color: 'var(--color-text-secondary)' }}>
                                    <td className="py-1">Lv.{lvl}</td>
                                    <td className="text-right">{hp}</td>
                                    <td className="text-right">{atk}</td>
                                    <td className="text-right">{def}</td>
                                    <td className="text-right">{spd}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'skills' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>可学习技能</h4>
                        <button
                          onClick={() => {
                            const newSkill: LearnableSkill = {
                              id: `learnable-${Date.now()}`,
                              skillId: '',
                              learnLevel: 1,
                              notes: '',
                            };
                            updateCurrentJob({
                              learnableSkills: [...(selectedJob.learnableSkills || []), newSkill]
                            });
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--color-accent)', color: 'white' }}
                        >
                          <Plus size={12} /> 添加技能
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(selectedJob.learnableSkills || []).map((learnable, idx) => {
                          const skill = skills.find(s => s.id === learnable.skillId);
                          return (
                            <div
                              key={learnable.id}
                              className="flex items-center gap-3 p-3 rounded"
                              style={{ background: 'var(--color-bg-primary)' }}
                            >
                              <div className="w-12">
                                <label className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>学习等级</label>
                                <input
                                  type="number"
                                  value={learnable.learnLevel}
                                  onChange={(e) => {
                                    const newSkills = [...(selectedJob.learnableSkills || [])];
                                    newSkills[idx] = { ...newSkills[idx], learnLevel: Number(e.target.value) };
                                    updateCurrentJob({ learnableSkills: newSkills });
                                  }}
                                  className="input-field w-full text-xs mt-1"
                                  min={1}
                                  max={99}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>技能</label>
                                <select
                                  value={learnable.skillId}
                                  onChange={(e) => {
                                    const newSkills = [...(selectedJob.learnableSkills || [])];
                                    newSkills[idx] = { ...newSkills[idx], skillId: e.target.value };
                                    updateCurrentJob({ learnableSkills: newSkills });
                                  }}
                                  className="input-field w-full text-xs mt-1"
                                >
                                  <option value="">选择技能</option>
                                  {skills.filter(s => s.type === 'active' || s.type === 'ultimate').map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-24">
                                <label className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>分支</label>
                                <input
                                  type="text"
                                  value={learnable.branch || ''}
                                  onChange={(e) => {
                                    const newSkills = [...(selectedJob.learnableSkills || [])];
                                    newSkills[idx] = { ...newSkills[idx], branch: e.target.value };
                                    updateCurrentJob({ learnableSkills: newSkills });
                                  }}
                                  className="input-field w-full text-xs mt-1"
                                  placeholder="如: 物理系"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const newSkills = (selectedJob.learnableSkills || []).filter((_, i) => i !== idx);
                                  updateCurrentJob({ learnableSkills: newSkills });
                                }}
                                className="p-1 rounded hover:bg-[var(--color-danger)] mt-4"
                              >
                                <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                              </button>
                            </div>
                          );
                        })}
                        {(selectedJob.learnableSkills || []).length === 0 && (
                          <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                            暂无可学习技能，请点击"添加技能"创建
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'traits' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>职业特性 / Traits</h4>
                        <button
                          onClick={() => {
                            const newTrait: JobTrait = {
                              id: `trait-${Date.now()}`,
                              name: '新特性',
                              traitType: 'stat-bonus',
                              value: {},
                              description: '',
                            };
                            updateCurrentJob({
                              traits: [...(selectedJob.traits || []), newTrait]
                            });
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--color-accent)', color: 'white' }}
                        >
                          <Plus size={12} /> 添加特性
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(selectedJob.traits || []).map((trait, idx) => (
                          <div
                            key={trait.id}
                            className="p-3 rounded"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex-1">
                                <label className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>特性名称</label>
                                <input
                                  type="text"
                                  value={trait.name}
                                  onChange={(e) => {
                                    const newTraits = [...(selectedJob.traits || [])];
                                    newTraits[idx] = { ...newTraits[idx], name: e.target.value };
                                    updateCurrentJob({ traits: newTraits });
                                  }}
                                  className="input-field w-full text-xs mt-1"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>特性类型</label>
                                <select
                                  value={trait.traitType}
                                  onChange={(e) => {
                                    const newTraits = [...(selectedJob.traits || [])];
                                    newTraits[idx] = { ...newTraits[idx], traitType: e.target.value as any };
                                    updateCurrentJob({ traits: newTraits });
                                  }}
                                  className="input-field w-full text-xs mt-1"
                                >
                                  <option value="stat-bonus">属性加成</option>
                                  <option value="element-resistance">元素抗性</option>
                                  <option value="status-resistance">状态抗性</option>
                                  <option value="resource-modifier">资源修正</option>
                                  <option value="hit-dodge-crit">命中/闪避/暴击</option>
                                  <option value="additional-skill-type">额外技能类型</option>
                                  <option value="special">特殊</option>
                                </select>
                              </div>
                              <button
                                onClick={() => {
                                  const newTraits = (selectedJob.traits || []).filter((_, i) => i !== idx);
                                  updateCurrentJob({ traits: newTraits });
                                }}
                                className="p-1 rounded hover:bg-[var(--color-danger)] mt-4"
                              >
                                <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                              </button>
                            </div>
                            {/* Value inputs based on trait type */}
                            <div className="grid grid-cols-3 gap-2">
                              {trait.traitType === 'stat-bonus' && (
                                <>
                                  <div>
                                    <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>攻击+</label>
                                    <input
                                      type="number"
                                      value={trait.value.attack || 0}
                                      onChange={(e) => {
                                        const newTraits = [...(selectedJob.traits || [])];
                                        newTraits[idx] = { ...newTraits[idx], value: { ...newTraits[idx].value, attack: Number(e.target.value) } };
                                        updateCurrentJob({ traits: newTraits });
                                      }}
                                      className="input-field w-full text-xs mt-1"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>防御+</label>
                                    <input
                                      type="number"
                                      value={trait.value.defense || 0}
                                      onChange={(e) => {
                                        const newTraits = [...(selectedJob.traits || [])];
                                        newTraits[idx] = { ...newTraits[idx], value: { ...newTraits[idx].value, defense: Number(e.target.value) } };
                                        updateCurrentJob({ traits: newTraits });
                                      }}
                                      className="input-field w-full text-xs mt-1"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>速度+</label>
                                    <input
                                      type="number"
                                      value={trait.value.speed || 0}
                                      onChange={(e) => {
                                        const newTraits = [...(selectedJob.traits || [])];
                                        newTraits[idx] = { ...newTraits[idx], value: { ...newTraits[idx].value, speed: Number(e.target.value) } };
                                        updateCurrentJob({ traits: newTraits });
                                      }}
                                      className="input-field w-full text-xs mt-1"
                                    />
                                  </div>
                                </>
                              )}
                              {trait.traitType === 'hit-dodge-crit' && (
                                <>
                                  <div>
                                    <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>命中+</label>
                                    <input
                                      type="number"
                                      value={trait.value.hit || 0}
                                      onChange={(e) => {
                                        const newTraits = [...(selectedJob.traits || [])];
                                        newTraits[idx] = { ...newTraits[idx], value: { ...newTraits[idx].value, hit: Number(e.target.value) } };
                                        updateCurrentJob({ traits: newTraits });
                                      }}
                                      className="input-field w-full text-xs mt-1"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>闪避+</label>
                                    <input
                                      type="number"
                                      value={trait.value.dodge || 0}
                                      onChange={(e) => {
                                        const newTraits = [...(selectedJob.traits || [])];
                                        newTraits[idx] = { ...newTraits[idx], value: { ...newTraits[idx].value, dodge: Number(e.target.value) } };
                                        updateCurrentJob({ traits: newTraits });
                                      }}
                                      className="input-field w-full text-xs mt-1"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>暴击+</label>
                                    <input
                                      type="number"
                                      value={trait.value.crit || 0}
                                      onChange={(e) => {
                                        const newTraits = [...(selectedJob.traits || [])];
                                        newTraits[idx] = { ...newTraits[idx], value: { ...newTraits[idx].value, crit: Number(e.target.value) } };
                                        updateCurrentJob({ traits: newTraits });
                                      }}
                                      className="input-field w-full text-xs mt-1"
                                    />
                                  </div>
                                </>
                              )}
                              {trait.traitType === 'element-resistance' && (
                                <div className="col-span-3">
                                  <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>元素抗性(%)</label>
                                  <input
                                    type="text"
                                    value={Object.entries(trait.value).map(([k, v]) => `${k}:${v}`).join(', ')}
                                    onChange={(e) => {
                                      const value: Record<string, number> = {};
                                      e.target.value.split(',').forEach(item => {
                                        const [k, v] = item.split(':');
                                        if (k && v) value[k.trim()] = Number(v);
                                      });
                                      const newTraits = [...(selectedJob.traits || [])];
                                      newTraits[idx] = { ...newTraits[idx], value };
                                      updateCurrentJob({ traits: newTraits });
                                    }}
                                    className="input-field w-full text-xs mt-1"
                                    placeholder="fire:10, ice: -5"
                                  />
                                </div>
                              )}
                              {trait.traitType === 'additional-skill-type' && (
                                <div className="col-span-3">
                                  <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>允许技能类型</label>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {['active', 'passive', 'ultimate', 'support', 'control'].map(type => (
                                      <label key={type} className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={(trait.value as any)[type] === true}
                                          onChange={(e) => {
                                            const newTraits = [...(selectedJob.traits || [])];
                                            newTraits[idx] = { ...newTraits[idx], value: { ...newTraits[idx].value, [type]: e.target.checked } };
                                            updateCurrentJob({ traits: newTraits });
                                          }}
                                        />
                                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{type}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {(selectedJob.traits || []).length === 0 && (
                          <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                            暂无特性，请点击"添加特性"创建
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'equipment' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>装备权限</h4>
                      
                      {/* Weapon Types */}
                      <div className="mb-4">
                        <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>可装备武器类型</label>
                        <div className="flex flex-wrap gap-2">
                          {weaponTypes.map(weapon => (
                            <label key={weapon.id} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedJob.equipmentPermissions?.weaponTypes?.includes(weapon.id) || false}
                                onChange={(e) => {
                                  const weapons = selectedJob.equipmentPermissions?.weaponTypes || [];
                                  const newWeapons = e.target.checked
                                    ? [...weapons, weapon.id]
                                    : weapons.filter(w => w !== weapon.id);
                                  updateCurrentJob({
                                    equipmentPermissions: { ...selectedJob.equipmentPermissions!, weaponTypes: newWeapons }
                                  });
                                }}
                              />
                              <span className="text-xs px-2 py-0.5 rounded" style={{ 
                                background: selectedJob.equipmentPermissions?.weaponTypes?.includes(weapon.id) ? 'var(--color-accent)' : 'var(--color-bg-primary)',
                                color: selectedJob.equipmentPermissions?.weaponTypes?.includes(weapon.id) ? 'white' : 'var(--color-text-secondary)'
                              }}>
                                {weapon.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Armor Types */}
                      <div className="mb-4">
                        <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>可装备护甲类型</label>
                        <div className="flex flex-wrap gap-2">
                          {armorTypes.map(armor => (
                            <label key={armor.id} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedJob.equipmentPermissions?.armorTypes?.includes(armor.id) || false}
                                onChange={(e) => {
                                  const armors = selectedJob.equipmentPermissions?.armorTypes || [];
                                  const newArmors = e.target.checked
                                    ? [...armors, armor.id]
                                    : armors.filter(a => a !== armor.id);
                                  updateCurrentJob({
                                    equipmentPermissions: { ...selectedJob.equipmentPermissions!, armorTypes: newArmors }
                                  });
                                }}
                              />
                              <span className="text-xs px-2 py-0.5 rounded" style={{ 
                                background: selectedJob.equipmentPermissions?.armorTypes?.includes(armor.id) ? 'var(--color-success)' : 'var(--color-bg-primary)',
                                color: selectedJob.equipmentPermissions?.armorTypes?.includes(armor.id) ? 'white' : 'var(--color-text-secondary)'
                              }}>
                                {armor.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Accessory Types */}
                      <div className="mb-4">
                        <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>可装备饰品类型</label>
                        <div className="flex flex-wrap gap-2">
                          {accessoryTypes.map(acc => (
                            <label key={acc.id} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedJob.equipmentPermissions?.accessoryTypes?.includes(acc.id) || false}
                                onChange={(e) => {
                                  const accessories = selectedJob.equipmentPermissions?.accessoryTypes || [];
                                  const newAccessories = e.target.checked
                                    ? [...accessories, acc.id]
                                    : accessories.filter(a => a !== acc.id);
                                  updateCurrentJob({
                                    equipmentPermissions: { ...selectedJob.equipmentPermissions!, accessoryTypes: newAccessories }
                                  });
                                }}
                              />
                              <span className="text-xs px-2 py-0.5 rounded" style={{ 
                                background: selectedJob.equipmentPermissions?.accessoryTypes?.includes(acc.id) ? 'var(--color-warning)' : 'var(--color-bg-primary)',
                                color: selectedJob.equipmentPermissions?.accessoryTypes?.includes(acc.id) ? 'white' : 'var(--color-text-secondary)'
                              }}>
                                {acc.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Forbidden Types */}
                      <div>
                        <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>禁用装备类型</label>
                        <div className="flex flex-wrap gap-2">
                          {weaponTypes.concat(armorTypes).map(item => (
                            <label key={item.id} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedJob.equipmentPermissions?.forbiddenTypes?.includes(item.id) || false}
                                onChange={(e) => {
                                  const forbidden = selectedJob.equipmentPermissions?.forbiddenTypes || [];
                                  const newForbidden = e.target.checked
                                    ? [...forbidden, item.id]
                                    : forbidden.filter(f => f !== item.id);
                                  updateCurrentJob({
                                    equipmentPermissions: { ...selectedJob.equipmentPermissions!, forbiddenTypes: newForbidden }
                                  });
                                }}
                              />
                              <span className="text-xs px-2 py-0.5 rounded" style={{ 
                                background: selectedJob.equipmentPermissions?.forbiddenTypes?.includes(item.id) ? 'var(--color-danger)' : 'var(--color-bg-primary)',
                                color: selectedJob.equipmentPermissions?.forbiddenTypes?.includes(item.id) ? 'white' : 'var(--color-text-secondary)'
                              }}>
                                {item.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => {
                    if (selectedJobId) {
                      deleteJob(selectedJobId);
                      setSelectedJobId(jobs[0]?.id || null);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-xs"
                  style={{ background: 'var(--color-danger)', color: 'white' }}
                >
                  <Trash2 size={12} /> 删除职业
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
              <div className="text-center">
                <Sparkles size={48} className="mx-auto mb-4 opacity-30" />
                <div className="text-lg mb-2">选择或创建职业</div>
                <div className="text-sm mb-4">从左侧职业注册表中选择已有职业，或点击"+"创建新职业</div>
                <button
                  onClick={() => createNewJob('warrior')}
                  className="flex items-center gap-2 px-4 py-2 rounded"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  <Plus size={16} /> 创建新职业
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview & Validation */}
        <div className="w-72 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>职业预览 & 校验</h3>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {selectedJob ? (
              <>
                {/* Job Card Preview */}
                <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>职业卡预览</h4>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)', borderLeft: `3px solid ${jobTypeConfig.find(t => t.id === selectedJob.jobType)?.color || 'var(--color-accent)'}` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded flex items-center justify-center" style={{ background: (jobTypeConfig.find(t => t.id === selectedJob.jobType)?.color || 'var(--color-accent)') + '20' }}>
                        {(() => {
                          const Icon = jobTypeConfig.find(t => t.id === selectedJob.jobType)?.icon || Sword;
                          const color = jobTypeConfig.find(t => t.id === selectedJob.jobType)?.color || 'var(--color-accent)';
                          return <Icon size={24} style={{ color }} />;
                        })()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedJob.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {jobTypeConfig.find(t => t.id === selectedJob.jobType)?.label || '特殊'} · {roleConfig.find(r => r.id === selectedJob.role)?.label || '输出'}
                        </div>
                      </div>
                    </div>
                    {selectedJob.description && (
                      <div className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {selectedJob.description}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <span>等级上限: {selectedJob.growth?.levelCap || 99}</span>
                    </div>
                  </div>
                </div>

                {/* Growth Summary */}
                <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>成长倾向</h4>
                  <div className="space-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <div className="flex justify-between">
                      <span>成长类型</span>
                      <span>{selectedJob.growth?.growthType === 'early' ? '早熟' : selectedJob.growth?.growthType === 'late' ? '晚熟' : '均衡'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>可学习技能</span>
                      <span>{selectedJob.learnableSkills?.length || 0}个</span>
                    </div>
                    <div className="flex justify-between">
                      <span>职业特性</span>
                      <span>{selectedJob.traits?.length || 0}个</span>
                    </div>
                  </div>
                </div>

                {/* Equipment Summary */}
                <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>装备权限摘要</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>武器</span>
                      <div className="flex flex-wrap gap-1">
                        {(selectedJob.equipmentPermissions?.weaponTypes || []).map(w => (
                          <span key={w} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--color-accent)', color: 'white' }}>
                            {weaponTypes.find(t => t.id === w)?.label || w}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>护甲</span>
                      <div className="flex flex-wrap gap-1">
                        {(selectedJob.equipmentPermissions?.armorTypes || []).map(a => (
                          <span key={a} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--color-success)', color: 'white' }}>
                            {armorTypes.find(t => t.id === a)?.label || a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills Preview */}
                <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>可学习技能预览</h4>
                  <div className="space-y-1">
                    {(selectedJob.learnableSkills || []).length > 0 ? (
                      selectedJob.learnableSkills!.slice(0, 5).map((ls, idx) => {
                        const skill = skills.find(s => s.id === ls.skillId);
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            <span>Lv.{ls.learnLevel}</span>
                            <span className="flex-1 truncate ml-2">{skill?.name || '未选择'}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>暂无技能</div>
                    )}
                    {(selectedJob.learnableSkills || []).length > 5 && (
                      <div className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                        还有{(selectedJob.learnableSkills || []).length - 5}个技能...
                      </div>
                    )}
                  </div>
                </div>

                {/* Risk Warnings */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                  <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>风险提示</h4>
                  <div className="space-y-2">
                    {jobRisks.length > 0 ? (
                      jobRisks.map((risk, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <AlertTriangle size={12} style={{ color: 'var(--color-warning)' }} />
                          <span style={{ color: 'var(--color-warning)' }}>{risk}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs" style={{ color: 'var(--color-success)' }}>配置完整，无风险</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                <div className="text-center text-xs">选择职业查看预览</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
