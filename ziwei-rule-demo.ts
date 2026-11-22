import assert from 'node:assert/strict';
import test from 'node:test';
import exampleRule from './example-rule.json' with { type: 'json' };

type FactValue = boolean | number | string;
type ChartFacts = Readonly<Partial<Record<string, FactValue>>>;

type Condition = {
  id: string;
  fact: string;
  equals: FactValue;
};

type Rule = {
  schemaVersion: number;
  id: string;
  sourceRef: string;
  requires: readonly Condition[];
  blockers: readonly Condition[];
};

type ConditionStatus = 'met' | 'unmet' | 'unknown';
type RuleStatus = 'matched' | 'blocked' | 'not_matched' | 'insufficient_data';

function checkCondition(condition: Condition, facts: ChartFacts) {
  const observed = facts[condition.fact];
  let status: ConditionStatus = 'unmet';

  if (observed === undefined) {
    status = 'unknown';
  } else if (observed === condition.equals) {
    status = 'met';
  }

  return { ...condition, observed, status };
}

function evaluateRule(rule: Rule, facts: ChartFacts) {
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

// The example rule and chart facts below are synthetic test data.
const rule: Rule = exampleRule;

const baseline = {
  hasRequiredPlacement: true,
  hasSupportingRelation: true,
  hasBlockingTransform: false,
};

test('all requirements met and no blocker: matched', () => {
  const result = evaluateRule(rule, baseline);

  assert.equal(result.status, 'matched');
  assert.equal(result.ruleId, rule.id);
  assert.equal(result.sourceRef, rule.sourceRef);
  assert.deepEqual(result.requires.map((check) => check.status), ['met', 'met']);
  assert.equal(result.blockers[0].status, 'unmet');
});

test('one changed fact triggers the blocker: blocked', () => {
  const result = evaluateRule(rule, { ...baseline, hasBlockingTransform: true });

  assert.equal(result.status, 'blocked');
  assert.equal(result.blockers[0].id, 'blocking-transform');
  assert.equal(result.blockers[0].observed, true);
});

test('required fact omitted: insufficient data', () => {
  const result = evaluateRule(rule, {
    hasRequiredPlacement: true,
    hasBlockingTransform: false,
  });

  assert.equal(result.status, 'insufficient_data');
  assert.equal(result.requires[1].id, 'support');
  assert.equal(result.requires[1].status, 'unknown');
});

test('required fact explicitly false: not matched', () => {
  const result = evaluateRule(rule, { ...baseline, hasSupportingRelation: false });

  assert.equal(result.status, 'not_matched');
  assert.equal(result.requires[1].observed, false);
  assert.equal(result.requires[1].status, 'unmet');
});

test('blocker fact omitted: insufficient data', () => {
  const result = evaluateRule(rule, {
    hasRequiredPlacement: true,
    hasSupportingRelation: true,
  });

  assert.equal(result.status, 'insufficient_data');
  assert.equal(result.blockers[0].status, 'unknown');
});
