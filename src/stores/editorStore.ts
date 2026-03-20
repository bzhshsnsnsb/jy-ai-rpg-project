import { create } from 'zustand';
import type { DatabaseCategory } from '../types';

export interface EditorTab {
  id: string;
  type: DatabaseCategory;
  entityId?: string;
  title: string;
  isDirty?: boolean;
}

interface EditorState {
  activeEditor: DatabaseCategory | null;
  activeEntityId: string | null;
  openTabs: EditorTab[];
  activeTabId: string | null;
  activeSubTab: string | null;
  /** 全局引导显示开关 */
  showGuide: boolean;
  /** 当前选中的技能ID，用于底部抽屉「技能调试日志」 */
  debugSkillId: string | null;
  /** 当前选中的状态ID，用于底部抽屉「状态调试日志」 */
  debugStatusId: string | null;
  /** 当前选中的职业ID，用于底部抽屉「职业调试日志」 */
  debugJobId: string | null;
  /** 当前选中的角色ID，用于底部抽屉「角色调试日志」 */
  debugCharacterId: string | null;
  /** 当前选中的装备ID，用于底部抽屉「装备调试日志」 */
  debugEquipmentId: string | null;
  /** 当前选中的道具ID，用于底部抽屉「道具调试日志」 */
  debugItemId: string | null;
  /** 当前选中的敌人ID，用于底部抽屉「敌人调试日志」 */
  debugEnemyId: string | null;
  /** 当前选中的敌群ID，用于底部抽屉「敌群调试日志」 */
  debugEnemyGroupId: string | null;

  setActiveEditor: (type: DatabaseCategory | null, entityId?: string | null) => void;
  /** 设置当前编辑实体的ID */
  setActiveEntityId: (entityId: string | null) => void;
  openTab: (tab: EditorTab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setActiveSubTab: (subTab: string | null) => void;
  setShowGuide: (show: boolean) => void;
  toggleShowGuide: () => void;
  setDebugSkillId: (id: string | null) => void;
  setDebugStatusId: (id: string | null) => void;
  setDebugJobId: (id: string | null) => void;
  setDebugCharacterId: (id: string | null) => void;
  setDebugEquipmentId: (id: string | null) => void;
  setDebugItemId: (id: string | null) => void;
  setDebugEnemyId: (id: string | null) => void;
  setDebugEnemyGroupId: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  activeEditor: 'project-rules',
  activeEntityId: 'project-rules-root',
  openTabs: [{ id: 'project-rules-root', type: 'project-rules', title: '项目规则' }],
  activeTabId: 'project-rules-root',
  activeSubTab: 'attributes',
  showGuide: true,
  debugSkillId: null,
  debugStatusId: null,
  debugJobId: null,
  debugCharacterId: null,
  debugEquipmentId: null,
  debugItemId: null,
  debugEnemyId: null,
  debugEnemyGroupId: null,

  setActiveEditor: (type, entityId = null) => set({ 
    activeEditor: type, 
    activeEntityId: entityId,
    activeTabId: entityId 
  }),
  
  setActiveEntityId: (entityId) => set({ activeEntityId: entityId }),
  
  openTab: (tab) => {
    const { openTabs } = get();
    const existing = openTabs.find(t => t.id === tab.id);
    if (existing) {
      set({ activeTabId: tab.id });
    } else {
      set({ 
        openTabs: [...openTabs, tab],
        activeTabId: tab.id 
      });
    }
  },
  
  closeTab: (tabId) => {
    const { openTabs, activeTabId } = get();
    const newTabs = openTabs.filter(t => t.id !== tabId);
    let newActiveTabId = activeTabId;
    if (activeTabId === tabId) {
      const idx = openTabs.findIndex(t => t.id === tabId);
      newActiveTabId = newTabs[idx]?.id || newTabs[idx - 1]?.id || null;
    }
    set({ openTabs: newTabs, activeTabId: newActiveTabId });
  },
  
  setActiveTab: (tabId) => set({ activeTabId: tabId }),
  
  setActiveSubTab: (subTab) => set({ activeSubTab: subTab }),
  setShowGuide: (show) => set({ showGuide: show }),
  toggleShowGuide: () => set((state) => ({ showGuide: !state.showGuide })),
  setDebugSkillId: (id) => set({ debugSkillId: id }),
  setDebugStatusId: (id) => set({ debugStatusId: id }),
  setDebugJobId: (id) => set({ debugJobId: id }),
  setDebugCharacterId: (id) => set({ debugCharacterId: id }),
  setDebugEquipmentId: (id) => set({ debugEquipmentId: id }),
  setDebugItemId: (id) => set({ debugItemId: id }),
  setDebugEnemyId: (id) => set({ debugEnemyId: id }),
  setDebugEnemyGroupId: (id) => set({ debugEnemyGroupId: id }),
}));

interface SelectionState {
  selectedNodeId: string | null;
  selectedNodeType: DatabaseCategory | null;
  selectedEntityId: string | null;
  
  selectNode: (nodeId: string, type: DatabaseCategory, entityId?: string | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeId: null,
  selectedNodeType: null,
  selectedEntityId: null,
  
  selectNode: (nodeId, type, entityId = null) => set({ 
    selectedNodeId: nodeId, 
    selectedNodeType: type,
    selectedEntityId: entityId 
  }),
  
  clearSelection: () => set({ 
    selectedNodeId: null, 
    selectedNodeType: null,
    selectedEntityId: null 
  }),
}));
