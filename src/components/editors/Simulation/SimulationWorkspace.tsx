import React, { useState, useEffect, useMemo } from 'react';
import { useEditorStore } from '../../../stores/editorStore';
import { useProjectStore } from '../../../stores/projectStore';
import {
  Settings,
  Swords,
  BarChart3,
  Clock,
  AlertTriangle,
  Play,
  Users,
  ChevronRight,
  FileText,
  Activity,
  Zap
} from 'lucide-react';

interface RecentItem {
  id: string;
  type: 'prebattle-prep' | 'battle-sim' | 'balance-analysis' | 'encounter' | 'simulation' | 'analysis';
  name: string;
  timestamp: number;
}

const NAV_ITEMS = [
  {
    id: 'prebattle-prep',
    title: '战前准备',
    description: '配置遭遇、阵容与站位',
    icon: Settings,
  },
  {
    id: 'battle-sim',
    title: '对战模拟',
    description: '实时战斗模拟与回合检视',
    icon: Swords,
  },
  {
    id: 'balance-analysis',
    title: '数值平衡分析',
    description: '多轮模拟与结果分析',
    icon: BarChart3,
  },
] as const;

const STORAGE_KEY = 'simulation_recent_items';

function loadRecentItems(): RecentItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load recent items:', e);
  }
  return [];
}

function saveRecentItems(items: RecentItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save recent items:', e);
  }
}

