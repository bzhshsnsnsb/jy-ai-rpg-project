// Core Type Definitions for RPG Balance Studio

// ============================================
// PROJECT RULES TYPES
// ============================================

export interface CustomAttribute {
  id: string;
  name: string;
  type: 'number' | 'percentage' | 'boolean' | 'text';
  min?: number;
  max?: number;
  defaultValue: number | boolean | string;
  unit?: string;
  description?: string;
  showInInspector: boolean;
}

export interface TurnModel {
  type: 'turn-based' | 'atb' | 'action-point' | 'phase-based';
  timePerTurn: number;
  speedCalculation: string;
  atbGaugeMax: number;
  actionPointPerTurn: number;
  tickInterval: number;
  phases: TurnPhase[];
  reactions?: Record<string, { enabled: boolean; chance?: number; value?: number }>;
  phaseHooks?: TurnPhaseHook[];
}

export interface TurnPhaseHook {
  id: string;
  enabled: boolean;
  handlers: string[];
}

export interface TurnPhase {
  id: string;
  name: string;
  order: number;
  duration?: number;
}

export interface ResourceModel {
  resources: ResourceDefinition[];
}

export interface ResourceDefinition {
  id: string;
  name: string;
  type: 'hp' | 'mp' | 'energy' | 'rage' | 'custom';
  maxFormula: string;
  regenFormula?: string;
  canOverflow: boolean;
  canUnderflow: boolean;
  visualConfig: ResourceVisualConfig;
  consumptionRules?: Record<string, { enabled: boolean; value?: number }>;
}

export interface ResourceVisualConfig {
  barColor: string;
  barWidth: number;
  showText: boolean;
  textFormat: 'current/max' | 'current%' | 'raw';
  showInBattle?: boolean;
  keepAfterBattle?: boolean;
}

export interface GridModel {
  width: number;
  height: number;
  cellSize: number;
  shape: 'square' | 'hex' | 'diamond';
  zones: GridZone[];
}

export interface GridZone {
  id: string;
  name: string;
  type: 'spawn-ally' | 'spawn-enemy' | 'hazard' | 'buff' | 'neutral';
  cells: { x: number; y: number }[];
}

export interface DamageFormula {
  id: string;
  name: string;
  formula: string;
  description?: string;
  branches: FormulaBranch[];
}

export interface FormulaBranch {
  condition: string;
  formula: string;
  weight?: number;
}

export interface ElementType {
  id: string;
  name: string;
  color: string;
  icon?: string;
  resistances: ElementResistance[];
}

export interface ElementResistance {
  elementId: string;
  multiplier: number;
}

export interface VictoryCondition {
  id: string;
  type: 'defeat-all' | 'survive' | 'capture' | 'defeat-boss' | 'custom' | 'defeatAll' | 'defeatBoss' | 'surviveTurns' | 'escort' | 'protect';
  description: string;
  params: Record<string, unknown>;
  isWin: boolean;
  target?: string;
  value?: number;
}

// Character faction/category for grouping
export type CharacterCategory = 'player' | 'enemy-controlled' | 'npc-battle' | 'test' | 'boss';

// Individual character trait (similar to JobTrait but for character-specific)
export interface CharacterTrait {
  id: string;
  name: string;
  traitType: 'stat-bonus' | 'element-resistance' | 'status-resistance' | 'resource-modifier' | 'hit-dodge-crit' | 'special';
  value: Record<string, number>;
  description?: string;
}

// Character level configuration
export interface CharacterLevelConfig {
  initial: number;
  max: number;
  inheritJobGrowth: boolean;
  overrideGrowth: boolean;
  growthOffsets?: Record<string, number>;
}

// Initial equipment for character
export interface CharacterInitialEquipment {
  weapon?: string;
  armor?: string;
  accessory1?: string;
  accessory2?: string;
  locked: boolean;
  exclusiveEquipment?: string[];
}

// Combat performance settings
export interface CombatPerformance {
  idleAnim?: string;
  attackAnim?: string;
  hitAnim?: string;
  voice?: string;
  battleLogName?: string;
}

