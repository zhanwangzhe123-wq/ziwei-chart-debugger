import type { ChartFacts } from './rules.ts';

export const factLabels = {
  hasRequiredPlacement: { palace: '命宫', label: '示例主星出现' },
  hasSupportingRelation: { palace: '官禄宫', label: '示例辅星出现' },
  hasBlockingTransform: { palace: '迁移宫', label: '示例阻断标记出现' },
} as const;

const baseline = { hasRequiredPlacement: true, hasSupportingRelation: true, hasBlockingTransform: false };

type Example = { id: string; title: string; facts: ChartFacts };

export const examples: readonly Example[] = [
  { id: 'baseline', title: '基准盘', facts: baseline },
  { id: 'blocked', title: '破格变体', facts: { ...baseline, hasBlockingTransform: true } },
  {
    id: 'missing',
    title: '资料缺失变体',
    facts: { hasRequiredPlacement: true, hasBlockingTransform: false },
  },
  { id: 'unmet', title: '成立条件未满足', facts: { ...baseline, hasSupportingRelation: false } },
  {
    id: 'unknown-blocker',
    title: '破格字段未录入',
    facts: { hasRequiredPlacement: true, hasSupportingRelation: true },
  },
];
