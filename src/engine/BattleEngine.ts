import type { Character, Enemy, EnemyGroup, BattleTestAlly } from '../types';

// ============================================
// BATTLE ENGINE TYPES
// ============================================

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

export interface ActionQueueItem {
  actorId: string;
  actorType: 'ally' | 'enemy';
  speed: number;
  delay: number;
  action?: 'attack' | 'skill' | 'item' | 'defend' | 'heal';
  targetId?: string;
  skillId?: string;
  isExtraTurn?: boolean;    // 额外行动回合
  isChase?: boolean;        // 追击
  isDelayed?: boolean;      // 延迟行动（被击退）
  originalSpeed?: number;    // 原始速度（用于显示速度变化）
}

export interface BattleLogEntry {
  turn: number;
  round: number;
  actorId: string;
  actorName: string;
  actorType: 'ally' | 'enemy';
  action: string;
  skillId?: string;
  targetId?: string;
  targetName?: string;
  damage?: number;
  healing?: number;
  statusEffects?: string[];
  message: string;
  timestamp: number;
  // Extended fields for events
  eventType?: 'wave' | 'spawn' | 'phase' | 'event' | 'victory' | 'defeat' | 'battle-event' | 'midway-spawn' | 'wave-switch' | 'judgement';
  // 详细判定信息
  judgementDetails?: {
    condition: string;
    result: 'win' | 'lose';
    trigger: string;
  };
}

export interface ActorState {
  id: string;
  name: string;
  type: 'ally' | 'enemy';
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  ap: number;
  maxAp: number;
  rage: number;
  maxRage: number;
  statusEffects: StatusEffectInstance[];
  position: { x: number; y: number };
  isAlive: boolean;
  isDefending: boolean;
  isBoss: boolean;
  level: number;
  attributes: ActorAttributes;
}

export interface ActorAttributes {
  attack: number;
  defense: number;
  magic: number;
  resistance: number;
  healPower: number;
  speed: number;
  critRate: number;
  critDamage: number;
  evasion: number;
  accuracy: number;
}

export interface StatusEffectInstance {
  statusId: string;
  name: string;
  turnsRemaining: number;
  stacks: number;
  sourceId: string;
}

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  isCrit: boolean;
  isMiss: boolean;
  isResisted: boolean;
  elementBonus: number;
  statusBonus: number;
  defenseReduction: number;
}

export interface SimulationConfig {
  party: BattleTestAlly[];
  formation: PrebattleFormation[];
  resources: Record<string, PrebattleResource>;
  encounter: EnemyGroup;
  characters: Character[];
  enemies: Enemy[];
  seed?: number;
  speed: number;
  autoBattle: boolean;
}

export interface SimulationResult {
  winner: 'ally' | 'enemy' | 'draw';
  totalTurns: number;
  totalRounds: number;
  duration: number;
  survivingAllies: number;
  survivingEnemies: number;
  damageDealt: Record<string, number>;
  damageTaken: Record<string, number>;
  healingDone: Record<string, number>;
  overhealingDone: Record<string, number>;
  skillsUsed: Record<string, number>;
  eventsTriggered: string[];
  battleLog: BattleLogEntry[];
}

export interface TurnResult {
  turn: number;
  round: number;
  actor: ActorState;
  action: string;
  target?: ActorState;
  damage?: DamageResult;
  healing?: number;
  statusEffects?: StatusEffectInstance[];
  nextActor?: ActorState;
  isBattleEnd: boolean;
  // Extended information
  hitChance?: number;
  critChance?: number;
  resistanceChance?: number;
  isHit?: boolean;
  isCrit?: boolean;
  isResisted?: boolean;
}

// ============================================
// BATTLE ENGINE CLASS
// ============================================

export class BattleEngine {
  // Configuration
  private config: SimulationConfig;
  