// Skill configuration for character
export interface CharacterSkillConfig {
  initialSkills: string[];
  exclusiveSkills: string[];
  disabledSkills: string[];
  skillReplacements?: { from: string; to: string }[];
  defaultSkillBar?: string[];
}

// Character Resource configuration
export interface CharacterResourceConfig {
  initialHp: number;
  initialMp: number;
  individualOffsets?: Record<string, number>;
  inheritJobGrowth: boolean;
}

// Character Element/Resistance preferences
export interface CharacterElementConfig {
  elementPreference?: string[];
  resistancePreference?: Record<string, number>;
}

// Character trait/passive configuration
export interface CharacterTraitConfig {
  individualTraits: CharacterTrait[];
  passiveTalents: string[];
  resourceEfficiencyOffsets?: Record<string, number>;
}

// ============================================
// CHARACTER TYPES
// ============================================

export interface Character {
  id: string;
  identity: CharacterIdentity;
  // Job binding - references a Job
  jobId?: string;
  // Category for grouping in database tree
  category?: CharacterCategory;
  // Level configuration
  levelConfig?: CharacterLevelConfig;
  // Initial attributes
  initialAttributes?: CharacterResourceConfig;
  // Skills configuration
  skillConfig?: CharacterSkillConfig;
  // Equipment configuration
  initialEquipment?: CharacterInitialEquipment;
  // Individual traits
  traitConfig?: CharacterTraitConfig;
  // Combat performance
  combatPerformance?: CombatPerformance;
  // Legacy fields (kept for compatibility)
  attributes: CharacterAttributes;
  actions: CharacterActions;
  skills: CharacterSkills;
  equipment: CharacterEquipment;
  resistances: CharacterResistances;
  growthUnlocks: GrowthUnlocks;
}

export interface CharacterIdentity {
  name: string;
  description?: string;
  modelId?: string;
  faction: string;
  rarity: number;
  tags: string[];
}

export interface CharacterAttributes {
  baseStats: Record<string, number>;
  growthRates: Record<string, number>;
  levelFormula: string;
}

export interface CharacterActions {
  normalAttack: ActionConfig;
  chaseAttack: ActionConfig;
  coordinatedAttack: ActionConfig;
  defend: ActionConfig;
}

export interface ActionConfig {
  enabled: boolean;
  formulaId?: string;
  params?: Record<string, unknown>;
}

export interface CharacterSkills {
  skillSlots: SkillSlot[];
  skillLevels: Record<string, number>;
}

export interface SkillSlot {
  id: string;
  slotType: 'active' | 'passive' | 'ultimate';
  skillId?: string;
  unlocked: boolean;
  unlockLevel?: number;
}

export interface CharacterEquipment {
  defaultEquipment: Record<string, string>;
  equipmentRestrictions: Record<string, string[]>;
}

export interface CharacterResistances {
  statusResistances: Record<string, number>;
  damageReduction: Record<string, number>;
  elementReduction: Record<string, number>;
}

export interface GrowthUnlocks {
  breakthroughs: Breakthrough[];
  awakenings: Awakening[];
  exclusiveWeapons: ExclusiveWeapon[];
}

export interface Breakthrough {
  level: number;
  statBoosts: Record<string, number>;
  requiredItems: string[];
}

export interface Awakening {
  tier: number;
  unlockedSkills: string[];
  statBoosts: Record<string, number>;
}

export interface ExclusiveWeapon {
  id: string;
  name: string;
  bonuses: Record<string, number>;
  requiredAwakening: number;
}

// ============================================
// JOB/PROFESSION TYPES
// ============================================

// Job type categories
export type JobType = 'warrior' | 'mage' | 'priest' | 'assassin' | 'tank' | 'support' | 'special';

// Job role/archetype
export type JobRole = 'damage' | 'tank' | 'healer' | 'support' | 'control' | 'hybrid';

// Experience curve formula
export interface ExperienceCurve {
  baseValue: number;      // Base experience required
  extraValue: number;     // Extra experience per level
  accelerationA: number; // Quadratic coefficient
  accelerationB: number;  // Cubic coefficient
}

// Growth type for curve generation
export type GrowthType = 'early' | 'balanced' | 'late';

