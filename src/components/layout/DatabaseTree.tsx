import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useEditorStore } from '../../stores/editorStore';
import type { DatabaseCategory, TreeNode, CharacterCategory, Enemy, EnemyGroup } from '../../types';
import { 
  Settings, Users, Briefcase, Sparkles, Sword, Swords, Skull, Map, Play, Package,
  ChevronRight, ChevronDown, Plus, Search, AlertCircle, CheckCircle, AlertTriangle, Circle, BarChart3
} from 'lucide-react';

type NodeStatus = 'empty' | 'in-progress' | 'completed' | 'warning' | 'error';

// Character category config for tree display
const characterCategoryConfig: { id: CharacterCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'player', label: '主角团', icon: <Users size={12} />, color: '#22c55e' },
  { id: 'enemy-controlled', label: '敌方可控', icon: <Skull size={12} />, color: '#ef4444' },
  { id: 'npc-battle', label: 'NPC战斗', icon: <Users size={12} />, color: '#3b82f6' },
  { id: 'test', label: '测试角色', icon: <AlertCircle size={12} />, color: '#f59e0b' },
  { id: 'boss', label: 'Boss模板', icon: <Sparkles size={12} />, color: '#8b5cf6' },
];

const iconMap: Record<DatabaseCategory, React.ReactNode> = {
  'project-rules': <Settings size={14} />,
  'characters': <Users size={14} />,
  'jobs': <Briefcase size={14} />,
  'skills': <Sparkles size={14} />,
  'statuses': <AlertCircle size={14} />,
  'equipment': <Sword size={14} />,
  'items': <Package size={14} />,
  'enemies': <Skull size={14} />,
  'enemygroups': <Users size={14} />,
  'maps': <Map size={14} />,
  'simulation': <Play size={14} />,
  'battle-sim': <Swords size={14} />,
  'balance-analysis': <BarChart3 size={14} />,
};

const statusIcons: Record<NodeStatus, React.ReactNode> = {
  'empty': <Circle size={10} style={{ color: 'var(--color-text-muted)' }} />,
  'in-progress': <AlertCircle size={10} style={{ color: 'var(--color-info)' }} />,
  'completed': <CheckCircle size={10} style={{ color: 'var(--color-success)' }} />,
  'warning': <AlertTriangle size={10} style={{ color: 'var(--color-warning)' }} />,
  'error': <AlertCircle size={10} style={{ color: 'var(--color-danger)' }} />,
};

const getNodeStatus = (node: TreeNode): NodeStatus => {
  if (node.data?.empty) return 'empty';
  if (node.data?.status) return node.data.status as NodeStatus;
  return 'completed';
};

// Get enemy status for risk detection
const getEnemyStatus = (enemy: Enemy): 'completed' | 'warning' | 'error' => {
  const risks: string[] = [];

  // Check for missing AI
  if (!enemy.ai || !enemy.ai.behaviorTree) {
    risks.push('no-ai');
  }

  // Check for no drops
  if (!enemy.drops || enemy.drops.length === 0) {
    risks.push('no-drop');
  }

  // Check for no image
  if (!enemy.battlerResource) {
    risks.push('no-image');
  }

  // Check for no resistances/traits
  if ((!enemy.elementResistances || Object.keys(enemy.elementResistances).length === 0) &&
      (!enemy.statusResistances || Object.keys(enemy.statusResistances).length === 0)) {
    risks.push('no-resistances');
  }

  // Check for no skills
  if (!enemy.skills || enemy.skills.length === 0) {
    risks.push('no-skills');
  }

  // If has errors, return error
  if (risks.includes('no-ai') || risks.includes('no-drop')) {
    return 'error';
  }

  // If has warnings, return warning
  if (risks.length > 0) {
    return 'warning';
  }

  return 'completed';
};