  // State
  private allies: ActorState[] = [];
  private enemies: ActorState[] = [];
  private actionQueue: ActionQueueItem[] = [];
  private battleLog: BattleLogEntry[] = [];
  private currentTurn: number = 1;
  private currentRound: number = 1;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private winner: 'ally' | 'enemy' | 'draw' | null = null;
  
  // Statistics
  private damageDealt: Record<string, number> = {};
  private damageTaken: Record<string, number> = {};
  private healingDone: Record<string, number> = {};
  private overhealingDone: Record<string, number> = {};
  private skillsUsed: Record<string, number> = {};
  private eventsTriggered: string[] = [];
  
  // Current actor for step-by-step
  private currentActorState: ActorState | null = null;

  private scaleStat(base: number, growth: number | undefined, level: number, fallbackGrowthRate: number): number {
    if (level <= 1) {
      return Math.floor(base);
    }

    if (typeof growth === 'number' && growth > 0) {
      return Math.floor(base + growth * (level - 1));
    }

    return Math.floor(base * (1 + (level - 1) * fallbackGrowthRate));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  constructor(config: SimulationConfig) {
    this.config = config;
    this.initializeBattle();
  }

  // Initialize battle state
  private initializeBattle(): void {
    this.allies = this.createAllyActors();
    this.enemies = this.createEnemyActors();
    this.buildInitialActionQueue();
    this.isRunning = true;
    this.isPaused = false;
    this.currentTurn = 1;
    this.currentRound = 1;
    this.winner = null;
    this.battleLog = [];

    // Initialize stats
    this.damageDealt = {};
    this.damageTaken = {};
    this.healingDone = {};
    this.overhealingDone = {};
    this.skillsUsed = {};
    this.eventsTriggered = [];

    // Log wave information if available
    const waves = this.config.encounter.waves;
    if (waves && waves.length > 0) {
      this.addLog({
        turn: 0,
        round: 0,
        actorId: 'system',
        actorName: '系统',
        actorType: 'ally',
        action: 'wave_info',
        eventType: 'wave',
        message: `遭遇: ${this.config.encounter.name} - 共 ${waves.length} 波`,
        timestamp: Date.now(),
      });
    }

    // Add battle start log
    this.addLog({
      turn: 0,
      round: 0,
      actorId: 'system',
      actorName: '系统',
      actorType: 'ally',
      action: 'battle_start',
      eventType: 'event',
      message: `战斗开始！遭遇: ${this.config.encounter.name}`,
      timestamp: Date.now(),
    });
  }

  // Create ally actors from party configuration
  private createAllyActors(): ActorState[] {
    return this.config.party.map((ally, index) => {
      const character = this.config.characters.find(c => c.id === ally.characterId);
      if (!character) {
        throw new Error(`Character not found: ${ally.characterId}`);
      }

      const formation = this.config.formation.find(f => f.characterId === ally.characterId);
      const resources = this.config.resources[ally.characterId];

      // Calculate level-based attributes
      const baseAttrs = character.attributes?.baseStats || {};
      const growthRates = character.attributes?.growthRates || {};
      const level = ally.level;
      const baseHp = Number(baseAttrs.hp ?? character.initialAttributes?.initialHp ?? 100);
      const baseMp = Number(baseAttrs.mp ?? character.initialAttributes?.initialMp ?? 50);
      const maxHp = this.scaleStat(baseHp, Number(growthRates.hp ?? 0), level, 0.08);
      const maxMp = this.scaleStat(baseMp, Number(growthRates.mp ?? 0), level, 0.04);
      const attack = this.scaleStat(Number(baseAttrs.attack ?? 10), Number(growthRates.attack ?? 0), level, 0.05);
      const defense = this.scaleStat(Number(baseAttrs.defense ?? 5), Number(growthRates.defense ?? 0), level, 0.04);
      const magic = this.scaleStat(
        Number(baseAttrs.magicAttack ?? baseAttrs.magic ?? 10),
        Number(growthRates.magicAttack ?? growthRates.magic ?? 0),
        level,
        0.05,
      );
      const resistance = this.scaleStat(
        Number(baseAttrs.magicDefense ?? baseAttrs.resistance ?? 5),
        Number(growthRates.magicDefense ?? growthRates.resistance ?? 0),
        level,
        0.04,
      );
      const healPower = this.scaleStat(
        Number(baseAttrs.healPower ?? baseAttrs.heal ?? 0),
        Number(growthRates.healPower ?? growthRates.heal ?? 0),
        level,
        0.03,
      );
      const speed = this.scaleStat(Number(baseAttrs.speed ?? 10), Number(growthRates.speed ?? 0), level, 0.02);

      return {
        id: ally.characterId,
        name: character.identity.name,
        type: 'ally' as const,
        hp: resources?.hp ?? maxHp,
        maxHp,
        mp: resources?.mp ?? maxMp,
        maxMp,
        ap: resources?.ap ?? this.config.encounter.battleTestConfig?.initialResources?.ap ?? 3,
        maxAp: this.config.encounter.battleTestConfig?.initialResources?.ap ?? 3,
        rage: resources?.rage ?? 0,
        maxRage: 100,
        statusEffects: [],
        position: formation ? { x: formation.x, y: formation.y } : { x: index % 3, y: Math.floor(index / 3) },
        isAlive: true,
        isDefending: false,
        isBoss: false,
        level: level,
        attributes: {
          attack,
          defense,
          magic,
          resistance,
          healPower,
          speed,
          critRate: Number(baseAttrs.critRate ?? 5),
          critDamage: Number(baseAttrs.critDamage ?? 150),
          evasion: Number(baseAttrs.dodge ?? baseAttrs.evasion ?? 5),
          accuracy: Number(baseAttrs.accuracy ?? 95),
        },
      };
    });
  }

  // Create enemy actors from encounter
  private createEnemyActors(): ActorState[] {
    const members = this.config.encounter.members || [];
    
    return members.map(member => {
      const enemy = this.config.enemies.find(e => e.id === member.enemyId);
      if (!enemy) {
        throw new Error(`Enemy not found: ${member.enemyId}`);
      }

      const attrs = enemy.attributes;

      return {
        id: `${member.enemyId}_${member.x}_${member.y}`,
        name: enemy.name,
        type: 'enemy' as const,
        hp: attrs.hp,
        maxHp: attrs.hp,
        mp: attrs.mp || 0,
        maxMp: attrs.mp || 0,
        ap: 0,
        maxAp: 100,
        rage: 0,
        maxRage: 100,
        statusEffects: [],
        position: { x: member.x, y: member.y },
        isAlive: true,
        isDefending: false,
        isBoss: member.isBoss || false,
        level: attrs.level,
        attributes: {
          attack: attrs.attack || 10,
          defense: attrs.defense || 5,
          magic: (attrs as Record<string, number>).magicAttack || 10,
          resistance: (attrs as Record<string, number>).magicDefense || 5,
          healPower: (attrs as Record<string, number>).healPower || 0,
          speed: attrs.speed || 10,
          critRate: attrs.critRate || 5,
          critDamage: attrs.critDamage || 150,
          evasion: (attrs as Record<string, number>).evasion || 5,
          accuracy: (attrs as Record<string, number>).accuracy || 95,
        },
      };
    });
  }

  // Build initial action queue based on speed
  private buildInitialActionQueue(): void {
    const allActors = [...this.allies, ...this.enemies]
      .filter(a => a.isAlive)
      .map(actor => ({
        actorId: actor.id,
        actorType: actor.type,
        speed: actor.attributes.speed,
        originalSpeed: actor.attributes.speed,
        delay: Math.floor(Math.random() * 50), // Random initial delay for variety
      }));

    // Sort by speed (higher first), then by random delay
    allActors.sort((a, b) => {
      if (b.speed !== a.speed) return b.speed - a.speed;
      return a.delay - b.delay;
    });

    this.actionQueue = allActors;
  }

  // Add log entry
  private addLog(entry: BattleLogEntry): void {
    this.battleLog.push(entry);
  }

  // Log battle event (wave change, spawn, etc.)
  private logBattleEvent(type: 'wave' | 'spawn' | 'phase' | 'event' | 'battle-event' | 'midway-spawn' | 'wave-switch', message: string): void {
    this.addLog({
      turn: this.currentTurn,
      round: this.currentRound,
      actorId: 'system',
      actorName: '系统',
      actorType: 'ally',
      action: type,
      message,
      timestamp: Date.now(),
    });
  }

  // Calculate damage
  calculateDamage(attacker: ActorState, defender: ActorState, isSkill: boolean = false): DamageResult {
    const attackStat = isSkill ? attacker.attributes.magic : attacker.attributes.attack;
    const defenseStat = isSkill ? defender.attributes.resistance : defender.attributes.defense;
    const hitChance = this.clamp(attacker.attributes.accuracy - defender.attributes.evasion + 5, 35, 100);
    const isMiss = Math.random() * 100 > hitChance;

    if (isMiss) {
      return {
        rawDamage: 0,
        finalDamage: 0,
        isCrit: false,
        isMiss: true,
        isResisted: false,
        elementBonus: 0,
        statusBonus: 0,
        defenseReduction: 0,
      };
    }

    const variance = 0.9 + Math.random() * 0.2;
    const defenseRatio = defenseStat / (defenseStat + attackStat + 120);
    let rawDamage = Math.max(1, attackStat * variance * (1 - defenseRatio * 0.8));

    const isCrit = Math.random() * 100 < attacker.attributes.critRate;
    if (isCrit) {
      rawDamage *= attacker.attributes.critDamage / 100;
    }

    if (defender.isDefending) {
      rawDamage *= 0.68;
    }

    const defenseReduction = Math.max(0, attackStat * variance - rawDamage);
    const finalDamage = Math.max(1, Math.floor(rawDamage));

    return {
      rawDamage: Math.floor(rawDamage),
      finalDamage,
      isCrit,
      isMiss,
      isResisted: false,
      elementBonus: 0,
      statusBonus: 0,
      defenseReduction: Math.floor(defenseReduction),
    };
  }

  // Execute one action
  executeAction(): TurnResult | null {
    if (!this.isRunning || this.isPaused) return null;

    // Check battle end
    if (this.isBattleEnd()) {
      this.endBattle();
      return null;
    }

    // Get next actor from queue
    const queueItem = this.actionQueue.find(item => {
      const actor = item.actorType === 'ally' 
        ? this.allies.find(a => a.id === item.actorId)
        : this.enemies.find(a => a.id === item.actorId);
      return actor?.isAlive;
    });

    if (!queueItem) {
      // Rebuild queue if empty
      this.buildInitialActionQueue();
      return this.executeAction();
    }

    const actor = queueItem.actorType === 'ally'
      ? this.allies.find(a => a.id === queueItem.actorId)
      : this.enemies.find(a => a.id === queueItem.actorId);

    if (!actor || !actor.isAlive) {
      // Skip dead actors
      this.actionQueue = this.actionQueue.filter(item => item.actorId !== queueItem.actorId);
      return this.executeAction();
    }

    this.currentActorState = actor;

    // Determine action (simple AI for now)
    const action = this.determineAction(actor);
    let target: ActorState | undefined;
    let damage: DamageResult | undefined;
    let healing: number | undefined;

    if (action.targetId) {
      target = action.actorType === 'ally'
        ? this.enemies.find(e => e.id === action.targetId)
        : this.allies.find(a => a.id === action.targetId);
    }

    // Execute action
    if (action.action === 'attack' && target) {
      damage = this.calculateDamage(actor, target, false);
      target.hp = Math.max(0, target.hp - damage.finalDamage);
      
      // Track damage
      this.damageDealt[actor.id] = (this.damageDealt[actor.id] || 0) + damage.finalDamage;
      this.damageTaken[target.id] = (this.damageTaken[target.id] || 0) + damage.finalDamage;

      this.addLog({
        turn: this.currentTurn,
        round: this.currentRound,
        actorId: actor.id,
        actorName: actor.name,
        actorType: actor.type,
        action: 'attack',
        targetId: target.id,
        targetName: target.name,
        damage: damage.finalDamage,
        message: damage.isMiss 
          ? `${actor.name} 攻击 ${target.name} 未命中！`
          : `${actor.name} 攻击 ${target.name} 造成 ${damage.finalDamage} 伤害${damage.isCrit ? '（暴击）' : ''}`,
        timestamp: Date.now(),
      });

      // Check if target died
      if (target.hp <= 0) {
        target.isAlive = false;
        this.addLog({
          turn: this.currentTurn,
          round: this.currentRound,
          actorId: target.id,
          actorName: target.name,
          actorType: target.type,
          action: 'death',
          message: `${target.name} 被击败！`,
          timestamp: Date.now(),
        });
      }
    } else if (action.action === 'defend') {
      actor.isDefending = true;
      this.addLog({
        turn: this.currentTurn,
        round: this.currentRound,
        actorId: actor.id,
        actorName: actor.name,
        actorType: actor.type,
        action: 'defend',
        message: `${actor.name} 进入防御状态`,
        timestamp: Date.now(),
      });
    } else if (action.action === 'skill' && target) {
      // Skill damage (simplified)
      damage = this.calculateDamage(actor, target, true);
      target.hp = Math.max(0, target.hp - damage.finalDamage);
      actor.mp = Math.max(0, actor.mp - 10);
      
      this.skillsUsed[action.skillId || 'unknown'] = (this.skillsUsed[action.skillId || 'unknown'] || 0) + 1;
      
      this.damageDealt[actor.id] = (this.damageDealt[actor.id] || 0) + damage.finalDamage;
      this.damageTaken[target.id] = (this.damageTaken[target.id] || 0) + damage.finalDamage;

      this.addLog({
        turn: this.currentTurn,
        round: this.currentRound,
        actorId: actor.id,
        actorName: actor.name,
        actorType: actor.type,
        action: 'skill',
        skillId: action.skillId,
        targetId: target.id,
        targetName: target.name,
        damage: damage.finalDamage,
        message: `${actor.name} 使用技能攻击 ${target.name} 造成 ${damage.finalDamage} 伤害`,
        timestamp: Date.now(),
      });

      if (target.hp <= 0) {
        target.isAlive = false;
        this.addLog({
          turn: this.currentTurn,
          round: this.currentRound,
          actorId: target.id,
          actorName: target.name,
          actorType: target.type,
          action: 'death',
          message: `${target.name} 被击败！`,
          timestamp: Date.now(),
        });
      }
    } else if (action.action === 'heal') {
      const healTarget = action.targetId
        ? (action.actorType === 'ally'
            ? this.allies.find((ally) => ally.id === action.targetId)
            : this.enemies.find((enemy) => enemy.id === action.targetId))
        : actor;

      if (!healTarget) {
        return null;
      }

      const healAmount = Math.floor(healTarget.maxHp * 0.18 + actor.attributes.healPower * 1.15 + actor.level * 4);
      const actualHealing = Math.min(healAmount, healTarget.maxHp - healTarget.hp);
      const overheal = Math.max(0, healAmount - actualHealing);
      healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + healAmount);
      actor.mp = Math.max(0, actor.mp - 10);
      healing = actualHealing;
      
      this.healingDone[actor.id] = (this.healingDone[actor.id] || 0) + actualHealing;
      this.overhealingDone[actor.id] = (this.overhealingDone[actor.id] || 0) + overheal;

      this.addLog({
        turn: this.currentTurn,
        round: this.currentRound,
        actorId: actor.id,
        actorName: actor.name,
        actorType: actor.type,
        action: 'heal',
        healing: actualHealing,
        targetId: healTarget.id,
        targetName: healTarget.name,
        message: `${actor.name} 治疗 ${healTarget.name}，恢复 ${actualHealing} HP${overheal > 0 ? `（溢出 ${overheal}）` : ''}`,
        timestamp: Date.now(),
      });
    }

    // Reset defending status at start of turn
    actor.isDefending = false;

    // Remove current actor from queue and get next
    this.actionQueue = this.actionQueue.filter(item => item.actorId !== actor.id);

    // Check battle end after action
    const battleEnd = this.isBattleEnd();

    // Get next actor
    const nextActorItem = this.actionQueue.find(item => {
      const a = item.actorType === 'ally' 
        ? this.allies.find(a => a.id === item.actorId)
        : this.enemies.find(a => a.id === item.actorId);
      return a?.isAlive;
    });

    const nextActor = nextActorItem 
      ? (nextActorItem.actorType === 'ally'
          ? this.allies.find(a => a.id === nextActorItem.actorId)
          : this.enemies.find(e => e.id === nextActorItem.actorId))
      : undefined;

    // Update turn/round if queue is empty
    if (this.actionQueue.filter(item => {
      const a = item.actorType === 'ally' 
        ? this.allies.find(a => a.id === item.actorId)
        : this.enemies.find(a => a.id === item.actorId);
      return a?.isAlive;
    }).length === 0) {
      this.currentTurn++;
      this.currentRound = this.currentTurn;
      this.buildInitialActionQueue();
    }

    return {
      turn: this.currentTurn,
      round: this.currentRound,
      actor,
      action: action.action || 'wait',
      target,
      damage,
      healing,
      nextActor: nextActor || undefined,
      isBattleEnd: battleEnd,
      // Extended information for inspector
      hitChance: target ? actor.attributes.accuracy : undefined,
      critChance: target ? actor.attributes.critRate : undefined,
      resistanceChance: target ? target.attributes.evasion : undefined,
      isHit: damage ? !damage.isMiss : undefined,
      isCrit: damage ? damage.isCrit : undefined,
      isResisted: damage ? damage.isResisted : undefined,
    };
  }