// Job growth configuration
export interface JobGrowth {
  statGrowth: Record<string, number[]>;
  levelCap: number;
  experienceCurve?: ExperienceCurve;
  growthType?: GrowthType;
}

// Learnable skill entry
export interface LearnableSkill {
  id: string;
  skillId: string;
  learnLevel: number;
  replaceSkillId?: string;
  branch?: string;
  notes?: string;
}

// Job trait/passive types
export type JobTraitType = 
  | 'additional-skill-type'
  | 'stat-bonus'
  | 'element-resistance'
  | 'status-resistance'
  | 'resource-modifier'
  | 'hit-dodge-crit'
  | 'special';

// Job trait
export interface JobTrait {
  id: string;
  name: string;
  traitType: JobTraitType;
  value: Record<string, number>;
  description?: string;
}

// Equipment permissions
export interface EquipmentPermission {
  weaponTypes: string[];
  armorTypes: string[];
  accessoryTypes: string[];
  preferredSlots?: string[];
  exclusiveWeapons?: string[];
  forbiddenTypes?: string[];
}

// Extended Job interface
export interface Job {
  id: string;
  name: string;
  jobType: JobType;
  role: JobRole;
  description?: string;
  defaultWeaponTendency?: string;
  defaultPositionTendency?: string;
  /** 职业 1 级基准属性，用于个体属性展示与 AI 生成/调整基准 */
  baseStats?: Record<string, number>;
  growth: JobGrowth;
  learnableSkills: LearnableSkill[];
  traits: JobTrait[];
  equipmentPermissions: EquipmentPermission;
  tree: JobTreeNode[];
  passives: JobPassive[];
  weaponAdaptations: WeaponAdaptation[];
  synergies: SynergyEffect[];
}

export interface JobTreeNode {
  id: string;
  jobId: string;
  parentId?: string;
  level: number;
  requiredJobLevel: number;
  requiredItems: string[];
  unlockedSkills: string[];
}

export interface JobPassive {
  id: string;
  name: string;
  description: string;
  effect: string;
  levelRequirement: number;
}

export interface WeaponAdaptation {
  weaponType: string;
  damageBonus: number;
  attackSpeedBonus: number;
  specialBonus?: string;
}

export interface SynergyEffect {
  id: string;
  name: string;
  targetJob: string;
  effect: string;
  stackLimit: number;
}

// ============================================
// SKILL TYPES
// ============================================

// Skill categories
export type SkillCategory = 'normal' | 'active' | 'passive' | 'ultimate' | 'support' | 'control' | 'special';

// Target conditions
export interface TargetCondition {
  condition: 'alive' | 'dead' | 'any' | 'position' | 'status';
  position?: { min?: number; max?: number; include?: string[]; exclude?: string[] };
  statusId?: string;
}

// Skill display config
export interface SkillDisplay {
  icon?: string;
  priority?: number;
  showInBar?: boolean;
  animation?: string;
  soundEffect?: string;
}

// Skill requirement
export interface SkillRequirement {
  weaponType?: string;
  classRequirement?: string;
  positionRequirement?: string;
  statusRequirement?: string;
  resourceThreshold?: { type: string; min?: number; max?: number };
  comboCondition?: string;
  reactionCondition?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  type: 'active' | 'passive' | 'ultimate';
  // Basic info
  icon?: string;
  scenario?: string[];
  upgradable?: boolean;
  showInBar?: boolean;
  // Target config
  targetType: 'single' | 'aoe' | 'self' | 'ally' | 'enemy' | 'mixed';
  targetCamp?: 'enemy' | 'ally' | 'both' | 'self';
  targetCount?: number;
  targetConditions?: TargetCondition[];
  targetPosition?: { range?: number; shape?: 'circle' | 'line' | 'cone' | 'cross' };
  requireTargetSelection?: boolean;
  // Cost & activation
  cost: SkillCost;
  cooldown?: number;
  charge?: number;
  speedModifier?: number;
  successRate?: number;
  repeat?: number;
  resourceGain?: { type: string; amount: number };
  // Hit type
  hitType?: 'certain' | 'physical' | 'magic';
  // Damage config
  damageType?: 'physical' | 'magic' | 'true' | 'heal';
  formulaId?: string;
  element?: string;
  variance?: number;
  critEnabled?: boolean;
  trueDamagePenetration?: boolean;
  damageRange?: { min?: number; max?: number };
  // Effect blocks
  effectBlocks: EffectBlock[];
  // Requirements
  requirements?: SkillRequirement;
  // Animation & presentation
  animation?: string;
  soundEffect?: string;
  battleLogTemplate?: string;
  hitEffect?: string;
  missEffect?: string;
}

