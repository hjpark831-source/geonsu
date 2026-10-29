import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getAll, put } from './db.js';
import { isConfigured, lastSyncedAt, signIn, signOutUser, syncNow, watchUser } from './sync.js';
import { clampCount } from './format.js';
import { DEFAULT_RULE, sortRules } from './incentive.js';

const Ctx = createContext(null);

async function loadAll() {
  const [dayRows, monthRows, settingRows] = await Promise.all([getAll('days'), getAll('months'), getAll('settings')]);
  const days = {};
  for (const r of dayRows) days[r.id] = r;
  const months = {};
  for (const r of monthRows) months[r.id] = r;
  const rulesRow = settingRows.find((r) => r.id === 'rules');
  const rules = rulesRow && Array.isArray(rulesRow.list) && rulesRow.list.length ? sortRules(rulesRow.list) : [DEFAULT_RULE];
  return { days, months, rules };
}

export function StoreProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [days, setDays] = useState({});
  const [months, setMonths] = useState({});
  const [rules, setRulesState] = useState([DEFAULT_RULE]);
  const [cloud, setCloud] = useState({ configured: isConfigured, user: null, syncing: false, lastSync: lastSyncedAt(), error: '' });
  const daysRef = useRef(days);
  daysRef.current = days;
  const userRef = useRef(null);
  const timer = useRef(null);

  const reload = useCallback(async () => {
    const d = await loadAll();
    setDays(d.days);
    setMonths(d.months);
    setRulesState(d.rules);
  }, []);

  useEffect(() => {
    reload()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('error'));
  }, [reload]);

  const runSync = useCallback(async () => {
    const user = userRef.current;
    if (!user) return;
    setCloud((c) => ({ ...c, syncing: true, error: '' }));
    try {
      const changed = await syncNow(user);
      if (changed) await reload();
      setCloud((c) => ({ ...c, syncing: false, lastSync: lastSyncedAt() }));
    } catch (e) {
      console.warn('sync', e);
      setCloud((c) => ({ ...c, syncing: false, error: '백업하지 못했어요. 인터넷 연결을 확인해 주세요.' }));
    }
  }, [reload]);

  const scheduleSync = useCallback(() => {
    if (!userRef.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(runSync, 1500);
  }, [runSync]);

  // 구글 로그인 상태 지켜보기 → 로그인되어 있으면 바로 동기화
  useEffect(() => {
    if (!isConfigured || status !== 'ready') return undefined;
    let unsub = () => {};
    let alive = true;
    watchUser((user) => {
      userRef.current = user;
      setCloud((c) => ({ ...c, user: user ? { name: user.displayName || '', email: user.email || '' } : null }));
      if (user) runSync();
    })
      .then((u) => {
        if (alive) unsub = u;
        else u();
      })
      .catch(() => setCloud((c) => ({ ...c, error: '구글 백업을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.' })));
    return () => {
      alive = false;
      unsub();
    };
  }, [status, runSync]);

  // 앱으로 돌아올 때마다 다른 폰에서 바뀐 기록 받기
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') runSync();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [runSync]);

  const setCount = useCallback(
    (key, patch) => {
      const cur = daysRef.current[key] || { am: 0, pm: 0 };
      const next = {
        id: key,
        am: clampCount(patch.am ?? cur.am),
        pm: clampCount(patch.pm ?? cur.pm),
        updatedAt: Date.now(),
      };
      if (next.am === (cur.am || 0) && next.pm === (cur.pm || 0)) return;
      setDays((d) => ({ ...d, [key]: next }));
      put('days', next).then(scheduleSync, () => {});
    },
    [scheduleSync],
  );

  const setMonthSales = useCallback(
    (ym, sales) => {
      const rec = { id: ym, sales: Math.max(0, Math.floor(Number(sales) || 0)), updatedAt: Date.now() };
      setMonths((m) => ({ ...m, [ym]: rec }));
      put('months', rec).then(scheduleSync, () => {});
    },
    [scheduleSync],
  );

  const saveRules = useCallback(
    (list) => {
      const sorted = sortRules(list.length ? list : [DEFAULT_RULE]);
      setRulesState(sorted);
      put('settings', { id: 'rules', list: sorted, updatedAt: Date.now() }).then(scheduleSync, () => {});
    },
    [scheduleSync],
  );

  const connectGoogle = useCallback(async () => {
    setCloud((c) => ({ ...c, error: '' }));
    try {
      await signIn();
    } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user') {
        setCloud((c) => ({ ...c, error: '로그인하지 못했어요. 다시 시도해 주세요.' }));
      }
    }
  }, []);

  const disconnectGoogle = useCallback(async () => {
    await signOutUser();
    userRef.current = null;
    setCloud((c) => ({ ...c, user: null, lastSync: null }));
  }, []);

  const value = useMemo(
    () => ({ status, days, months, rules, cloud, setCount, setMonthSales, saveRules, connectGoogle, disconnectGoogle, syncNow: runSync }),
    [status, days, months, rules, cloud, setCount, setMonthSales, saveRules, connectGoogle, disconnectGoogle, runSync],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