// Get encounter status for risk detection
const getEncounterStatus = (group: EnemyGroup): 'completed' | 'warning' | 'error' => {
  const risks: string[] = [];

  // Check for no members
  if (!group.members || group.members.length === 0) {
    risks.push('no-members');
  }

  // Check for enemy existence
  const enemyIds = group.members?.map(m => m.enemyId) || [];
  const waveEnemyIds = group.waves?.flatMap(w => w.spawns?.map(s => s.enemyId) || []) || [];
  const allEnemyIds = [...new Set([...enemyIds, ...waveEnemyIds])];
  
  // Check mid-battle spawn without event
  const midBattleSpawns = group.members?.filter(m => m.midBattleSpawn) || [];
  const hasReinforceEvents = group.events?.some(e => e.type === 'reinforce') || false;
  if (midBattleSpawns.length > 0 && !hasReinforceEvents) {
    risks.push('mid-battle-spawn-no-event');
  }

  // Check for no victory conditions
  if (!group.victoryConditions || group.victoryConditions.length === 0) {
    risks.push('no-victory-condition');
  }

  // Check for no defeat conditions
  if (!group.defeatConditions || group.defeatConditions.length === 0) {
    risks.push('no-defeat-condition');
  }

  // Check for waves without trigger
  const wavesWithoutTrigger = group.waves?.filter(w => !w.triggerCondition) || [];
  if (wavesWithoutTrigger.length > 0) {
    risks.push('wave-no-trigger');
  }

  // If has errors, return error
  if (risks.includes('no-members') || risks.includes('no-victory-condition')) {
    return 'error';
  }

  // If has warnings, return warning
  if (risks.length > 0) {
    return 'warning';
  }

  return 'completed';
};

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  onSelect: (node: TreeNode) => void;
  selectedId: string | null;
}

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({ node, level, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState(level === 0);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const status = getNodeStatus(node);

  return (
    <div>
      <div 
        className={`tree-item flex items-center gap-1 px-2 py-1.5 cursor-pointer ${isSelected ? 'selected' : ''}`}
        style={{ 
          paddingLeft: `${level * 12 + 8}px`,
          background: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
          color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-primary)',
        }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button 
            className="p-0.5 hover:bg-[var(--color-bg-elevated)] rounded"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="shrink-0" style={{ color: isSelected ? 'inherit' : 'var(--color-accent)' }}>
          {iconMap[node.type]}
        </span>
        <span className="text-xs truncate flex-1">{node.label}</span>
        {statusIcons[status]}
        {hasChildren && (
          <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>
            ({node.children?.length})
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children?.map((child) => (
            <TreeNodeComponent 
              key={child.id} 
              node={child} 
              level={level + 1} 
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DatabaseTree: React.FC = () => {
  const { project } = useProjectStore();
  const { activeEntityId, setActiveEditor, openTab } = useEditorStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Safe project reference - avoid crashes when project is not fully loaded
  const p = project ?? {
    characters: [],
    jobs: [],
    skills: [],
    statuses: [],
    equipment: [],
    enemies: [],
    enemyGroups: [],
    items: [],
    battleMaps: []
  };

  // Use store's activeEntityId as selected, default to project-rules-root
  const selectedId = activeEntityId || 'project-rules-root';

  const treeData = useMemo<TreeNode[]>(() => {
    const categories: TreeNode[] = [
      {
        id: 'project-rules-root',
        label: '项目规则',
        type: 'project-rules',
        data: { status: 'completed' as NodeStatus },
        children: [
          { id: 'attr-system', label: '自定义属性', type: 'project-rules', data: { subType: 'attributes', status: 'completed' as NodeStatus } },
          { id: 'turn-model', label: '回合模型', type: 'project-rules', data: { subType: 'turn', status: 'completed' as NodeStatus } },
          { id: 'resource-model', label: '资源模型', type: 'project-rules', data: { subType: 'resource', status: 'completed' as NodeStatus } },
          { id: 'grid-model', label: '站位/网格', type: 'project-rules', data: { subType: 'grid', status: 'completed' as NodeStatus } },
          { id: 'damage-formulas', label: '伤害公式', type: 'project-rules', data: { subType: 'damage', status: 'completed' as NodeStatus } },
          { id: 'elements', label: '元素系统', type: 'project-rules', data: { subType: 'elements', status: 'completed' as NodeStatus } },
          { id: 'victory-conds', label: '胜负条件', type: 'project-rules', data: { subType: 'victory', status: 'completed' as NodeStatus } },
          { id: 'preset-library', label: '策划模板库', type: 'project-rules', data: { subType: 'library', status: 'completed' as NodeStatus } },
        ],
      },
      {
        id: 'characters-root',
        label: '角色',
        type: 'characters',
        data: { status: p.characters.length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
        children: p.characters.length > 0 
          ? characterCategoryConfig.map(cat => {
              const catChars = p.characters.filter(c => (c.category || 'player') === cat.id);
              return {
                id: `char-cat-${cat.id}`,
                label: cat.label,
                type: 'characters' as DatabaseCategory,
                data: { subType: 'character-category', category: cat.id },
                children: catChars.length > 0 
                  ? catChars.map(c => ({ 
                      id: c.id, 
                      label: c.identity?.name || '未命名', 
                      type: 'characters' as DatabaseCategory, 
                      data: { entityId: c.id, status: 'completed' as NodeStatus } 
                    }))
                  : undefined
              };
            })
          : [{ id: 'no-char', label: '(无角色)', type: 'characters', data: { empty: true } }],
      },
      {
        id: 'jobs-root',
        label: '职业/派系',
        type: 'jobs',
        data: { status: p.jobs.length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
        children: p.jobs.length > 0
          ? p.jobs.map(j => ({ id: j.id, label: j.name, type: 'jobs' as DatabaseCategory, data: { entityId: j.id, status: 'completed' as NodeStatus } }))
          : [{ id: 'no-job', label: '(无职业)', type: 'jobs', data: { empty: true } }],
      },
      {
        id: 'skills-root',
        label: '技能/状态',
        type: 'skills',
        data: { status: (p.skills.length > 0 || p.statuses.length > 0) ? 'completed' as NodeStatus : 'empty' as NodeStatus },
        children: [
          { id: 'skills-sub', label: '技能', type: 'skills', data: { subType: 'skills', status: p.skills.length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus }, 
            children: p.skills.length > 0 
              ? p.skills.map(s => ({ id: s.id, label: s.name, type: 'skills' as DatabaseCategory, data: { entityId: s.id, subType: 'skills', status: 'completed' as NodeStatus } }))
              : [{ id: 'no-skill', label: '(无技能)', type: 'skills', data: { empty: true } }] 
          },
          { id: 'statuses-sub', label: '状态', type: 'statuses', data: { subType: 'statuses', status: p.statuses.length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
            children: p.statuses.length > 0
              ? p.statuses.map(s => ({ id: s.id, label: s.name, type: 'statuses' as DatabaseCategory, data: { entityId: s.id, subType: 'statuses', status: 'completed' as NodeStatus } }))
              : [{ id: 'no-status', label: '(无状态)', type: 'statuses', data: { empty: true } }]
          },
        ],
      },
      {
        id: 'equipment-root',
        label: '装备',
        type: 'equipment',
        data: { status: p.equipment.length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
        children: p.equipment.length > 0
          ? [
              { id: 'equip-weapon', label: '武器', type: 'equipment' as DatabaseCategory, data: { subType: 'weapon' } as any,
                children: p.equipment.filter(e => e.equipmentCategory === 'weapon').map(e => ({ id: e.id, label: e.name, type: 'equipment' as DatabaseCategory, data: { entityId: e.id, status: 'completed' as NodeStatus } }))
              },
              { id: 'equip-armor', label: '防具', type: 'equipment' as DatabaseCategory, data: { subType: 'armor' } as any,
                children: p.equipment.filter(e => e.equipmentCategory === 'armor').map(e => ({ id: e.id, label: e.name, type: 'equipment' as DatabaseCategory, data: { entityId: e.id, status: 'completed' as NodeStatus } }))
              },
              { id: 'equip-accessory', label: '饰品', type: 'equipment' as DatabaseCategory, data: { subType: 'accessory' } as any,
                children: p.equipment.filter(e => e.equipmentCategory === 'accessory').map(e => ({ id: e.id, label: e.name, type: 'equipment' as DatabaseCategory, data: { entityId: e.id, status: 'completed' as NodeStatus } }))
              },
              { id: 'equip-exclusive', label: '专属装备', type: 'equipment' as DatabaseCategory, data: { subType: 'exclusive' } as any,
                children: p.equipment.filter(e => e.equipmentCategory === 'exclusive').map(e => ({ id: e.id, label: e.name, type: 'equipment' as DatabaseCategory, data: { entityId: e.id, status: 'completed' as NodeStatus } }))
              },
              { id: 'equip-test', label: '测试装备', type: 'equipment' as DatabaseCategory, data: { subType: 'test' } as any,
                children: p.equipment.filter(e => e.equipmentCategory === 'test').map(e => ({ id: e.id, label: e.name, type: 'equipment' as DatabaseCategory, data: { entityId: e.id, status: 'completed' as NodeStatus } }))
              },
            ]
          : [{ id: 'no-equip', label: '(无装备)', type: 'equipment', data: { empty: true } }],
      },
      {
        id: 'items-root',
        label: '道具',
        type: 'items',
        data: { status: p.items.length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
        children: p.items.length > 0
          ? [
              { id: 'item-recovery', label: '恢复', type: 'items' as DatabaseCategory, data: { subType: 'recovery' } as any,
                children: p.items.filter(i => i.itemCategory === 'recovery').map(i => ({ id: i.id, label: i.name, type: 'items' as DatabaseCategory, data: { entityId: i.id, status: 'completed' as NodeStatus } }))
              },
              { id: 'item-resurrection', label: '复活', type: 'items' as DatabaseCategory, data: { subType: 'resurrection' } as any,
                children: p.items.filter(i => i.itemCategory === 'resurrection').map(i => ({ id: i.id, label: i.name, type: 'items' as DatabaseCategory, data: { entityId: i.id, status: 'completed' as NodeStatus } }))
              },
              { id: 'item-buff', label: '增益', type: 'items' as DatabaseCategory, data: { subType: 'buff' } as any,
                children: p.items.filter(i => i.itemCategory === 'buff').map(i => ({ id: i.id, label: i.name, type: 'items' as DatabaseCategory, data: { entityId: i.id, status: 'completed' as NodeStatus } }))
              },
              { id: 'item-consumable', label: '战斗消耗品', type: 'items' as DatabaseCategory, data: { subType: 'consumable' } as any,
                children: p.items.filter(i => i.itemCategory === 'consumable').map(i => ({ id: i.id, label: i.name, type: 'items' as DatabaseCategory, data: { entityId: i.id, status: 'completed' as NodeStatus } }))
              },
              { id: 'item-quest', label: '任务道具', type: 'items' as DatabaseCategory, data: { subType: 'quest' } as any,
                children: p.items.filter(i => i.itemCategory === 'quest').map(i => ({ id: i.id, label: i.name, type: 'items' as DatabaseCategory, data: { entityId: i.id, status: 'completed' as NodeStatus } }))
              },
              { id: 'item-key', label: '关键道具', type: 'items' as DatabaseCategory, data: { subType: 'key' } as any,
                children: p.items.filter(i => i.itemCategory === 'key').map(i => ({ id: i.id, label: i.name, type: 'items' as DatabaseCategory, data: { entityId: i.id, status: 'completed' as NodeStatus } }))
              },
            ]
          : [{ id: 'no-item', label: '(无道具)', type: 'items', data: { empty: true } }],
      },
      // 敌人资产
      {
        id: 'enemies-root',
        label: '敌人资产',
        type: 'enemies',
        data: { status: p.enemies.length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
        children: [
          { id: 'enemy-minion', label: '小怪', type: 'enemies', data: { subType: 'minion', status: p.enemies.filter(e => e.enemyType === 'normal').length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
            children: p.enemies.filter(e => e.enemyType === 'normal').length > 0
              ? p.enemies.filter(e => e.enemyType === 'normal').map(e => ({ id: e.id, label: `${e.name} ⚠${e.dangerLevel || 1}`, type: 'enemies' as DatabaseCategory, data: { entityId: e.id, subType: 'minion', status: getEnemyStatus(e) as NodeStatus, skillCount: e.skills?.length || 0 } }))
              : [{ id: 'no-minion', label: '(无小怪)', type: 'enemies', data: { empty: true } }]
          },
          { id: 'enemy-elite', label: '精英', type: 'enemies', data: { subType: 'elite', status: p.enemies.filter(e => e.enemyType === 'elite').length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
            children: p.enemies.filter(e => e.enemyType === 'elite').length > 0
              ? p.enemies.filter(e => e.enemyType === 'elite').map(e => ({ id: e.id, label: `${e.name} ⚠${e.dangerLevel || 2}`, type: 'enemies' as DatabaseCategory, data: { entityId: e.id, subType: 'elite', status: getEnemyStatus(e) as NodeStatus, skillCount: e.skills?.length || 0 } }))
              : [{ id: 'no-elite', label: '(无精英)', type: 'enemies', data: { empty: true } }]
          },
          { id: 'enemy-boss', label: 'Boss', type: 'enemies', data: { subType: 'boss', status: p.enemies.filter(e => e.enemyType === 'boss').length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
            children: p.enemies.filter(e => e.enemyType === 'boss').length > 0
              ? p.enemies.filter(e => e.enemyType === 'boss').map(e => ({ id: e.id, label: `${e.name} ⚠${e.dangerLevel || 3}`, type: 'enemies' as DatabaseCategory, data: { entityId: e.id, subType: 'boss', status: getEnemyStatus(e) as NodeStatus, skillCount: e.skills?.length || 0 } }))
              : [{ id: 'no-boss', label: '(无Boss)', type: 'enemies', data: { empty: true } }]
          },
          { id: 'enemy-summon', label: '召唤物', type: 'enemies', data: { subType: 'summon', status: p.enemies.filter(e => e.enemyType === 'summon').length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
            children: p.enemies.filter(e => e.enemyType === 'summon').length > 0
              ? p.enemies.filter(e => e.enemyType === 'summon').map(e => ({ id: e.id, label: `${e.name} ⚠${e.dangerLevel || 1}`, type: 'enemies' as DatabaseCategory, data: { entityId: e.id, subType: 'summon', status: getEnemyStatus(e) as NodeStatus, skillCount: e.skills?.length || 0 } }))
              : [{ id: 'no-summon', label: '(无召唤物)', type: 'enemies', data: { empty: true } }]
          },
          { id: 'enemy-test', label: '测试敌人', type: 'enemies', data: { subType: 'test', status: p.enemies.filter(e => e.enemyType === 'test').length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
            children: p.enemies.filter(e => e.enemyType === 'test').length > 0
              ? p.enemies.filter(e => e.enemyType === 'test').map(e => ({ id: e.id, label: `${e.name} ⚠${e.dangerLevel || 1}`, type: 'enemies' as DatabaseCategory, data: { entityId: e.id, subType: 'test', status: getEnemyStatus(e) as NodeStatus, skillCount: e.skills?.length || 0 } }))
              : [{ id: 'no-enemy-test', label: '(无测试敌人)', type: 'enemies', data: { empty: true } }]
          },
        ],
      },
      // 敌群/遭遇
      {
        id: 'encounters-root',
        label: '敌群/遭遇',
        type: 'enemygroups',
        data: { status: p.enemyGroups.length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
        children: [
          { id: 'encounter-normal', label: '普通遭遇', type: 'enemygroups', data: { subType: 'encounter-normal', status: p.enemyGroups.filter(g => g.encounterType === 'normal').length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
            children: p.enemyGroups.filter(g => g.encounterType === 'normal').length > 0
              ? p.enemyGroups.filter(g => g.encounterType === 'normal').map(g => ({ id: g.id, label: `${g.name} 👥${g.members?.length || 0} 🌊${g.waves?.length || 1}`, type: 'enemygroups' as DatabaseCategory, data: { entityId: g.id, subType: 'encounter', status: getEncounterStatus(g) as NodeStatus, hasEvents: (g.events?.length || 0) > 0, waveCount: g.waves?.length || 1 } }))
              : [{ id: 'no-enc-normal', label: '(无普通遭遇)', type: 'enemygroups', data: { empty: true } }]
          },
          { id: 'encounter-elite', label: '精英战', type: 'enemygroups', data: { subType: 'encounter-elite', status: p.enemyGroups.filter(g => g.encounterType === 'elite').length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
            children: p.enemyGroups.filter(g => g.encounterType === 'elite').length > 0
              ? p.enemyGroups.filter(g => g.encounterType === 'elite').map(g => ({ id: g.id, label: `${g.name} 👥${g.members?.length || 0} 🌊${g.waves?.length || 1}`, type: 'enemygroups' as DatabaseCategory, data: { entityId: g.id, subType: 'encounter', status: getEncounterStatus(g) as NodeStatus, hasEvents: (g.events?.length || 0) > 0, waveCount: g.waves?.length || 1 } }))
              : [{ id: 'no-enc-elite', label: '(无精英战)', type: 'enemygroups', data: { empty: true } }]
          },
          { id: 'encounter-boss', label: 'Boss战', type: 'enemygroups', data: { subType: 'encounter-boss', status: p.enemyGroups.filter(g => g.encounterType === 'boss').length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
            children: p.enemyGroups.filter(g => g.encounterType === 'boss').length > 0
              ? p.enemyGroups.filter(g => g.encounterType === 'boss').map(g => ({ id: g.id, label: `${g.name} 👥${g.members?.length || 0} 🌊${g.waves?.length || 1}`, type: 'enemygroups' as DatabaseCategory, data: { entityId: g.id, subType: 'encounter', status: getEncounterStatus(g) as NodeStatus, hasEvents: (g.events?.length || 0) > 0, waveCount: g.waves?.length || 1 } }))
              : [{ id: 'no-enc-boss', label: '(无Boss战)', type: 'enemygroups', data: { empty: true } }]
          },
          { id: 'encounter-tutorial', label: '教学战', type: 'enemygroups', data: { subType: 'encounter-tutorial', status: p.enemyGroups.filter(g => g.encounterType === 'tutorial').length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
            children: p.enemyGroups.filter(g => g.encounterType === 'tutorial').length > 0
              ? p.enemyGroups.filter(g => g.encounterType === 'tutorial').map(g => ({ id: g.id, label: `${g.name} 👥${g.members?.length || 0} 🌊${g.waves?.length || 1}`, type: 'enemygroups' as DatabaseCategory, data: { entityId: g.id, subType: 'encounter', status: getEncounterStatus(g) as NodeStatus, hasEvents: (g.events?.length || 0) > 0, waveCount: g.waves?.length || 1 } }))
              : [{ id: 'no-enc-tutorial', label: '(无教学战)', type: 'enemygroups', data: { empty: true } }]
          },
          { id: 'encounter-test', label: '测试遭遇', type: 'enemygroups', data: { subType: 'encounter-test', status: p.enemyGroups.filter(g => g.encounterType === 'test').length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
            children: p.enemyGroups.filter(g => g.encounterType === 'test').length > 0
              ? p.enemyGroups.filter(g => g.encounterType === 'test').map(g => ({ id: g.id, label: `${g.name} 👥${g.members?.length || 0} 🌊${g.waves?.length || 1}`, type: 'enemygroups' as DatabaseCategory, data: { entityId: g.id, subType: 'encounter', status: getEncounterStatus(g) as NodeStatus, hasEvents: (g.events?.length || 0) > 0, waveCount: g.waves?.length || 1 } }))
              : [{ id: 'no-enc-test', label: '(无测试遭遇)', type: 'enemygroups', data: { empty: true } }]
          },
        ],
      },
      {
        id: 'maps-root',
        label: '地图/关卡',
        type: 'maps',
        data: { status: p.battleMaps.length > 0 ? 'completed' as NodeStatus : 'empty' as NodeStatus },
        children: p.battleMaps.length > 0
          ? p.battleMaps.map(m => ({ id: m.id, label: m.name, type: 'maps' as DatabaseCategory, data: { entityId: m.id, status: 'completed' as NodeStatus } }))
          : [{ id: 'no-map', label: '(无地图)', type: 'maps', data: { empty: true } }],
      },
      {
        id: 'simulation-root',
        label: '模拟/分析',
        type: 'simulation',
        data: { status: 'in-progress' as NodeStatus },
        children: [
          { id: 'pre-battle', label: '战前准备', type: 'simulation', data: { subType: 'pre-battle', status: 'empty' as NodeStatus } },
          { id: 'battle-sim-node', label: '对战模拟', type: 'battle-sim', data: { subType: 'battle-sim', status: 'empty' as NodeStatus } },
          { id: 'balance-analysis-node', label: '数值平衡分析', type: 'balance-analysis', data: { subType: 'balance-analysis', status: 'empty' as NodeStatus } },
        ],
      },
    ];
    
    return categories;
  }, [project]);

  const filteredTree = useMemo(() => {
    if (!searchTerm) return treeData;
    const term = searchTerm.toLowerCase();
    const filterNode = (node: TreeNode): TreeNode | null => {
      if (node.label.toLowerCase().includes(term)) {
        return node;
      }
      if (node.children) {
        const filteredChildren = node.children.map(filterNode).filter(Boolean) as TreeNode[];
        if (filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
      }
      return null;
    };
    return treeData.map(filterNode).filter(Boolean) as TreeNode[];
  }, [treeData, searchTerm]);

  const handleSelect = (node: TreeNode) => {
    // 如果是角色分类节点，自动选中该分类下的第一个角色（避免传入无效 entityId 导致黑屏）
    if (node.data?.subType === 'character-category') {
      try {
        const category = node.data.category as string;
        const store = useEditorStore.getState();
        const project = useProjectStore.getState().project;
        const chars = Array.isArray(project?.characters) ? project.characters : [];
        const categoryChars = chars.filter((c: { category?: string }) => (c.category || 'player') === category);
        const targetChar = categoryChars.length > 0 ? categoryChars[0] : chars[0];
        if (targetChar) {
          store.setActiveEditor('characters', targetChar.id);
          store.openTab({
            id: targetChar.id,
            type: 'characters',
            entityId: targetChar.id,
            title: targetChar.identity?.name || '未命名',
          });
          return;
        }
      } catch (_) {
        // 若解析失败则走下方通用逻辑，避免整页崩溃
      }
    }

    const entityId = (node.data?.entityId as string) || node.id;
    let editorType = node.data?.subType === 'statuses' ? 'statuses' : node.type;
    if (node.data?.subType === 'pre-battle') editorType = 'prebattle-prep';
    if (node.data?.subType === 'battle-sim') editorType = 'battle-sim';
    if (node.data?.subType === 'balance-analysis') editorType = 'balance-analysis';
    
    // Get store actions
    const store = useEditorStore.getState();
    
    // Determine subTab for project-rules
    let targetSubTab: string | null = null;
    if (node.type === 'project-rules' && node.data?.subType) {
      const subTypeMap: Record<string, string | null> = {
        'attributes': 'attributes',
        'turn': 'turn',
        'resource': 'resource',
        'damage': 'damage',
        'grid': 'grid',
        'elements': 'elements',
        'victory': 'victory',
        'library': 'library',
      };
      targetSubTab = subTypeMap[node.data.subType as string] || 'attributes';
    }
    
    // Update all state at once
    store.setActiveEditor(editorType, entityId);
    if (targetSubTab !== null) {
      store.setActiveSubTab(targetSubTab);
    }
    
    // Open or switch to tab
    store.openTab({
      id: entityId,
      type: editorType,
      entityId: entityId,
      title: node.label,
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-2">
        <div 
          className="flex items-center gap-2 px-2 py-1 rounded"
          style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}
        >
          <Search size={12} style={{ color: 'var(--color-text-muted)' }} />
          <input 
            type="text"
            placeholder="搜索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-xs"
            style={{ color: 'var(--color-text-primary)' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredTree.map((node) => (
          <TreeNodeComponent 
            key={node.id} 
            node={node} 
            level={0} 
            onSelect={handleSelect}
            selectedId={selectedId}
          />
        ))}
      </div>

      <div className="p-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button 
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded text-xs hover:bg-[var(--color-bg-tertiary)]"
          style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
        >
          <Plus size={12} />
          新建
        </button>
      </div>
    </div>
  );
};