export interface SkillCost {
  resourceType: string;
  amount: number;
  formula?: string;
}

export interface EffectBlock {
  id: string;
  type: EffectType;
  params: Record<string, unknown>;
  condition?: string;
  subEffects?: EffectBlock[];
}

export type EffectType =
  | 'damage'
  | 'heal'
  | 'status'
  | 'displacement'
  | 'summon'
  | 'chase'
  | 'action-gauge'
  | 'terrain'
  | 'buff'
  | 'debuff'
  | 'transform'
  | 'teleport';

// ============================================
// STATUS/EFFECT TYPES
// ============================================

export interface Status {
  id: string;
  name: string;
  description: string;
  category: 'buff' | 'debuff' | 'neutral' | 'control' | 'dot' | 'hot' | 'shield' | 'mark' | 'special';
  restriction: 'none' | 'attack-enemy' | 'attack-any' | 'attack-ally' | 'cannot-act';
  duration: StatusDuration;
  stacking: StackingConfig;
  dispel: DispelConfig;
  conflict: ConflictRule;
  triggers: TriggerConfig[];
  display: StatusDisplay;
}

export interface StatusDuration {
  type: 'rounds' | 'turns' | 'permanent' | 'instant' | 'custom';
  value: number;
  canRefresh: boolean;
}

export interface StackingConfig {
  type: 'none' | 'intensity' | 'duration' | 'both';
  maxStacks: number;
  stackMultiplier: number;
}

export interface DispelConfig {
  priority: number;
  canDispel: boolean;
  dispelType: 'any' | 'positive' | 'negative' | 'none';
  dispelResistance?: number;
  removeOnBattleEnd: boolean;
  removeOnStatusOverride: boolean;
  removeOnActionEnd: boolean;
  removeOnTurnEnd: boolean;
  removeOnDamage: { enabled: boolean; probability: number };
  removeOnMapStep: { enabled: boolean; steps: number };
}

export interface ConflictRule {
  type: 'replace' | 'stack' | 'block' | 'none';
  conflictingStatuses: string[];
  overrideStatuses: string[];
  upgradeStatuses: { target: string; condition: string }[];
  convertStatuses: { target: string; trigger: string }[];
  chainReactions: { triggerStatus: string; effect: string }[];
}

export interface TriggerConfig {
  event: 'on-apply' | 'on-remove' | 'on-turn-start' | 'on-turn-end' | 'on-action-start' | 'on-action-end' | 'on-damaged' | 'on-kill' | 'custom';
  condition?: string;
  effect: string;
  probability?: number;
}

export interface StatusDisplay {
  icon?: string;
  priority: number;
  showDuration: boolean;
  color?: string;
}

// ============================================
// ENEMY TYPES
// ============================================

// Enemy type categories
export type EnemyType = 'normal' | 'elite' | 'boss' | 'summon' | 'test';

// Enemy category for tree display
export type EnemyCategory = 'minion' | 'elite' | 'boss' | 'summon' | 'test';

