import React, { useState, useMemo } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useProjectStore } from '../../stores/projectStore';
import { useValidationStore } from '../../stores/validationStore';
import { 
  Link, ChevronDown, ChevronRight, 
  CheckCircle, Zap, AlertTriangle, ArrowRight, 
  FileText, Hash, Percent, AlertCircle
} from 'lucide-react';
import type { Character, Skill, Enemy, EnemyGroup, Status, CustomAttribute } from '../../types';

interface ValidationIssue {
  type: 'blocker' | 'warning';
  message: string;
  field?: string;
}

interface NextStep {
  label: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

// 本地规则校验 - 不调用AI
const validateCustomAttributes = (attributes: CustomAttribute[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  
  attributes.forEach(attr => {
    // 检查缺单位
    if (attr.type === 'number' && !attr.unit) {
      issues.push({ type: 'warning', message: `属性"${attr.name}"缺少单位`, field: 'unit' });
    }
    
    // 检查命名一致性 - np 可能应为 mp
    if (attr.id.toLowerCase() === 'np' || attr.name.toLowerCase().includes('np')) {
      issues.push({ type: 'warning', message: `属性"${attr.name}"可能是"mp"(魔法值)的笔误`, field: 'name' });
    }
    if (attr.id.toLowerCase() === 'mp' && attr.name.toLowerCase().includes('魔法')) {
      // 这是正确的
    } else if (attr.id.toLowerCase() === 'mp' && !attr.name.toLowerCase().includes('魔法')) {
      issues.push({ type: 'warning', message: `属性"${attr.name}"建议使用更明确的名称如"魔法值"`, field: 'name' });
    }
    
    // 检查min/max一致性
    if (attr.min !== undefined && attr.max !== undefined && attr.min >= attr.max) {
      issues.push({ type: 'blocker', message: `属性"${attr.name}"的最小值大于等于最大值`, field: 'min' });
    }
    
    // 检查默认值范围
    if (attr.type === 'number' && attr.min !== undefined && typeof attr.defaultValue === 'number' && attr.defaultValue < attr.min) {
      issues.push({ type: 'blocker', message: `属性"${attr.name}"默认值小于最小值`, field: 'defaultValue' });
    }
    if (attr.type === 'number' && attr.max !== undefined && typeof attr.defaultValue === 'number' && attr.defaultValue > attr.max) {
      issues.push({ type: 'blocker', message: `属性"${attr.name}"默认值大于最大值`, field: 'defaultValue' });
    }
  });
  
  // 检查重复ID
  const ids = attributes.map(a => a.id);
  const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  if (duplicates.length > 0) {
    issues.push({ type: 'blocker', message: `存在重复ID: ${duplicates.join(', ')}`, field: 'id' });
  }
  
  return issues;
};

const validateCharacter = (char: Character): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (!char.identity?.name?.trim()) {
    issues.push({ type: 'blocker', message: '角色名称为空', field: 'name' });
  }
  if (!char.identity?.faction) {
    issues.push({ type: 'warning', message: '未设置阵营', field: 'faction' });
  }
  // 角色数据结构支持 initialAttributes（当前）或 baseStats / attributes.baseStats（兼容）
  const hasBaseStats = !!(char.initialAttributes ?? (char as any).baseStats ?? (char as any).attributes?.baseStats);
  if (!hasBaseStats) {
    issues.push({ type: 'blocker', message: '未设置基础属性', field: 'baseStats' });
  }
  return issues;
};

const validateEnemy = (enemy: Enemy): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (!enemy.name) {
    issues.push({ type: 'blocker', message: '敌人名称为空', field: 'name' });
  }
  if (!enemy.drops || enemy.drops.length === 0) {
    issues.push({ type: 'warning', message: '敌人无掉落物品', field: 'drops' });
  }
  if (!enemy.ai?.behaviorTree) {
    issues.push({ type: 'warning', message: '未配置AI行为树', field: 'ai' });
  }
  if (!enemy.battlerResource) {
    issues.push({ type: 'warning', message: '缺少敌人图像资源', field: 'battlerResource' });
  }
  if (!enemy.skills || enemy.skills.length === 0) {
    issues.push({ type: 'warning', message: '敌人无技能', field: 'skills' });
  }
  if (enemy.enemyType === 'boss' && (!enemy.phaseShift || enemy.phaseShift.length === 0)) {
    issues.push({ type: 'warning', message: 'Boss未配置阶段切换', field: 'phaseShift' });
  }
  return issues;
};

