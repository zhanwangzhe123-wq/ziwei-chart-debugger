export type FactValue = boolean | number | string;
export type ChartFacts = Readonly<Partial<Record<string, FactValue>>>;

type Condition = {
  id: string;
  fact: string;
  equals: FactValue;
};

export type Rule = {
  schemaVersion: number;
  id: string;
  sourceRef: string;
  requires: readonly Condition[];
  blockers: readonly Condition[];
};

type ConditionStatus = 'met' | 'unmet' | 'unknown';
export type RuleStatus = 'matched' | 'blocked' | 'not_matched' | 'insufficient_data';

function checkCondition(condition: Condition, facts: ChartFacts) {
  const observed = Object.hasOwn(facts, condition.fact) ? facts[condition.fact] : undefined;
  let status: ConditionStatus = 'unmet';

  if (observed === undefined) {
    status = 'unknown';
  } else if (observed === condition.equals) {
    status = 'met';
  }

  return { ...condition, observed, status };
}

export function evaluateRule(rule: Rule, facts: ChartFacts) {
  const requires = rule.requires.map((condition) => checkCondition(condition, facts));
  const blockers = rule.blockers.map((condition) => checkCondition(condition, facts));
  let status: RuleStatus = 'matched';

  if (requires.some((check) => check.status === 'unmet')) {
    status = 'not_matched';
  } else if (requires.some((check) => check.status === 'unknown')) {
    status = 'insufficient_data';
  } else if (blockers.some((check) => check.status === 'met')) {
    status = 'blocked';
  } else if (blockers.some((check) => check.status === 'unknown')) {
    status = 'insufficient_data';
  }

  return { ruleId: rule.id, sourceRef: rule.sourceRef, status, requires, blockers };
}

export type RuleResult = ReturnType<typeof evaluateRule>;