export interface Enemy {
  id: string;
  name: string;
  description?: string;
  // 基础信息
  enemyType: EnemyType;
  race?: string;
  faction?: string;
  dangerLevel: number;
  battlerResource?: string; // 敌人图像资源
  // 属性与成长
  attributes: EnemyAttributes;
  useTemplateGrowth?: boolean;
  dangerScore?: number;
  // 技能与行为
  skills: EnemySkill[];
  normalAttack?: string;
  activeSkills?: string[];
  specialSkills?: string[];
  ai: EnemyAI;
  // Traits / 抗性
  elementResistances: Record<string, number>; // 元素抗性 -100~200
  statusResistances: Record<string, number>; // 状态抗性
  debuffRateMod: number;
  immunity: string[];
  absorb: Record<string, number>; // 吸收
  reflect: Record<string, number>; // 反弹
  weaknesses: string[]; // 弱点
  hitMod: number;
  evasionMod: number;
  // 掉落与奖励
  drops: EnemyDrop[];
  goldMin: number;
  goldMax: number;
  expMin: number;
  expMax: number;
  firstKillReward?: string;
  questDrops: QuestDrop[];
  // 战斗表现
  idleAnimation?: string;
  attackAnimation?: string;
  damageAnimation?: string;
  deathAnimation?: string;
  soundEffects?: EnemySoundEffects;
  battleLogName?: string;
  // 特殊机制
  phaseShift?: PhaseShift[];
  shieldLayers?: number;
  enragedCondition?: string;
  summonBehavior?: SummonBehavior;
  phaseStateChanges?: PhaseStateChange[];
  specialEventFlags?: string[];
}

export interface EnemyAttributes {
  level: number;
  hp: number;
  mp?: number;
  attack: number;
  defense: number;
  magicAttack?: number;
  magicDefense?: number;
  speed: number;
  critRate?: number;
  critDamage?: number;
  elements: Record<string, number>;
}

export interface EnemySkill {
  skillId: string;
  slot: 'normal' | 'active' | 'special';
  unlockCondition?: string;
}

export interface EnemyAI {
  behaviorTree: BehaviorNode;
  priorityTargets: string[];
  skillUsage: AISkillUsage[];
  // 行为优先级
  behaviorPriority: BehaviorPriority[];
  // 行动频率
  actionFrequency?: number;
  // 首回合偏好
  firstTurnPreference?: 'attack' | 'defend' | 'skill' | 'wait';
  // 血量阈值行为
  hpThresholdBehaviors?: HPThresholdBehavior[];
  // 状态触发行为
  statusTriggerBehaviors?: StatusTriggerBehavior[];
}

export interface BehaviorPriority {
  action: 'attack' | 'skill' | 'defend' | 'item' | 'wait';
  weight: number;
  condition?: string;
}

export interface HPThresholdBehavior {
  hpPercent: number;
  action: string;
  skillId?: string;
}

export interface StatusTriggerBehavior {
  statusId: string;
  trigger: 'on_apply' | 'on_remove' | 'on_turn_start' | 'on_turn_end';
  action: string;
}

export interface BehaviorNode {
  type: 'action' | 'condition' | 'sequence' | 'selector' | 'parallel';
  children?: BehaviorNode[];
  params?: Record<string, unknown>;
}

export interface AISkillUsage {
  skillId: string;
  condition: string;
  probability: number;
}

export interface EnemyDrop {
  itemId: string;
  dropRate: number; // 0-100
  amountMin?: number;
  amountMax?: number;
}

export interface QuestDrop {
  questId: string;
  itemId: string;
  required: boolean;
}

export interface EnemySoundEffects {
  attack?: string;
  hurt?: string;
  death?: string;
  skill?: string;
}

export interface PhaseShift {
  phaseNumber: number;
  triggerCondition: string; // HP百分比等
  addStates?: string[];
  removeStates?: string[];
  statModifiers?: Partial<EnemyAttributes>;
}

export interface SummonBehavior {
  summonEnemyId: string;
  summonCount: number;
  summonCondition: string;
  maxSummons?: number;
}

export interface PhaseStateChange {
  phase: number;
  addStatus: string[];
  removeStatus: string[];
}

export type EncounterType = 'normal' | 'elite' | 'boss' | 'tutorial' | 'test';

export interface EnemyGroup {
  id: string;
  name: string;
  // 基础信息
  encounterType: EncounterType;
  description?: string;
  background?: string;
  groundTexture?: string;
  recommendedLevel: number;
  dangerLevel: number;
  // 敌人摆放
  members: GroupMember[];
  // 波次与增援
  waves: WaveConfig[];
  reinforcements: Reinforcement[];
  // 战斗事件
  events: BattleEvent[];
  // 胜负条件与奖励
  victoryConditions: VictoryCondition[];
  defeatConditions: DefeatCondition[];
  defaultRewardOverride?: RewardOverride;
  firstClearReward?: FirstClearReward;
  // Battle Test
  battleTestConfig?: BattleTestConfig;
}