export const SimulationWorkspace: React.FC = () => {
  const { setActiveEditor } = useEditorStore();
  const { project } = useProjectStore();
  const [recentItems, setRecentItems] = useState<RecentItem[]>(loadRecentItems);

  const activeSubEditor = useEditorStore((state) => state.activeEditor);

  const handleNavClick = (itemId: string) => {
    setActiveEditor(itemId as any);
    const now = Date.now();
    const newItem: RecentItem = {
      id: itemId,
      type: itemId as any,
      name: NAV_ITEMS.find(n => n.id === itemId)?.title || itemId,
      timestamp: now,
    };
    const filtered = recentItems.filter(i => i.type !== newItem.type);
    const updated = [newItem, ...filtered].slice(0, 10);
    setRecentItems(updated);
    saveRecentItems(updated);
  };

  const recentSimulations = useMemo(() => {
    return project.simulations?.slice(-5).reverse() || [];
  }, [project.simulations]);

  const recentEncounters = useMemo(() => {
    return project.enemyGroups?.slice(-3).reverse() || [];
  }, [project.enemyGroups]);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {/* 左侧导航栏 */}
      <div
        className="shrink-0 flex flex-col border-r"
        style={{
          width: 260,
          background: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            模拟 / 分析
          </h2>
        </div>
        <div className="flex-1 p-3 space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSubEditor === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="w-full text-left p-3 rounded-lg transition-all"
                style={{
                  background: isActive ? 'var(--color-accent)' : 'transparent',
                  color: isActive ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <div>
                    <div className="font-medium text-sm">{item.title}</div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}
                    >
                      {item.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <Clock size={12} />
            <span>已记录 {recentItems.length} 条最近操作</span>
          </div>
        </div>
      </div>

      {/* 中央主内容区 */}
      <div className="flex-1 flex flex-col overflow-auto p-6">
        {/* 第一行：3张大卡 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* 最近使用 */}
          <div
            className="p-4 rounded-lg border cursor-pointer hover:border-[var(--color-accent)] transition-colors"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
            onClick={() => recentItems[0] && handleNavClick(recentItems[0].type)}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} style={{ color: 'var(--color-accent)' }} />
              <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>最近使用</span>
            </div>
            {recentItems.length > 0 ? (
              <div>
                <div className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {recentItems[0].name}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {formatTime(recentItems[0].timestamp)}
                </div>
              </div>
            ) : (
              <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>暂无记录</div>
            )}
          </div>

          {/* 最近遭遇 */}
          <div
            className="p-4 rounded-lg border cursor-pointer hover:border-[var(--color-accent)] transition-colors"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
            onClick={() => setActiveEditor('enemygroups')}
          >
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} style={{ color: 'var(--color-accent)' }} />
              <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>最近遭遇</span>
            </div>
            {recentEncounters.length > 0 ? (
              <div>
                <div className="text-lg font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {recentEncounters[0].name}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {recentEncounters.length} 个遭遇配置
                </div>
              </div>
            ) : (
              <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>暂无遭遇</div>
            )}
          </div>

          {/* 快速开始 */}
          <div
            className="p-4 rounded-lg border cursor-pointer hover:border-[var(--color-accent)] transition-colors"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
            onClick={() => handleNavClick('battle-sim')}
          >
            <div className="flex items-center gap-2 mb-3">
              <Play size={16} style={{ color: 'var(--color-accent)' }} />
              <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>快速开始</span>
            </div>
            <div className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              开始对战
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              一键启动战斗模拟
            </div>
          </div>
        </div>

        {/* 第二行：内容块 */}
        <div className="grid grid-cols-3 gap-4 flex-1">
          {/* 最近模拟结果 */}
          <div
            className="p-4 rounded-lg border flex flex-col"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} style={{ color: 'var(--color-accent)' }} />
              <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>最近模拟结果</span>
            </div>
            <div className="flex-1 overflow-auto">
              {recentSimulations.length > 0 ? (
                <div className="space-y-2">
                  {recentSimulations.slice(0, 3).map((sim) => (
                    <div
                      key={sim.id}
                      className="p-2 rounded text-xs cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
                      onClick={() => setActiveEditor('battle-sim')}
                    >
                      <div className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {sim.name}
                      </div>
                      <div style={{ color: 'var(--color-text-muted)' }}>
                        种子: {sim.seed || '随机'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm h-full flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                  暂无模拟记录
                </div>
              )}
            </div>
          </div>

          {/* 最近分析结论 */}
          <div
            className="p-4 rounded-lg border flex flex-col"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} style={{ color: 'var(--color-accent)' }} />
              <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>最近分析结论</span>
            </div>
            <div className="flex-1 overflow-auto">
              {recentItems.filter(i => i.type === 'balance-analysis').length > 0 ? (
                <div className="space-y-2">
                  {recentItems.filter(i => i.type === 'balance-analysis').slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded text-xs cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
                      onClick={() => handleNavClick('balance-analysis')}
                    >
                      <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {item.name}
                      </div>
                      <div style={{ color: 'var(--color-text-muted)' }}>
                        {formatTime(item.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm h-full flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                  暂无分析记录
                </div>
              )}
            </div>
          </div>

          {/* 风险待办 */}
          <div
            className="p-4 rounded-lg border flex flex-col"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} style={{ color: 'var(--color-accent)' }} />
              <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>风险待办</span>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="text-sm h-full flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                暂无风险提醒
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧辅助栏 */}
      <div
        className="shrink-0 flex flex-col border-l"
        style={{
          width: 300,
          background: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
            辅助信息
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* 最近打开 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>最近打开</span>
            </div>
            <div className="space-y-1">
              {recentItems.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded text-xs cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
                  onClick={() => handleNavClick(item.type)}
                >
                  <span style={{ color: 'var(--color-text-primary)' }}>{item.name}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{formatTime(item.timestamp)}</span>
                </div>
              ))}
              {recentItems.length === 0 && (
                <div className="text-xs p-2" style={{ color: 'var(--color-text-muted)' }}>暂无记录</div>
              )}
            </div>
          </div>

          {/* 最近模拟 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>最近模拟</span>
            </div>
            <div className="space-y-1">
              {recentSimulations.slice(0, 3).map((sim) => (
                <div
                  key={sim.id}
                  className="flex items-center justify-between p-2 rounded text-xs cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
                  onClick={() => setActiveEditor('battle-sim')}
                >
                  <span className="truncate" style={{ color: 'var(--color-text-primary)' }}>{sim.name}</span>
                  <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              ))}
              {recentSimulations.length === 0 && (
                <div className="text-xs p-2" style={{ color: 'var(--color-text-muted)' }}>暂无模拟</div>
              )}
            </div>
          </div>

          {/* 最近分析 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>最近分析</span>
            </div>
            <div className="space-y-1">
              {recentItems.filter(i => i.type === 'balance-analysis').slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded text-xs cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
                  onClick={() => handleNavClick('balance-analysis')}
                >
                  <span style={{ color: 'var(--color-text-primary)' }}>{item.name}</span>
                  <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              ))}
              {recentItems.filter(i => i.type === 'balance-analysis').length === 0 && (
                <div className="text-xs p-2" style={{ color: 'var(--color-text-muted)' }}>暂无分析</div>
              )}
            </div>
          </div>

          {/* 风险提醒 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>风险提醒</span>
            </div>
            <div
              className="p-3 rounded text-xs"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
            >
              暂无风险提醒
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