const validateEnemyGroup = (group: EnemyGroup): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (!group.name) {
    issues.push({ type: 'blocker', message: '遭遇名称为空', field: 'name' });
  }
  if (!group.members || group.members.length === 0) {
    issues.push({ type: 'blocker', message: '遭遇无敌人', field: 'members' });
  }
  if (!group.victoryConditions || group.victoryConditions.length === 0) {
    issues.push({ type: 'blocker', message: '未配置胜利条件', field: 'victoryConditions' });
  }
  if (!group.defeatConditions || group.defeatConditions.length === 0) {
    issues.push({ type: 'blocker', message: '未配置失败条件', field: 'defeatConditions' });
  }
  if (group.encounterType === 'boss' && group.waves && group.waves.length === 0) {
    issues.push({ type: 'warning', message: 'Boss战未配置波次', field: 'waves' });
  }
  return issues;
};

  const validateSkill = (skill: Skill): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (!skill.name) {
    issues.push({ type: 'blocker', message: '技能名称为空', field: 'name' });
  }
  if (!skill.effectBlocks || skill.effectBlocks.length === 0) {
    issues.push({ type: 'warning', message: '技能无效果', field: 'effectBlocks' });
  }
  if (!skill.targetType) {
    issues.push({ type: 'warning', message: '未配置目标选择', field: 'targetType' });
  }
  return issues;
};

const validateStatus = (status: Status): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (!status.name) {
    issues.push({ type: 'blocker', message: '状态名称为空', field: 'name' });
  }
  if (!status.category) {
    issues.push({ type: 'blocker', message: '未选择状态类型', field: 'category' });
  }
  if ((status.category === 'buff' || status.category === 'debuff') && (!status.duration?.value || status.duration.value === 0)) {
    issues.push({ type: 'warning', message: 'Buff/Debuff建议设置持续回合', field: 'duration' });
  }
  if (!status.triggers || status.triggers.length === 0) {
    issues.push({ type: 'warning', message: '状态暂无触发行为', field: 'triggers' });
  }
  return issues;
};

