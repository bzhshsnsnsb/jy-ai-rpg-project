type TokenType = 'number' | 'identifier' | 'operator' | 'paren' | 'comma';

interface Token {
  type: TokenType;
  value: string;
}

type FormulaFunction = (...args: number[]) => number;

const FUNCTIONS: Record<string, FormulaFunction> = {
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
  abs: (value) => Math.abs(value),
  floor: (value) => Math.floor(value),
  ceil: (value) => Math.ceil(value),
  round: (value, precision = 0) => {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  },
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),
};

const tokenize = (expression: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let value = char;
      index += 1;
      while (index < expression.length && /[0-9.]/.test(expression[index])) {
        value += expression[index];
        index += 1;
      }
      tokens.push({ type: 'number', value });
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let value = char;
      index += 1;
      while (index < expression.length && /[A-Za-z0-9_.]/.test(expression[index])) {
        value += expression[index];
        index += 1;
      }
      tokens.push({ type: 'identifier', value });
      continue;
    }

    if (['+', '-', '*', '/'].includes(char)) {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }

    if (['(', ')'].includes(char)) {
      tokens.push({ type: 'paren', value: char });
      index += 1;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'comma', value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported token: ${char}`);
  }

  return tokens;
};

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly variables: Record<string, number>,
  ) {}

  parse(): number {
    const value = this.parseExpression();
    if (this.current()) {
      throw new Error(`Unexpected token: ${this.current()!.value}`);
    }
    return value;
  }

  private current(): Token | undefined {
    return this.tokens[this.index];
  }

  private consume(): Token {
    const token = this.tokens[this.index];
    if (!token) {
      throw new Error('Unexpected end of expression');
    }
    this.index += 1;
    return token;
  }

  private match(type: TokenType, value?: string): boolean {
    const token = this.current();
    if (!token || token.type !== type) {
      return false;
    }
    if (value !== undefined && token.value !== value) {
      return false;
    }
    this.index += 1;
    return true;
  }

  private parseExpression(): number {
    let value = this.parseTerm();

    while (true) {
      if (this.match('operator', '+')) {
        value += this.parseTerm();
        continue;
      }
      if (this.match('operator', '-')) {
        value -= this.parseTerm();
        continue;
      }
      return value;
    }
  }

  private parseTerm(): number {
    let value = this.parseUnary();

    while (true) {
      if (this.match('operator', '*')) {
        value *= this.parseUnary();
        continue;
      }
      if (this.match('operator', '/')) {
        const divisor = this.parseUnary();
        if (divisor === 0) {
          throw new Error('Division by zero');
        }
        value /= divisor;
        continue;
      }
      return value;
    }
  }

  private parseUnary(): number {
    if (this.match('operator', '+')) {
      return this.parseUnary();
    }
    if (this.match('operator', '-')) {
      return -this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.current();
    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    if (this.match('number')) {
      return Number(token.value);
    }

    if (token.type === 'identifier') {
      this.consume();
      if (this.match('paren', '(')) {
        return this.parseFunctionCall(token.value);
      }
      if (!(token.value in this.variables)) {
        throw new Error(`Unknown variable: ${token.value}`);
      }
      return this.variables[token.value];
    }

    if (this.match('paren', '(')) {
      const value = this.parseExpression();
      if (!this.match('paren', ')')) {
        throw new Error('Missing closing parenthesis');
      }
      return value;
    }

    throw new Error(`Unexpected token: ${token.value}`);
  }

  private parseFunctionCall(name: string): number {
    const fn = FUNCTIONS[name];
    if (!fn) {
      throw new Error(`Unknown function: ${name}`);
    }

    const args: number[] = [];
    if (!this.match('paren', ')')) {
      do {
        args.push(this.parseExpression());
      } while (this.match('comma'));

      if (!this.match('paren', ')')) {
        throw new Error(`Missing closing parenthesis for ${name}`);
      }
    }

    if (args.length === 0) {
      throw new Error(`${name} requires at least one argument`);
    }

    const result = fn(...args);
    if (Number.isNaN(result) || !Number.isFinite(result)) {
      throw new Error(`Invalid result from ${name}`);
    }
    return result;
  }
}

export const getFormulaError = (
  formula: string,
  variables: Record<string, number>,
): string | null => {
  try {
    if (!formula.trim()) {
      return null;
    }
    const parser = new Parser(tokenize(formula), variables);
    parser.parse();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid formula';
  }
};

export const evaluateFormula = (
  formula: string,
  variables: Record<string, number>,
  fallbackValue: number,
): number => {
  try {
    if (!formula.trim()) {
      return fallbackValue;
    }
    const parser = new Parser(tokenize(formula), variables);
    const result = parser.parse();
    return Number.isFinite(result) ? result : fallbackValue;
  } catch {
    return fallbackValue;
  }
};

export const SUPPORTED_FORMULA_FUNCTIONS = Object.keys(FUNCTIONS);
