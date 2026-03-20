import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useEditorStore } from '../../stores/editorStore';
import { useUIStore } from '../../stores/uiStore';
import {
  ChevronRight,
  Save,
  AlertTriangle,
  Play,
  Upload,
  Camera,
  CheckCircle,
  Settings,
  Sparkles,
} from 'lucide-react';
import {
  PROJECT_STORAGE_KEYS,
  exportProjectSnapshot,
  importProjectSnapshot,
  loadProjectFromStorage,
  saveProjectToStorage,
} from '../../utils/projectPersistence';

type FlashState = {
  tone: 'success' | 'warning' | 'error';
  text: string;
} | null;

const formatTime = (iso: string | null) => {
  if (!iso) {
    return '';
  }

  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const Toolbar: React.FC = () => {
  const { project, isDirty, setDirty, replaceProject } = useProjectStore();
  const { openTabs, activeTabId, showGuide, toggleShowGuide, setActiveEditor, openTab } = useEditorStore();
  const { setDrawerTab } = useUIStore();

  const [flash, setFlash] = useState<FlashState>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastDraftAt, setLastDraftAt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasHydratedRef = useRef(false);
  const flashTimerRef = useRef<number | null>(null);

  const currentTab = openTabs.find((tab) => tab.id === activeTabId);
  const currentPath = currentTab ? `数据库 > ${currentTab.title}` : '数据库 > 项目规则';
  const saveStatus = isDirty ? 'dirty' : 'saved';

  const saveHint = useMemo(() => {
    if (saveStatus === 'dirty' && lastDraftAt) {
      return `草稿 ${formatTime(lastDraftAt)}`;
    }
    if (lastSavedAt) {
      return `保存于 ${formatTime(lastSavedAt)}`;
    }
    return saveStatus === 'dirty' ? '尚未保存' : '';
  }, [lastDraftAt, lastSavedAt, saveStatus]);

  const showFlash = (tone: NonNullable<FlashState>['tone'], text: string) => {
    setFlash({ tone, text });
    if (flashTimerRef.current) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setFlash(null);
    }, 2600);
  };

  const openWorkspace = (type: 'balance-analysis' | 'battle-sim', title: string) => {
    setActiveEditor(type, type);
    openTab({
      id: type,
      type,
      entityId: type,
      title,
    });
  };

  const handleSave = () => {
    const savedEnvelope = saveProjectToStorage(PROJECT_STORAGE_KEYS.saved, project, 'manual-save');
    saveProjectToStorage(PROJECT_STORAGE_KEYS.draft, project, 'draft');
    setDirty(false);
    setLastSavedAt(savedEnvelope.savedAt);
    setLastDraftAt(savedEnvelope.savedAt);
    showFlash('success', '项目已保存到本地工作区');
  };

  const handleValidate = () => {
    setDrawerTab('rules-inspector');
    showFlash('warning', '已打开规则体检面板');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const importedProject = await importProjectSnapshot(file);
      replaceProject(importedProject, { markDirty: true });
      saveProjectToStorage(PROJECT_STORAGE_KEYS.draft, importedProject, 'import');
      setLastDraftAt(new Date().toISOString());
      showFlash('success', `已导入快照: ${file.name}`);
    } catch (error) {
      showFlash('error', error instanceof Error ? error.message : '导入失败，文件格式不正确');
    } finally {
      event.target.value = '';
    }
  };

  const handleSnapshot = () => {
    const envelope = exportProjectSnapshot(project);
    setLastSavedAt(envelope.savedAt);
    showFlash('success', '已导出可回滚快照');
  };

  useEffect(() => {
    if (hasHydratedRef.current) {
      return;
    }

    hasHydratedRef.current = true;
    const savedEnvelope =
      loadProjectFromStorage(PROJECT_STORAGE_KEYS.saved) ??
      loadProjectFromStorage(PROJECT_STORAGE_KEYS.draft);

    if (!savedEnvelope) {
      return;
    }

    replaceProject(savedEnvelope.project, { markDirty: false });
    setLastSavedAt(savedEnvelope.savedAt);
    setLastDraftAt(savedEnvelope.savedAt);
    showFlash('success', `已恢复本地${savedEnvelope.source === 'draft' ? '草稿' : '项目'}数据`);
  }, [replaceProject]);

  useEffect(() => {
    if (!hasHydratedRef.current || !isDirty) {
      return;
    }

    const timer = window.setTimeout(() => {
      const envelope = saveProjectToStorage(PROJECT_STORAGE_KEYS.draft, project, 'draft');
      setLastDraftAt(envelope.savedAt);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isDirty, project]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [project, isDirty]);

  return (
    <div
      className="h-8 flex items-center justify-between px-3 shrink-0 gap-3"
      style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Settings size={14} style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
            {project.name}
          </span>
        </div>
        <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
          {currentPath}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded"
          style={{ background: 'var(--color-bg-tertiary)', minWidth: 106 }}
        >
          {saveStatus === 'saved' ? (
            <>
              <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                已保存
              </span>
            </>
          ) : (
            <>
              <AlertTriangle size={12} style={{ color: 'var(--color-warning)' }} />
              <span className="text-xs" style={{ color: 'var(--color-warning)' }}>
                未保存
              </span>
            </>
          )}
        </div>

        <div className="text-[10px] hidden xl:block" style={{ color: 'var(--color-text-muted)', minWidth: 70 }}>
          {saveHint}
        </div>

        {flash && (
          <div
            className="hidden xl:flex items-center px-2 py-1 rounded text-[10px]"
            style={{
              background:
                flash.tone === 'success'
                  ? 'rgba(34, 197, 94, 0.12)'
                  : flash.tone === 'warning'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
              color:
                flash.tone === 'success'
                  ? '#22c55e'
                  : flash.tone === 'warning'
                    ? '#f59e0b'
                    : '#ef4444',
            }}
          >
            {flash.text}
          </div>
        )}

        <button onClick={handleSave} className="toolbar-btn" title="保存到本地工作区 (Ctrl+S)">
          <Save size={12} />
          <span>保存</span>
        </button>

        <button onClick={handleValidate} className="toolbar-btn" title="打开规则体检面板">
          <AlertTriangle size={12} />
          <span>校验</span>
        </button>

        <button
          className="toolbar-btn"
          title="打开数值平衡分析"
          onClick={() => openWorkspace('balance-analysis', '数值平衡分析')}
        >
          <Play size={12} />
          <span>模拟</span>
        </button>

        <button className="toolbar-btn" title="导入项目快照" onClick={handleImportClick}>
          <Upload size={12} />
          <span>导入</span>
        </button>

        <button className="toolbar-btn" title="导出当前快照" onClick={handleSnapshot}>
          <Camera size={12} />
          <span>快照</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={toggleShowGuide}
          title={showGuide ? '隐藏引导' : '显示引导'}
          style={{
            background: showGuide ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
            color: showGuide ? 'white' : 'var(--color-text-secondary)',
          }}
        >
          <Sparkles size={12} />
          <span>引导</span>
        </button>
      </div>
    </div>
  );
};
