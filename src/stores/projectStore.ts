import { create } from 'zustand';
import type { 
  CustomAttribute, TurnModel, ResourceModel, GridModel, 
  DamageFormula, ElementType, VictoryCondition,
  Character, Job, Skill, Status, Enemy, EnemyGroup, BattleMap,
  SimulationConfig, AnalysisReport, Equipment, Item, BattleTestConfig
} from '../types';

export interface ProjectRules {
  attributes: CustomAttribute[];
  turnModel: TurnModel;
  resourceModel: ResourceModel;
  gridModel: GridModel;
  damageFormulas: DamageFormula[];
  elements: ElementType[];
  victoryConditions: VictoryCondition[];
}

export interface ProjectData {
  id: string;
  name: string;
  rules: ProjectRules;
  characters: Character[];
  jobs: Job[];
  skills: Skill[];
  statuses: Status[];
  equipment: Equipment[];
  items: Item[];
  enemies: Enemy[];
  enemyGroups: EnemyGroup[];
  battleMaps: BattleMap[];
  simulations: SimulationConfig[];
  analysis: AnalysisReport[];
}

interface ProjectStore {
  project: ProjectData;
  isDirty: boolean;
  
  // Prebattle state
  prebattleConfig: PrebattleState;
  
  setProjectName: (name: string) => void;
  updateRules: (rules: Partial<ProjectRules>) => void;
  
  // Prebattle actions
  setPrebattleSelectedGroup: (groupId: string | null) => void;
  setPrebattleParty: (party: string[]) => void;
  setPrebattleFormation: (formation: PrebattleFormation[]) => void;
  setPrebattleResources: (resources: Record<string, PrebattleResource>) => void;
  setPrebattleItems: (items: string[]) => void;
  addPrebattlePartyMember: (characterId: string) => void;
  removePrebattlePartyMember: (characterId: string) => void;
  setPrebattleFormationPosition: (characterId: string, x: number, y: number) => void;
  validatePrebattleConfig: () => PrebattleIssue[];
  
