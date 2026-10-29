import { useState } from 'react';
import { useStore } from '../store.jsx';
import { addMonth, pad, won } from '../format.js';
import { calcPay, METHODS, normalizeRule, ruleFor, ruleSummary, salesOf, sortRules, ymLabel } from '../incentive.js';
import { Icon, NumField, useMonthInfo } from './ui.jsx';

const FIRST = '2000-01';
const ymOf = ({ y, m }) => `${y}-${pad(m)}`;
const parseYm = (ym) => ({ y: Number(ym.slice(0, 4)), m: Number(ym.slice(5)) });

function Seg({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map(([id, label]) => (
        <button type="button" key={id} className={value === id ? 'on' : ''} aria-pressed={value === id} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Settings({ today, onClose, showToast }) {
  const { rules, saveRules, cloud, connectGoogle, disconnectGoogle, syncNow } = useStore();
  const thisYm = ymOf(today);
  const [draft, setDraft] = useState(() => ruleFor(rules, thisYm));
  const info = useMonthInfo(today.y, today.m);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const shiftStart = (k) => {
    if (draft.start === FIRST) {
      if (k > 0) set({ start: thisYm });
      return;
    }
    const next = ymOf(addMonth(parseYm(draft.start), k));
    set({ start: next < '2020-01' ? FIRST : next });
  };

  const save = () => {
    const list = rules.filter((r) => r.start !== draft.start);
    const rule = { ...normalizeRule(draft), id: `r-${draft.start}` };
    saveRules(sortRules([...list, rule]));
    showToast(`${draft.start === FIRST ? '처음' : ymLabel(draft.start)}부터 적용하도록 저장했어요`);
  };
  const remove = (start) => {
    const list = rules.filter((r) => r.start !== start);
    saveRules(list);
    if (draft.start === start) setDraft(ruleFor(list, thisYm));
    showToast('기준을 지웠어요');
  };

  // 구간별 지급
  const tiers = [...draft.tiers].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
  const setTier = (i, patch) => set({ tiers: tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const addTier = () => {
    const lastCap = tiers.length > 1 ? tiers[tiers.length - 2].upTo : 0;
    const copy = [...tiers];
    copy.splice(tiers.length - 1, 0, { upTo: (lastCap || 0) + 100, rate: tiers[tiers.length - 1].rate });
    set({ tiers: copy });
  };
  // 매출 기준
  const sTiers = [...draft.salesTiers].sort((a, b) => a.min - b.min);
  const setSTier = (i, patch) => set({ salesTiers: sTiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const addSTier = () => {
    const last = sTiers[sTiers.length - 1];
    set({ salesTiers: [...sTiers, { min: (last?.min || 0) + 1000000, pct: (last?.pct || 0) + 1 }] });
  };

  const sampleSales = draft.salesMode === 'manual' ? info.manualSales : salesOf(draft, info.total, 0);
  const preview = calcPay(draft, info.total, info.manualSales);

  return (
    <section className="view settings" aria-labelledby="t-set">
      <header className="top start">
        <button type="button" className="iconbtn" aria-label="닫기" onClick={onClose}>
          {Icon.left}
        </button>
        <h1 id="t-set">설정</h1>
      </header>

      <section className="group" aria-labelledby="h-method">
        <h2 id="h-method">인센티브 계산 방식</h2>
        {METHODS.map((mt) => (
          <button type="button" key={mt.id} className={draft.method === mt.id ? 'choice on' : 'choice'} aria-pressed={draft.method === mt.id} onClick={() => set({ method: mt.id })}>
            <span className="choice-text">
              <b>{mt.title}</b>
              <span>{mt.desc}</span>
            </span>
            <span className="radio" aria-hidden="true" />
          </button>
        ))}
      </section>

      <section className="card group" aria-labelledby="h-amount">
        <h2 id="h-amount">금액</h2>
        {draft.method === 'per' && (
          <label className="field-row" htmlFor="per-rate">
            1건당 금액
            <span className="inline">
              <NumField id="per-rate" value={draft.perRate} onChange={(v) => set({ perRate: v })} />원
            </span>
          </label>
        )}
        {draft.method === 'over' && (
          <>
            <label className="field-row" htmlFor="base">
              한 달 기준 건수
              <span className="inline">
                <NumField id="base" value={draft.base} onChange={(v) => set({ base: v })} />건
              </span>
            </label>
            <label className="field-row" htmlFor="over-rate">
              넘은 1건당 금액
              <span className="inline">
                <NumField id="over-rate" value={draft.overRate} onChange={(v) => set({ overRate: v })} />원
              </span>
            </label>
            <p className="note">기준 건수까지는 인센티브가 없고, 넘은 건수만 계산해요.</p>
          </>
        )}
        {draft.method === 'tier' && (
          <>
            {tiers.map((t, i) => {
              const from = i === 0 ? 1 : (tiers[i - 1].upTo || 0) + 1;
              const isLast = i === tiers.length - 1;
              return (
                <div className="field-row" key={i}>
                  <span className="inline">
                    {isLast ? (
                      `${won(from)}건부터`
                    ) : (
                      <>
                        {`${won(from)} ~`}
                        <NumField value={t.upTo} width={68} label={`${i + 1}번째 구간 마지막 건수`} onChange={(v) => setTier(i, { upTo: Math.max(from, v) })} />건
                      </>
                    )}
                  </span>
                  <span className="inline">
                    <NumField value={t.rate} width={88} label={`${i + 1}번째 구간 1건당 금액`} onChange={(v) => setTier(i, { rate: v })} />원
                    {!isLast && tiers.length > 2 && (
                      <button type="button" className="x" aria-label={`${i + 1}번째 구간 지우기`} onClick={() => set({ tiers: tiers.filter((_, j) => j !== i) })}>
                        {Icon.close}
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
            <button type="button" className="dashed" onClick={addTier}>
              + 구간 추가
            </button>
          </>
        )}
        {draft.method === 'sales' && (
          <>
            <span className="note">매출 계산</span>
            <Seg
              options={[
                ['unit', '건수 × 건당 매출'],
                ['manual', '매달 직접 입력'],
              ]}
              value={draft.salesMode}
              onChange={(v) => set({ salesMode: v })}
            />
            {draft.salesMode === 'unit' ? (
              <label className="field-row" htmlFor="unit-sales">
                1건당 매출
                <span className="inline">
                  <NumField id="unit-sales" value={draft.unitSales} onChange={(v) => set({ unitSales: v })} />원
                </span>
              </label>
            ) : (
              <p className="note">그 달 매출은 통계 화면에서 직접 입력해요.</p>
            )}
            <span className="note">% 적용 대상</span>
            <Seg
              options={[
                ['all', '매출 전체'],
                ['over', '기준 넘은 금액만'],
              ]}
              value={draft.applyTo}
              onChange={(v) => set({ applyTo: v })}
            />
            <p className="note">
              {draft.applyTo === 'all'
                ? '넘은 기준 중 가장 높은 %를 매출 전체에 적용해요.'
                : '기준을 넘은 금액에만 적용해요. 기준이 여러 개면 구간마다 그 %로 나눠 계산해요.'}
            </p>
            <span className="note">지급 기준</span>
            {sTiers.map((t, i) => (
              <div className="field-row" key={i}>
                <span className="inline">
                  매출
                  <NumField value={t.min} width={110} label={`${i + 1}번째 기준 매출`} onChange={(v) => setSTier(i, { min: v })} />
                  원 이상
                </span>
                <span className="inline">
                  <NumField value={t.pct} width={52} decimal label={`${i + 1}번째 기준 퍼센트`} onChange={(v) => setSTier(i, { pct: v })} />%
                  {sTiers.length > 1 && (
                    <button type="button" className="x" aria-label={`${i + 1}번째 기준 지우기`} onClick={() => set({ salesTiers: sTiers.filter((_, j) => j !== i) })}>
                      {Icon.close}
                    </button>
                  )}
                </span>
              </div>
            ))}
            <button type="button" className="dashed" onClick={addSTier}>
              + 기준 추가
            </button>
            <p className="note">첫째 기준보다 매출이 적으면 인센티브가 없어요.</p>
          </>
        )}
      </section>

      <section className="card group" aria-labelledby="h-start">
        <h2 id="h-start">적용 시작</h2>
        <div className="month-pick">
          <button type="button" className="step" aria-label="한 달 앞으로" disabled={draft.start === FIRST} onClick={() => shiftStart(-1)}>
            {Icon.left}
          </button>
          <b>{draft.start === FIRST ? '처음부터' : `${ymLabel(draft.start)}부터`}</b>
          <button type="button" className="step" aria-label="한 달 뒤로" onClick={() => shiftStart(1)}>
            {Icon.right}
          </button>
        </div>
        <p className="note">이 달부터 새 기준으로 계산해요. 지난 달 기록은 그때 기준 그대로 남아요.</p>
      </section>

      <section className="preview" aria-label="미리 계산">
        <div className="col">
          <span className="small">미리 계산</span>
          <span>
            {`이번 달 ${won(info.total)}건`}
            {draft.method === 'sales' ? ` · 매출 ${won(sampleSales)}원` : ''}
            이면
          </span>
        </div>
        <b>{`${won(preview)}원`}</b>
      </section>

      <button type="button" className="primary" onClick={save}>
        저장
      </button>

      <section className="group" aria-labelledby="h-history">
        <h2 id="h-history">기준 변경 기록</h2>
        <div className="card list">
          {[...rules].reverse().map((r) => (
            <div className="list-row" key={r.start}>
              <button type="button" className="link" onClick={() => setDraft(normalizeRule(r))}>
                <span>{r.start === FIRST ? '처음부터' : `${ymLabel(r.start)}부터`}</span>
                <b>{ruleSummary(normalizeRule(r))}</b>
              </button>
              {rules.length > 1 && (
                <button type="button" className="x" aria-label={`${ymLabel(r.start)} 기준 지우기`} onClick={() => remove(r.start)}>
                  {Icon.close}
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="note">기록을 누르면 위에서 그 기준을 고칠 수 있어요.</p>
      </section>

      <section className="group" aria-labelledby="h-pay">
        <h2 id="h-pay">정산</h2>
        <div className="card list">
          <div className="list-row plain">
            <span>정산 기간</span>
            <b>매월 1일 ~ 말일</b>
          </div>
          <div className="list-row plain">
            <span>지급</span>
            <b>월급과 함께</b>
          </div>
        </div>
      </section>

      <section className="group" aria-labelledby="h-backup">
        <h2 id="h-backup">백업</h2>
        <div className="card backup">
          {cloud.user ? (
            <>
              <div className="col">
                <b>구글 계정 자동 백업</b>
                <span className="small">
                  {cloud.user.email}
                  {cloud.syncing ? ' · 백업 중' : cloud.lastSync ? ` · ${new Date(cloud.lastSync).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })} 백업됨` : ''}
                </span>
              </div>
              <div className="inline">
                <button type="button" className="ghost" onClick={syncNow} disabled={cloud.syncing}>
                  지금 백업
                </button>
                <button type="button" className="ghost" onClick={disconnectGoogle}>
                  로그아웃
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="col">
                <b>구글 계정 자동 백업</b>
                <span className="small">가계부와 같은 구글 계정으로 로그인하면 폰을 바꿔도 기록이 남아요.</span>
              </div>
              <button type="button" className="primary sm" onClick={connectGoogle} disabled={!cloud.configured}>
                구글로 로그인
              </button>
            </>
          )}
          {cloud.error && <p className="error">{cloud.error}</p>}
        </div>
      </section>
    </section>
  );
}
