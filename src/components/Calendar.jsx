import { useState } from 'react';
import { useStore } from '../store.jsx';
import { addMonth, dateKey, daysIn, DOW, dowOf, won } from '../format.js';
import { Counter, Icon, useMonthInfo } from './ui.jsx';

export default function Calendar({ today }) {
  const { days, setCount } = useStore();
  const [cal, setCal] = useState({ y: today.y, m: today.m });
  const [sel, setSel] = useState(today.d);
  const info = useMonthInfo(cal.y, cal.m);

  const first = new Date(cal.y, cal.m - 1, 1).getDay();
  const n = daysIn(cal.y, cal.m);
  const todayStamp = today.y * 10000 + today.m * 100 + today.d;
  const selDay = Math.min(sel, n);
  const selKey = dateKey(cal.y, cal.m, selDay);
  const rec = days[selKey] || { am: 0, pm: 0 };
  const selTotal = (rec.am || 0) + (rec.pm || 0);
  const selFuture = cal.y * 10000 + cal.m * 100 + selDay > todayStamp;

  const move = (k) => {
    const next = addMonth(cal, k);
    setCal(next);
    const last = next.y === today.y && next.m === today.m ? today.d : daysIn(next.y, next.m);
    setSel((s) => Math.min(s, last));
  };

  const cells = [];
  for (let i = 0; i < first; i++) cells.push(<span key={`b${i}`} aria-hidden="true" />);
  for (let d = 1; d <= n; d++) {
    const r = days[dateKey(cal.y, cal.m, d)];
    const t = r ? (r.am || 0) + (r.pm || 0) : 0;
    const stamp = cal.y * 10000 + cal.m * 100 + d;
    const cls = ['cell'];
    if (t) cls.push('has');
    if (stamp === todayStamp) cls.push('today');
    if (d === selDay) cls.push('sel');
    cells.push(
      <button
        type="button"
        key={d}
        className={cls.join(' ')}
        disabled={stamp > todayStamp}
        aria-pressed={d === selDay}
        aria-label={`${cal.m}월 ${d}일 ${dowOf(cal.y, cal.m, d)}요일, ${t ? `${t}건` : '기록 없음'}`}
        onClick={() => setSel(d)}
      >
        <span className="d">{d}</span>
        <span className="t">{t || ''}</span>
      </button>,
    );
  }

  return (
    <section className="view" aria-labelledby="t-cal">
      <header className="top">
        <button type="button" className="iconbtn" aria-label="이전 달" onClick={() => move(-1)}>
          {Icon.left}
        </button>
        <h1 id="t-cal">{`${cal.y}년 ${cal.m}월`}</h1>
        <button type="button" className="iconbtn" aria-label="다음 달" onClick={() => move(1)}>
          {Icon.right}
        </button>
      </header>

      <div className="card summary">
        <div className="col">
          <span className="small">{`${cal.m}월 합계`}</span>
          <span className="strong lg">{`${won(info.total)}건`}</span>
        </div>
        <div className="col end">
          <span className="strong">{info.needsSales && !info.manualSales ? '매출 입력 필요' : `${won(info.pay)}원`}</span>
          <span className="small">{info.work ? `근무 ${info.work}일 · 하루 평균 ${(info.total / info.work).toFixed(1)}건` : '아직 기록이 없어요'}</span>
        </div>
      </div>

      <div>
        <div className="dow" aria-hidden="true">
          {DOW.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid" role="group" aria-label="날짜 선택">
          {cells}
        </div>
      </div>

      <div className="sheet">
        <div className="sel-head">
          <span className="sel-title">{`${cal.m}월 ${selDay}일 ${dowOf(cal.y, cal.m, selDay)}요일 · ${selTotal}건`}</span>
          {info.rule.method === 'per' && <span className="small">{`인센티브 ${won(selTotal * info.rule.perRate)}원`}</span>}
        </div>
        {selFuture ? (
          <p className="empty">아직 오지 않은 날이에요.</p>
        ) : (
          <div className="mini">
            <Counter compact id="sel-am" label="오전" value={rec.am || 0} onChange={(v) => setCount(selKey, { am: v })} />
            <Counter compact id="sel-pm" label="오후" value={rec.pm || 0} onChange={(v) => setCount(selKey, { pm: v })} />
          </div>
        )}
      </div>
    </section>
  );
}