  // BattleTest actions
  saveBattleTestConfig: (groupId: string, config: BattleTestConfig) => void;
  getBattleTestConfig: (groupId: string) => BattleTestConfig | null;
  
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, data: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  
  addJob: (job: Job) => void;
  updateJob: (id: string, data: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  
  addSkill: (skill: Skill) => void;
  updateSkill: (id: string, data: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  
  addStatus: (status: Status) => void;
  updateStatus: (id: string, data: Partial<Status>) => void;
  deleteStatus: (id: string) => void;
  
  addEquipment: (equipment: Equipment) => void;
  updateEquipment: (id: string, data: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;
  
  addItem: (item: Item) => void;
  updateItem: (id: string, data: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  
  addEnemy: (enemy: Enemy) => void;
  updateEnemy: (id: string, data: Partial<Enemy>) => void;
  deleteEnemy: (id: string) => void;
  
  addEnemyGroup: (group: EnemyGroup) => void;
  updateEnemyGroup: (id: string, data: Partial<EnemyGroup>) => void;
  deleteEnemyGroup: (id: string) => void;
  
  addBattleMap: (map: BattleMap) => void;
  updateBattleMap: (id: string, data: Partial<BattleMap>) => void;
  deleteBattleMap: (id: string) => void;
  
  addSimulation: (sim: SimulationConfig) => void;
  updateSimulation: (id: string, data: Partial<SimulationConfig>) => void;
  deleteSimulation: (id: string) => void;
  
  setDirty: (dirty: boolean) => void;
  replaceProject: (project: ProjectData, options?: { markDirty?: boolean }) => void;
  resetProject: () => void;
}

// Prebattle types
export interface PrebattleState {
  selectedGroupId: string | null;
  party: string[];
  formation: PrebattleFormation[];
  resources: Record<string, PrebattleResource>;
  items: string[];
}

export interface PrebattleFormation {
  characterId: string;
  x: number;
  y: number;
}

export interface PrebattleResource {
  hp: number;
  mp: number;
  ap: number;
  rage: number;
}

export interface PrebattleIssue {
  type: 'error' | 'warning';
  message: string;
  characterId?: string;
}

export const defaultProject: ProjectData = {
  id: 'default-project',
  name: '新项目',
  rules: {
    attributes: [
      { id: 'hp', name: '生命值', type: 'number', defaultValue: 1000, unit: 'HP', showInInspector: true },
      { id: 'mp', name: '魔法值', type: 'number', defaultValue: 100, unit: 'MP', showInInspector: true },
      { id: 'attack', name: '攻击力', type: 'number', defaultValue: 100, unit: '点', showInInspector: true },
      { id: 'defense', name: '防御力', type: 'number', defaultValue: 50, unit: '点', showInInspector: true },
      { id: 'speed', name: '速度', type: 'number', defaultValue: 100, unit: '点', showInInspector: true },
      { id: 'critRate', name: '暴击率', type: 'percentage', defaultValue: 5, unit: '%', min: 0, max: 100, showInInspector: true },
      { id: 'critDamage', name: '暴击伤害', type: 'percentage', defaultValue: 150, unit: '%', min: 100, max: 500, showInInspector: true },
      { id: 'magicAttack', name: '魔法攻击', type: 'number', defaultValue: 100, unit: '魔攻', showInInspector: true },
      { id: 'magicDefense', name: '魔法防御', type: 'number', defaultValue: 50, unit: '魔防', showInInspector: true },
      { id: 'healPower', name: '治疗力', type: 'number', defaultValue: 0, unit: '治疗', showInInspector: true },
      { id: 'resistance', name: '抗性', type: 'number', defaultValue: 0, unit: '点', showInInspector: true },
      { id: 'accuracy', name: '命中', type: 'percentage', defaultValue: 95, unit: '%', min: 0, max: 100, showInInspector: true },
      { id: 'dodge', name: '闪避', type: 'percentage', defaultValue: 5, unit: '%', min: 0, max: 100, showInInspector: true },
    ],
    turnModel: {
      type: 'turn-based',
      timePerTurn: 0,
      speedCalculation: 'speed',
      atbGaugeMax: 100,
      actionPointPerTurn: 3,
      tickInterval: 100,
      phases: [
        { id: 'phase-1', name: '行动阶段', order: 1 },
        { id: 'phase-2', name: '结算阶段', order: 2 },
      ],
    },
    resourceModel: {
      resources: [
        { id: 'hp', name: '生命值', type: 'hp', maxFormula: 'baseHp * (1 + level * 0.1)', canOverflow: false, canUnderflow: false, visualConfig: { barColor: '#ef4444', barWidth: 200, showText: true, textFormat: 'current/max', showInBattle: true, keepAfterBattle: false } },
        { id: 'mp', name: '魔法值', type: 'mp', maxFormula: 'baseMp + level * 5', regenFormula: 'level * 0.5', canOverflow: true, canUnderflow: false, visualConfig: { barColor: '#3b82f6', barWidth: 200, showText: true, textFormat: 'current/max', showInBattle: true, keepAfterBattle: false } },
        { id: 'ap', name: '行动点', type: 'custom', maxFormula: '3', canOverflow: false, canUnderflow: false, visualConfig: { barColor: '#22c55e', barWidth: 100, showText: true, textFormat: 'current/max', showInBattle: true, keepAfterBattle: false } },
        { id: 'rage', name: '怒气', type: 'rage', maxFormula: '100', canOverflow: true, canUnderflow: false, visualConfig: { barColor: '#f97316', barWidth: 150, showText: true, textFormat: 'current/max', showInBattle: true, keepAfterBattle: true } },
      ],
    },
    gridModel: {
      width: 8,
      height: 6,
      cellSize: 64,
      shape: 'square',
      zones: [
        { id: 'ally-spawn', name: '友军出生点', type: 'spawn-ally', cells: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}] },
        { id: 'enemy-spawn', name: '敌军出生点', type: 'spawn-enemy', cells: [{x: 6, y: 4}, {x: 7, y: 4}, {x: 6, y: 5}, {x: 7, y: 5}] },
      ],
    },
    damageFormulas: [
      { id: 'phys-dmg', name: '物理伤害', formula: 'attack * (1 - defense / (defense + 1000))', branches: [] },
      { id: 'mag-dmg', name: '魔法伤害', formula: 'magic * (1 - resistance / (resistance + 1000))', branches: [] },
      { id: 'heal-formula', name: '治疗量', formula: 'heal * 1.5', branches: [] },
    ],
    elements: [
      { id: 'fire', name: '火', color: '#ef4444', resistances: [{ elementId: 'water', multiplier: 0.5 }, { elementId: 'ice', multiplier: 2 }] },
      { id: 'water', name: '水', color: '#3b82f6', resistances: [{ elementId: 'fire', multiplier: 0.5 }, { elementId: 'thunder', multiplier: 2 }] },
      { id: 'thunder', name: '雷', color: '#eab308', resistances: [{ elementId: 'water', multiplier: 0.5 }] },
      { id: 'ice', name: '冰', color: '#06b6d4', resistances: [{ elementId: 'fire', multiplier: 0.5 }] },
      { id: 'wind', name: '风', color: '#22c55e', resistances: [] },
      { id: 'earth', name: '土', color: '#a16207', resistances: [] },
      { id: 'light', name: '光', color: '#f0e68c', resistances: [{ elementId: 'dark', multiplier: 2 }] },
      { id: 'dark', name: '暗', color: '#7c3aed', resistances: [{ elementId: 'light', multiplier: 2 }] },
    ],
    victoryConditions: [
      { id: 'victory-default', type: 'defeat-all', description: '击败所有敌人', params: {}, isWin: true },
      { id: 'defeat-default', type: 'defeat-all', description: '我方全灭', params: {}, isWin: false },
    ],
  },
  characters: [
    // 默认4个示例角色
    {
      id: 'char-knight',
      identity: {
        name: '阿尔斯',
        description: '王国的守护骑士，光明之剑的继承者',
        faction: '王国',
        rarity: 5,
        tags: ['主角', '前排', '坦克'],
      },
      category: 'player',
      jobId: 'job-warrior',
      levelConfig: {
        initial: 1,
        max: 99,
        inheritJobGrowth: true,
        overrideGrowth: false,
        growthOffsets: {},
      },
      initialAttributes: {
        initialHp: 1200,
        initialMp: 80,
        individualOffsets: { defense: 10 },
        inheritJobGrowth: true,
      },
      skillConfig: {
        initialSkills: ['power-strike', 'shield-bash'],
        exclusiveSkills: [],
        disabledSkills: [],
        skillReplacements: [],
        defaultSkillBar: [],
      },
      initialEquipment: {
        weapon: 'sword',
        armor: 'heavy',
        accessory1: 'ring',
        accessory2: undefined,
        locked: false,
        exclusiveEquipment: [],
      },
      traitConfig: {
        individualTraits: [
          { id: 'trait-k1', name: '骑士精神', traitType: 'stat-bonus', value: { defense: 15, hp: 100 }, description: '额外防御和生命加成' },
        ],
        passiveTalents: [],
        resourceEfficiencyOffsets: {},
      },
      combatPerformance: {
        idleAnim: 'idle',
        attackAnim: 'sword-slash',
        hitAnim: 'block',
        voice: 'knight_voice',
        battleLogName: '阿尔斯(骑士)',
      },
      // Legacy fields
      attributes: {
        baseStats: { hp: 1200, mp: 80, attack: 110, defense: 80, speed: 60 },
        growthRates: { hp: 120, attack: 12, defense: 8, speed: 4 },
        levelFormula: 'level * 10',
      },
      actions: {
        normalAttack: { enabled: true },
        chaseAttack: { enabled: false },
        coordinatedAttack: { enabled: false },
        defend: { enabled: true },
      },
      skills: {
        skillSlots: [
          { id: 'slot-1', slotType: 'active', unlocked: true },
          { id: 'slot-2', slotType: 'passive', unlocked: true },
        ],
        skillLevels: {},
      },
      equipment: {
        defaultEquipment: { weapon: 'sword', armor: 'heavy' },
        equipmentRestrictions: {},
      },
      resistances: {
        statusResistances: {},
        damageReduction: {},
        elementReduction: {},
      },
      growthUnlocks: {
        breakthroughs: [],
        awakenings: [],
        exclusiveWeapons: [],
      },
    },
    {
      id: 'char-mage',
      identity: {
        name: '艾莉娜',
        description: '天赋异禀的冰火法师，元素魔法的掌控者',
        faction: '王国',
        rarity: 5,
        tags: ['主角', '后排', '输出'],
      },
      category: 'player',
      jobId: 'job-mage',
      levelConfig: {
        initial: 1,
        max: 99,
        inheritJobGrowth: true,
        overrideGrowth: false,
        growthOffsets: {},
      },
      initialAttributes: {
        initialHp: 600,
        initialMp: 150,
        individualOffsets: { magicAttack: 15 },
        inheritJobGrowth: true,
      },
      skillConfig: {
        initialSkills: ['fireball', 'ice-shard'],
        exclusiveSkills: [],
        disabledSkills: [],
        skillReplacements: [],
        defaultSkillBar: [],
      },
      initialEquipment: {
        weapon: 'staff',
        armor: 'cloth',
        accessory1: 'necklace',
        accessory2: undefined,
        locked: false,
        exclusiveEquipment: [],
      },
      traitConfig: {
        individualTraits: [
          { id: 'trait-m1', name: '元素亲和', traitType: 'element-resistance', value: { fire: 10, ice: 10, thunder: 5 }, description: '全元素抗性提升' },
        ],
        passiveTalents: [],
        resourceEfficiencyOffsets: { mp: 10 },
      },
      combatPerformance: {
        idleAnim: 'idle-magic',
        attackAnim: 'cast-spell',
        hitAnim: 'hurt',
        voice: 'mage_voice',
        battleLogName: '艾莉娜(法师)',
      },
      // Legacy fields
      attributes: {
        baseStats: { hp: 600, mp: 150, attack: 30, defense: 20, speed: 80 },
        growthRates: { hp: 60, attack: 4, defense: 3, speed: 8 },
        levelFormula: 'level * 10',
      },
      actions: {
        normalAttack: { enabled: true },
        chaseAttack: { enabled: false },
        coordinatedAttack: { enabled: false },
        defend: { enabled: true },
      },
      skills: {
        skillSlots: [
          { id: 'slot-1', slotType: 'active', unlocked: true },
          { id: 'slot-2', slotType: 'passive', unlocked: false },
        ],
        skillLevels: {},
      },
      equipment: {
        defaultEquipment: { weapon: 'staff', armor: 'cloth' },
        equipmentRestrictions: {},
      },
      resistances: {
        statusResistances: {},
        damageReduction: {},
        elementReduction: {},
      },
      growthUnlocks: {
        breakthroughs: [],
        awakenings: [],
        exclusiveWeapons: [],
      },
    },
    {
      id: 'char-priest',
      identity: {
        name: '瑟蕾娅',
        description: '神圣教廷的治愈者，团队的生命守护者',
        faction: '教廷',
        rarity: 5,
        tags: ['主角', '后排', '治疗'],
      },
      category: 'player',
      jobId: 'job-priest',
      levelConfig: {
        initial: 1,
        max: 99,
        inheritJobGrowth: true,
        overrideGrowth: false,
        growthOffsets: {},
      },
      initialAttributes: {
        initialHp: 700,
        initialMp: 120,
        individualOffsets: { heal: 10 },
        inheritJobGrowth: true,
      },
      skillConfig: {
        initialSkills: ['heal', 'bless'],
        exclusiveSkills: [],
        disabledSkills: [],
        skillReplacements: [],
        defaultSkillBar: [],
      },
      initialEquipment: {
        weapon: 'staff',
        armor: 'cloth',
        accessory1: 'necklace',
        accessory2: 'ring',
        locked: false,
        exclusiveEquipment: [],
      },
      traitConfig: {
        individualTraits: [
          { id: 'trait-p1', name: '神圣祝福', traitType: 'status-resistance', value: { poison: 25, curse: 25 }, description: '异常状态抗性提升' },
        ],
        passiveTalents: [],
        resourceEfficiencyOffsets: { mp: 5 },
      },
      combatPerformance: {
        idleAnim: 'idle-pray',
        attackAnim: 'heal-cast',
        hitAnim: 'blessed',
        voice: 'priest_voice',
        battleLogName: '瑟蕾娅(牧师)',
      },
      // Legacy fields
      attributes: {
        baseStats: { hp: 700, mp: 120, attack: 40, defense: 30, speed: 70 },
        growthRates: { hp: 70, attack: 5, defense: 4, speed: 6 },
        levelFormula: 'level * 10',
      },
      actions: {
        normalAttack: { enabled: true },
        chaseAttack: { enabled: false },
        coordinatedAttack: { enabled: false },
        defend: { enabled: true },
      },
      skills: {
        skillSlots: [
          { id: 'slot-1', slotType: 'active', unlocked: true },
          { id: 'slot-2', slotType: 'passive', unlocked: true },
        ],
        skillLevels: {},
      },
      equipment: {
        defaultEquipment: { weapon: 'staff', armor: 'cloth' },
        equipmentRestrictions: {},
      },
      resistances: {
        statusResistances: { poison: 25, curse: 25 },
        damageReduction: {},
        elementReduction: {},
      },
      growthUnlocks: {
        breakthroughs: [],
        awakenings: [],
        exclusiveWeapons: [],
      },
    },
    {
      id: 'char-assassin',
      identity: {
        name: '夜影',
        description: '阴影中的刺客，一击必杀的暗影杀手',
        faction: '暗影公会',
        rarity: 5,
        tags: ['主角', '后排', '爆发'],
      },
      category: 'player',
      jobId: 'job-assassin',
      levelConfig: {
        initial: 1,
        max: 99,
        inheritJobGrowth: true,
        overrideGrowth: false,
        growthOffsets: {},
      },
      initialAttributes: {
        initialHp: 550,
        initialMp: 60,
        individualOffsets: { speed: 8, critRate: 5 },
        inheritJobGrowth: true,
      },
      skillConfig: {
        initialSkills: ['backstab', 'poison-blade'],
        exclusiveSkills: ['lethality'],
        disabledSkills: [],
        skillReplacements: [],
        defaultSkillBar: [],
      },
      initialEquipment: {
        weapon: 'dagger',
        armor: 'light',
        accessory1: 'ring',
        accessory2: 'bracelet',
        locked: false,
        exclusiveEquipment: [],
      },
      traitConfig: {
        individualTraits: [
          { id: 'trait-a1', name: '疾风', traitType: 'hit-dodge-crit', value: { crit: 10, dodge: 8, hit: 5 }, description: '暴击和闪避提升' },
        ],
        passiveTalents: [],
        resourceEfficiencyOffsets: {},
      },
      combatPerformance: {
        idleAnim: 'idle-stealth',
        attackAnim: 'backstab',
        hitAnim: 'dodge',
        voice: 'assassin_voice',
        battleLogName: '夜影(刺客)',
      },
      // Legacy fields
      attributes: {
        baseStats: { hp: 550, mp: 60, attack: 130, defense: 20, speed: 120 },
        growthRates: { hp: 55, attack: 14, defense: 3, speed: 12 },
        levelFormula: 'level * 10',
      },
      actions: {
        normalAttack: { enabled: true },
        chaseAttack: { enabled: true },
        coordinatedAttack: { enabled: false },
        defend: { enabled: false },
      },
      skills: {
        skillSlots: [
          { id: 'slot-1', slotType: 'active', unlocked: true },
          { id: 'slot-2', slotType: 'passive', unlocked: true },
          { id: 'slot-3', slotType: 'ultimate', unlocked: true },
        ],
        skillLevels: {},
      },
      equipment: {
        defaultEquipment: { weapon: 'dagger', armor: 'light' },
        equipmentRestrictions: {},
      },
      resistances: {
        statusResistances: {},
        damageReduction: {},
        elementReduction: {},
      },
      growthUnlocks: {
        breakthroughs: [],
        awakenings: [],
        exclusiveWeapons: [],
      },
    },
  ],
  jobs: [
    // 默认4个职业
    {
      id: 'job-warrior',
      name: '战士',
      jobType: 'warrior',
      role: 'tank',
      description: '以强大的物理攻击和防御能力著称的近战职业，擅长使用剑、斧等重型武器。',
      defaultWeaponTendency: 'sword',
      defaultPositionTendency: 'front',
      baseStats: { hp: 1200, mp: 80, attack: 110, defense: 80, speed: 60, magicAttack: 30, magicDefense: 40, critRate: 5, critDamage: 150 },
      growth: {
        statGrowth: {
          hp: [120, 135, 150, 165, 180],
          mp: [30, 35, 40, 45, 50],
          attack: [12, 14, 16, 18, 20],
          defense: [8, 10, 12, 14, 16],
          speed: [4, 4, 5, 5, 6],
        },
        levelCap: 99,
        experienceCurve: { baseValue: 100, extraValue: 40, accelerationA: 8, accelerationB: 4 },
        growthType: 'balanced',
      },
      learnableSkills: [
        { id: 'learn-1', skillId: 'power-strike', learnLevel: 1, branch: '物理系', notes: '初始技能' },
        { id: 'learn-2', skillId: 'shield-bash', learnLevel: 5, branch: '防御系', notes: '防御姿态' },
        { id: 'learn-3', skillId: 'charge', learnLevel: 10, branch: '物理系', notes: '冲锋' },
        { id: 'learn-4', skillId: 'rage', learnLevel: 20, branch: '物理系', notes: '怒斩' },
        { id: 'learn-5', skillId: 'defend', learnLevel: 15, branch: '防御系', notes: '铁壁防御' },
      ],
      traits: [
        { id: 'trait-1', name: '战士体质', traitType: 'stat-bonus', value: { hp: 50, defense: 10 }, description: '生命值和防御力额外加成' },
        { id: 'trait-2', name: '武器专精', traitType: 'additional-skill-type', value: { passive: 1 }, description: '可以使用被动技能' },
      ],
      equipmentPermissions: {
        weaponTypes: ['sword', 'axe', 'hammer', 'polearm'],
        armorTypes: ['heavy', 'medium'],
        accessoryTypes: ['ring', 'necklace', 'bracelet'],
        forbiddenTypes: ['staff', 'wand'],
      },
      tree: [],
      passives: [],
      weaponAdaptations: [],
      synergies: [],
    },
    {
      id: 'job-mage',
      name: '法师',
      jobType: 'mage',
      role: 'damage',
      description: '掌握元素魔法的远程输出职业，擅长使用法杖和魔杖释放强大的魔法攻击。',
      defaultWeaponTendency: 'staff',
      defaultPositionTendency: 'back',
      baseStats: { hp: 600, mp: 150, attack: 30, defense: 20, speed: 80, magicAttack: 120, magicDefense: 70, critRate: 5, critDamage: 150 },
      growth: {
        statGrowth: {
          hp: [60, 70, 80, 90, 100],
          mp: [80, 95, 110, 125, 140],
          attack: [4, 5, 6, 7, 8],
          defense: [3, 4, 5, 6, 7],
          speed: [6, 7, 8, 9, 10],
        },
        levelCap: 99,
        experienceCurve: { baseValue: 100, extraValue: 55, accelerationA: 12, accelerationB: 6 },
        growthType: 'late',
      },
      learnableSkills: [
        { id: 'learn-1', skillId: 'fireball', learnLevel: 1, branch: '火系', notes: '初始技能' },
        { id: 'learn-2', skillId: 'ice-shard', learnLevel: 5, branch: '冰系', notes: '冰霜箭' },
        { id: 'learn-3', skillId: 'thunder', learnLevel: 10, branch: '雷系', notes: '雷电术' },
        { id: 'learn-4', skillId: 'teleport', learnLevel: 15, branch: '通用', notes: '传送' },
        { id: 'learn-5', skillId: 'magic-shield', learnLevel: 20, branch: '通用', notes: '魔法护盾' },
      ],
      traits: [
        { id: 'trait-1', name: '魔法天赋', traitType: 'stat-bonus', value: { mp: 30, magicAttack: 15 }, description: 'MP和魔法攻击额外加成' },
        { id: 'trait-2', name: '元素亲和', traitType: 'element-resistance', value: { fire: 10, ice: 10, thunder: 10 }, description: '全元素抗性提升' },
      ],
      equipmentPermissions: {
        weaponTypes: ['staff', 'wand'],
        armorTypes: ['cloth'],
        accessoryTypes: ['ring', 'necklace'],
        forbiddenTypes: ['sword', 'axe', 'hammer', 'dagger', 'bow', 'polearm', 'heavy'],
      },
      tree: [],
      passives: [],
      weaponAdaptations: [],
      synergies: [],
    },
    {
      id: 'job-priest',
      name: '牧师',
      jobType: 'priest',
      role: 'healer',
      description: '神圣的治愈职业，擅长治疗和辅助技能，是团队中不可或缺的支援角色。',
      defaultWeaponTendency: 'staff',
      defaultPositionTendency: 'back',
      baseStats: { hp: 700, mp: 120, attack: 40, defense: 30, speed: 70, magicAttack: 60, magicDefense: 50, critRate: 0, critDamage: 150 },
      growth: {
        statGrowth: {
          hp: [70, 80, 90, 100, 110],
          mp: [70, 85, 100, 115, 130],
          attack: [5, 6, 7, 8, 9],
          defense: [5, 6, 7, 8, 9],
          speed: [5, 6, 7, 8, 9],
        },
        levelCap: 99,
        experienceCurve: { baseValue: 100, extraValue: 45, accelerationA: 10, accelerationB: 5 },
        growthType: 'balanced',
      },
      learnableSkills: [
        { id: 'learn-1', skillId: 'heal', learnLevel: 1, branch: '治疗系', notes: '初始技能' },
        { id: 'learn-2', skillId: 'bless', learnLevel: 5, branch: '辅助系', notes: '祝福' },
        { id: 'learn-3', skillId: 'resurrection', learnLevel: 15, branch: '治疗系', notes: '复活' },
        { id: 'learn-4', skillId: 'purify', learnLevel: 10, branch: '辅助系', notes: '净化' },
        { id: 'learn-5', skillId: 'holy-shield', learnLevel: 20, branch: '辅助系', notes: '圣光护盾' },
      ],
      traits: [
        { id: 'trait-1', name: '神圣之力', traitType: 'stat-bonus', value: { mp: 25, heal: 15 }, description: 'MP和治疗量额外加成' },
        { id: 'trait-2', name: '状态免疫', traitType: 'status-resistance', value: { poison: 20, curse: 20 }, description: '异常状态抗性提升' },
      ],
      equipmentPermissions: {
        weaponTypes: ['staff', 'wand'],
        armorTypes: ['cloth', 'light'],
        accessoryTypes: ['ring', 'necklace', 'bracelet'],
        forbiddenTypes: ['sword', 'axe', 'hammer', 'dagger', 'bow', 'polearm', 'heavy'],
      },
      tree: [],
      passives: [],
      weaponAdaptations: [],
      synergies: [],
    },
    {
      id: 'job-assassin',
      name: '刺客',
      jobType: 'assassin',
      role: 'damage',
      description: '以高爆发和高机动性著称的物理输出职业，擅长使用匕首进行瞬间输出。',
      defaultWeaponTendency: 'dagger',
      defaultPositionTendency: 'back',
      baseStats: { hp: 550, mp: 90, attack: 130, defense: 25, speed: 120, magicAttack: 25, magicDefense: 30, critRate: 15, critDamage: 180 },
      growth: {
        statGrowth: {
          hp: [55, 65, 75, 85, 95],
          mp: [40, 48, 56, 64, 72],
          attack: [14, 17, 20, 23, 26],
          defense: [3, 4, 5, 6, 7],
          speed: [10, 12, 14, 16, 18],
        },
        levelCap: 99,
        experienceCurve: { baseValue: 100, extraValue: 35, accelerationA: 6, accelerationB: 3 },
        growthType: 'early',
      },
      learnableSkills: [
        { id: 'learn-1', skillId: 'backstab', learnLevel: 1, branch: '刺杀系', notes: '初始技能' },
        { id: 'learn-2', skillId: 'poison-blade', learnLevel: 5, branch: '毒系', notes: '毒刃' },
        { id: 'learn-3', skillId: 'stealth', learnLevel: 10, branch: '刺杀系', notes: '隐身' },
        { id: 'learn-4', skillId: 'shadow-step', learnLevel: 15, branch: '刺杀系', notes: '瞬移' },
        { id: 'learn-5', skillId: 'lethality', learnLevel: 20, branch: '刺杀系', notes: '致命一击' },
      ],
      traits: [
        { id: 'trait-1', name: '敏捷身法', traitType: 'stat-bonus', value: { speed: 10, attack: 8 }, description: '速度和攻击额外加成' },
        { id: 'trait-2', name: '疾风', traitType: 'hit-dodge-crit', value: { crit: 15, dodge: 10, hit: 5 }, description: '暴击和闪避提升' },
      ],
      equipmentPermissions: {
        weaponTypes: ['dagger', 'bow'],
        armorTypes: ['light'],
        accessoryTypes: ['ring', 'bracelet', 'belt'],
        forbiddenTypes: ['sword', 'axe', 'hammer', 'polearm', 'staff', 'wand', 'heavy'],
      },
      tree: [],
      passives: [],
      weaponAdaptations: [],
      synergies: [],
    },
  ],
  skills: [
    // 默认6个技能
    {
      id: 'normal-attack',
      name: '普通攻击',
      description: '最基本的物理攻击',
      category: 'normal',
      type: 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      targetCount: 1,
      cost: { resourceType: 'hp', amount: 0 },
      cooldown: 0,
      hitType: 'physical',
      damageType: 'physical',
      formulaId: 'phys-dmg',
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { baseDamage: 100 } }
      ],
      showInBar: true,
      upgradable: false,
      requirements: {},
    },
    {
      id: 'power-strike',
      name: '强力斩',
      description: '蓄力后的一次强力攻击，造成150%伤害',
      category: 'active',
      type: 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      targetCount: 1,
      cost: { resourceType: 'mp', amount: 15 },
      cooldown: 2,
      hitType: 'physical',
      damageType: 'physical',
      formulaId: 'phys-dmg',
      variance: 10,
      critEnabled: true,
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { multiplier: 1.5 } }
      ],
      showInBar: true,
      upgradable: true,
      requirements: {},
    },
    {
      id: 'healing',
      name: '治疗术',
      description: '恢复目标的生命值',
      category: 'support',
      type: 'active',
      targetType: 'single',
      targetCamp: 'ally',
      targetCount: 1,
      cost: { resourceType: 'mp', amount: 20 },
      cooldown: 3,
      hitType: 'certain',
      damageType: 'heal',
      formulaId: 'heal-formula',
      effectBlocks: [
        { id: 'effect-1', type: 'heal', params: { baseHeal: 150 } }
      ],
      showInBar: true,
      upgradable: true,
      requirements: {},
    },
    {
      id: 'poison-blade',
      name: '毒刃',
      description: '在武器上涂毒，造成持续伤害',
      category: 'active',
      type: 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      targetCount: 1,
      cost: { resourceType: 'mp', amount: 10 },
      cooldown: 1,
      hitType: 'physical',
      damageType: 'physical',
      formulaId: 'phys-dmg',
      element: 'poison',
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { baseDamage: 50 } },
        { id: 'effect-2', type: 'status', params: { statusId: 'dot-poison', duration: 3 } }
      ],
      showInBar: true,
      upgradable: true,
      requirements: {},
    },
    {
      id: 'armor-break',
      name: '破甲打击',
      description: '降低目标的防御力',
      category: 'active',
      type: 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      targetCount: 1,
      cost: { resourceType: 'mp', amount: 12 },
      cooldown: 2,
      hitType: 'physical',
      damageType: 'physical',
      formulaId: 'phys-dmg',
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { baseDamage: 60 } },
        { id: 'effect-2', type: 'status', params: { statusId: 'debuff-armor-break', duration: 3 } }
      ],
      showInBar: true,
      upgradable: true,
      requirements: {},
    },
    {
      id: 'battle-cry',
      name: '战吼',
      description: '提升自身攻击力',
      category: 'support',
      type: 'active',
      targetType: 'self',
      targetCamp: 'self',
      targetCount: 1,
      cost: { resourceType: 'rage', amount: 25 },
      cooldown: 4,
      hitType: 'certain',
      effectBlocks: [
        { id: 'effect-1', type: 'status', params: { statusId: 'buff-attack-up', duration: 3 } }
      ],
      showInBar: true,
      upgradable: true,
      requirements: {},
    },
  ],
  statuses: [
    // 默认6个状态
    {
      id: 'buff-attack-up',
      name: '攻击提升',
      description: '攻击力提升20%',
      category: 'buff',
      restriction: 'none',
      duration: { type: 'rounds', value: 3, canRefresh: true },
      stacking: { type: 'none', maxStacks: 1, stackMultiplier: 1 },
      dispel: { priority: 1, canDispel: true, dispelType: 'positive', removeOnBattleEnd: false, removeOnStatusOverride: false, removeOnActionEnd: false, removeOnTurnEnd: false, removeOnDamage: { enabled: false, probability: 0 }, removeOnMapStep: { enabled: false, steps: 0 } },
      conflict: { type: 'replace', conflictingStatuses: [], overrideStatuses: [], upgradeStatuses: [], convertStatuses: [], chainReactions: [] },
      triggers: [
        { event: 'on-apply', effect: '{"type":"attack-up","value":20}' },
      ],
      display: { icon: 'Swords', priority: 1, showDuration: true, color: '#22c55e' },
    },
    {
      id: 'debuff-armor-break',
      name: '破甲',
      description: '防御力降低25%',
      category: 'debuff',
      restriction: 'none',
      duration: { type: 'rounds', value: 3, canRefresh: true },
      stacking: { type: 'intensity', maxStacks: 3, stackMultiplier: 1 },
      dispel: { priority: 2, canDispel: true, dispelType: 'negative', removeOnBattleEnd: false, removeOnStatusOverride: false, removeOnActionEnd: false, removeOnTurnEnd: false, removeOnDamage: { enabled: false, probability: 0 }, removeOnMapStep: { enabled: false, steps: 0 } },
      conflict: { type: 'replace', conflictingStatuses: [], overrideStatuses: [], upgradeStatuses: [], convertStatuses: [], chainReactions: [] },
      triggers: [
        { event: 'on-apply', effect: '{"type":"defense-down","value":25}' },
      ],
      display: { icon: 'ShieldOff', priority: 1, showDuration: true, color: '#ef4444' },
    },
    {
      id: 'dot-poison',
      name: '中毒',
      description: '每回合损失最大生命值5%的生命',
      category: 'dot',
      restriction: 'none',
      duration: { type: 'rounds', value: 5, canRefresh: true },
      stacking: { type: 'intensity', maxStacks: 5, stackMultiplier: 1 },
      dispel: { priority: 1, canDispel: true, dispelType: 'negative', removeOnBattleEnd: false, removeOnStatusOverride: false, removeOnActionEnd: false, removeOnTurnEnd: false, removeOnDamage: { enabled: false, probability: 0 }, removeOnMapStep: { enabled: false, steps: 0 } },
      conflict: { type: 'stack', conflictingStatuses: [], overrideStatuses: [], upgradeStatuses: [], convertStatuses: [], chainReactions: [] },
      triggers: [
        { event: 'on-turn-end', effect: '{"type":"dot-damage","value":5}' },
      ],
      display: { icon: 'Flame', priority: 1, showDuration: true, color: '#dc2626' },
    },
    {
      id: 'control-stun',
      name: '眩晕',
      description: '无法行动',
      category: 'control',
      restriction: 'cannot-act',
      duration: { type: 'rounds', value: 1, canRefresh: false },
      stacking: { type: 'none', maxStacks: 1, stackMultiplier: 1 },
      dispel: { priority: 3, canDispel: true, dispelType: 'negative', removeOnBattleEnd: false, removeOnStatusOverride: true, removeOnActionEnd: false, removeOnTurnEnd: false, removeOnDamage: { enabled: false, probability: 0 }, removeOnMapStep: { enabled: false, steps: 0 } },
      conflict: { type: 'block', conflictingStatuses: ['control-freeze', 'control-silence'], overrideStatuses: [], upgradeStatuses: [], convertStatuses: [], chainReactions: [] },
      triggers: [],
      display: { icon: 'Stun', priority: 3, showDuration: true, color: '#f97316' },
    },
    {
      id: 'mark-ignite',
      name: '灼烧印记',
      description: '被攻击时额外受到50%伤害',
      category: 'mark',
      duration: { type: 'rounds', value: 3, canRefresh: true },
      stacking: { type: 'intensity', maxStacks: 3, stackMultiplier: 0.5 },
      dispel: { priority: 1, canDispel: true, dispelType: 'negative' },
      conflict: { type: 'stack', conflictingStatuses: [] },
      triggers: [
        { event: 'on-damaged', effect: '{"type":"dot-damage","value":50}' },
      ],
      display: { icon: 'Flame', priority: 2, showDuration: true, color: '#eab308' },
    },
    {
      id: 'shield-barrier',
      name: '护盾',
      description: '吸收等同于最大生命值15%的伤害',
      category: 'shield',
      duration: { type: 'rounds', value: 3, canRefresh: true },
      stacking: { type: 'intensity', maxStacks: 3, stackMultiplier: 1 },
      dispel: { priority: 0, canDispel: false, dispelType: 'none' },
      conflict: { type: 'stack', conflictingStatuses: [] },
      triggers: [
        { event: 'on-apply', effect: '{"type":"shield","value":15}' },
      ],
      display: { icon: 'Shield', priority: 2, showDuration: true, color: '#3b82f6' },
    },
    // 战士技能
    {
      id: 'shield-bash',
      name: '盾击',
      description: '用盾牌击晕敌人',
      category: 'active',
      type: 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      targetCount: 1,
      cost: { resourceType: 'mp', amount: 10 },
      cooldown: 3,
      hitType: 'physical',
      damageType: 'physical',
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { damage: 80 } },
        { id: 'effect-2', type: 'status', params: { statusId: 'stun', duration: 1 } }
      ],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'charge',
      name: '冲锋',
      description: '向敌人发起冲锋',
      category: 'active',
      type: 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      targetCount: 1,
      cost: { resourceType: 'mp', amount: 20 },
      cooldown: 4,
      hitType: 'physical',
      damageType: 'physical',
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { damage: 120 } }
      ],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'rage',
      name: '怒斩',
      description: '愤怒的斩击，造成巨大伤害',
      category: 'ultimate',
      type: 'ultimate',
      targetType: 'single',
      targetCamp: 'enemy',
      targetCount: 1,
      cost: { resourceType: 'mp', amount: 50 },
      cooldown: 8,
      hitType: 'physical',
      damageType: 'physical',
      critEnabled: true,
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { damage: 250 } }
      ],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'defend',
      name: '防御姿态',
      description: '进入防御姿态，提升防御力',
      category: 'active',
      type: 'active',
      targetType: 'self',
      targetCamp: 'self',
      cost: { resourceType: 'mp', amount: 15 },
      cooldown: 3,
      effectBlocks: [
        { id: 'effect-1', type: 'buff', params: { statusId: 'defense-up', duration: 2, value: 30 } }
      ],
      showInBar: true,
      requirements: {},
    },
    // 法师技能
    {
      id: 'fireball',
      name: '火球术',
      description: '发射一个火球攻击敌人',
      category: 'active',
      type: 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      cost: { resourceType: 'mp', amount: 25 },
      cooldown: 2,
      hitType: 'magic',
      damageType: 'magic',
      element: 'fire',
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { damage: 100 } }
      ],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'ice-shard',
      name: '冰霜箭',
      description: '发射冰霜箭矢攻击敌人',
      category: 'active',
      type: 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      cost: { resourceType: 'mp', amount: 20 },
      cooldown: 2,
      hitType: 'magic',
      damageType: 'magic',
      element: 'ice',
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { damage: 85 } }
      ],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'thunder',
      name: '雷电术',
      description: '召唤雷电攻击敌人',
      category: 'active',
      type: 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      cost: { resourceType: 'mp', amount: 30 },
      cooldown: 3,
      hitType: 'magic',
      damageType: 'magic',
      element: 'thunder',
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { damage: 120 } }
      ],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'teleport',
      name: '传送',
      description: '瞬间传送到指定位置',
      category: 'special',
      type: 'active',
      targetType: 'self',
      targetCamp: 'self',
      cost: { resourceType: 'mp', amount: 15 },
      cooldown: 5,
      effectBlocks: [],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'magic-shield',
      name: '魔法护盾',
      description: '创建一个魔法护盾吸收伤害',
      category: 'active',
      type: 'active',
      targetType: 'self',
      targetCamp: 'self',
      cost: { resourceType: 'mp', amount: 40 },
      cooldown: 6,
      effectBlocks: [
        { id: 'effect-1', type: 'status', params: { statusId: 'magic-shield-status', duration: 3, value: 100 } }
      ],
      showInBar: true,
      requirements: {},
    },
    // 牧师技能
    {
      id: 'heal',
      name: '治疗',
      description: '恢复目标生命值',
      category: 'support',
      type: 'active',
      targetType: 'ally',
      targetCamp: 'ally',
      cost: { resourceType: 'mp', amount: 15 },
      cooldown: 2,
      hitType: 'certain',
      damageType: 'heal',
      effectBlocks: [
        { id: 'effect-1', type: 'heal', params: { heal: 120 } }
      ],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'bless',
      name: '祝福',
      description: '为目标施加祝福状态',
      category: 'support',
      type: 'active',
      targetType: 'ally',
      targetCamp: 'ally',
      cost: { resourceType: 'mp', amount: 25 },
      cooldown: 3,
      effectBlocks: [
        { id: 'effect-1', type: 'buff', params: { statusId: 'blessed', duration: 3, value: 20 } }
      ],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'resurrection',
      name: '复活',
      description: '复活倒地的队友',
      category: 'support',
      type: 'active',
      targetType: 'ally',
      targetCamp: 'ally',
      cost: { resourceType: 'mp', amount: 80 },
      cooldown: 10,
      effectBlocks: [],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'purify',
      name: '净化',
      description: '移除目标身上的负面状态',
      category: 'support',
      type: 'active',
      targetType: 'ally',
      targetCamp: 'ally',
      cost: { resourceType: 'mp', amount: 20 },
      cooldown: 4,
      effectBlocks: [],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'holy-shield',
      name: '圣光护盾',
      description: '为目标施加圣光护盾',
      category: 'support',
      type: 'active',
      targetType: 'ally',
      targetCamp: 'ally',
      cost: { resourceType: 'mp', amount: 35 },
      cooldown: 5,
      effectBlocks: [
        { id: 'effect-1', type: 'status', params: { statusId: 'holy-shield-status', duration: 3, value: 150 } }
      ],
      showInBar: true,
      requirements: {},
    },
    // 刺客技能
    {
      id: 'backstab',
      name: '背刺',
      description: '从背后发起攻击，造成额外伤害',
      category: 'active',
      type: 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      cost: { resourceType: 'mp', amount: 15 },
      cooldown: 2,
      hitType: 'physical',
      damageType: 'physical',
      critEnabled: true,
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { damage: 150 } }
      ],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'stealth',
      name: '隐身',
      description: '进入隐身状态',
      category: 'active',
      type: 'active',
      targetType: 'self',
      targetCamp: 'self',
      cost: { resourceType: 'mp', amount: 30 },
      cooldown: 8,
      effectBlocks: [
        { id: 'effect-1', type: 'status', params: { statusId: 'stealth', duration: 3 } }
      ],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'shadow-step',
      name: '影步',
      description: '瞬间移动到目标身后',
      category: 'active',
      type: 'active',
      targetType: 'single',
      targetCamp: 'enemy',
      cost: { resourceType: 'mp', amount: 20 },
      cooldown: 4,
      effectBlocks: [],
      showInBar: true,
      requirements: {},
    },
    {
      id: 'lethality',
      name: '致命一击',
      description: '给予敌人致命伤害',
      category: 'ultimate',
      type: 'ultimate',
      targetType: 'single',
      targetCamp: 'enemy',
      cost: { resourceType: 'mp', amount: 60 },
      cooldown: 10,
      hitType: 'physical',
      damageType: 'physical',
      critEnabled: true,
      effectBlocks: [
        { id: 'effect-1', type: 'damage', params: { damage: 300 } }
      ],
      showInBar: true,
      requirements: {},
    },
  ],
  // Default equipment data
  equipment: [
    // Weapons
    {
      id: 'equip-iron-sword',
      name: '铁剑',
      equipmentCategory: 'weapon',
      equipmentType: 'sword',
      rarity: 1,
      description: '最基本的剑，适合初学者使用',
      icon: 'sword',
      stats: { attack: 10 },
      traits: [],
      condition: { allowedJobs: ['job-warrior', 'job-assassin'] },
      economy: { price: 100, sellPrice: 50, shopAvailable: true, rarityTag: '普通' },
      combatDisplay: {},
    },
    {
      id: 'equip-knight-sword',
      name: '骑士长剑',
      equipmentCategory: 'weapon',
      equipmentType: 'sword',
      rarity: 3,
      description: '王国骑士的标准佩剑，锋利且耐用',
      icon: 'sword',
      stats: { attack: 25, defense: 5 },
      traits: [
        { id: 'trait-kw1', name: '骑士之力', traitType: 'stat-bonus', value: { attack: 5 }, description: '攻击额外+5' }
      ],
      condition: { allowedJobs: ['job-warrior'], minLevel: 10 },
      economy: { price: 500, sellPrice: 250, shopAvailable: true, rarityTag: '稀有' },
      combatDisplay: {},
    },
    // Armor
    {
      id: 'equip-cloth-armor',
      name: '布衣',
      equipmentCategory: 'armor',
      equipmentType: 'cloth',
      rarity: 1,
      description: '简单的布制护甲',
      icon: 'shirt',
      stats: { defense: 5 },
      traits: [],
      condition: {},
      economy: { price: 50, sellPrice: 25, shopAvailable: true, rarityTag: '普通' },
      combatDisplay: {},
    },
    {
      id: 'equip-heavy-armor',
      name: '重甲',
      equipmentCategory: 'armor',
      equipmentType: 'heavy',
      rarity: 3,
      description: '厚重的金属铠甲，提供强大的防护',
      icon: 'shield',
      stats: { defense: 20, hp: 50, speed: -5 },
      traits: [
        { id: 'trait-ha1', name: '铁壁', traitType: 'stat-bonus', value: { defense: 10 }, description: '防御额外+10' }
      ],
      condition: { allowedJobs: ['job-warrior'], minLevel: 15 },
      economy: { price: 800, sellPrice: 400, shopAvailable: true, rarityTag: '稀有' },
      combatDisplay: {},
    },
    // Accessory
    {
      id: 'equip-heal-ring',
      name: '治愈戒指',
      equipmentCategory: 'accessory',
      equipmentType: 'ring',
      rarity: 2,
      description: '蕴含治愈之力的魔法戒指',
      icon: 'circle',
      stats: { magicAttack: 5 },
      traits: [
        { id: 'trait-hr1', name: '治愈之光', traitType: 'stat-bonus', value: { heal: 10 }, description: '治疗效果+10%' }
      ],
      condition: { allowedJobs: ['job-priest'] },
      economy: { price: 300, sellPrice: 150, shopAvailable: true, rarityTag: '优秀' },
      combatDisplay: {},
    },
  ],
  // Default items data
  items: [
    {
      id: 'item-small-potion',
      name: '小回复药',
      itemCategory: 'recovery',
      itemType: 'potion',
      description: '恢复少量生命值',
      icon: 'flask',
      useRule: { scenario: 'anytime', targetType: 'ally', usesPerBattle: 99, consumable: true },
      effects: [{ id: 'effect-hp1', effectType: 'heal-hp', value: 50 }],
      event关联: { isKeyItem: false },
      economy: { price: 20, sellPrice: 10, shopAvailable: true, rarity: 1, stackMax: 99 },
      display: {},
    },
    {
      id: 'item-mana-potion',
      name: '魔力药水',
      itemCategory: 'recovery',
      itemType: 'potion',
      description: '恢复魔法值',
      icon: 'flask',
      useRule: { scenario: 'anytime', targetType: 'ally', usesPerBattle: 99, consumable: true },
      effects: [{ id: 'effect-mp1', effectType: 'heal-mp', value: 30 }],
      event关联: { isKeyItem: false },
      economy: { price: 30, sellPrice: 15, shopAvailable: true, rarity: 1, stackMax: 99 },
      display: {},
    },
    {
      id: 'item-resurrect-feather',
      name: '复活羽毛',
      itemCategory: 'resurrection',
      itemType: 'feather',
      description: '可复活倒地的队友，恢复50%生命值',
      icon: 'feather',
      useRule: { scenario: 'battle', targetType: 'ally', usesPerBattle: 1, consumable: true },
      effects: [{ id: 'effect-res1', effectType: 'heal-hp', value: 0.5, eventId: 'resurrect' }],
      event关联: { isKeyItem: false },
      economy: { price: 200, sellPrice: 100, shopAvailable: true, rarity: 3, stackMax: 10 },
      display: {},
    },
  ],
  enemies: [
    {
      id: 'enemy-slime',
      name: '史莱姆',
      description: '最常见的魔物，行动缓慢但数量众多',
      enemyType: 'normal',
      race: '史莱姆族',
      faction: '野生',
      dangerLevel: 1,
      battlerResource: 'slime',
      attributes: {
        level: 1,
        hp: 50,
        mp: 0,
        attack: 8,
        defense: 2,
        magicAttack: 5,
        magicDefense: 2,
        speed: 3,
        critRate: 0.05,
        critDamage: 1.5,
        elements: { 水: 50, 火: -50 },
      },
      useTemplateGrowth: false,
      dangerScore: 5,
      skills: [
        { skillId: 'skill-slime-attack', slot: 'normal' },
        { skillId: 'skill-slime-split', slot: 'special', unlockCondition: 'hp<30%' },
      ],
      normalAttack: 'skill-slime-attack',
      activeSkills: [],
      specialSkills: ['skill-slime-split'],
      ai: {
        behaviorTree: { type: 'sequence', children: [] },
        priorityTargets: [],
        skillUsage: [],
        behaviorPriority: [
          { action: 'attack', weight: 80 },
          { action: 'defend', weight: 20, condition: 'hp<50%' },
        ],
        actionFrequency: 1,
        firstTurnPreference: 'attack',
        hpThresholdBehaviors: [
          { hpPercent: 30, action: 'skill', skillId: 'skill-slime-split' },
        ],
      },
      elementResistances: { 水: 50 },
      statusResistances: {},
      debuffRateMod: 1.0,
      immunity: [],
      absorb: {},
      reflect: {},
      weaknesses: ['火'],
      hitMod: 1.0,
      evasionMod: 1.0,
      drops: [
        { itemId: 'item-slime-gel', dropRate: 30, amountMin: 1, amountMax: 3 },
      ],
      goldMin: 5,
      goldMax: 15,
      expMin: 10,
      expMax: 20,
      firstKillReward: 'skill-slime-rare',
      questDrops: [],
      idleAnimation: 'idle-bounce',
      attackAnimation: 'attack-squeeze',
      damageAnimation: 'damage-shake',
      deathAnimation: 'death-pop',
      soundEffects: {
        attack: 'slime_squish',
        hurt: 'slime_hit',
        death: 'slime_pop',
      },
      battleLogName: '史莱姆',
      phaseShift: [],
      shieldLayers: 0,
      enragedCondition: undefined,
      summonBehavior: undefined,
      phaseStateChanges: [],
      specialEventFlags: [],
    },
    {
      id: 'enemy-goblin-warrior',
      name: '哥布林战士',
      description: '绿皮肤的类人生物，擅长使用简陋的武器',
      enemyType: 'elite',
      race: '哥布林族',
      faction: '哥布林部落',
      dangerLevel: 3,
      battlerResource: 'goblin-warrior',
      attributes: {
        level: 5,
        hp: 180,
        mp: 30,
        attack: 25,
        defense: 12,
        magicAttack: 10,
        magicDefense: 8,
        speed: 15,
        critRate: 0.1,
        critDamage: 1.5,
        elements: {},
      },
      useTemplateGrowth: false,
      dangerScore: 35,
      skills: [
        { skillId: 'skill-goblin-basic', slot: 'normal' },
        { skillId: 'skill-goblin-heavy', slot: 'active', unlockCondition: 'always' },
        { skillId: 'skill-goblin-rage', slot: 'special', unlockCondition: 'hp<40%' },
      ],
      normalAttack: 'skill-goblin-basic',
      activeSkills: ['skill-goblin-heavy'],
      specialSkills: ['skill-goblin-rage'],
      ai: {
        behaviorTree: { type: 'selector', children: [] },
        priorityTargets: ['healer', 'mage'],
        skillUsage: [
          { skillId: 'skill-goblin-heavy', condition: 'target.def<10', probability: 0.4 },
        ],
        behaviorPriority: [
          { action: 'skill', weight: 50, condition: 'enemy.hasBuff(heal)' },
          { action: 'attack', weight: 40 },
          { action: 'defend', weight: 10 },
        ],
        actionFrequency: 1.2,
        firstTurnPreference: 'attack',
        hpThresholdBehaviors: [
          { hpPercent: 40, action: 'skill', skillId: 'skill-goblin-rage' },
        ],
        statusTriggerBehaviors: [
          { statusId: 'status-poison', trigger: 'on_apply', action: 'attack' },
        ],
      },
      elementResistances: {},
      statusResistances: { 中毒: 50, 灼烧: 25 },
      debuffRateMod: 0.8,
      immunity: ['恐惧'],
      absorb: {},
      reflect: {},
      weaknesses: [],
      hitMod: 1.1,
      evasionMod: 0.9,
      drops: [
        { itemId: 'item-goblin-ear', dropRate: 50, amountMin: 1, amountMax: 2 },
        { itemId: 'item-crude-axe', dropRate: 15 },
      ],
      goldMin: 30,
      goldMax: 80,
      expMin: 50,
      expMax: 100,
      firstKillReward: 'item-goblin-king-ticket',
      questDrops: [
        { questId: 'quest-goblin-plague', itemId: 'item-goblin-ear', required: true },
      ],
      idleAnimation: 'idle-shake',
      attackAnimation: 'attack-swing',
      damageAnimation: 'damage-flash',
      deathAnimation: 'death-collapse',
      soundEffects: {
        attack: 'goblin_yell',
        hurt: 'goblin_pain',
        death: 'goblin_die',
      },
      battleLogName: '哥布林战士',
      phaseShift: [],
      shieldLayers: 0,
      enragedCondition: 'hp<30%',
      summonBehavior: {
        summonEnemyId: 'enemy-goblin',
        summonCount: 2,
        summonCondition: 'onFirstTurn',
        maxSummons: 3,
      },
      phaseStateChanges: [],
      specialEventFlags: [],
    },
    {
      id: 'enemy-black-armor-knight',
      name: '黑甲骑士',
      description: '身着黑色重甲的精锐战士，攻防一体',
      enemyType: 'boss',
      race: '人类',
      faction: '黑暗骑士团',
      dangerLevel: 5,
      battlerResource: 'black-armor-knight',
      attributes: {
        level: 15,
        hp: 2500,
        mp: 100,
        attack: 80,
        defense: 60,
        magicAttack: 30,
        magicDefense: 45,
        speed: 25,
        critRate: 0.15,
        critDamage: 1.8,
        elements: { 暗: 30 },
      },
      useTemplateGrowth: false,
      dangerScore: 280,
      skills: [
        { skillId: 'skill-knight-strike', slot: 'normal' },
        { skillId: 'skill-knight-shield-bash', slot: 'active', unlockCondition: 'always' },
        { skillId: 'skill-knight-dark-sword', slot: 'active', unlockCondition: 'turn>=3' },
        { skillId: 'skill-knight-ultima', slot: 'special', unlockCondition: 'hp<20%' },
      ],
      normalAttack: 'skill-knight-strike',
      activeSkills: ['skill-knight-shield-bash', 'skill-knight-dark-sword'],
      specialSkills: ['skill-knight-ultima'],
      ai: {
        behaviorTree: { type: 'sequence', children: [] },
        priorityTargets: ['healer', 'mage', 'physical-dps'],
        skillUsage: [
          { skillId: 'skill-knight-shield-bash', condition: 'target.critRate>0.1', probability: 0.3 },
          { skillId: 'skill-knight-dark-sword', condition: 'turn>=3', probability: 0.5 },
        ],
        behaviorPriority: [
          { action: 'skill', weight: 60 },
          { action: 'attack', weight: 30 },
          { action: 'defend', weight: 10, condition: 'hp<30%' },
        ],
        actionFrequency: 1.5,
        firstTurnPreference: 'skill',
        hpThresholdBehaviors: [
          { hpPercent: 50, action: 'skill', skillId: 'skill-knight-dark-sword' },
          { hpPercent: 20, action: 'skill', skillId: 'skill-knight-ultima' },
        ],
        statusTriggerBehaviors: [],
      },
      elementResistances: { 暗: 50, 火: 25 },
      statusResistances: { 眩晕: 80, 冰冻: 60, 睡眠: 50 },
      debuffRateMod: 0.5,
      immunity: ['眩晕', '冰冻'],
      absorb: { 暗: 30 },
      reflect: {},
      weaknesses: ['光'],
      hitMod: 1.2,
      evasionMod: 0.7,
      drops: [
        { itemId: 'item-black-armor', dropRate: 100 },
        { itemId: 'item-dark-sword', dropRate: 30 },
        { itemId: 'item-knight-badge', dropRate: 50 },
      ],
      goldMin: 500,
      goldMax: 1000,
      expMin: 500,
      expMax: 800,
      firstKillReward: 'skill-knight-counter',
      questDrops: [],
      idleAnimation: 'idle-stand',
      attackAnimation: 'attack-slash',
      damageAnimation: 'damage-clang',
      deathAnimation: 'death-fall',
      soundEffects: {
        attack: 'sword_swipe',
        hurt: 'armor_hit',
        death: 'armor_collapse',
      },
      battleLogName: '黑甲骑士',
      phaseShift: [
        { phaseNumber: 2, triggerCondition: 'hp<50%', addStates: ['status-dark-aura'], statModifiers: { attack: 20, speed: 10 } },
      ],
      shieldLayers: 3,
      enragedCondition: 'hp<30%',
      summonBehavior: undefined,
      phaseStateChanges: [
        { phase: 2, addStatus: ['status-dark-aura'], removeStatus: [] },
      ],
      specialEventFlags: ['boss-battle', 'knight-defeat-unlock'],
    },
    {
      id: 'enemy-ancient-dragon',
      name: '古代龙兽',
      description: '存活了数千年的远古巨龙，掌握多种元素之力',
      enemyType: 'boss',
      race: '龙族',
      faction: '中立',
      dangerLevel: 8,
      battlerResource: 'ancient-dragon',
      attributes: {
        level: 30,
        hp: 15000,
        mp: 500,
        attack: 150,
        defense: 100,
        magicAttack: 180,
        magicDefense: 120,
        speed: 40,
        critRate: 0.2,
        critDamage: 2.0,
        elements: { 火: 100, 冰: 100, 雷: 100, 风: 100 },
      },
      useTemplateGrowth: false,
      dangerScore: 1500,
      skills: [
        { skillId: 'skill-dragon-claw', slot: 'normal' },
        { skillId: 'skill-dragon-breath', slot: 'active', unlockCondition: 'always' },
        { skillId: 'skill-dragon-multi-element', slot: 'active', unlockCondition: 'turn>=2' },
        { skillId: 'skill-dragon-armor', slot: 'active', unlockCondition: 'hp<70%' },
        { skillId: 'skill-dragon-cataclysm', slot: 'special', unlockCondition: 'hp<25%' },
      ],
      normalAttack: 'skill-dragon-claw',
      activeSkills: ['skill-dragon-breath', 'skill-dragon-multi-element', 'skill-dragon-armor'],
      specialSkills: ['skill-dragon-cataclysm'],
      ai: {
        behaviorTree: { type: 'selector', children: [] },
        priorityTargets: ['healer', 'mage', 'physical-dps'],
        skillUsage: [
          { skillId: 'skill-dragon-breath', condition: 'targetCount>=2', probability: 0.6 },
          { skillId: 'skill-dragon-multi-element', condition: 'turn>=2', probability: 0.4 },
          { skillId: 'skill-dragon-armor', condition: 'hp<70%', probability: 0.8 },
        ],
        behaviorPriority: [
          { action: 'skill', weight: 70 },
          { action: 'attack', weight: 25 },
          { action: 'defend', weight: 5, condition: 'hp<30%' },
        ],
        actionFrequency: 2.0,
        firstTurnPreference: 'skill',
        hpThresholdBehaviors: [
          { hpPercent: 70, action: 'skill', skillId: 'skill-dragon-armor' },
          { hpPercent: 50, action: 'skill', skillId: 'skill-dragon-multi-element' },
          { hpPercent: 25, action: 'skill', skillId: 'skill-dragon-cataclysm' },
        ],
        statusTriggerBehaviors: [
          { statusId: 'status-berserk', trigger: 'on_apply', action: 'skill' },
        ],
      },
      elementResistances: { 火: 100, 冰: 100, 雷: 100, 风: 100, 暗: 50, 光: 50 },
      statusResistances: { 中毒: 90, 灼烧: 90, 冰冻: 80, 眩晕: 70, 睡眠: 70, 石化: 60 },
      debuffRateMod: 0.3,
      immunity: ['眩晕', '冰冻', '石化', '恐惧', '沉默'],
      absorb: { 火: 50, 冰: 50, 雷: 50, 风: 50 },
      reflect: { 魔法: 25 },
      weaknesses: [],
      hitMod: 1.3,
      evasionMod: 0.8,
      drops: [
        { itemId: 'item-dragon-scale', dropRate: 100, amountMin: 5, amountMax: 10 },
        { itemId: 'item-dragon-heart', dropRate: 50 },
        { itemId: 'item-ancient-dragon-blood', dropRate: 30 },
        { itemId: 'item-dragon-egg', dropRate: 10 },
      ],
      goldMin: 2000,
      goldMax: 5000,
      expMin: 2000,
      expMax: 5000,
      firstKillReward: 'skill-dragon-wish',
      questDrops: [
        { questId: 'quest-dragon-slayer', itemId: 'item-dragon-scale', required: true },
      ],
      idleAnimation: 'idle-fly',
      attackAnimation: 'attack-claw',
      damageAnimation: 'damage-roar',
      deathAnimation: 'death-explode',
      soundEffects: {
        attack: 'dragon_roar',
        hurt: 'dragon_pain',
        death: 'dragon_crash',
        skill: 'dragon_magic',
      },
      battleLogName: '古代龙兽',
      phaseShift: [
        { phaseNumber: 2, triggerCondition: 'hp<70%', addStates: ['status-dragon-aura'], removeStates: [], statModifiers: { magicAttack: 30, speed: 10 } },
        { phaseNumber: 3, triggerCondition: 'hp<40%', addStates: ['status-dragon-enraged'], removeStates: ['status-dragon-aura'], statModifiers: { attack: 40, magicAttack: 40, defense: -20 } },
      ],
      shieldLayers: 5,
      enragedCondition: 'hp<40%',
      summonBehavior: {
        summonEnemyId: 'enemy-dragon-spawn',
        summonCount: 2,
        summonCondition: 'onPhaseChange',
        maxSummons: 4,
      },
      phaseStateChanges: [
        { phase: 2, addStatus: ['status-dragon-aura'], removeStatus: [] },
        { phase: 3, addStatus: ['status-dragon-enraged'], removeStatus: ['status-dragon-aura'] },
      ],
      specialEventFlags: ['legendary-battle', 'dragon-defeat-achievement'],
    },
  ],
  enemyGroups: [
    {
      id: 'encounter-slime-group',
      name: '史莱姆群',
      encounterType: 'normal',
      description: '在森林中遭遇的史莱姆群，适合新手练习',
      recommendedLevel: 1,
      dangerLevel: 1,
      members: [
        { enemyId: 'enemy-slime', x: 2, y: 1, isBoss: false },
        { enemyId: 'enemy-slime', x: 3, y: 2, isBoss: false },
        { enemyId: 'enemy-slime', x: 4, y: 1, isBoss: false },
      ],
      waves: [],
      reinforcements: [],
      events: [],
      victoryConditions: [
        { id: 'vc-1', type: 'defeatAll', description: '击败所有史莱姆', params: {}, isWin: true },
      ],
      defeatConditions: [
        { id: 'dc-1', type: 'allyDeath', description: '任意队友死亡' },
      ],
    },
    {
      id: 'encounter-goblin-elite',
      name: '哥布林战士遭遇',
      encounterType: 'elite',
      description: '哥布林战士带领的巡逻队，比普通史莱姆更具威胁',
      recommendedLevel: 3,
      dangerLevel: 2,
      members: [
        { enemyId: 'enemy-goblin-warrior', x: 3, y: 1, isBoss: false },
        { enemyId: 'enemy-slime', x: 2, y: 2, isBoss: false },
        { enemyId: 'enemy-slime', x: 4, y: 2, isBoss: false },
      ],
      waves: [],
      reinforcements: [],
      events: [],
      victoryConditions: [
        { id: 'vc-2', type: 'defeatAll', description: '击败所有敌人', params: {}, isWin: true },
      ],
      defeatConditions: [
        { id: 'dc-2', type: 'allyDeath', description: '任意队友死亡' },
      ],
    },
    {
      id: 'encounter-black-knight-boss',
      name: '黑甲骑士伏击',
      encounterType: 'boss',
      description: '黑甲骑士带领的伏击战，需要小心应对',
      recommendedLevel: 5,
      dangerLevel: 3,
      members: [
        { enemyId: 'enemy-black-armor-knight', x: 3, y: 0, isBoss: true },
        { enemyId: 'enemy-goblin-warrior', x: 1, y: 1, isBoss: false },
        { enemyId: 'enemy-goblin-warrior', x: 5, y: 1, isBoss: false },
      ],
      waves: [],
      reinforcements: [],
      events: [],
      victoryConditions: [
        { id: 'vc-3', type: 'defeatBoss', description: '击败黑甲骑士', params: {}, isWin: true },
      ],
      defeatConditions: [
        { id: 'dc-3', type: 'allyDeath', description: '任意队友死亡' },
      ],
    },
    {
      id: 'encounter-ancient-dragon',
      name: '古代龙兽讨伐',
      encounterType: 'boss',
      description: '强大的古代龙兽，需要完整的团队配合才能击败',
      recommendedLevel: 10,
      dangerLevel: 5,
      members: [
        { enemyId: 'enemy-ancient-dragon', x: 3, y: 0, isBoss: true },
      ],
      waves: [
        {
          waveNumber: 1,
          spawns: [
            { enemyId: 'enemy-goblin-warrior', x: 1, y: 2, isBoss: false },
            { enemyId: 'enemy-goblin-warrior', x: 5, y: 2, isBoss: false },
          ],
          triggerCondition: 'turn >= 3',
          description: '第二波增援',
        },
      ],
      reinforcements: [],
      events: [],
      victoryConditions: [
        { id: 'vc-4', type: 'defeatBoss', description: '击败古代龙兽', params: {}, isWin: true },
        { id: 'vc-4b', type: 'surviveTurns', value: 5, description: '存活5回合', params: {}, isWin: true },
      ],
      defeatConditions: [
        { id: 'dc-4', type: 'allyDeath', description: '任意队友死亡' },
      ],
      defaultRewardOverride: {
        goldMin: 500,
        goldMax: 1000,
        expMin: 200,
        expMax: 500,
        items: [],
      },
    },
  ],
  battleMaps: [],
  simulations: [],
  analysis: [],
};

