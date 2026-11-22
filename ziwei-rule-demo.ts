import assert from 'node:assert/strict';
import test from 'node:test';
import exampleRule from './example-rule.json' with { type: 'json' };
import { evaluateRule, type Rule } from './src/rules.ts';

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
