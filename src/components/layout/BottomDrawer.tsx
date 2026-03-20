import React, { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import { useProjectStore } from '../../stores/projectStore';
import type { DrawerPanel } from '../../types';
import {
  FileText, AlertTriangle, Calculator, Layers, GitCompare, Trophy, Sparkles, Tag, Briefcase, User, Sword, FlaskRound, Skull, ChevronDown, Users, CheckCircle, Eye, Info
} from 'lucide-react';
import { getValidationSummary, validateAttribute } from '../../utils/rulesValidation';

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'system';
  message: string;
  time: string;
}

const tabConfig: { id: DrawerPanel; label: string; icon: React.ReactNode }[] = [
  { id: 'combat-log', label: '战斗日志', icon: <FileText size={12} /> },
  { id: 'errors', label: '报错', icon: <AlertTriangle size={12} /> },
  { id: 'formula', label: '公式控制台', icon: <Calculator size={12} /> },
  { id: 'batch-edit', label: '批量修改', icon: <Layers size={12} /> },
  { id: 'version', label: '版本对比', icon: <GitCompare size={12} /> },
  { id: 'simulation', label: '模拟结果', icon: <Trophy size={12} /> },
  { id: 'rules-inspector', label: '规则检视', icon: <Eye size={12} /> },
  { id: 'skill-log', label: '技能调试日志', icon: <Sparkles size={12} /> },
  { id: 'status-log', label: '状态日志', icon: <Tag size={12} /> },
  { id: 'job-log', label: '职业调试日志', icon: <Briefcase size={12} /> },
  { id: 'character-log', label: '角色调试日志', icon: <User size={12} /> },
  { id: 'equipment-log', label: '装备调试日志', icon: <Sword size={12} /> },
  { id: 'item-log', label: '道具调试日志', icon: <FlaskRound size={12} /> },
  { id: 'enemy-log', label: '敌人调试日志', icon: <Skull size={12} /> },
  { id: 'enemygroup-log', label: '敌群调试日志', icon: <Users size={12} /> },
  { id: 'prebattle-log', label: '战前调试日志', icon: <CheckCircle size={12} /> },
  { id: 'analysis-log', label: '分析日志', icon: <Trophy size={12} /> },
];

