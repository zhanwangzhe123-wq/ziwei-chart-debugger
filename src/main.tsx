import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import exampleRule from '../example-rule.json';
import { examples, factLabels } from './examples.ts';
import { evaluateRule, type FactValue, type RuleResult } from './rules.ts';
import './styles.css';

const palaces = [
  ['命宫', 1, 1], ['兄弟宫', 1, 2], ['夫妻宫', 1, 3], ['子女宫', 1, 4],
  ['财帛宫', 2, 4], ['疾厄宫', 3, 4], ['迁移宫', 4, 4], ['交友宫', 4, 3],
  ['官禄宫', 4, 2], ['田宅宫', 4, 1], ['福德宫', 3, 1], ['父母宫', 2, 1],
] as const;

const resultLabels: Record<RuleResult['status'], string> = {
  matched: '成格', blocked: '破格', not_matched: '未成格', insufficient_data: '资料不足',
};

type Example = (typeof examples)[number];
type Check = RuleResult['requires'][number];

function factLabel(fact: string) {
  return factLabels[fact as keyof typeof factLabels]?.label ?? fact;
}

function showFact(value: FactValue | undefined) {
  if (value === undefined) return '未录入';
  if (value === true) return '有';
  if (value === false) return '无';
  return String(value);
}

function ChartPanel({ side, example, result, onSelect }: {
  side: 'A' | 'B';
  example: Example;
  result: RuleResult;
  onSelect: (id: string) => void;
}) {
  const checks = [...result.requires, ...result.blockers];

  return (
    <section className="panel" aria-labelledby={`chart-${side}`}>
      <div className="panel-bar">
        <h2 id={`chart-${side}`}><span className="side-index">{side}</span>{side === 'A' ? '参照盘' : '对照盘'}</h2>
        <select aria-label={side === 'A' ? '选择参照盘' : '选择对照盘'} value={example.id} onChange={(event) => onSelect(event.target.value)}>
          {examples.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </div>
      <div className="palace-grid" aria-label={`${example.title}十二宫`}>
        {palaces.map(([palace, row, column]) => {
          const check = checks.find((item) => factLabels[item.fact as keyof typeof factLabels]?.palace === palace);
          return (
            <div className={`palace ${check ? 'relevant' : ''}`} key={palace} style={{ gridRow: row, gridColumn: column }}>
              <span>{palace}</span>
              {check && <strong className={`fact-${check.status}`}>{factLabel(check.fact)} · {showFact(check.observed)}</strong>}
            </div>
          );
        })}
        <div className={`chart-center status-${result.status}`} aria-live="polite">
          <span>{example.title}</span>
          <strong>{resultLabels[result.status]}</strong>
          <span>{result.ruleId}</span>
        </div>
      </div>
    </section>
  );
}

function TraceCell({ check, kind }: { check: Check; kind: 'require' | 'blocker' }) {
  const labels = kind === 'require' ? ['已满足', '未满足'] : ['已触发', '未触发'];
  let label = '资料缺失';
  if (check.status === 'met') label = labels[0];
  if (check.status === 'unmet') label = labels[1];

  return (
    <td className={`trace-value ${kind}-${check.status}`}>
      <strong>{label}</strong><span>盘面值 {showFact(check.observed)}</span>
    </td>
  );
}

function App() {
  const [leftId, setLeftId] = useState('baseline');
  const [rightId, setRightId] = useState('blocked');
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const left = examples.find((item) => item.id === leftId) ?? examples[0];
  const right = examples.find((item) => item.id === rightId) ?? examples[1];
  const leftResult = evaluateRule(exampleRule, left.facts);
  const rightResult = evaluateRule(exampleRule, right.facts);
  const trace = [
    ...leftResult.requires.map((check, index) => ({ check, other: rightResult.requires[index], kind: 'require' as const })),
    ...leftResult.blockers.map((check, index) => ({ check, other: rightResult.blockers[index], kind: 'blocker' as const })),
  ];
  const changed = trace.filter(({ check, other }) => check.observed !== other.observed);
  const visible = differencesOnly ? changed : trace;

  function swapCharts() {
    setLeftId(rightId);
    setRightId(leftId);
  }

  return (
    <main>
      <header className="page-header">
        <div>
          <div className="tag"><span aria-hidden="true" />合成示例</div>
          <h1>紫微命盘对照器</h1>
          <p>并排复核两张命盘，查看同一条规则在哪个条件上改变了结论。</p>
        </div>
        <button className="swap" onClick={swapCharts}><span aria-hidden="true">⇄</span>交换两盘</button>
      </header>

      <div className="panels">
        <ChartPanel side="A" example={left} result={leftResult} onSelect={setLeftId} />
        <ChartPanel side="B" example={right} result={rightResult} onSelect={setRightId} />
      </div>

      <section className="trace" aria-labelledby="trace-heading">
        <header className="trace-header">
          <div>
            <h2 id="trace-heading">判定依据</h2>
            <p>{trace.length} 条条件 <span aria-hidden="true">·</span> {changed.length} 项盘面差异</p>
          </div>
          <label className="filter"><input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} />只看差异</label>
        </header>
        <div className="table-wrap">
          <table aria-label="规则条件对照">
            <thead><tr><th scope="col">条件</th><th scope="col">A 参照盘</th><th scope="col">B 对照盘</th></tr></thead>
            <tbody>
              {visible.map(({ check, other, kind }) => (
                <tr key={check.id} className={check.observed !== other.observed ? 'changed' : undefined}>
                  <th scope="row">
                    <strong>{factLabel(check.fact)}</strong>
                    <span>{kind === 'require' ? '成立条件' : '破格条件'} · 期望值 {showFact(check.equals)}</span>
                  </th>
                  <TraceCell check={check} kind={kind} />
                  <TraceCell check={other} kind={kind} />
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={3} className="empty">当前两张盘在这条规则涉及的字段上一致。</td></tr>}
            </tbody>
          </table>
        </div>
        <details className="definition">
          <summary>查看规则定义和来源</summary>
          <p>来源 <code>{leftResult.sourceRef}</code>。这是用于软件验收的合成规则。</p>
          <pre>{JSON.stringify(exampleRule, null, 2)}</pre>
        </details>
      </section>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing app root');
createRoot(root).render(<StrictMode><App /></StrictMode>);
