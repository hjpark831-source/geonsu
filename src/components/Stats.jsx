import { useState } from 'react';
import { useStore } from '../store.jsx';
import { addMonth, monthStats, won } from '../format.js';
import { ruleSummary } from '../incentive.js';
import { NumField, useMonthInfo } from './ui.jsx';

export default function Stats({ today }) {
  const { days, setMonthSales } = useStore();
  const list = [];
  for (let i = 5; i >= 0; i--) {
    const ym = addMonth(today, -i);
    list.push({ ...ym, total: monthStats(days, ym.y, ym.m).total });
  }
  const [selIdx, setSelIdx] = useState(5);
  const cur = list[selIdx];
  const info = useMonthInfo(cur.y, cur.m);
  const max = Math.max(1, ...list.map((x) => x.total));
  const missing = info.needsSales && !info.manualSales;

  return (
    <section className="view" aria-labelledby="t-stats">
      <header className="top">
        <div>
          <p className="eyebrow">최근 6개월</p>
          <h1 id="t-stats">통계</h1>
        </div>
      </header>

      <div className="stat-head">
        <p className="eyebrow">{`${cur.m}월 인센티브`}</p>
        <p className="stat-pay">{missing ? '매출 입력 필요' : `${won(info.pay)}원`}</p>
        <p className="eyebrow">{`총 ${won(info.total)}건 · ${ruleSummary(info.rule)}`}</p>
        {info.sales != null && !info.needsSales && <p className="eyebrow">{`매출 ${won(info.sales)}원`}</p>}
      </div>

      {info.needsSales && (
        <label className="card sales-input" htmlFor="month-sales">
          <span>{`${cur.m}월 매출`}</span>
          <span className="inline">
            <NumField id="month-sales" value={info.manualSales} width={140} onChange={(v) => setMonthSales(info.ym, v)} />
            <span>원</span>
          </span>
        </label>
      )}

      <div className="card">
        <div className="bars">
          {list.map((x, i) => (
            <button
              type="button"
              key={`${x.y}-${x.m}`}
              className={i === selIdx ? 'bar on' : 'bar'}
              aria-pressed={i === selIdx}
              aria-label={`${x.y}년 ${x.m}월 ${x.total}건`}
              onClick={() => setSelIdx(i)}
            >
              <span className="v">{won(x.total)}</span>
              <span className="col" style={{ height: `${Math.round((x.total / max) * 150)}px` }} />
              <span className="m">{`${x.m}월`}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <span className="small">하루 평균</span>
          <b>{info.work ? `${(info.total / info.work).toFixed(1)}건` : '-'}</b>
        </div>
        <div className="tile">
          <span className="small">최고 기록</span>
          <b>{info.best ? `${info.best}건` : '-'}</b>
          {info.best ? <span className="small">{`${cur.m}월 ${info.bestDay}일`}</span> : null}
        </div>
        <div className="tile">
          <span className="small">근무일</span>
          <b>{`${info.work}일`}</b>
        </div>
      </div>
    </section>
  );
}
