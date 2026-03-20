import type { CustomAttribute, DamageFormula } from '../types';

export interface AttributeValidation {
  status: 'valid' | 'warning' | 'error' | 'info';
  message: string;
}

export interface ValidationSummary {
  errors: number;
  warnings: number;
  infos: number;
  total: number;
}

export interface RulesValidationInput {
  attributes: CustomAttribute[];
  damageFormulas: DamageFormula[];
}

// 公式中常用变量名与属性 ID 的对应（公式可能用简写）
const formulaVarToAttrId: Record<string, string> = {
  magic: 'magicAttack',
  resistance: 'resistance',
  heal: 'healPower',
  attack: 'attack',
  defense: 'defense',
  speed: 'speed',
  critRate: 'critRate',
  critDamage: 'critDamage',
};

// 资源/核心属性不要求出现在伤害公式中（在别处使用）
const attrIdsNotRequiredInFormulas = [
  'hp',
  'mp',
  'ap',
  'rage',
  'speed',
  'critRate',
  'critDamage',
  'accuracy',
  'dodge',
  'magicDefense',
];

export const isAttributeInFormulas = (
  rules: RulesValidationInput,
  attrId: string
): boolean => {
  if (attrIdsNotRequiredInFormulas.includes(attrId)) return true;

  const formulaPatterns = [
    new RegExp(`\\b${attrId}\\b`, 'i'),
    new RegExp(
      `\\bbase${attrId.charAt(0).toUpperCase() + attrId.slice(1)}\\b`,
      'i'
    ),
  ];

  const formulaRefsAttr = rules.damageFormulas.some((formula) =>
    formulaPatterns.some((pattern) => pattern.test(formula.formula))
  );

  if (formulaRefsAttr) return true;

  const formulaUsesAlias = rules.damageFormulas.some((formula) => {
    const usedVar = Object.entries(formulaVarToAttrId).find(
      ([, id]) => id === attrId
    );
    return usedVar && new RegExp(`\\b${usedVar[0]}\\b`, 'i').test(formula.formula);
  });

  return !!formulaUsesAlias;
};

// 检查属性是否有绑定显示配置
export const checkDisplayBinding = (
  attrId: string,
  showInInspector: boolean
): { bound: boolean; details: string } => {
  const knownStats = [
    'hp',
    'mp',
    'attack',
    'defense',
    'speed',
    'magicAttack',
    'magicDefense',
    'critRate',
    'critDamage',
    'healPower',
    'resistance',
    'accuracy',
    'dodge',
  ];

  if (knownStats.includes(attrId)) {
    return { bound: true, details: '已绑定默认显示配置' };
  }

  if (showInInspector) {
    return { bound: true, details: '已在检视面板显示' };
  }

  return { bound: false, details: '未绑定任何显示配置' };
};

export const validateAttribute = (
  rules: RulesValidationInput,
  attr: CustomAttribute
): AttributeValidation => {
  if (!attr.name) return { status: 'error', message: '缺少名称' };
  if (!attr.id) return { status: 'error', message: '缺少ID' };
  if (/^\d/.test(attr.id))
    return { status: 'error', message: 'ID不能以数字开头' };
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(attr.id))
    return { status: 'error', message: 'ID只能包含字母、数字、下划线' };

  if (attr.type === 'number' && !attr.unit)
    return { status: 'warning', message: '缺少单位 (如: HP, 点, 秒)' };

  // 检查是否被伤害/治疗公式引用
  if (!isAttributeInFormulas(rules, attr.id)) {
    return { status: 'warning', message: '未参与任何伤害/治疗公式计算' };
  }

  // 检查显示配置
  const displayCheck = checkDisplayBinding(attr.id, attr.showInInspector);
  if (!displayCheck.bound) {
    return { status: 'info', message: displayCheck.details };
  }

  return { status: 'valid', message: '正常' };
};

export const getValidationSummary = (
  rules: RulesValidationInput
): ValidationSummary => {
  const attrValidations = rules.attributes.map((attr) =>
    validateAttribute(rules, attr)
  );
  const errors = attrValidations.filter((v) => v.status === 'error').length;
  const warnings = attrValidations.filter((v) => v.status === 'warning').length;
  const infos = attrValidations.filter((v) => v.status === 'info').length;
  return {
    errors,
    warnings,
    infos,
    total: attrValidations.length,
  };
};
