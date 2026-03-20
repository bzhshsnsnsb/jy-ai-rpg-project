import React, { useMemo, useState } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { BookOpen, Briefcase, Copy, Plus, Sparkles } from 'lucide-react';
import {
  FORMULA_SNIPPETS,
  JOB_TEMPLATES,
  RECOMMENDED_ATTRIBUTES,
  type FormulaSnippetCategory,
} from '../../../data/projectRuleLibrary';

const categoryLabels: Record<FormulaSnippetCategory, string> = {
  damage: '伤害公式',
  healing: '治疗与护盾',
  hit: '命中与暴击',
  status: '状态与持续效果',
  turn: '回合节奏',
  resource: '资源曲线',
  growth: '成长曲线',
  encounter: '关卡预算',
};

export const RulesPresetLibraryEditor: React.FC = () => {
  const { project, updateRules, addJob } = useProjectStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const missingAttributes = useMemo(
    () => RECOMMENDED_ATTRIBUTES.filter((attr) => !project.rules.attributes.some((item) => item.id === attr.id)),
    [project.rules.attributes],
  );

  const missingJobs = useMemo(
    () => JOB_TEMPLATES.filter((job) => !project.jobs.some((item) => item.id === job.id)),
    [project.jobs],
  );

  const importableFormulas = useMemo(
    () =>
      FORMULA_SNIPPETS.filter(
        (item) => item.importable && !project.rules.damageFormulas.some((formula) => formula.id === item.importable?.id),
      ),
    [project.rules.damageFormulas],
  );

  const formulasByCategory = useMemo(() => {
    return FORMULA_SNIPPETS.reduce<Record<FormulaSnippetCategory, typeof FORMULA_SNIPPETS>>((grouped, snippet) => {
      grouped[snippet.category].push(snippet);
      return grouped;
    }, {
      damage: [],
      healing: [],
      hit: [],
      status: [],
      turn: [],
      resource: [],
      growth: [],
      encounter: [],
    });
  }, []);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setActionNotice('浏览器拒绝了复制权限，请手动复制公式');
    }
  };

  const importAll = () => {
    if (missingAttributes.length > 0) {
      updateRules({
        attributes: [...project.rules.attributes, ...missingAttributes],
      });
    }

    missingJobs.forEach((job) => addJob(job));

    if (importableFormulas.length > 0) {
      updateRules({
        damageFormulas: [
          ...project.rules.damageFormulas,
          ...importableFormulas
            .map((item) => item.importable)
            .filter(Boolean) as NonNullable<(typeof importableFormulas)[number]['importable']>[],
        ],
      });
    }

    setActionNotice('已把推荐职业、属性和可导入公式补齐到当前项目');
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>策划模板库</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              按战棋 SRPG 常见做法补全缺失职业、核心属性和固定公式，适合独立开发者直接拿来当项目骨架。
            </div>
          </div>
          <button className="toolbar-btn" onClick={importAll}>
            <Sparkles size={12} />
            <span>一键补全当前项目</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
          <div className="p-3 rounded" style={{ background: 'var(--color-bg-primary)' }}>
            <div style={{ color: 'var(--color-text-muted)' }}>可补属性</div>
            <div className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{missingAttributes.length}</div>
          </div>
          <div className="p-3 rounded" style={{ background: 'var(--color-bg-primary)' }}>
            <div style={{ color: 'var(--color-text-muted)' }}>可补职业</div>
            <div className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{missingJobs.length}</div>
          </div>
          <div className="p-3 rounded" style={{ background: 'var(--color-bg-primary)' }}>
            <div style={{ color: 'var(--color-text-muted)' }}>公式模板</div>
            <div className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{FORMULA_SNIPPETS.length}</div>
          </div>
        </div>
        {actionNotice && (
          <div className="mt-3 text-xs" style={{ color: 'var(--color-accent)' }}>
            {actionNotice}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={16} style={{ color: 'var(--color-accent)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>可直接导入的职业模板</h3>
          </div>
          <div className="space-y-3">
            {JOB_TEMPLATES.map((job) => {
              const exists = project.jobs.some((item) => item.id === job.id);
              return (
                <div key={job.id} className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{job.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {job.role} / {job.defaultWeaponTendency} / {job.defaultPositionTendency}
                      </div>
                    </div>
                    {!exists && (
                      <button className="toolbar-btn" onClick={() => addJob(job)}>
                        <Plus size={12} />
                        <span>导入</span>
                      </button>
                    )}
                  </div>
                  <div className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>{job.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} style={{ color: 'var(--color-accent)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>可直接导入的核心属性</h3>
          </div>
          <div className="space-y-3">
            {RECOMMENDED_ATTRIBUTES.map((attribute) => {
              const exists = project.rules.attributes.some((item) => item.id === attribute.id);
              return (
                <div key={attribute.id} className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{attribute.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{attribute.id} / {attribute.unit || '-'}</div>
                    </div>
                    {!exists && (
                      <button
                        className="toolbar-btn"
                        onClick={() => updateRules({ attributes: [...project.rules.attributes, attribute] })}
                      >
                        <Plus size={12} />
                        <span>导入</span>
                      </button>
                    )}
                  </div>
                  <div className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>{attribute.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {Object.entries(formulasByCategory).map(([category, snippets]) => (
        <div key={category} className="p-4 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} style={{ color: 'var(--color-accent)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{categoryLabels[category as FormulaSnippetCategory]}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {snippets.map((snippet) => (
              <div key={snippet.id} className="p-3 rounded-lg" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{snippet.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{snippet.category}</div>
                  </div>
                  <div className="flex gap-2">
                    {snippet.importable && !project.rules.damageFormulas.some((formula) => formula.id === snippet.importable?.id) && (
                      <button
                        className="toolbar-btn"
                        onClick={() =>
                          updateRules({
                            damageFormulas: [...project.rules.damageFormulas, snippet.importable!],
                          })
                        }
                      >
                        <Plus size={12} />
                        <span>导入</span>
                      </button>
                    )}
                    <button className="toolbar-btn" onClick={() => copyText(snippet.id, snippet.formula)}>
                      <Copy size={12} />
                      <span>{copiedId === snippet.id ? '已复制' : '复制'}</span>
                    </button>
                  </div>
                </div>
                <div className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>{snippet.description}</div>
                <div className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  变量: {snippet.variables.join(', ')}
                </div>
                <pre
                  className="mt-3 p-3 rounded text-xs overflow-auto"
                  style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-accent)', whiteSpace: 'pre-wrap' }}
                >
                  {snippet.formula}
                </pre>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