export const BottomDrawer: React.FC = () => {
  const { drawerActiveTab, setDrawerTab } = useUIStore();
  const { debugSkillId, debugStatusId, debugJobId, debugCharacterId, debugEquipmentId, debugItemId, debugEnemyId, debugEnemyGroupId } = useEditorStore();
  const { project } = useProjectStore();
  const selectedSkill = project.skills.find(s => s.id === debugSkillId);
  const selectedStatus = project.statuses.find(s => s.id === debugStatusId);
  const selectedJob = project.jobs.find(j => j.id === debugJobId);
  const selectedCharacter = project.characters.find(c => c.id === debugCharacterId);
  const selectedEquipment = project.equipment.find(e => e.id === debugEquipmentId);
  const selectedItem = project.items.find(i => i.id === debugItemId);
  const selectedEnemy = project.enemies.find(e => e.id === debugEnemyId);
  const selectedEnemyGroup = project.enemyGroups.find(g => g.id === debugEnemyGroupId);
  
  const [logs] = useState<LogEntry[]>([
    { level: 'system', message: '系统初始化完成', time: '14:30:25' },
    { level: 'info', message: '加载项目数据...', time: '14:30:26' },
    { level: 'info', message: '项目规则已加载', time: '14:30:26' },
    { level: 'warn', message: '缺少默认元素配置', time: '14:30:27' },
    { level: 'system', message: '等待用户操作', time: '14:30:27' },
  ]);
  
  const [errors] = useState<LogEntry[]>([
    { level: 'error', message: '属性 hp 缺少单位', time: '14:25:10' },
    { level: 'warn', message: '重复的属性ID: attack', time: '14:25:11' },
  ]);

  const getLevelClass = (level: string) => {
    switch (level) {
      case 'info': return 'log-info';
      case 'warn': return 'log-warn';
      case 'error': return 'log-error';
      case 'system': return 'log-system';
      default: return '';
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'info': return 'info';
      case 'warn': return 'warning';
      case 'error': return 'error';
      case 'system': return '';
      default: return '';
    }
  };

  const [moreOpen, setMoreOpen] = useState(false);

  const getTabCount = (tabId: DrawerPanel) => {
    if (tabId === 'combat-log') return { count: logs.length, badgeType: 'info' };
    if (tabId === 'errors') return { count: errors.length, badgeType: 'error' };
    if (tabId === 'rules-inspector') {
      const summary = getValidationSummary(project.rules);
      return { count: summary.errors + summary.warnings + summary.infos, badgeType: summary.errors > 0 ? 'error' : summary.warnings > 0 ? 'warning' : 'info' };
    }
    if (['skill-log', 'status-log', 'job-log', 'character-log', 'equipment-log', 'item-log', 'enemy-log'].includes(tabId)) {
      const hasSelection = tabId === 'skill-log' && selectedSkill || tabId === 'status-log' && selectedStatus || tabId === 'job-log' && selectedJob || tabId === 'character-log' && selectedCharacter || tabId === 'equipment-log' && selectedEquipment || tabId === 'item-log' && selectedItem || tabId === 'enemy-log' && selectedEnemy;
      return { count: hasSelection ? 1 : 0, badgeType: 'info' };
    }
    return { count: 0, badgeType: '' };
  };

  // 常用面板放前面，其余进「更多」
  const primaryTabs = tabConfig.slice(0, 6);
  const moreTabs = tabConfig.slice(6);
  const activeTabInMore = moreTabs.find(t => t.id === drawerActiveTab);
  const rightButtonLabel = activeTabInMore ? activeTabInMore.label : '更多面板';

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar: 左侧可滚动标签 + 右侧「更多面板」 */}
      <div 
        className="h-8 flex items-center gap-1 px-2 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
      >
        <div className="flex-1 flex items-center gap-1 overflow-x-auto min-w-0">
          {primaryTabs.map((tab) => {
            const { count, badgeType } = getTabCount(tab.id);
            return (
              <button
                key={tab.id}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs shrink-0"
                style={{ 
                  background: drawerActiveTab === tab.id ? 'var(--color-accent)' : 'transparent',
                  color: drawerActiveTab === tab.id ? 'white' : 'var(--color-text-secondary)',
                }}
                onClick={() => setDrawerTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`badge ${badgeType}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative shrink-0 pl-1 border-l" style={{ borderColor: 'var(--color-border)' }}>
          <button
            className="flex items-center gap-1 px-2 py-1 rounded text-xs max-w-[120px]"
            style={{ 
              background: moreOpen ? 'var(--color-accent)' : 'transparent',
              color: moreOpen ? 'white' : 'var(--color-text-secondary)',
            }}
            onClick={() => setMoreOpen(!moreOpen)}
            title={rightButtonLabel}
          >
            <span className="truncate">{rightButtonLabel}</span>
            <ChevronDown size={12} className={moreOpen ? 'rotate-180' : ''} style={{ transition: 'transform 0.15s' }} />
          </button>
          {moreOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                style={{ top: 0, left: 0, right: 0, bottom: 0 }}
                onClick={() => setMoreOpen(false)}
                aria-hidden
              />
              <div 
                className="absolute right-0 top-full mt-0.5 py-1 rounded z-20 shadow-lg min-w-[140px]"
                style={{ 
                  background: 'var(--color-bg-primary)', 
                  border: '1px solid var(--color-border)',
                }}
              >
                {moreTabs.map((tab) => {
                  const { count, badgeType } = getTabCount(tab.id);
                  return (
                    <button
                      key={tab.id}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[var(--color-bg-tertiary)]"
                      style={{ color: 'var(--color-text-primary)' }}
                      onClick={() => { setDrawerTab(tab.id); setMoreOpen(false); }}
                    >
                      {tab.icon}
                      <span className="flex-1 truncate">{tab.label}</span>
                      {count > 0 && (
                        <span className={`badge ${badgeType}`}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {drawerActiveTab === 'combat-log' && (
          <div className="font-mono text-xs space-y-0.5">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span style={{ color: 'var(--color-text-muted)' }}>[{log.time}]</span>
                <span className={`badge ${getLevelBadge(log.level)}`}>{log.level.toUpperCase()}</span>
                <span className={getLevelClass(log.level)}>{log.message}</span>
              </div>
            ))}
          </div>
        )}

        {drawerActiveTab === 'errors' && (
          <div className="font-mono text-xs space-y-0.5">
            {errors.map((err, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span style={{ color: 'var(--color-text-muted)' }}>[{err.time}]</span>
                <span className={`badge ${getLevelBadge(err.level)}`}>{err.level.toUpperCase()}</span>
                <span className={getLevelClass(err.level)}>{err.message}</span>
              </div>
            ))}
          </div>
        )}

        {drawerActiveTab === 'formula' && (
          <div className="space-y-2">
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>公式预览</div>
            <div 
              className="p-2 rounded font-mono text-xs"
              style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
            >
              damage = attack * (1 - defense / (defense + 1000))
            </div>
            <button 
              className="px-3 py-1 rounded text-xs"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              测试公式
            </button>
          </div>
        )}

        {drawerActiveTab === 'batch-edit' && (
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            批量修改功能 - 选择要批量编辑的项...
          </div>
        )}

        {drawerActiveTab === 'version' && (
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            版本对比功能 - 选择要对比的版本...
          </div>
        )}

        {drawerActiveTab === 'simulation' && (
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            模拟结果将显示在这里
          </div>
        )}

        {drawerActiveTab === 'skill-log' && (
          <div className="font-mono text-xs space-y-0.5">
            {selectedSkill ? (
              <>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[配置]</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>技能ID: {selectedSkill.id}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[消耗]</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {selectedSkill.cost?.amount ?? 0} {selectedSkill.cost?.resourceType ?? 'mp'} | 冷却: {selectedSkill.cooldown ?? 0} 回合
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[目标]</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {selectedSkill.targetType} | {selectedSkill.targetCamp ?? '-'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[效果]</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>共 {selectedSkill.effectBlocks?.length ?? 0} 个效果块</span>
                </div>
                {(!selectedSkill.formulaId && selectedSkill.damageType) && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <span style={{ color: 'var(--color-warning)' }}>缺少伤害公式</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--color-text-muted)' }}>在技能编辑器中选择技能后，调试信息将显示在此处</div>
            )}
          </div>
        )}

        {drawerActiveTab === 'status-log' && (
          <div className="font-mono text-xs space-y-0.5">
            {selectedStatus ? (
              <>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[配置]</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>状态ID: {selectedStatus.id}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[生命周期]</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    持续 {selectedStatus.duration?.value ?? 0} 回合，可刷新: {selectedStatus.duration?.canRefresh ? '是' : '否'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[叠加]</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    类型: {selectedStatus.stacking?.type ?? '-'}，最大层数: {selectedStatus.stacking?.maxStacks ?? 1}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[触发]</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>共 {selectedStatus.triggers?.length ?? 0} 个触发时机</span>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--color-text-muted)' }}>在状态编辑器中选择状态后，调试信息将显示在此处</div>
            )}
          </div>
        )}

        {drawerActiveTab === 'job-log' && (
          <div className="font-mono text-xs space-y-0.5">
            {selectedJob ? (
              <>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[配置]</span>
                  <span>职业ID: {selectedJob.id}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[经验]</span>
                  <span>Base: {selectedJob.growth?.experienceCurve?.baseValue || 100} | AccA: {selectedJob.growth?.experienceCurve?.accelerationA || 0}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[成长]</span>
                  <span>类型: {selectedJob.growth?.growthType || 'balanced'} | 等级上限: {selectedJob.growth?.levelCap || 99}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[技能]</span>
                  <span>共{selectedJob.learnableSkills?.length || 0}个可学习技能</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[装备]</span>
                  <span>武器: {(selectedJob.equipmentPermissions?.weaponTypes || []).join(', ') || '未设置'}</span>
                </div>
              </>
            ) : (
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                选择职业查看调试信息
              </div>
            )}
          </div>
        )}

        {drawerActiveTab === 'character-log' && (
          <div className="font-mono text-xs space-y-0.5">
            {selectedCharacter ? (
              <>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[配置]</span>
                  <span>角色ID: {selectedCharacter.id}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[职业]</span>
                  <span>{selectedCharacter.jobId ? project.jobs.find(j => j.id === selectedCharacter.jobId)?.name || selectedCharacter.jobId : '未绑定'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[等级]</span>
                  <span>初始: {selectedCharacter.levelConfig?.initial || 1} | 最大: {selectedCharacter.levelConfig?.max || 99}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[继承]</span>
                  <span>职业成长: {selectedCharacter.levelConfig?.inheritJobGrowth ? '是' : '否'} | 职业属性: {selectedCharacter.initialAttributes?.inheritJobGrowth ? '是' : '否'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[技能]</span>
                  <span>初始: {selectedCharacter.skillConfig?.initialSkills?.length || 0}个 | 专属: {selectedCharacter.skillConfig?.exclusiveSkills?.length || 0}个</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[装备]</span>
                  <span>武器: {selectedCharacter.initialEquipment?.weapon || '无'} | 防具: {selectedCharacter.initialEquipment?.armor || '无'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[特质]</span>
                  <span>个体特质: {selectedCharacter.traitConfig?.individualTraits?.length || 0}个</span>
                </div>
                {/* Validation checks */}
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>[校验]</span>
                </div>
                {!selectedCharacter.jobId && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>未绑定职业</span>
                  </div>
                )}
                {selectedCharacter.jobId && selectedCharacter.levelConfig?.inheritJobGrowth && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-success)' }}>
                    <span>已继承职业成长曲线</span>
                  </div>
                )}
                {(selectedCharacter.skillConfig?.initialSkills?.length || 0) === 0 && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>未配置初始技能</span>
                  </div>
                )}
                {(selectedCharacter.traitConfig?.individualTraits?.length || 0) === 0 && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>未配置个体特质</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                选择角色查看调试信息
              </div>
            )}
          </div>
        )}

        {drawerActiveTab === 'equipment-log' && (
          <div className="font-mono text-xs space-y-0.5">
            {selectedEquipment ? (
              <>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[配置]</span>
                  <span>装备ID: {selectedEquipment.id}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[类型]</span>
                  <span>{selectedEquipment.equipmentCategory} · {selectedEquipment.equipmentType}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[稀有度]</span>
                  <span>{selectedEquipment.rarity}星</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[属性]</span>
                  <span>{Object.entries(selectedEquipment.stats || {}).filter(([, v]) => v !== 0).map(([k, v]) => `${k}:${v}`).join(', ') || '无'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[特质]</span>
                  <span>{selectedEquipment.traits?.length || 0}个</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[价格]</span>
                  <span>售价: {selectedEquipment.economy?.price || 0} | 收购: {selectedEquipment.economy?.sellPrice || 0}</span>
                </div>
                {/* Validation checks */}
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>[校验]</span>
                </div>
                {(selectedEquipment.traits?.length || 0) === 0 && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>无装备特质</span>
                  </div>
                )}
                {!selectedEquipment.economy?.price && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>未设置价格</span>
                  </div>
                )}
                {!selectedEquipment.condition?.allowedJobs?.length && !selectedEquipment.condition?.allowedCharacters?.length && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>无职业限制（任何人都能装备）</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                选择装备查看调试信息
              </div>
            )}
          </div>
        )}

        {drawerActiveTab === 'item-log' && (
          <div className="font-mono text-xs space-y-0.5">
            {selectedItem ? (
              <>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[配置]</span>
                  <span>道具ID: {selectedItem.id}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[类型]</span>
                  <span>{selectedItem.itemCategory} · {selectedItem.itemType}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[使用]</span>
                  <span>{selectedItem.useRule.scenario} | {selectedItem.useRule.targetType} | 消耗: {selectedItem.useRule.consumable ? '是' : '否'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[效果]</span>
                  <span>{selectedItem.effects?.length || 0}个效果</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[价格]</span>
                  <span>售价: {selectedItem.economy?.price || 0} | 堆叠: {selectedItem.economy?.stackMax || 99}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[关键]</span>
                  <span>{selectedItem.event关联?.isKeyItem ? '是关键道具' : '普通道具'}</span>
                </div>
                {/* Validation checks */}
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>[校验]</span>
                </div>
                {(selectedItem.effects?.length || 0) === 0 && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>无道具效果</span>
                  </div>
                )}
                {!selectedItem.economy?.price && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>未设置价格</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                选择道具查看调试信息
              </div>
            )}
          </div>
        )}

        {drawerActiveTab === 'enemy-log' && (
          <div className="font-mono text-xs space-y-0.5">
            {selectedEnemy ? (
              <>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[配置]</span>
                  <span>敌人ID: {selectedEnemy.id}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[类型]</span>
                  <span>{selectedEnemy.enemyType === 'normal' ? '小怪' : selectedEnemy.enemyType === 'elite' ? '精英' : selectedEnemy.enemyType === 'boss' ? 'Boss' : selectedEnemy.enemyType === 'summon' ? '召唤物' : '测试'} | {selectedEnemy.race} | {selectedEnemy.faction}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[等级]</span>
                  <span>Lv.{selectedEnemy.attributes?.level || 1} | HP: {selectedEnemy.attributes?.hp || 0}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[攻击]</span>
                  <span>攻击: {selectedEnemy.attributes?.attack || 0} | 防御: {selectedEnemy.attributes?.defense || 0} | 速度: {selectedEnemy.attributes?.speed || 0}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[技能]</span>
                  <span>共 {selectedEnemy.skills?.length || 0} 个技能</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[掉落]</span>
                  <span>{(selectedEnemy.drops?.length || 0)} 个掉落 | 金币: {selectedEnemy.goldMin || 0}-{selectedEnemy.goldMax || 0}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[抗性]</span>
                  <span>元素: {Object.keys(selectedEnemy.elementResistances || {}).length || 0} | 状态: {Object.keys(selectedEnemy.statusResistances || {}).length || 0}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[特殊]</span>
                  <span>阶段: {selectedEnemy.phaseShift?.length || 0} | 护盾: {selectedEnemy.shieldLayers || 0}</span>
                </div>
                {/* Validation checks */}
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>[校验]</span>
                </div>
                {!selectedEnemy.ai?.behaviorTree && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
                    <AlertTriangle size={12} />
                    <span>未配置AI行为树</span>
                  </div>
                )}
                {(!selectedEnemy.drops || selectedEnemy.drops.length === 0) && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
                    <AlertTriangle size={12} />
                    <span>未配置掉落物品</span>
                  </div>
                )}
                {!selectedEnemy.battlerResource && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>未设置敌人图像</span>
                  </div>
                )}
                {(!selectedEnemy.skills || selectedEnemy.skills.length === 0) && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>未配置技能</span>
                  </div>
                )}
                {selectedEnemy.enemyType === 'boss' && (!selectedEnemy.phaseShift || selectedEnemy.phaseShift.length === 0) && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>Boss未配置阶段切换</span>
                  </div>
                )}
                {(Object.keys(selectedEnemy.elementResistances || {}).length === 0 && Object.keys(selectedEnemy.statusResistances || {}).length === 0) && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>未配置抗性</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                选择敌人查看调试信息
              </div>
            )}
          </div>
        )}

        {drawerActiveTab === 'enemygroup-log' && (
          <div className="font-mono text-xs space-y-0.5">
            {selectedEnemyGroup ? (
              <>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[配置]</span>
                  <span>遭遇ID: {selectedEnemyGroup.id}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[名称]</span>
                  <span>{selectedEnemyGroup.name} | {selectedEnemyGroup.encounterType === 'normal' ? '普通遭遇' : selectedEnemyGroup.encounterType === 'elite' ? '精英战' : selectedEnemyGroup.encounterType === 'boss' ? 'Boss战' : selectedEnemyGroup.encounterType === 'tutorial' ? '教学战' : '测试'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[等级]</span>
                  <span>推荐等级: Lv.{selectedEnemyGroup.recommendedLevel || 1} | 危险度: {selectedEnemyGroup.dangerLevel || 1}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[阵容]</span>
                  <span>共 {selectedEnemyGroup.members?.length || 0} 个敌人</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[波次]</span>
                  <span>共 {selectedEnemyGroup.waves?.length || 0} 波</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[事件]</span>
                  <span>共 {selectedEnemyGroup.events?.length || 0} 个事件</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--color-accent)' }}>[条件]</span>
                  <span>胜利: {selectedEnemyGroup.victoryConditions?.length || 0} | 失败: {selectedEnemyGroup.defeatConditions?.length || 0}</span>
                </div>
                {/* Validation checks */}
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>[校验]</span>
                </div>
                {(!selectedEnemyGroup.members || selectedEnemyGroup.members.length === 0) && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
                    <AlertTriangle size={12} />
                    <span>阵容为空，请添加敌人</span>
                  </div>
                )}
                {selectedEnemyGroup.members?.some(m => {
                  const enemy = project.enemies.find(e => e.id === m.enemyId);
                  return !enemy;
                }) && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
                    <AlertTriangle size={12} />
                    <span>存在引用不存在的敌人</span>
                  </div>
                )}
                {(!selectedEnemyGroup.victoryConditions || selectedEnemyGroup.victoryConditions.length === 0) && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
                    <AlertTriangle size={12} />
                    <span>未配置胜利条件</span>
                  </div>
                )}
                {(!selectedEnemyGroup.defeatConditions || selectedEnemyGroup.defeatConditions.length === 0) && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
                    <AlertTriangle size={12} />
                    <span>未配置失败条件</span>
                  </div>
                )}
                {selectedEnemyGroup.members?.some(m => m.midBattleSpawn) && (!selectedEnemyGroup.events || selectedEnemyGroup.events.filter(e => e.type === 'reinforce').length === 0) && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>半途出现敌人但无增援事件</span>
                  </div>
                )}
                {selectedEnemyGroup.waves?.some(w => !w.triggerCondition) && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>部分波次未配置触发条件</span>
                  </div>
                )}
                {(selectedEnemyGroup.encounterType === 'boss') && (!selectedEnemyGroup.waves || selectedEnemyGroup.waves.length === 0) && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
                    <AlertTriangle size={12} />
                    <span>Boss战建议配置波次/阶段</span>
                  </div>
                )}
                {/* Battle Test check */}
                {selectedEnemyGroup.battleTestConfig?.allyTeam && selectedEnemyGroup.battleTestConfig.allyTeam.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-success)' }}>
                    <span>[Battle Test]</span>
                    <span>已配置 {selectedEnemyGroup.battleTestConfig.allyTeam.length} 个测试角色</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                选择敌群查看调试信息
              </div>
            )}
          </div>
        )}

        {drawerActiveTab === 'prebattle-log' && (
          <div className="font-mono text-xs space-y-2">
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>战前准备检查</div>

            {/* Party Status */}
            <div className="p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: 'var(--color-accent)' }}>[队伍状态]</span>
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                请在「战前准备」页面选择遭遇并配置阵容
              </div>
            </div>

            {/* Quick Validation */}
            <div className="p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={12} style={{ color: 'var(--color-warning)' }} />
                <span style={{ color: 'var(--color-text-secondary)' }}>检查项</span>
              </div>
              <div className="space-y-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                <div>- 未部署角色检查</div>
                <div>- 装备合法性检查</div>
                <div>- 技能配置检查</div>
                <div>- 恢复/复活道具检查</div>
                <div>- 初始资源检查</div>
              </div>
            </div>

            {/* Tips */}
            <div className="p-2 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                提示：在「战前准备」页面点击「战前预检」标签可查看完整配置状态和风险提示
              </div>
            </div>
          </div>
        )}
        
        {drawerActiveTab === 'analysis-log' && (
          <div className="font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={14} style={{ color: 'var(--color-accent)' }} />
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>数值分析日志</span>
            </div>
            
            <div className="p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>数据来源</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                战斗模拟引擎 - BattleEngine.ts
              </div>
            </div>

            <div className="p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>分析说明</div>
              <div className="space-y-1 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                <div>- 胜率: 胜利次数 / 总模拟次数</div>
                <div>- 平均回合: 所有战斗回合数的平均值</div>
                <div>- 角色输出: 造成伤害的累计值</div>
                <div>- 技能分析: 基于战斗日志的使用统计</div>
              </div>
            </div>

            <div className="p-2 rounded" style={{ background: 'var(--color-bg-primary)' }}>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>风险等级</div>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: '#fef2f2', color: '#991b1b' }}>高风险 (胜率&lt;40%)</span>
                <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: '#fef3c7', color: '#92400e' }}>中风险 (40%&lt;胜率&lt;70%)</span>
                <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: '#f0fdf4', color: '#166534' }}>低风险 (胜率&gt;70%)</span>
              </div>
            </div>

            <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              提示：在「数值平衡分析」页面执行分析后，可以查看详细的分析结果和风险提示
            </div>
          </div>
        )}
        
        {drawerActiveTab === 'rules-inspector' && (
          <div className="space-y-3">
            {/* 校验摘要 */}
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)' }}>
              <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>校验摘要</h4>
              <div className="flex items-center gap-3 text-xs">
                {(() => {
                  const summary = getValidationSummary(project.rules);
                  if (summary.errors > 0) {
                    return (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: 'var(--color-danger)', color: 'white' }}>
                        {summary.errors} 错误
                      </span>
                    );
                  }
                  if (summary.warnings > 0) {
                    return (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: 'var(--color-warning)', color: 'white' }}>
                        {summary.warnings} 警告
                      </span>
                    );
                  }
                  if (summary.infos > 0) {
                    return (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: 'var(--color-accent)', color: 'white' }}>
                        {summary.infos} 提示
                      </span>
                    );
                  }
                  return (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: 'var(--color-success)', color: 'white' }}>
                      全部正常
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* 详细校验信息 */}
            <div className="space-y-2">
              {project.rules.attributes.map(attr => {
                const validation = validateAttribute(project.rules, attr);
                if (validation.status === 'valid') return null;
                return (
                  <div key={attr.id} className="p-2 rounded text-xs" style={{ background: 'var(--color-bg-primary)' }}>
                    <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{attr.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {validation.status === 'error' && <AlertTriangle size={10} style={{ color: 'var(--color-danger)' }} />}
                      {validation.status === 'warning' && <AlertTriangle size={10} style={{ color: 'var(--color-warning)' }} />}
                      {validation.status === 'info' && <Info size={10} style={{ color: 'var(--color-accent)' }} />}
                      <span style={{ 
                        color: validation.status === 'error' ? 'var(--color-danger)' : 
                               validation.status === 'warning' ? 'var(--color-warning)' : 'var(--color-accent)' 
                      }}>
                        {validation.message}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
