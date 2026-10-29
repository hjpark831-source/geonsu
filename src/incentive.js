// 인센티브 계산 기준
//
// 기준은 여러 개를 둘 수 있고, 각 기준에는 '적용 시작 달'(start, 'YYYY-MM')이 있다.
// 어느 달의 인센티브는 그 달 이전에 시작한 기준 중 가장 최근 것으로 계산한다.
// 그래서 금액이 바뀌어도 지난 달 인센티브는 그때 기준 그대로 남는다.
//
// method
//   per   : 건당 지급            전체 건수 × perRate
//   over  : 기준 넘은 만큼 지급   (전체 건수 − base) × overRate
//   tier  : 구간별 지급          tiers = [{ upTo: 200, rate: 3000 }, { upTo: null, rate: 5000 }]
//   sales : 매출 기준 % 지급      salesTiers = [{ min: 3000000, pct: 5 }, ...]
//           salesMode 'unit'   → 매출 = 건수 × unitSales,  'manual' → 그 달 매출을 직접 입력
//           applyTo   'all'    → 넘은 기준 중 가장 높은 %를 매출 전체에
//                     'over'   → 기준 넘은 금액에만, 구간마다 그 %로

import { won } from './format.js';

export const METHODS = [
  { id: 'per', title: '건당 지급', desc: '전체 건수 × 1건당 금액' },
  { id: 'over', title: '기준 넘은 만큼 지급', desc: '(전체 건수 − 기준 건수) × 1건당 금액' },
  { id: 'tier', title: '구간별 지급', desc: '건수 구간마다 1건당 금액이 달라요' },
  { id: 'sales', title: '매출 기준 % 지급', desc: '매출이 얼마 이상이면 매출의 몇 %' },
];

export const DEFAULT_RULE = {
  id: 'first',
  start: '2000-01',
  method: 'per',
  perRate: 5000,
  base: 200,
  overRate: 5000,
  tiers: [
    { upTo: 200, rate: 3000 },
    { upTo: null, rate: 5000 },
  ],
  salesMode: 'unit',
  unitSales: 10000,
  salesTiers: [
    { min: 3000000, pct: 5 },
    { min: 5000000, pct: 10 },
  ],
  applyTo: 'all',
};

export const normalizeRule = (r) => ({ ...DEFAULT_RULE, ...r });

export const sortRules = (list) => [...list].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

// 그 달(ym = 'YYYY-MM')에 쓰는 기준
export function ruleFor(list, ym) {
  const sorted = sortRules(list && list.length ? list : [DEFAULT_RULE]);
  let found = sorted[0];
  for (const r of sorted) if (r.start <= ym) found = r;
  return normalizeRule(found);
}

export const usesManualSales = (rule) => rule.method === 'sales' && rule.salesMode === 'manual';

export function salesOf(rule, total, manualSales) {
  return rule.salesMode === 'manual' ? Number(manualSales) || 0 : total * (rule.unitSales || 0);
}

// 한 달 인센티브 (원)
export function calcPay(rule, total, manualSales) {
  const n = Math.max(0, total || 0);
  switch (rule.method) {
    case 'over':
      return Math.max(0, n - (rule.base || 0)) * (rule.overRate || 0);
    case 'tier': {
      const tiers = [...(rule.tiers || [])].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
      let prev = 0;
      let sum = 0;
      for (const t of tiers) {
        const cap = t.upTo == null ? Infinity : t.upTo;
        sum += Math.max(0, Math.min(n, cap) - prev) * (t.rate || 0);
        prev = Math.max(prev, cap);
      }
      return sum;
    }
    case 'sales': {
      const s = salesOf(rule, n, manualSales);
      const tiers = [...(rule.salesTiers || [])].sort((a, b) => (a.min || 0) - (b.min || 0));
      if (rule.applyTo === 'over') {
        let sum = 0;
        tiers.forEach((t, i) => {
          const hi = i + 1 < tiers.length ? tiers[i + 1].min : Infinity;
          sum += Math.max(0, Math.min(s, hi) - (t.min || 0)) * (t.pct || 0);
        });
        return Math.round(sum / 100);
      }
      let pct = 0;
      for (const t of tiers) if (s >= (t.min || 0)) pct = t.pct || 0;
      return Math.round((s * pct) / 100);
    }
    default:
      return n * (rule.perRate || 0);
  }
}

const man = (v) => (v >= 10000 && v % 10000 === 0 ? `${won(v / 10000)}만` : won(v));

// 기준을 한 줄로
export function ruleSummary(rule) {
  switch (rule.method) {
    case 'over':
      return `${won(rule.base)}건 넘은 만큼 1건당 ${won(rule.overRate)}원`;
    case 'tier':
      return `구간별 ${(rule.tiers || []).map((t) => won(t.rate)).join(' / ')}원`;
    case 'sales':
      return `매출 ${(rule.salesTiers || []).map((t) => `${man(t.min)}↑ ${t.pct}%`).join(' · ')} (${rule.applyTo === 'over' ? '넘은 금액' : '전체'})`;
    default:
      return `건당 지급 ${won(rule.perRate)}원`;
  }
}

export const ymLabel = (ym) => (ym <= '2000-01' ? '처음' : `${Number(ym.slice(0, 4))}년 ${Number(ym.slice(5))}월`);
