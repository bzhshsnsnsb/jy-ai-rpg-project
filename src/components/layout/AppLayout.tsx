import React, { useRef, useCallback } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { DatabaseTree } from './DatabaseTree';
import { MainEditor } from './MainEditor';
import { Inspector } from './Inspector';
import { SmartAssistant } from './SmartAssistant';
import { BottomDrawer } from './BottomDrawer';
import { Toolbar } from './Toolbar';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { 
    sidebarWidth, 
    sidebarCollapsed, 
    toggleSidebar,
    inspectorWidth,
    inspectorCollapsed,
    toggleInspector,
    rightPanelTab,
    setRightPanelTab,
    drawerHeight,
    drawerCollapsed,
    setDrawerHeight,
  } = useUIStore();

  const drawerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleDrawerResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startYRef.current = e.clientY;
    startHeightRef.current = drawerHeight;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startYRef.current - e.clientY;
      const newHeight = Math.max(100, Math.min(600, startHeightRef.current + deltaY));
      setDrawerHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [drawerHeight, setDrawerHeight]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Database Tree */}
        <div 
          className="flex shrink-0 relative"
          style={{ width: sidebarCollapsed ? 40 : sidebarWidth }}
        >
          {sidebarCollapsed && (
            <div 
              className="h-full w-10 flex items-center justify-center cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
              style={{ background: 'var(--color-bg-secondary)', borderRight: '1px solid var(--color-border)' }}
              onClick={toggleSidebar}
            >
              <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
            </div>
          )}
          {!sidebarCollapsed && (
            <>
              <div 
                className="h-full flex flex-col"
                style={{ width: sidebarWidth - 4, background: 'var(--color-bg-secondary)', borderRight: '1px solid var(--color-border)' }}
              >
                <div 
                  className="h-8 flex items-center justify-between px-2 shrink-0"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>数据库</span>
                  <button 
                    onClick={toggleSidebar}
                    className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <DatabaseTree />
                </div>
              </div>
              <div 
                className="w-1 cursor-col-resize resizer"
                style={{ background: 'var(--color-border-muted)' }}
              />
            </>
          )}
        </div>

        {/* Middle - Main Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <MainEditor />
          
          {/* Bottom Drawer */}
          <div 
            ref={drawerRef}
            className="shrink-0 border-t relative"
            style={{ height: drawerCollapsed ? 32 : drawerHeight, borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
          >
            {/* Resizable Handle */}
            <div 
              className="absolute -top-3 left-0 right-0 h-3 flex items-center justify-center cursor-ns-resize hover:bg-[var(--color-bg-tertiary)] z-10"
              onMouseDown={handleDrawerResizeStart}
            >
              <div 
                className="w-20 h-1.5 rounded-full hover:bg-[var(--color-accent)] transition-colors"
                style={{ background: 'var(--color-border)' }}
              />
            </div>
            {!drawerCollapsed && <BottomDrawer />}
            {drawerCollapsed && (
              <div className="h-full flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                <span className="text-xs">底部面板 (点击展开)</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Inspector + SmartAssistant */}
        <div 
          className="flex shrink-0 relative"
          style={{ width: inspectorCollapsed ? 40 : inspectorWidth }}
        >
          {!inspectorCollapsed && (
            <>
              <div 
                className="w-1 cursor-col-resize resizer"
                style={{ background: 'var(--color-border-muted)' }}
              />
              <div 
                className="h-full flex flex-col"
                style={{ width: inspectorWidth - 4, background: 'var(--color-bg-secondary)', borderLeft: '1px solid var(--color-border)' }}
              >
                {/* Tabs for switching between Inspector and SmartAssistant */}
                <div 
                  className="h-8 flex items-center justify-between px-2 shrink-0"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center gap-1">
                    <button
                      className={`px-3 py-1 rounded text-xs ${rightPanelTab === 'inspector' ? 'bg-[var(--color-bg-tertiary)]' : ''}`}
                      onClick={() => setRightPanelTab('inspector')}
                      style={{ color: rightPanelTab === 'inspector' ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                    >
                      检视
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-xs flex items-center gap-1 ${rightPanelTab === 'assistant' ? 'bg-[var(--color-bg-tertiary)]' : ''}`}
                      onClick={() => setRightPanelTab('assistant')}
                      style={{ color: rightPanelTab === 'assistant' ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                    >
                      <Sparkles size={10} />
                      助手
                    </button>
                  </div>
                </div>
                {/* Content based on active tab */}
                {rightPanelTab === 'inspector' ? <Inspector /> : <SmartAssistant />}
              </div>
            </>
          )}
          {inspectorCollapsed && (
            <div 
              className="h-full w-10 flex flex-col items-center py-2 gap-2"
              style={{ background: 'var(--color-bg-secondary)', borderLeft: '1px solid var(--color-border)' }}
            >
              <button 
                className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)]"
                onClick={toggleInspector}
                title="展开右侧面板"
              >
                <ChevronLeft size={16} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
              <button 
                className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)]"
                onClick={() => { toggleInspector(); setRightPanelTab('assistant'); }}
                title="打开智能助手"
              >
                <Sparkles size={16} style={{ color: 'var(--color-accent)' }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
