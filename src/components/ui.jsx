import { useEffect, useState } from 'react';
import { useStore } from '../store.jsx';
import { monthStats, pad } from '../format.js';
import { calcPay, ruleFor, salesOf, usesManualSales } from '../incentive.js';

export const Icon = {
  gear: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  minus: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg>
  ),
  plus: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
  ),
  left: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
  ),
  right: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
  ),
  close: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
  ),
  today: (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
  ),
  cal: (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
  ),
  stats: (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
  ),
};

// 숫자 입력칸: 입력하는 동안은 글자 그대로 두고, 숫자만 위로 알린다
export function NumField({ id, value, onChange, decimal = false, width = 112, label, ...rest }) {
  const [text, setText] = useState(String(value ?? 0));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value ?? 0));
  }, [value, focused]);
  return (
    <input
      id={id}
      className="numfield"
      style={{ width }}
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={label}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onBlur={() => {
        setFocused(false);
        setText(String(value ?? 0));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '');
        setText(raw);
        const n = decimal ? parseFloat(raw) : parseInt(raw, 10);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      {...rest}
    />
  );
}

// 오전/오후 한 줄: 숫자 + −/+ 버튼
export function Counter({ id, label, value, onChange, compact = false }) {
  return (
    <div className={compact ? 'row compact' : 'row'}>
      <label htmlFor={id} className="counter-label">
        {label}
        <span className="num">
          <NumField id={id} value={value} onChange={onChange} width={`${Math.max(1, String(value).length) + 0.4}ch`} />
          <span>건</span>
        </span>
      </label>
      <div className="steps">
        <button type="button" className="step" aria-label={`${label} 1건 빼기`} onClick={() => onChange(Math.max(0, value - 1))}>
          {Icon.minus}
        </button>
        <button type="button" className="step plus" aria-label={`${label} 1건 더하기`} onClick={() => onChange(value + 1)}>
          {Icon.plus}
        </button>
      </div>
    </div>
  );
}

// 한 달 합계 + 그 달 기준으로 계산한 인센티브
export function useMonthInfo(y, m) {
  const { days, months, rules } = useStore();
  const ym = `${y}-${pad(m)}`;
  const st = monthStats(days, y, m);
  const rule = ruleFor(rules, ym);
  const manualSales = months[ym]?.sales || 0;
  const needsSales = usesManualSales(rule);
  return {
    ym,
    ...st,
    rule,
    needsSales,
    manualSales,
    sales: rule.method === 'sales' ? salesOf(rule, st.total, manualSales) : null,
    pay: calcPay(rule, st.total, manualSales),
  };
}