export interface GroupMember {
  enemyId: string;
  x: number;
  y: number;
  isBoss: boolean;
  midBattleSpawn?: boolean;  // 半途出现
}

// Wave trigger types
export type WaveTriggerType = 'turnEnd' | 'turn' | 'enemyHp' | 'actorHp' | 'switch' | 'custom';

export interface WaveTriggerConfig {
  type: WaveTriggerType;
  targetId?: string;      // enemy or actor id (for enemyHp/actorHp)
  threshold?: number;     // HP percentage (0-100) for enemyHp/actorHp
  value?: number;         // turn number or switch value
  customCondition?: string; // fallback for custom type
}

export interface WaveConfig {
  waveNumber: number;
  spawns: GroupMember[];
  triggerCondition: string;      // Legacy: keep for backward compatibility
  triggerConfig?: WaveTriggerConfig;  // New: structured trigger
  description?: string;
}

export interface Reinforcement {
  enemyId: string;
  spawnPosition: { x: number; y: number };
  triggerCondition: string;
}

// Event trigger types
export type EventTriggerType = 'turnEnd' | 'turn' | 'enemyHp' | 'actorHp' | 'switch' | 'onDeath' | 'onSpawn' | 'custom';

export interface EventTriggerConfig {
  type: EventTriggerType;
  targetId?: string;        // enemy or actor id
  threshold?: number;       // HP percentage for enemyHp/actorHp
  value?: number;           // turn number or switch value
  customCondition?: string;  // fallback for custom type
}

// Event scope types
export type EventScopeType = 'battle' | 'turn' | 'moment';

export interface EventScopeConfig {
  scope: EventScopeType;
  turnNumber?: number;      // specific turn for 'turn' scope
  momentId?: string;        // specific moment for 'moment' scope
}

export interface BattleEvent {
  id: string;
  name?: string;
  type: 'dialogue' | 'cutscene' | 'environmental' | 'trigger' | 'reinforce' | 'transform' | 'forceAction' | 'background' | 'phase' | 'custom';
  triggerCondition: string;        // Legacy: keep for backward compatibility
  triggerConfig?: EventTriggerConfig;   // New: structured trigger
  span: 'battle' | 'turn' | 'moment';   // Legacy: keep for backward compatibility
  scopeConfig?: EventScopeConfig;       // New: structured scope
  content: Record<string, unknown>;
  enabled?: boolean;
}

export interface DefeatCondition {
  id: string;
  type: 'allyDeath' | 'bossDeath' | 'turnExceed' | 'custom';
  target?: string;
  value?: number;
  description?: string;
}

export interface RewardOverride {
  goldMin: number;
  goldMax: number;
  expMin: number;
  expMax: number;
  items: { itemId: string; amountMin: number; amountMax: number; rate: number }[];
}

export interface FirstClearReward {
  itemId?: string;
  skillId?: string;
  equipmentId?: string;
  message?: string;
}

export interface BattleTestConfig {
  allyTeam: BattleTestAlly[];
  initialResources?: { hp?: number; mp?: number };
  autoSave?: boolean;
}

