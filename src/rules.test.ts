import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import rule from '../example-rule.json';
import schema from '../rule.schema.json';
import { examples } from './examples.ts';
import { evaluateRule, type RuleStatus } from './rules.ts';

const expected: Record<string, RuleStatus> = {
  baseline: 'matched',
  blocked: 'blocked',
  missing: 'insufficient_data',
  unmet: 'not_matched',
  'unknown-blocker': 'insufficient_data',
};

describe('public fixtures', () => {
  it.each(examples)('evaluates $id and preserves its rule references', ({ id, facts }) => {
    const result = evaluateRule(rule, facts);
    expect(result.status).toBe(expected[id]);
    expect(result.ruleId).toBe(rule.id);
    expect(result.sourceRef).toBe(rule.sourceRef);
  });

  it('retains the difference between an absent fact and false', () => {
    const absent = evaluateRule(rule, { hasRequiredPlacement: true });
    const present = evaluateRule(rule, { hasRequiredPlacement: true, hasSupportingRelation: false });
    expect(absent.requires[1]).toMatchObject({ id: 'support', observed: undefined, status: 'unknown' });
    expect(present.requires[1]).toMatchObject({ id: 'support', observed: false, status: 'unmet' });
  });
});

describe('versioned rule schema', () => {
  const validate = new Ajv2020({ strict: true }).compile(schema);

  it('accepts the rule used by the interface', () => {
    expect(validate(rule)).toBe(true);
  });

  it('rejects a rule without a source reference', () => {
    const { sourceRef, ...withoutSource } = rule;
    expect(validate(withoutSource)).toBe(false);
    expect(validate.errors?.[0].params).toEqual({ missingProperty: 'sourceRef' });
  });

  it('rejects a non-scalar condition value', () => {
    const blockers = [{ ...rule.blockers[0], equals: { unexpected: true } }];
    expect(validate({ ...rule, blockers })).toBe(false);
  });
});