  // Determine action for actor (simple AI)
  private determineAction(actor: ActorState): ActionQueueItem {
    const isAlly = actor.type === 'ally';
    const allies = isAlly ? this.allies : this.enemies;
    const enemies = isAlly ? this.enemies : this.allies;
    
    // Get alive targets
    const aliveEnemies = enemies.filter(e => e.isAlive);
    if (aliveEnemies.length === 0) {
      return { actorId: actor.id, actorType: actor.type, speed: actor.attributes.speed, delay: 0, action: 'defend' };
    }

    const aliveAllies = allies.filter((ally) => ally.isAlive);
    const weakestAlly = aliveAllies
      .slice()
      .sort((left, right) => left.hp / left.maxHp - right.hp / right.maxHp)[0];

    if (
      actor.attributes.healPower > 0 &&
      weakestAlly &&
      weakestAlly.hp / weakestAlly.maxHp <= 0.55 &&
      actor.mp >= 10
    ) {
      return {
        actorId: actor.id,
        actorType: actor.type,
        speed: actor.attributes.speed,
        delay: 0,
        action: 'heal',
        targetId: weakestAlly.id,
      };
    }

    // Simple AI: 70% attack, 20% defend, 10% skill (if has MP)
    const roll = Math.random();
    
    if (roll < 0.7) {
      // Attack random alive enemy
      const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      return {
        actorId: actor.id,
        actorType: actor.type,
        speed: actor.attributes.speed,
        delay: 0,
        action: 'attack',
        targetId: target.id,
      };
    } else if (roll < 0.9 || actor.mp < 10) {
      // Defend
      return {
        actorId: actor.id,
        actorType: actor.type,
        speed: actor.attributes.speed,
        delay: 0,
        action: 'defend',
      };
    } else {
      // Use skill
      const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      return {
        actorId: actor.id,
        actorType: actor.type,
        speed: actor.attributes.speed,
        delay: 0,
        action: 'skill',
        skillId: 'skill_attack',
        targetId: target.id,
      };
    }
  }

