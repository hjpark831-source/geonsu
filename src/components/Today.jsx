import { useStore } from '../store.jsx';
import { dateKey, dowOf, won } from '../format.js';
import { ruleSummary } from '../incentive.js';
import { Counter, Icon, useMonthInfo } from './ui.jsx';

export default function Today({ today, onOpenSettings }) {
  const { days, setCount } = useStore();
  const { y, m, d } = today;
  const key = dateKey(y, m, d);
  const rec = days[key] || { am: 0, pm: 0 };
  const total = (rec.am || 0) + (rec.pm || 0);
  const info = useMonthInfo(y, m);

  let pill;
  if (info.rule.method === 'per') pill = `오늘 인센티브 ${won(total * info.rule.perRate)}원`;
  else if (info.needsSales && !info.manualSales) pill = '이번 달 매출을 넣으면 인센티브가 계산돼요';
  else pill = `${m}월 예상 인센티브 ${won(info.pay)}원`;

  return (
    <section className="view" aria-labelledby="t-today">
      <header className="top">
        <div>
          <p className="eyebrow">{`${y}년 ${m}월 ${d}일 ${dowOf(y, m, d)}요일`}</p>
          <h1 id="t-today">오늘의 작업</h1>
        </div>
        <button type="button" className="iconbtn" aria-label="설정" onClick={onOpenSettings}>
          {Icon.gear}
        </button>
      </header>

      <div className="hero">
        <p className="eyebrow">오늘 합계</p>
        <p className="big">
          <b>{total}</b>
          <span>건</span>
        </p>
        <p className="pill">{pill}</p>
      </div>

      <div className="sheet">
        <Counter id="today-am" label="오전" value={rec.am || 0} onChange={(v) => setCount(key, { am: v })} />
        <Counter id="today-pm" label="오후" value={rec.pm || 0} onChange={(v) => setCount(key, { pm: v })} />
        <div className="month">
          <div className="l">
            <span className="small">{`${m}월 누적`}</span>
            <span className="strong">{`${won(info.total)}건`}</span>
          </div>
          <div className="r">
            <span className="strong">{info.needsSales && !info.manualSales ? '매출 입력 필요' : `${won(info.pay)}원`}</span>
            <span className="small">{ruleSummary(info.rule)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
