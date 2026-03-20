import React, { Suspense, lazy } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { X } from 'lucide-react';

const lazyNamed = <T extends React.ComponentType<any>>(
  loader: () => Promise<Record<string, T>>,
  exportName: string,
) =>
  lazy(async () => {
    const module = await loader();
    return { default: module[exportName] };
  });

const ProjectRulesWorkspace = lazyNamed(
  () => import('../editors/ProjectRules/ProjectRulesWorkspace'),
  'ProjectRulesWorkspace',
);
const CharacterEditor = lazyNamed(() => import('../editors/Character/CharacterEditor'), 'CharacterEditor');
const JobEditor = lazyNamed(() => import('../editors/Job/JobEditor'), 'JobEditor');
const SkillEditor = lazyNamed(() => import('../editors/Skill/SkillEditor'), 'SkillEditor');
const StatusEditor = lazyNamed(() => import('../editors/Status/StatusEditor'), 'StatusEditor');
const EnemyEditor = lazyNamed(() => import('../editors/Enemy/EnemyEditor'), 'EnemyEditor');
const EnemyGroupEditor = lazyNamed(() => import('../editors/EnemyGroup/EnemyGroupEditor'), 'EnemyGroupEditor');
const EquipmentEditor = lazyNamed(() => import('../editors/Equipment/EquipmentEditor'), 'EquipmentEditor');
const ItemEditor = lazyNamed(() => import('../editors/Item/ItemEditor'), 'ItemEditor');
const PrebattlePrepEditor = lazyNamed(
  () => import('../editors/PrebattlePrep/PrebattlePrepEditor'),
  'PrebattlePrepEditor',
);
const BattleSimEditor = lazyNamed(() => import('../editors/BattleSim/BattleSimEditor'), 'BattleSimEditor');
const BalanceAnalysisEditor = lazyNamed(
  () => import('../editors/BalanceAnalysis/BalanceAnalysisEditor'),
  'BalanceAnalysisEditor',
);
const SimulationWorkspace = lazyNamed(
  () => import('../editors/Simulation/SimulationWorkspace'),
  'SimulationWorkspace',
);

const LoadingState: React.FC = () => (
  <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
    <div className="text-center">
      <div className="text-sm">正在加载编辑器…</div>
    </div>
  </div>
);

export const MainEditor: React.FC = () => {
  const { activeEditor, openTabs, activeTabId, setActiveTab, closeTab } = useEditorStore();

  const renderEditor = () => {
    if (!activeEditor) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" style={{ color: 'var(--color-text-muted)' }}>
            <div className="text-lg mb-2">选择一个项目开始编辑</div>
            <div className="text-sm">从左侧数据库树中选择项目</div>
          </div>
        </div>
      );
    }

    switch (activeEditor) {
      case 'project-rules':
        return <ProjectRulesWorkspace />;
      case 'characters':
        return <CharacterEditor />;
      case 'jobs':
        return <JobEditor />;
      case 'skills':
        return <SkillEditor />;
      case 'statuses':
        return <StatusEditor />;
      case 'enemies':
        return <EnemyEditor />;
      case 'enemygroups':
        return <EnemyGroupEditor />;
      case 'equipment':
        return <EquipmentEditor />;
      case 'items':
        return <ItemEditor />;
      case 'maps':
        return <div className="p-4"><h2 style={{ color: 'var(--color-text-primary)' }}>战场编辑器</h2></div>;
      case 'simulation':
        return <SimulationWorkspace />;
      case 'prebattle-prep':
        return <PrebattlePrepEditor />;
      case 'battle-sim':
        return <BattleSimEditor />;
      case 'balance-analysis':
        return <BalanceAnalysisEditor />;
      default:
        return <div className="p-4"><span style={{ color: 'var(--color-text-muted)' }}>未实现的编辑器</span></div>;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {openTabs.length > 0 && (
        <div
          className="h-8 flex items-center gap-1 px-1 shrink-0 overflow-x-auto"
          style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}
        >
          {openTabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-3 py-1 rounded-t text-xs cursor-pointer ${
                activeTabId === tab.id ? 'shrink-0' : 'shrink-0 opacity-60'
              }`}
              style={{
                background: activeTabId === tab.id ? 'var(--color-bg-primary)' : 'transparent',
                color: activeTabId === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                borderBottom: activeTabId === tab.id ? '2px solid var(--color-accent)' : 'none',
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="truncate max-w-[100px]">{tab.title}</span>
              <button
                className="ml-1 hover:bg-[var(--color-bg-tertiary)] rounded p-0.5"
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <Suspense fallback={<LoadingState />}>{renderEditor()}</Suspense>
      </div>
    </div>
  );
};