export const Inspector: React.FC = () => {
  const { activeEditor, activeEntityId, activeSubTab } = useEditorStore();
  const { project, updateRules } = useProjectStore();
  const { characterValidation } = useValidationStore();
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    properties: true,
    references: true,
    risks: true,
    nextStep: true,
  });
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // 获取当前实体
  const getCurrentEntity = useMemo(() => {
    if (!activeEntityId) return null;
    
    switch (activeEditor) {
      case 'characters':
        return project.characters.find(c => c.id === activeEntityId);
      case 'jobs':
        return project.jobs.find(j => j.id === activeEntityId);
      case 'skills':
        return project.skills.find(s => s.id === activeEntityId);
      case 'statuses':
        return project.statuses.find(s => s.id === activeEntityId);
      case 'enemies':
        return project.enemies.find(e => e.id === activeEntityId);
      case 'enemygroups':
        return project.enemyGroups.find(g => g.id === activeEntityId);
      case 'prebattle-prep':
        return { id: 'prebattle-prep', name: '战前准备', type: 'workspace' };
      case 'battle-sim':
        return { id: 'battle-sim', name: '对战模拟', type: 'workspace' };
      case 'balance-analysis':
        return { id: 'balance-analysis', name: '数值平衡分析', type: 'workspace' };
      case 'project-rules':
        return { type: 'project-rules', subType: activeSubTab };
      default:
        return null;
    }
  }, [activeEditor, activeEntityId, activeSubTab, project]);

  // 获取实体名称
  const getEntityName = useMemo(() => {
    if (!activeEditor) return '未选择';
    
    if (activeEditor === 'project-rules') {
      switch (activeSubTab) {
        case 'attributes': return '自定义属性';
        case 'turn': return '回合模型';
        case 'resource': return '资源模型';
        case 'damage': return '伤害公式';
        case 'grid': return '站位模型';
        case 'elements': return '元素系统';
        case 'victory': return '胜负条件';
        default: return '项目规则';
      }
    }
    
    const entity = getCurrentEntity as any;
    if (!entity) return '未知实体';
    
    return entity.name || entity.identity?.name || entity.id;
  }, [activeEditor, activeSubTab, getCurrentEntity]);

  // 计算完成度
  const calculateCompletion = useMemo((): { percentage: number; label: string } => {
    if (!activeEditor) return { percentage: 0, label: '未选择' };
    
    if (activeEditor === 'project-rules') {
      switch (activeSubTab) {
        case 'attributes': {
          const attrs = project.rules.attributes;
          if (attrs.length === 0) return { percentage: 0, label: '无属性' };
          const complete = attrs.filter(a => a.name && a.type).length;
          return { percentage: Math.round((complete / attrs.length) * 100), label: `${complete}/${attrs.length}` };
        }
        default:
          return { percentage: 50, label: '部分完成' };
      }
    }
    
    const entity = getCurrentEntity as any;
    if (!entity) return { percentage: 0, label: '空实体' };

    if ((entity as any).type === 'workspace') {
      return { percentage: 100, label: '工作台' };
    }
    
    // 简单完成度计算
    let complete = 0;
    let total = 5;
    
    if (entity.name || entity.identity?.name) complete++;
    if (entity.attributes?.baseStats || entity.initialAttributes) complete++;
    if (entity.skills?.skillSlots || entity.skillConfig) complete++;
    if (entity.equipment || entity.initialEquipment) complete++;
    
    return { percentage: Math.round((complete / total) * 100), label: `${complete}/${total}` };
  }, [activeEditor, activeSubTab, getCurrentEntity, project]);

  // 本地规则校验 - 使用共享store确保与Editor同步
  const getValidationIssues = useMemo((): ValidationIssue[] => {
    if (!activeEditor) return [];

    // 优先使用共享校验结果（CharacterEditor已同步）
    if (activeEditor === 'characters' && characterValidation && characterValidation.entityId === activeEntityId) {
      // 将共享校验结果转换为ValidationIssue格式
      return [
        ...characterValidation.errors.map(e => ({
          type: e.type === 'error' ? 'blocker' : 'warning',
          message: e.message,
          field: e.field
        }))
      ];
    }
    
    if (activeEditor === 'project-rules' && activeSubTab === 'attributes') {
      return validateCustomAttributes(project.rules.attributes);
    }
    
    const entity = getCurrentEntity;
    if (!entity) return [];
    
    switch (activeEditor) {
      case 'characters': return validateCharacter(entity as Character);
      case 'enemies': return validateEnemy(entity as Enemy);
      case 'enemygroups': return validateEnemyGroup(entity as EnemyGroup);
      case 'skills': return validateSkill(entity as Skill);
      case 'statuses': return validateStatus(entity as Status);
      default: return [];
    }
  }, [activeEditor, activeSubTab, getCurrentEntity, project, characterValidation, activeEntityId]);

  // 引用关系
  const getReferences = useMemo(() => {
    if (!activeEntityId) return { referencedBy: [], referencesTo: [] };
    
    const referencedBy: { module: string; count: number }[] = [];
    const referencesTo: { module: string; count: number }[] = [];
    
    // 检查技能被谁引用
    if (activeEditor === 'skills') {
      const charCount = project.characters.filter(c => 
        c.skills?.skillSlots?.some((s: any) => s.skillId === activeEntityId)
      ).length;
      if (charCount > 0) referencedBy.push({ module: '角色', count: charCount });
      
      const enemyCount = project.enemies.filter(e => 
        e.skills?.some((s: any) => s.skillId === activeEntityId)
      ).length;
      if (enemyCount > 0) referencedBy.push({ module: '敌人', count: enemyCount });
    }
    
    // 检查角色引用了什么
    if (activeEditor === 'characters' && getCurrentEntity) {
      const char = getCurrentEntity as Character;
      if (char.skills?.skillSlots) {
        referencesTo.push({ module: '技能', count: char.skills.skillSlots.length });
      }
      if (char.equipment?.length) {
        referencesTo.push({ module: '装备', count: char.equipment.length });
      }
    }
    
    // 检查敌人引用了什么
    if (activeEditor === 'enemies' && getCurrentEntity) {
      const enemy = getCurrentEntity as Enemy;
      if (enemy.skills?.length) {
        referencesTo.push({ module: '技能', count: enemy.skills.length });
      }
      if (enemy.drops?.length) {
        referencesTo.push({ module: '掉落', count: enemy.drops.length });
      }
    }
    
    return { referencedBy, referencesTo };
  }, [activeEditor, activeEntityId, getCurrentEntity, project]);

  // 下一步建议
  const getNextStep = useMemo((): NextStep | null => {
    if (!activeEditor) return null;
    
    const issues = getValidationIssues;
    const blockers = issues.filter(i => i.type === 'blocker');
    const warnings = issues.filter(i => i.type === 'warning');
    
    // 优先处理阻塞项
    if (blockers.length > 0) {
      const blocker = blockers[0];
      return {
        label: `修复: ${blocker.message}`,
        action: `fix-${blocker.field}`,
        priority: 'high'
      };
    }
    
    // 其次处理警告
    if (warnings.length > 0) {
      const warning = warnings[0];
      return {
        label: `完善: ${warning.message}`,
        action: `fix-${warning.field}`,
        priority: 'medium'
      };
    }
    
    // 无问题时根据页面类型给出建议
    if (activeEditor === 'project-rules' && activeSubTab === 'attributes') {
      return {
        label: '添加新属性',
        action: 'add-attribute',
        priority: 'low'
      };
    }
    
    if (activeEditor === 'skills') {
      return {
        label: '添加技能效果',
        action: 'add-effect',
        priority: 'low'
      };
    }
    
    return null;
  }, [activeEditor, activeSubTab, getValidationIssues]);

  const applyNextStep = () => {
    setActionFeedback(null);

    if (activeEditor === 'project-rules' && activeSubTab === 'attributes') {
      const target = project.rules.attributes.find((attr) => attr.type === 'number' && !attr.unit);
      if (!target) {
        setActionFeedback('当前没有可自动处理的属性项');
        return;
      }

      const inferredUnit = /rate|accuracy|dodge|crit/i.test(target.id) ? '%' : '点';
      updateRules({
        attributes: project.rules.attributes.map((attr) =>
          attr.id === target.id ? { ...attr, unit: inferredUnit } : attr,
        ),
      });
      setActionFeedback(`已为 ${target.name} 自动补全单位：${inferredUnit}`);
      return;
    }

    setActionFeedback('这个建议需要手动调整，暂不支持一键修复');
  };

  // 自定义属性统计
  const getAttributeStats = useMemo(() => {
    if (activeEditor !== 'project-rules' || activeSubTab !== 'attributes') return null;
    
    const attrs = project.rules.attributes;
    const total = attrs.length;
    const percentage = attrs.filter(a => a.type === 'percentage').length;
    const noUnit = attrs.filter(a => a.type === 'number' && !a.unit).length;
    const nameRisks: string[] = [];
    
    attrs.forEach(attr => {
      if (attr.id.toLowerCase() === 'np' || attr.name.toLowerCase().includes('np')) {
        nameRisks.push(`"${attr.name}"可能是"mp"`);
      }
    });
    
    return { total, percentage, noUnit, nameRisks };
  }, [activeEditor, activeSubTab, project]);

  const blockerCount = getValidationIssues.filter(i => i.type === 'blocker').length;
  const warningCount = getValidationIssues.filter(i => i.type === 'warning').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div 
        className="h-8 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>检视</span>
      </div>

      <div className="flex-1 overflow-auto">
        {/* 1. 页面摘要 */}
        <div className="inspector-section">
          <div 
            className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => toggleSection('summary')}
          >
            {expandedSections.summary ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <FileText size={12} style={{ color: 'var(--color-accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>页面摘要</span>
          </div>
          {expandedSections.summary && (
            <div className="px-3 pb-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>当前实体</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{getEntityName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>完成度</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--color-bg-tertiary)' }}>
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${calculateCompletion.percentage}%`,
                          background: calculateCompletion.percentage === 100 ? 'var(--color-success)' : 'var(--color-accent)'
                        }} 
                      />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{calculateCompletion.label}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>阻塞项</span>
                  <span className={`text-xs ${blockerCount > 0 ? 'risk-high' : ''}`}>{blockerCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>告警项</span>
                  <span className={`text-xs ${warningCount > 0 ? 'risk-medium' : ''}`}>{warningCount}</span>
                </div>
                
                {/* 自定义属性补充统计 */}
                {getAttributeStats && (
                  <>
                    <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--color-border-muted)' }}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>属性数</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{getAttributeStats.total}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                          <Percent size={10} />百分比属性
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{getAttributeStats.percentage}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>缺单位</span>
                        <span className={`text-xs ${getAttributeStats.noUnit > 0 ? 'risk-medium' : ''}`}>{getAttributeStats.noUnit}</span>
                      </div>
                      {getAttributeStats.nameRisks.length > 0 && (
                        <div className="mt-2 p-2 rounded" style={{ background: 'rgba(251, 191, 36, 0.1)' }}>
                          <div className="flex items-center gap-1 mb-1">
                            <AlertCircle size={10} style={{ color: 'var(--color-warning)' }} />
                            <span className="text-xs" style={{ color: 'var(--color-warning)' }}>命名风险</span>
                          </div>
                          {getAttributeStats.nameRisks.map((risk, idx) => (
                            <div key={idx} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{risk}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. 属性摘要 */}
        <div className="inspector-section">
          <div 
            className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => toggleSection('properties')}
          >
            {expandedSections.properties ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Hash size={12} style={{ color: 'var(--color-accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>属性</span>
          </div>
          {expandedSections.properties && (
            <div className="px-3 pb-2">
              {getCurrentEntity ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--color-border-muted)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>内部键名</span>
                    <span style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace', fontSize: 10 }}>
                      {(getCurrentEntity as any)?.id || '-'}
                    </span>
                  </div>
                  
                  {activeEditor === 'characters' && 'identity' in (getCurrentEntity as any) && (
                    <>
                      <div className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--color-border-muted)' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>名称</span>
                        <span style={{ color: 'var(--color-text-primary)' }}>{(getCurrentEntity as Character).identity?.name}</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--color-border-muted)' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>阵营</span>
                        <span style={{ color: 'var(--color-text-primary)' }}>{(getCurrentEntity as Character).identity?.faction || '-'}</span>
                      </div>
                    </>
                  )}

                  {activeEditor === 'enemies' && 'enemyType' in (getCurrentEntity as any) && (
                    <>
                      <div className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--color-border-muted)' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>类型</span>
                        <span style={{ color: 'var(--color-text-primary)' }}>
                          {((getCurrentEntity as Enemy).enemyType === 'normal' ? '小怪' : 
                            (getCurrentEntity as Enemy).enemyType === 'elite' ? '精英' : 
                            (getCurrentEntity as Enemy).enemyType === 'boss' ? 'Boss' : 
                            (getCurrentEntity as Enemy).enemyType === 'summon' ? '召唤物' : '测试')}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--color-border-muted)' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>危险等级</span>
                        <span style={{ color: 'var(--color-accent)' }}>Lv.{(getCurrentEntity as Enemy).dangerLevel || 1}</span>
                      </div>
                    </>
                  )}

                  {activeEditor === 'enemygroups' && (
                    <>
                      <div className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--color-border-muted)' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>敌人数量</span>
                        <span style={{ color: 'var(--color-text-primary)' }}>{(getCurrentEntity as EnemyGroup).members?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--color-border-muted)' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>波次数</span>
                        <span style={{ color: 'var(--color-text-primary)' }}>{(getCurrentEntity as EnemyGroup).waves?.length || 1}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>
                  选择实体查看属性
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. 引用关系 */}
        <div className="inspector-section">
          <div 
            className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => toggleSection('references')}
          >
            {expandedSections.references ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Link size={12} style={{ color: 'var(--color-accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>引用关系</span>
          </div>
          {expandedSections.references && (
            <div className="px-3 pb-2">
              {/* 谁引用当前实体 */}
              <div className="mb-3">
                <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>谁引用当前实体</div>
                {getReferences.referencedBy.length > 0 ? (
                  <div className="space-y-1">
                    {getReferences.referencedBy.map((ref, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 rounded px-2" style={{ background: 'var(--color-bg-tertiary)' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{ref.module}</span>
                        <span className="badge info">{ref.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs py-1" style={{ color: 'var(--color-text-muted)' }}>暂无引用</div>
                )}
              </div>
              
              {/* 当前实体引用了谁 */}
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>当前实体引用了谁</div>
                {getReferences.referencesTo.length > 0 ? (
                  <div className="space-y-1">
                    {getReferences.referencesTo.map((ref, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 rounded px-2" style={{ background: 'var(--color-bg-tertiary)' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{ref.module}</span>
                        <span className="badge info">{ref.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs py-1" style={{ color: 'var(--color-text-muted)' }}>暂无引用</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. 风险提示 */}
        <div className="inspector-section">
          <div 
            className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => toggleSection('risks')}
          >
            {expandedSections.risks ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <AlertTriangle size={12} style={{ color: getValidationIssues.length > 0 ? 'var(--color-warning)' : 'var(--color-success)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>风险提示</span>
            {getValidationIssues.length > 0 && (
              <span className="badge warning ml-auto">{getValidationIssues.length}</span>
            )}
          </div>
          {expandedSections.risks && (
            <div className="px-3 pb-2">
              {getValidationIssues.length > 0 ? (
                <div className="space-y-2">
                  {getValidationIssues.map((issue, idx) => (
                    <div 
                      key={idx} 
                      className="p-2 rounded"
                      style={{ 
                        background: issue.type === 'blocker' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)' 
                      }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {issue.type === 'blocker' ? (
                          <AlertCircle size={10} style={{ color: 'var(--color-error)' }} />
                        ) : (
                          <AlertTriangle size={10} style={{ color: 'var(--color-warning)' }} />
                        )}
                        <span className={`text-xs ${issue.type === 'blocker' ? 'risk-high' : 'risk-medium'}`}>
                          {issue.type === 'blocker' ? '阻塞' : '警告'}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{issue.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>
                  <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
                  本地校验通过
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. 下一步 */}
        <div className="inspector-section">
          <div 
            className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => toggleSection('nextStep')}
          >
            {expandedSections.nextStep ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <ArrowRight size={12} style={{ color: 'var(--color-accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>下一步</span>
          </div>
          {expandedSections.nextStep && (
            <div className="px-3 pb-2">
              {getNextStep ? (
                <div className="p-3 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} style={{ color: getNextStep.priority === 'high' ? 'var(--color-error)' : 'var(--color-accent)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {getNextStep.priority === 'high' ? '高优先级' : getNextStep.priority === 'medium' ? '中优先级' : '建议'}
                    </span>
                  </div>
                  <div className="text-xs mb-2" style={{ color: 'var(--color-text-primary)' }}>{getNextStep.label}</div>
                  <button 
                    className="w-full text-xs py-1.5 rounded flex items-center justify-center gap-1"
                    style={{ background: 'var(--color-accent)', color: 'white' }}
                    onClick={applyNextStep}
                  >
                    <ArrowRight size={10} /> 立即处理
                  </button>
                  {actionFeedback && (
                    <div className="mt-2 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {actionFeedback}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>
                  <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
                  暂无待办事项
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
