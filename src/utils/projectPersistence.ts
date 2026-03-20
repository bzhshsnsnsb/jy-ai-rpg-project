import { createDefaultProject } from '../stores/projectStore';
import type { ProjectData } from '../stores/projectStore';
import type { CustomAttribute } from '../types';

export const PROJECT_STORAGE_KEYS = {
  draft: 'rpg-balance-studio:draft',
  saved: 'rpg-balance-studio:saved',
} as const;

export interface StoredProjectEnvelope {
  version: 1;
  source: 'draft' | 'manual-save' | 'import';
  savedAt: string;
  project: ProjectData;
}

const cloneProject = (project: ProjectData): ProjectData => JSON.parse(JSON.stringify(project));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const mergeById = <T extends { id: string }>(base: T[], incoming: T[] | undefined): T[] => {
  if (!incoming || incoming.length === 0) {
    return base;
  }

  const merged = new Map<string, T>();
  base.forEach((item) => merged.set(item.id, item));
  incoming.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
};

const normalizeAttributes = (attributes: CustomAttribute[], fallback: CustomAttribute[]): CustomAttribute[] => {
  const source = attributes.length > 0 ? attributes : fallback;
  const seen = new Set<string>();

  return source.map((attribute) => {
    let next = { ...attribute };

    // Migrate legacy default sample typo: np -> mp when it clearly means mana.
    if (
      next.id === 'np' &&
      ((typeof next.name === 'string' && next.name.includes('魔法')) || next.unit === 'MP')
    ) {
      next = { ...next, id: 'mp' };
    }

    // Fill the default strategy-RPG resistance unit for older drafts.
    if (next.id === 'resistance' && next.type === 'number' && !next.unit) {
      next = { ...next, unit: '点' };
    }

    // Avoid duplicated ids introduced by migration by falling back to the original id.
    if (seen.has(next.id)) {
      next = { ...next, id: attribute.id };
    }
    seen.add(next.id);

    return next;
  });
};

const normalizeProject = (value: unknown): ProjectData => {
  const fallback = createDefaultProject();

  if (!isRecord(value)) {
    return fallback;
  }

  const project = value as Partial<ProjectData> & {
    rules?: Partial<ProjectData['rules']>;
  };
  const isDefaultSampleProject = project.id === fallback.id;

  return {
    ...fallback,
    ...project,
    rules: {
      ...fallback.rules,
      ...project.rules,
      attributes: normalizeAttributes(project.rules?.attributes ?? fallback.rules.attributes, fallback.rules.attributes),
      turnModel: project.rules?.turnModel ?? fallback.rules.turnModel,
      resourceModel: project.rules?.resourceModel ?? fallback.rules.resourceModel,
      gridModel: project.rules?.gridModel ?? fallback.rules.gridModel,
      damageFormulas: project.rules?.damageFormulas ?? fallback.rules.damageFormulas,
      elements: project.rules?.elements ?? fallback.rules.elements,
      victoryConditions: project.rules?.victoryConditions ?? fallback.rules.victoryConditions,
    },
    characters: project.characters ?? fallback.characters,
    jobs: project.jobs ?? fallback.jobs,
    skills: isDefaultSampleProject ? mergeById(fallback.skills, project.skills) : project.skills ?? fallback.skills,
    statuses: project.statuses ?? fallback.statuses,
    equipment: project.equipment ?? fallback.equipment,
    items: project.items ?? fallback.items,
    enemies: project.enemies ?? fallback.enemies,
    enemyGroups: project.enemyGroups ?? fallback.enemyGroups,
    battleMaps: project.battleMaps ?? fallback.battleMaps,
    simulations: project.simulations ?? fallback.simulations,
    analysis: project.analysis ?? fallback.analysis,
  };
};

export const createStoredProjectEnvelope = (
  project: ProjectData,
  source: StoredProjectEnvelope['source'],
): StoredProjectEnvelope => ({
  version: 1,
  source,
  savedAt: new Date().toISOString(),
  project: cloneProject(project),
});

export const saveProjectToStorage = (
  key: string,
  project: ProjectData,
  source: StoredProjectEnvelope['source'],
): StoredProjectEnvelope => {
  const envelope = createStoredProjectEnvelope(project, source);
  localStorage.setItem(key, JSON.stringify(envelope));
  return envelope;
};

export const loadProjectFromStorage = (key: string): StoredProjectEnvelope | null => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredProjectEnvelope> | ProjectData;
    if (isRecord(parsed) && 'project' in parsed) {
      return {
        version: 1,
        source: (parsed.source as StoredProjectEnvelope['source']) || 'draft',
        savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date(0).toISOString(),
        project: normalizeProject(parsed.project),
      };
    }

    return {
      version: 1,
      source: 'draft',
      savedAt: new Date(0).toISOString(),
      project: normalizeProject(parsed),
    };
  } catch {
    return null;
  }
};

export const exportProjectSnapshot = (project: ProjectData) => {
  const envelope = createStoredProjectEnvelope(project, 'manual-save');
  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = envelope.savedAt.replace(/[:.]/g, '-');
  anchor.href = url;
  anchor.download = `balance-studio-snapshot-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return envelope;
};

export const importProjectSnapshot = async (file: File): Promise<ProjectData> => {
  const raw = await file.text();
  const parsed = JSON.parse(raw) as Partial<StoredProjectEnvelope> | ProjectData;

  if (isRecord(parsed) && 'project' in parsed) {
    return normalizeProject(parsed.project);
  }

  return normalizeProject(parsed);
};
