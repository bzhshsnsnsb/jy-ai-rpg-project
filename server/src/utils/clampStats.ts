/**
 * 数值边界保护函数
 * 确保所有数值在合理范围内，禁止负数和非法百分比
 */

export interface StatsRecord {
  hp?: number;
  mp?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  magicAttack?: number;
  magicDefense?: number;
  healPower?: number;
  critRate?: number;
  critDamage?: number;
}

export function clampStats(stats: StatsRecord): StatsRecord {
  return {
    hp: Math.max(1, stats.hp ?? 1),
    mp: Math.max(0, stats.mp ?? 0),
    attack: Math.max(0, stats.attack ?? 0),
    defense: Math.max(0, stats.defense ?? 0),
    speed: Math.max(0, stats.speed ?? 0),
    magicAttack: Math.max(0, stats.magicAttack ?? 0),
    magicDefense: Math.max(0, stats.magicDefense ?? 0),
    healPower: Math.max(0, stats.healPower ?? 0),
    critRate: Math.min(100, Math.max(0, stats.critRate ?? 0)),
    critDamage: Math.max(100, stats.critDamage ?? 150),
  };
}