export interface BattleTestAlly {
  characterId: string;
  name?: string;
  level: number;
  equipment?: { weapon?: string; armor?: string; accessory?: string };
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

// ============================================
// BATTLE MAP TYPES
// ============================================

export interface BattleMap {
  id: string;
  name: string;
  grid: GridModel;
  terrain: TerrainCell[];
  background?: string;
}

export interface TerrainCell {
  x: number;
  y: number;
  type: TerrainType;
  properties: Record<string, unknown>;
}

export type TerrainType = 'normal' | 'hazard' | 'buff' | 'obstacle' | 'water' | 'wall';

// ============================================
// SIMULATION TYPES
// ============================================

export interface SimulationConfig {
  id: string;
  name: string;
  allyTeam: TeamSetup;
  enemyTeam: TeamSetup;
  battleMap: string;
  seed?: number;
  mode: 'single' | 'batch' | 'replay';
  speed: 'realtime' | 'fast' | 'instant';
  autoAdvance: boolean;
}

export interface TeamSetup {
  formation: FormationSlot[];
  equipmentOverrides: Record<string, string[]>;
  itemConfig: Record<string, string[]>;
}

export interface FormationSlot {
  characterId: string;
  position: { x: number; y: number };
  level: number;
  equipment?: string[];
}

export interface SimulationResult {
  id: string;
  configId: string;
  seed: number;
  winner: 'ally' | 'enemy' | 'draw';
  turns: number;
  duration: number;
  events: TurnEvent[];
  damageDealt: DamageSummary;
  healingDone: number;
  statusApplications: Record<string, number>;
}

export interface TurnEvent {
  turn: number;
  round: number;
  actor: string;
  action: string;
  target: string;
  damage?: number;
  healing?: number;
  statusChanges?: string[];
}

export interface DamageSummary {
  byCharacter: Record<string, number>;
  byType: Record<string, number>;
  byElement: Record<string, number>;
}

// ============================================
// ANALYSIS TYPES
// ============================================

export interface AnalysisReport {
  id: string;
  name: string;
  generatedAt: Date;
  metrics: AnalysisMetrics;
}

export interface AnalysisMetrics {
  growthCurves: GrowthCurveData[];
  dpsHps: DPSHPSData[];
  actionEconomy: ActionEconomyData[];
  statusCoverage: StatusCoverageData[];
  synergyAnalysis: SynergyAnalysisData;
  difficultyAssessment: DifficultyData[];
  resourceEconomy: ResourceEconomyData[];
  anomalies: AnomalyData[];
}

export interface GrowthCurveData {
  characterId: string;
  stat: string;
  points: { level: number; value: number }[];
}

export interface DPSHPSData {
  characterId: string;
  dps: number;
  hps: number;
  burstPotential: number;
  sustainedPotential: number;
}

export interface ActionEconomyData {
  characterId: string;
  actionsPerTurn: number;
  skillEfficiency: number;
  resourceEfficiency: number;
}

export interface StatusCoverageData {
  statusId: string;
  applicationRate: number;
  duration: number;
  dispelRate: number;
}

export interface SynergyAnalysisData {
  teamComposition: string[];
  synergies: SynergyPair[];
  overallScore: number;
}

export interface SynergyPair {
  characterIds: string[];
  synergyType: string;
  effectiveness: number;
}

export interface DifficultyData {
  enemyGroupId: string;
  estimatedDifficulty: number;
  requiredPower: number;
  recommendedLevels: number[];
}

export interface ResourceEconomyData {
  resourceType: string;
  generation: number;
  consumption: number;
  balance: number;
}

export interface AnomalyData {
  type: 'overpowered' | 'underpowered' | 'broken' | 'useless';
  description: string;
  affectedEntities: string[];
  severity: number;
  suggestion?: string;
}

// ============================================
// EQUIPMENT TYPES
// ============================================

export type EquipmentCategory = 'weapon' | 'armor' | 'accessory' | 'exclusive' | 'test';
export type EquipmentRarity = 1 | 2 | 3 | 4 | 5 | 6;

// Equipment stats bonus
export interface EquipmentStats {
  hp?: number;
  mp?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  critRate?: number;
  critDamage?: number;
  magicAttack?: number;
  magicDefense?: number;
  customStats?: Record<string, number>;
}

// Equipment trait/passive
export interface EquipmentTrait {
  id: string;
  name: string;
  traitType: 'stat-bonus' | 'element-resistance' | 'status-resistance' | 'resource-modifier' | 'hit-dodge-crit' | 'skill-type' | 'special';
  value: Record<string, number>;
  description?: string;
}

// Equipment condition (who can equip)
export interface EquipmentCondition {
  allowedJobs?: string[];
  allowedCharacters?: string[];
  forbiddenJobs?: string[];
  forbiddenCharacters?: string[];
  allowedPositions?: ('front' | 'middle' | 'back')[];
  minLevel?: number;
  maxLevel?: number;
}

// Equipment economy info
export interface EquipmentEconomy {
  price?: number;
  sellPrice?: number;
  dropSources?: string[];
  shopAvailable?: boolean;
  craftSources?: { itemId: string; count: number }[];
  rarityTag?: string;
}

// Equipment combat presentation
export interface EquipmentCombatDisplay {
  icon?: string;
  soundEffect?: string;
  battleLogText?: string;
  appearanceOverride?: string;
}

// Complete Equipment definition
export interface Equipment {
  id: string;
  name: string;
  equipmentCategory: EquipmentCategory;
  equipmentType: string; // sword, dagger, heavy, light, ring, etc.
  rarity: EquipmentRarity;
  description?: string;
  icon?: string;
  stats: EquipmentStats;
  traits: EquipmentTrait[];
  condition: EquipmentCondition;
  economy: EquipmentEconomy;
  combatDisplay: EquipmentCombatDisplay;
}

// ============================================
// ITEM TYPES
// ============================================

export type ItemCategory = 'recovery' | 'resurrection' | 'buff' | 'consumable' | 'quest' | 'key';
export type ItemUseScenario = 'battle' | 'menu' | 'anytime' | 'none';
export type ItemTargetType = 'self' | 'ally' | 'enemy' | 'all-ally' | 'all-enemy';

// Item effect block
export interface ItemEffect {
  id: string;
  effectType: 'heal-hp' | 'heal-mp' | 'add-status' | 'remove-status' | 'add-resource' | 'temp-buff' | 'trigger-event';
  value: number | Record<string, number>;
  statusId?: string;
  duration?: number;
  eventId?: string;
}

// Item use rules
export interface ItemUseRule {
  scenario: ItemUseScenario;
  targetType: ItemTargetType;
  targetCount?: number;
  usesPerBattle?: number;
  usesPerDay?: number;
  cooldown?: number;
  consumable: boolean;
}

// Item event关联
export interface ItemEvent关联 {
  isKeyItem: boolean;
  eventId?: string;
  unlockMap?: string;
  unlockDoor?: string;
  storyCondition?: string;
}

// Item economy
export interface ItemEconomy {
  price?: number;
  sellPrice?: number;
  shopAvailable?: boolean;
  dropSources?: string[];
  questRewards?: { questId: string; count: number }[];
  rarity: EquipmentRarity;
  stackMax?: number;
}

// Item display
export interface ItemDisplay {
  icon?: string;
  description?: string;
}

// Complete Item definition
export interface Item {
  id: string;
  name: string;
  itemCategory: ItemCategory;
  itemType: string;
  description?: string;
  icon?: string;
  useRule: ItemUseRule;
  effects: ItemEffect[];
  event关联: ItemEvent关联;
  economy: ItemEconomy;
  display: ItemDisplay;
}

// ============================================
// UI STATE TYPES
// ============================================

export type DatabaseCategory =
  | 'project-rules'
  | 'characters'
  | 'jobs'
  | 'skills'
  | 'statuses'
  | 'equipment'
  | 'items'
  | 'enemies'
  | 'enemygroups'
  | 'maps'
  | 'simulation'
  | 'prebattle-prep'
  | 'battle-sim'
  | 'balance-analysis';

export interface TreeNode {
  id: string;
  label: string;
  type: DatabaseCategory;
  children?: TreeNode[];
  data?: Record<string, unknown>;
  icon?: string;
}

export interface SelectionState {
  selectedNodeId: string | null;
  selectedNodeType: DatabaseCategory | null;
  selectedEntityId: string | null;
}

export interface DrawerTab {
  id: string;
  label: string;
  icon?: string;
  content: React.ReactNode;
}

export type DrawerPanel = 'combat-log' | 'errors' | 'formula' | 'batch-edit' | 'version' | 'simulation' | 'skill-log' | 'status-log' | 'job-log' | 'character-log' | 'equipment-log' | 'item-log' | 'enemy-log' | 'enemygroup-log' | 'prebattle-log' | 'analysis-log' | 'rules-inspector';
