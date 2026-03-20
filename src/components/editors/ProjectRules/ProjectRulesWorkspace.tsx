import React, { useState } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import { Plus, Trash2, GripVertical, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { CustomAttribute } from '../../../types';
import { validateAttribute, getValidationSummary } from '../../../utils/rulesValidation';
import { TurnModelEditor } from './TurnModelEditor';
import { ResourceModelEditor } from './ResourceModelEditor';
import { DamageFormulaEditor } from './DamageFormulaEditor';
import { RulesPresetLibraryEditor } from './RulesPresetLibraryEditor';

type RulesTab = 'attributes' | 'turnModel' | 'resourceModel' | 'gridModel' | 'damageFormulas' | 'elements' | 'victoryConditions' | 'presetLibrary';

const tabs: { id: RulesTab; label: string }[] = [
  { id: 'attributes', label: '自定义属性' },
  { id: 'turnModel', label: '回合模型' },
  { id: 'resourceModel', label: '资源模型' },
  { id: 'gridModel', label: '站位模型' },
  { id: 'damageFormulas', label: '伤害公式' },
  { id: 'elements', label: '元素系统' },
  { id: 'victoryConditions', label: '胜负条件' },
  { id: 'presetLibrary', label: '策划模板库' },
];

export const ProjectRulesWorkspace: React.FC = () => {
  const { project, updateRules } = useProjectStore();
  const { activeSubTab, setActiveSubTab } = useEditorStore();
  const { rules } = project;

  // Use store's activeSubTab, fall back to local state for internal tab switching
  const [localActiveTab, setLocalActiveTab] = useState<RulesTab>('attributes');

  // Determine which tab to show: activeSubTab takes precedence, otherwise use local state
  const activeTab = activeSubTab === 'turn' ? 'turnModel'
    : activeSubTab === 'resource' ? 'resourceModel'
    : activeSubTab === 'damage' ? 'damageFormulas'
    : activeSubTab === 'grid' ? 'gridModel'
    : activeSubTab === 'elements' ? 'elements'
    : activeSubTab === 'victory' ? 'victoryConditions'
    : activeSubTab === 'library' ? 'presetLibrary'
    : localActiveTab;

  const updateAttribute = (id: string, field: string, value: any) => {
    const attrs = rules.attributes.map(a => a.id === id ? { ...a, [field]: value } : a);
    updateRules({ attributes: attrs });
  };

  const addAttribute = () => {
    const newAttr: CustomAttribute = {
      id: `attr-${Date.now()}`,
      name: '新属性',
      type: 'number',
      defaultValue: 0,
      showInInspector: true,
    };
    updateRules({ attributes: [...rules.attributes, newAttr] });
  };

  const removeAttribute = (id: string) => {
    updateRules({ attributes: rules.attributes.filter(a => a.id !== id) });
  };

  const addElement = () => {
    const newElement = {
      id: `elem-${Date.now()}`,
      name: '新元素',
      color: '#888888',
      resistances: [],
    };
    updateRules({ elements: [...rules.elements, newElement] });
  };

  const updateElement = (id: string, field: string, value: any) => {
    const elements = rules.elements.map(e => e.id === id ? { ...e, [field]: value } : e);
    updateRules({ elements });
  };

  const handleTabChange = (tabId: RulesTab) => {
    setLocalActiveTab(tabId);
    setActiveSubTab(null); // Clear the store override so local state takes effect
    if (tabId === 'turnModel') setActiveSubTab('turn');
    else if (tabId === 'resourceModel') setActiveSubTab('resource');
    else if (tabId === 'damageFormulas') setActiveSubTab('damage');
    else if (tabId === 'presetLibrary') setActiveSubTab('library');
  };

  // 计算当前标签页的校验摘要
  const validationSummary = getValidationSummary(rules);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="flex border-b px-2 shrink-0" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {activeTab === 'attributes' && (
          <div className="h-full overflow-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>属性数据表</h3>
              <button onClick={addAttribute} className="toolbar-btn">
                <Plus size={12} /> 添加属性
              </button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  <th>ID</th>
                  <th>名称</th>
                  <th>类型</th>
                  <th>默认值</th>
                  <th>单位</th>
                  <th>显示</th>
                  <th>参与公式</th>
                  <th style={{ width: 80 }}>状态</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {rules.attributes.map(attr => {
                  const validation = validateAttribute(rules, attr);
                  return (
                    <tr key={attr.id}>
                      <td>
                        <GripVertical size={14} style={{ color: 'var(--color-text-muted)', cursor: 'grab' }} />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={attr.id}
                          onChange={(e) => updateAttribute(attr.id, 'id', e.target.value)}
                          className="input-field"
                          style={{ width: '100%', fontFamily: 'monospace', fontSize: 11 }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={attr.name}
                          onChange={(e) => updateAttribute(attr.id, 'name', e.target.value)}
                          className="input-field"
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <select
                          value={attr.type}
                          onChange={(e) => updateAttribute(attr.id, 'type', e.target.value)}
                          className="input-field"
                          style={{ width: '100%' }}
                        >
                          <option value="number">数值</option>
                          <option value="percentage">百分比</option>
                          <option value="boolean">布尔</option>
                          <option value="text">文本</option>
                        </select>
                      </td>
                      <td>
                        <div className="number-input" style={{ width: 80 }}>
                          <button onClick={() => updateAttribute(attr.id, 'defaultValue', (attr.defaultValue as number) - 1)}>-</button>
                          <input
                            type="number"
                            value={attr.defaultValue as number}
                            onChange={(e) => updateAttribute(attr.id, 'defaultValue', Number(e.target.value))}
                          />
                          <button onClick={() => updateAttribute(attr.id, 'defaultValue', (attr.defaultValue as number) + 1)}>+</button>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={attr.unit || ''}
                          onChange={(e) => updateAttribute(attr.id, 'unit', e.target.value)}
                          className="input-field"
                          style={{ width: '100%' }}
                          placeholder="如: HP"
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={attr.showInInspector}
                          onChange={(e) => updateAttribute(attr.id, 'showInInspector', e.target.checked)}
                        />
                      </td>
                      <td>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>-</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-center">
                          {validation.status === 'valid' && <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />}
                          {validation.status === 'warning' && <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />}
                          {validation.status === 'error' && <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => removeAttribute(attr.id)}
                          className="p-1 rounded hover:bg-[var(--color-danger)]"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'turnModel' && <TurnModelEditor />}
        {activeTab === 'resourceModel' && <ResourceModelEditor />}
        {activeTab === 'damageFormulas' && <DamageFormulaEditor />}
        {activeTab === 'presetLibrary' && <RulesPresetLibraryEditor />}

        {activeTab === 'gridModel' && (
          <div className="h-full overflow-auto p-4 space-y-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <Info size={12} />
                <span>此为全局默认配置。遭遇战/地图可覆盖此设置。当前实际生效的网格请查看遭遇配置。</span>
              </div>
            </div>
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>站位/网格模型</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>宽度</label>
                <div className="number-input" style={{ width: 100 }}>
                  <button onClick={() => updateRules({ gridModel: { ...rules.gridModel, width: rules.gridModel.width - 1 } })}>-</button>
                  <input
                    type="number"
                    value={rules.gridModel.width}
                    onChange={(e) => updateRules({ gridModel: { ...rules.gridModel, width: Number(e.target.value) } })}
                  />
                  <button onClick={() => updateRules({ gridModel: { ...rules.gridModel, width: rules.gridModel.width + 1 } })}>+</button>
                </div>
              </div>
              <div>
                <label className="text-xs" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>高度</label>
                <div className="number-input" style={{ width: 100 }}>
                  <button onClick={() => updateRules({ gridModel: { ...rules.gridModel, height: rules.gridModel.height - 1 } })}>-</button>
                  <input
                    type="number"
                    value={rules.gridModel.height}
                    onChange={(e) => updateRules({ gridModel: { ...rules.gridModel, height: Number(e.target.value) } })}
                  />
                  <button onClick={() => updateRules({ gridModel: { ...rules.gridModel, height: rules.gridModel.height + 1 } })}>+</button>
                </div>
              </div>
              <div>
                <label className="text-xs" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>格子大小</label>
                <div className="number-input" style={{ width: 100 }}>
                  <button onClick={() => updateRules({ gridModel: { ...rules.gridModel, cellSize: rules.gridModel.cellSize - 8 } })}>-</button>
                  <input
                    type="number"
                    value={rules.gridModel.cellSize}
                    onChange={(e) => updateRules({ gridModel: { ...rules.gridModel, cellSize: Number(e.target.value) } })}
                  />
                  <button onClick={() => updateRules({ gridModel: { ...rules.gridModel, cellSize: rules.gridModel.cellSize + 8 } })}>+</button>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>网格形状</label>
              <select
                value={rules.gridModel.shape}
                onChange={(e) => updateRules({ gridModel: { ...rules.gridModel, shape: e.target.value as any } })}
                className="input-field w-full"
              >
                <option value="square">方形</option>
                <option value="hex">六角形</option>
                <option value="diamond">菱形</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'elements' && (
          <div className="h-full overflow-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>元素/类型系统</h3>
              <button onClick={addElement} className="toolbar-btn">
                <Plus size={12} /> 添加元素
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {rules.elements.map(elem => (
                <div
                  key={elem.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: elem.color + '20', border: `1px solid ${elem.color}40` }}
                >
                  <div className="w-4 h-4 rounded-full" style={{ background: elem.color }} />
                  <input
                    type="text"
                    value={elem.name}
                    onChange={(e) => updateElement(elem.id, 'name', e.target.value)}
                    className="input-field text-sm"
                    style={{ width: 80, background: 'transparent', border: 'none' }}
                  />
                  <input
                    type="color"
                    value={elem.color}
                    onChange={(e) => updateElement(elem.id, 'color', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'victoryConditions' && (
          <div className="h-full overflow-auto p-4 space-y-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <Info size={12} />
                <span>项目规则胜负条件为全局默认值。遭遇战可在此基础上添加覆盖规则。当前为默认规则。</span>
              </div>
            </div>
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>胜负条件配置</h3>
            <div className="space-y-2">
              {rules.victoryConditions.map(cond => (
                <div key={cond.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <div
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ background: cond.isWin ? 'var(--color-success)' : 'var(--color-danger)', color: 'white' }}
                  >
                    {cond.isWin ? '胜利' : '失败'}
                  </div>
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{cond.description}</span>
                  <span className="text-xs px-2 py-0.5 rounded ml-auto" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}>
                    {cond.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
