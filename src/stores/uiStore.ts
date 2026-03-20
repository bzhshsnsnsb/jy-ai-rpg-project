import { create } from 'zustand';
import type { DrawerPanel } from '../types';

type RightPanelTab = 'inspector' | 'assistant';

interface UIState {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  inspectorWidth: number;
  inspectorCollapsed: boolean;
  rightPanelTab: RightPanelTab;
  drawerHeight: number;
  drawerCollapsed: boolean;
  drawerActiveTab: DrawerPanel;
  showCombatLog: boolean;
  showErrors: boolean;
  showFormulaConsole: boolean;
  showBatchEdit: boolean;
  showVersionCompare: boolean;
  showSimulationResults: boolean;
  showAnalysisLog: boolean;

  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setInspectorWidth: (width: number) => void;
  toggleInspector: () => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  setDrawerHeight: (height: number) => void;
  toggleDrawer: () => void;
  setDrawerTab: (tab: DrawerPanel) => void;
  setPanelVisibility: (panel: DrawerPanel, visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarWidth: 280,
  sidebarCollapsed: false,
  inspectorWidth: 320,
  inspectorCollapsed: false,
  rightPanelTab: 'inspector',
  drawerHeight: 200,
  drawerCollapsed: false,
  drawerActiveTab: 'combat-log',
  showCombatLog: true,
  showErrors: false,
  showFormulaConsole: false,
  showBatchEdit: false,
  showVersionCompare: false,
  showSimulationResults: false,
  showAnalysisLog: false,

  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setInspectorWidth: (width) => set({ inspectorWidth: width }),
  toggleInspector: () => set((state) => ({ inspectorCollapsed: !state.inspectorCollapsed })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  setDrawerHeight: (height) => set({ drawerHeight: height }),
  toggleDrawer: () => set((state) => ({ drawerCollapsed: !state.drawerCollapsed })),
  setDrawerTab: (tab) => set({ drawerActiveTab: tab }),
  setPanelVisibility: (_panel, _visible) => set((state) => {
    if (_panel === 'combat-log') return { showCombatLog: _visible };
    if (_panel === 'errors') return { showErrors: _visible };
    if (_panel === 'formula') return { showFormulaConsole: _visible };
    if (_panel === 'batch-edit') return { showBatchEdit: _visible };
    if (_panel === 'version') return { showVersionCompare: _visible };
    if (_panel === 'simulation') return { showSimulationResults: _visible };
    if (_panel === 'analysis-log') return { showAnalysisLog: _visible };
    return state;
  }),
}));