const sanitizeProjectData = (project: ProjectData): ProjectData => {
  const rawStatuses = [...project.statuses] as unknown[];
  const promotedSkills = rawStatuses.filter((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const record = entry as Record<string, unknown>;
    return Array.isArray(record.effectBlocks) && typeof record.targetType === 'string';
  });

  const normalizedStatuses = rawStatuses.filter((entry) => !promotedSkills.includes(entry));
  const mergedSkills = [...project.skills];

  promotedSkills.forEach((entry) => {
    const skill = entry as Skill;
    if (!mergedSkills.some((existing) => existing.id === skill.id)) {
      mergedSkills.push(skill);
    }
  });

  return {
    ...project,
    skills: mergedSkills,
    statuses: normalizedStatuses as Status[],
  };
};

export const createDefaultProject = (): ProjectData => sanitizeProjectData(JSON.parse(JSON.stringify(defaultProject)));

export const useProjectStore = create<ProjectStore>((set) => ({
  project: createDefaultProject(),
  isDirty: false,
  
  setProjectName: (name) => set((state) => ({ 
    project: { ...state.project, name }, 
    isDirty: true 
  })),
  
  updateRules: (rules) => set((state) => ({
    project: { ...state.project, rules: { ...state.project.rules, ...rules } },
    isDirty: true,
  })),
  
  addCharacter: (character) => set((state) => ({
    project: { ...state.project, characters: [...state.project.characters, character] },
    isDirty: true,
  })),
  
  updateCharacter: (id, data) => set((state) => ({
    project: { 
      ...state.project, 
      characters: state.project.characters.map(c => c.id === id ? { ...c, ...data } : c) 
    },
    isDirty: true,
  })),
  
  deleteCharacter: (id) => set((state) => ({
    project: { ...state.project, characters: state.project.characters.filter(c => c.id !== id) },
    isDirty: true,
  })),
  
  addJob: (job) => set((state) => ({
    project: { ...state.project, jobs: [...state.project.jobs, job] },
    isDirty: true,
  })),
  
  updateJob: (id, data) => set((state) => ({
    project: { 
      ...state.project, 
      jobs: state.project.jobs.map(j => j.id === id ? { ...j, ...data } : j) 
    },
    isDirty: true,
  })),
  
  deleteJob: (id) => set((state) => ({
    project: { ...state.project, jobs: state.project.jobs.filter(j => j.id !== id) },
    isDirty: true,
  })),
  
  addSkill: (skill) => set((state) => ({
    project: { ...state.project, skills: [...state.project.skills, skill] },
    isDirty: true,
  })),
  
  updateSkill: (id, data) => set((state) => ({
    project: { 
      ...state.project, 
      skills: state.project.skills.map(s => s.id === id ? { ...s, ...data } : s) 
    },
    isDirty: true,
  })),
  
  deleteSkill: (id) => set((state) => ({
    project: { ...state.project, skills: state.project.skills.filter(s => s.id !== id) },
    isDirty: true,
  })),
  
  addStatus: (status) => set((state) => ({
    project: { ...state.project, statuses: [...state.project.statuses, status] },
    isDirty: true,
  })),
  
  updateStatus: (id, data) => set((state) => ({
    project: { 
      ...state.project, 
      statuses: state.project.statuses.map(s => s.id === id ? { ...s, ...data } : s) 
    },
    isDirty: true,
  })),
  
  deleteStatus: (id) => set((state) => ({
    project: { ...state.project, statuses: state.project.statuses.filter(s => s.id !== id) },
    isDirty: true,
  })),
  
  addEquipment: (equipment) => set((state) => ({
    project: { ...state.project, equipment: [...state.project.equipment, equipment] },
    isDirty: true,
  })),
  
  updateEquipment: (id, data) => set((state) => ({
    project: { 
      ...state.project, 
      equipment: state.project.equipment.map(e => e.id === id ? { ...e, ...data } : e) 
    },
    isDirty: true,
  })),
  
  deleteEquipment: (id) => set((state) => ({
    project: { ...state.project, equipment: state.project.equipment.filter(e => e.id !== id) },
    isDirty: true,
  })),
  
  addItem: (item) => set((state) => ({
    project: { ...state.project, items: [...state.project.items, item] },
    isDirty: true,
  })),
  
  updateItem: (id, data) => set((state) => ({
    project: { 
      ...state.project, 
      items: state.project.items.map(i => i.id === id ? { ...i, ...data } : i) 
    },
    isDirty: true,
  })),
  
  deleteItem: (id) => set((state) => ({
    project: { ...state.project, items: state.project.items.filter(i => i.id !== id) },
    isDirty: true,
  })),
  
  addEnemy: (enemy) => set((state) => ({
    project: { ...state.project, enemies: [...state.project.enemies, enemy] },
    isDirty: true,
  })),
  
  updateEnemy: (id, data) => set((state) => ({
    project: { 
      ...state.project, 
      enemies: state.project.enemies.map(e => e.id === id ? { ...e, ...data } : e) 
    },
    isDirty: true,
  })),
  
  deleteEnemy: (id) => set((state) => ({
    project: { ...state.project, enemies: state.project.enemies.filter(e => e.id !== id) },
    isDirty: true,
  })),
  
  addEnemyGroup: (group) => set((state) => ({
    project: { ...state.project, enemyGroups: [...state.project.enemyGroups, group] },
    isDirty: true,
  })),
  
  updateEnemyGroup: (id, data) => set((state) => ({
    project: { 
      ...state.project, 
      enemyGroups: state.project.enemyGroups.map(g => g.id === id ? { ...g, ...data } : g) 
    },
    isDirty: true,
  })),
  
  deleteEnemyGroup: (id) => set((state) => ({
    project: { ...state.project, enemyGroups: state.project.enemyGroups.filter(g => g.id !== id) },
    isDirty: true,
  })),
  
  addBattleMap: (map) => set((state) => ({
    project: { ...state.project, battleMaps: [...state.project.battleMaps, map] },
    isDirty: true,
  })),
  
  updateBattleMap: (id, data) => set((state) => ({
    project: { 
      ...state.project, 
      battleMaps: state.project.battleMaps.map(m => m.id === id ? { ...m, ...data } : m) 
    },
    isDirty: true,
  })),
  
  deleteBattleMap: (id) => set((state) => ({
    project: { ...state.project, battleMaps: state.project.battleMaps.filter(m => m.id !== id) },
    isDirty: true,
  })),
  
  addSimulation: (sim) => set((state) => ({
    project: { ...state.project, simulations: [...state.project.simulations, sim] },
    isDirty: true,
  })),
  
  updateSimulation: (id, data) => set((state) => ({
    project: { 
      ...state.project, 
      simulations: state.project.simulations.map(s => s.id === id ? { ...s, ...data } : s) 
    },
    isDirty: true,
  })),
  
  deleteSimulation: (id) => set((state) => ({
    project: { ...state.project, simulations: state.project.simulations.filter(s => s.id !== id) },
    isDirty: true,
  })),
  
  // Prebattle state initialization
  prebattleConfig: {
    selectedGroupId: null,
    party: [],
    formation: [],
    resources: {},
    items: [],
  },
  
  // Prebattle actions
  setPrebattleSelectedGroup: (groupId) => set((state) => ({
    prebattleConfig: { ...state.prebattleConfig, selectedGroupId: groupId },
  })),
  
  setPrebattleParty: (party) => set((state) => ({
    prebattleConfig: { ...state.prebattleConfig, party },
  })),
  
  setPrebattleFormation: (formation) => set((state) => ({
    prebattleConfig: { ...state.prebattleConfig, formation },
  })),
  
  setPrebattleResources: (resources) => set((state) => ({
    prebattleConfig: { ...state.prebattleConfig, resources },
  })),
  
  setPrebattleItems: (items) => set((state) => ({
    prebattleConfig: { ...state.prebattleConfig, items },
  })),
  
  addPrebattlePartyMember: (characterId) => set((state) => {
    if (state.prebattleConfig.party.includes(characterId)) return state;
    return {
      prebattleConfig: {
        ...state.prebattleConfig,
        party: [...state.prebattleConfig.party, characterId],
      },
    };
  }),
  
  removePrebattlePartyMember: (characterId) => set((state) => ({
    prebattleConfig: {
      ...state.prebattleConfig,
      party: state.prebattleConfig.party.filter(id => id !== characterId),
      formation: state.prebattleConfig.formation.filter(f => f.characterId !== characterId),
    },
  })),
  
  setPrebattleFormationPosition: (characterId, x, y) => set((state) => {
    // Check if position is occupied by another character
    const existing = state.prebattleConfig.formation.find(
      f => f.x === x && f.y === y && f.characterId !== characterId
    );
    if (existing) return state;
    
    // Remove old position and add new
    const newFormation = state.prebattleConfig.formation.filter(
      f => f.characterId !== characterId
    );
    newFormation.push({ characterId, x, y });
    
    return {
      prebattleConfig: {
        ...state.prebattleConfig,
        formation: newFormation,
      },
    };
  }),
  
  validatePrebattleConfig: () => {
    // This will be implemented with access to state
    return [];
  },
  
  // BattleTest actions
  saveBattleTestConfig: (groupId, config) => set((state) => ({
    project: {
      ...state.project,
      enemyGroups: state.project.enemyGroups.map(g =>
        g.id === groupId ? { ...g, battleTestConfig: config } : g
      ),
    },
    isDirty: true,
  })),
  
  getBattleTestConfig: (groupId) => {
    // Use getState() to access current state
    return null;
  },
  
  setDirty: (dirty) => set({ isDirty: dirty }),

  replaceProject: (project, options) => set({
    project: sanitizeProjectData(JSON.parse(JSON.stringify(project))),
    isDirty: options?.markDirty ?? false,
  }),

  resetProject: () => set({
    project: createDefaultProject(),
    isDirty: false,
  }),
}));
