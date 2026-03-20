// 本地规则验证服务
// 复用前端 rulesValidation.ts 的核心逻辑

export interface ValidationMessage {
  type: 'error' | 'warning' | 'info';
  field?: string;
  message: string;
}

export interface ConsistencyCheckResult {
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
  summary: string;
}

// 公式变量名与属性ID的对应
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

// 不需要出现在伤害公式中的属性
const attrIdsNotRequiredInFormulas = [
  'hp', 'mp', 'ap', 'rage', 'speed', 'critRate', 'critDamage',
  'accuracy', 'dodge', 'magicDefense',
];

function isAttributeInFormulas(attrId: string, formulas: any[]): boolean {
  if (attrIdsNotRequiredInFormulas.includes(attrId)) return true;

  const formulaPatterns = [
    new RegExp(`\\b${attrId}\\b`, 'i'),
    new RegExp(`\\bbase${attrId.charAt(0).toUpperCase() + attrId.slice(1)}\\b`, 'i'),
  ];

  const formulaRefsAttr = formulas.some((formula) =>
    formulaPatterns.some((pattern) => pattern.test(formula.formula || ''))
  );

  if (formulaRefsAttr) return true;

  return formulas.some((formula) => {
    const usedVar = Object.entries(formulaVarToAttrId).find(([, id]) => id === attrId);
    return usedVar && new RegExp(`\\b${usedVar[0]}\\b`, 'i').test(formula.formula || '');
  });
}

// 第一阶段：验证属性配置
function validateAttributes(project: any): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const attributes = project.rules?.attributes || [];
  const formulas = project.rules?.damageFormulas || [];

  // 检查属性ID格式
  attributes.forEach((attr: any) => {
    if (!attr.name) {
      messages.push({ type: 'error', field: attr.id, message: `属性缺少名称` });
    }
    if (!attr.id) {
      messages.push({ type: 'error', message: '属性缺少ID' });
    } else if (/^\d/.test(attr.id)) {
      messages.push({ type: 'error', field: attr.id, message: '属性ID不能以数字开头' });
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(attr.id)) {
      messages.push({ type: 'error', field: attr.id, message: '属性ID格式无效' });
    }

    if (attr.type === 'number' && !attr.unit) {
      messages.push({ type: 'warning', field: attr.id, message: '数值属性缺少单位' });
    }

    // 检查是否被公式引用
    if (!isAttributeInFormulas(attr.id, formulas)) {
      messages.push({ type: 'info', field: attr.id, message: '未参与任何伤害/治疗公式计算' });
    }
  });

  return messages;
}

// 第一阶段：验证伤害公式
function validateDamageFormulas(project: any): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const formulas = project.rules?.damageFormulas || [];

  formulas.forEach((formula: any) => {
    if (!formula.name) {
      messages.push({ type: 'error', field: formula.id, message: '伤害公式缺少名称' });
    }
    if (!formula.formula || formula.formula.trim() === '') {
      messages.push({ type: 'error', field: formula.id, message: '伤害公式缺少表达式' });
    }
  });

  return messages;
}

// 第二阶段：跨实体一致性检查
function validateCrossEntityConsistency(project: any): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const characters = project.characters || [];
  const jobs = project.jobs || [];
  const skills = project.skills || [];
  const enemies = project.enemies || [];
  const statuses = project.statuses || [];

  // 检查角色
  characters.forEach((char: any) => {
    if (!char.name?.trim()) {
      messages.push({ type: 'error', field: 'character', message: `角色 ID=${char.id} 缺少名称` });
    }
    if (!char.jobId) {
      messages.push({ type: 'warning', field: 'character', message: `角色 "${char.name || char.id}" 未选择职业` });
    } else if (!jobs.find((j: any) => j.id === char.jobId)) {
      messages.push({ type: 'error', field: 'character', message: `角色 "${char.name || char.id}" 引用了不存在的职业` });
    }
    if (!char.level || char.level < 1) {
      messages.push({ type: 'error', field: 'character', message: `角色 "${char.name || char.id}" 等级无效` });
    }
  });

  // 检查职业
  jobs.forEach((job: any) => {
    if (!job.name?.trim()) {
      messages.push({ type: 'error', field: 'job', message: `职业 ID=${job.id} 缺少名称` });
    }
  });

  // 检查技能
  skills.forEach((skill: any) => {
    if (!skill.name?.trim()) {
      messages.push({ type: 'error', field: 'skill', message: `技能 ID=${skill.id} 缺少名称` });
    }
    if (!skill.type) {
      messages.push({ type: 'warning', field: 'skill', message: `技能 "${skill.name || skill.id}" 未选择类型` });
    }
  });

  // 检查敌人
  enemies.forEach((enemy: any) => {
    if (!enemy.name?.trim()) {
      messages.push({ type: 'error', field: 'enemy', message: `敌人 ID=${enemy.id} 缺少名称` });
    }
    if (!enemy.level || enemy.level < 1) {
      messages.push({ type: 'error', field: 'enemy', message: `敌人 "${enemy.name || enemy.id}" 等级无效` });
    }
  });

  // 检查敌人等级与角色等级的匹配
  const charLevels = new Set(characters.map((c: any) => c.level).filter(Boolean));
  enemies.forEach((enemy: any) => {
    if (enemy.level && charLevels.size > 0 && !charLevels.has(enemy.level)) {
      messages.push({ type: 'warning', field: 'enemy', message: `敌人 "${enemy.name}" 等级 ${enemy.level} 与所有角色等级不匹配` });
    }
  });

  // 检查状态抗性引用
  enemies.forEach((enemy: any) => {
    if (enemy.statusResistances) {
      Object.keys(enemy.statusResistances).forEach((statusId: string) => {
        if (!statuses.find((s: any) => s.id === statusId)) {
          messages.push({ type: 'error', field: 'enemy', message: `敌人 "${enemy.name}" 引用了不存在的状态 "${statusId}"` });
        }
      });
    }
  });

  return messages;
}

// 主检查函数
export function checkConsistency(project: any): ConsistencyCheckResult {
  const attrMessages = validateAttributes(project);
  const formulaMessages = validateDamageFormulas(project);
  const crossEntityMessages = validateCrossEntityConsistency(project);

  const allMessages = [...attrMessages, ...formulaMessages, ...crossEntityMessages];
  
  const errors = allMessages.filter(m => m.type === 'error');
  const warnings = allMessages.filter(m => m.type === 'warning');
  const info = allMessages.filter(m => m.type === 'info');

  let summary = '';
  if (errors.length === 0 && warnings.length === 0 && info.length === 0) {
    summary = '配置检查通过，未发现数值不一致问题';
  } else if (errors.length > 0) {
    summary = `发现 ${errors.length} 个错误，${warnings.length} 个警告`;
  } else if (warnings.length > 0) {
    summary = `发现 ${warnings.length} 个警告`;
  } else {
    summary = `发现 ${info.length} 条提示信息`;
  }

  return {
    errors,
    warnings,
    info,
    summary,
  };
}