  // Check if battle has ended
  isBattleEnd(): boolean {
    const aliveAllies = this.allies.filter(a => a.isAlive).length;
    const aliveEnemies = this.enemies.filter(e => e.isAlive).length;

    if (aliveAllies === 0) {
      this.winner = 'enemy';
      return true;
    }
    if (aliveEnemies === 0) {
      this.winner = 'ally';
      return true;
    }
    // Turn limit
    if (this.currentTurn > 30) {
      this.winner = 'draw';
      return true;
    }
    return false;
  }

  // End battle
  private endBattle(): void {
    this.isRunning = false;
    const survivingAllies = this.allies.filter(a => a.isAlive).length;
    const survivingEnemies = this.enemies.filter(e => e.isAlive).length;

    const resultMessage = this.winner === 'ally' ? '胜利' : this.winner === 'enemy' ? '失败' : '平局';
    const isWipe = survivingAllies === 0;

    // 构建详细判定信息
    let judgementCondition = '';
    if (this.winner === 'ally') {
      judgementCondition = survivingEnemies === 0 ? '敌方全灭' : `敌方剩余 ${survivingEnemies} 单位`;
    } else if (this.winner === 'enemy') {
      judgementCondition = survivingAllies === 0 ? '我方全灭' : `我方剩余 ${survivingAllies} 单位`;
    } else {
      judgementCondition = '战斗回合耗尽';
    }

    this.addLog({
      turn: this.currentTurn,
      round: this.currentRound,
      actorId: 'system',
      actorName: '系统',
      actorType: 'ally',
      action: 'battle_end',
      eventType: 'judgement',
      message: `战斗结束！${resultMessage} - 我方存活: ${survivingAllies} | 敌方存活: ${survivingEnemies}${isWipe ? ' (团灭)' : ''}`,
      timestamp: Date.now(),
      judgementDetails: {
        condition: judgementCondition,
        result: this.winner === 'ally' ? 'win' : this.winner === 'enemy' ? 'lose' : 'win',
        trigger: `第 ${this.currentTurn} 回合判定`,
      },
    });
  }

