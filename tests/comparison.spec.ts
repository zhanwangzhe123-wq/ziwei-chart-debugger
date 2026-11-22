import { expect, test } from '@playwright/test';

test('shows which single condition changes the result and filters the trace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '紫微命盘对照器' })).toBeVisible();
  await expect(page.getByRole('region', { name: /A\s*参照盘/ }).getByText('成格', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: /B\s*对照盘/ }).getByText('破格', { exact: true })).toBeVisible();

  const table = page.getByRole('table', { name: '规则条件对照' });
  await expect(table.getByRole('row')).toHaveCount(4);
  await page.getByLabel('只看差异').check();
  await expect(table.getByRole('row')).toHaveCount(2);
  const blocker = table.getByRole('row', { name: /示例阻断标记/ });
  await expect(blocker.getByText('未触发', { exact: true })).toBeVisible();
  await expect(blocker.getByText('已触发', { exact: true })).toBeVisible();

  await page.getByText('查看规则定义和来源').click();
  await expect(page.getByText('demo-notes:pattern-01', { exact: true })).toBeVisible();
});

test('distinguishes missing data from a negative fact and swaps the charts', async ({ page }) => {
  await page.goto('/');
  const right = page.getByLabel('选择对照盘');
  await right.selectOption('missing');
  await expect(page.getByRole('region', { name: /B\s*对照盘/ }).getByText('资料不足', { exact: true })).toBeVisible();
  const support = page.getByRole('row', { name: /示例辅星/ });
  await expect(support.getByText('资料缺失', { exact: true })).toBeVisible();

  await right.selectOption('unmet');
  await expect(support.getByText('未满足', { exact: true })).toBeVisible();
  await expect(support.getByText('盘面值 无', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '交换两盘' }).click();
  await expect(page.getByLabel('选择参照盘')).toHaveValue('unmet');
  await expect(right).toHaveValue('baseline');
});

test('keeps comparison controls and the trace usable at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('选择对照盘').selectOption('baseline');
  await page.getByLabel('只看差异').check();
  await expect(page.getByText('当前两张盘在这条规则涉及的字段上一致。')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