  // Get current state for UI
  getState() {
    return {
      allies: this.allies,
      enemies: this.enemies,
      actionQueue: this.actionQueue,
      currentTurn: this.currentTurn,
      currentRound: this.currentRound,
      currentActor: this.currentActorState,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      winner: this.winner,
      battleLog: this.battleLog,
    };
  }

  // Control methods
  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  step(): TurnResult | null {
    this.isPaused = false;
    return this.executeAction();
  }

  // Get final result
  getResult(): SimulationResult {
    return {
      winner: this.winner || 'draw',
      totalTurns: this.currentTurn,
      totalRounds: this.currentRound,
      duration: 0,
      survivingAllies: this.allies.filter(a => a.isAlive).length,
      survivingEnemies: this.enemies.filter(e => e.isAlive).length,
      damageDealt: this.damageDealt,
      damageTaken: this.damageTaken,
      healingDone: this.healingDone,
      overhealingDone: this.overhealingDone,
      skillsUsed: this.skillsUsed,
      eventsTriggered: this.eventsTriggered,
      battleLog: this.battleLog,
    };
  }

  // Run full battle (for auto simulation)
  runFullBattle(): SimulationResult {
    while (this.isRunning && !this.isPaused) {
      this.executeAction();
      if (this.isBattleEnd()) {
        break;
      }
    }
    return this.getResult();
  }
}

// ============================================
// HELPER FUNCTION
// ============================================

export function createBattleEngine(config: SimulationConfig): BattleEngine {
  return new BattleEngine(config);
}
