import { useEffect, useRef, useState } from 'react';
import { useStore } from './store.jsx';
import { todayParts } from './format.js';
import Today from './components/Today.jsx';
import Calendar from './components/Calendar.jsx';
import Stats from './components/Stats.jsx';
import Settings from './components/Settings.jsx';
import { Icon } from './components/ui.jsx';

const TABS = [
  ['today', '오늘', Icon.today],
  ['cal', '달력', Icon.cal],
  ['stats', '통계', Icon.stats],
];

// 자정이 지나거나 앱으로 돌아오면 '오늘'을 다시 계산한다
function useToday() {
  const [t, setT] = useState(todayParts);
  useEffect(() => {
    const check = () =>
      setT((prev) => {
        const n = todayParts();
        return n.y === prev.y && n.m === prev.m && n.d === prev.d ? prev : n;
      });
    const id = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return t;
}

export default function App() {
  const { status } = useStore();
  const today = useToday();
  const [tab, setTab] = useState('today');
  const [settings, setSettings] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  };

  if (status === 'error') {
    return (
      <div className="app">
        <p className="empty" style={{ margin: 'auto' }}>
          기록을 불러오지 못했어요. 브라우저의 시크릿 모드라면 일반 창에서 열어 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="blob a" aria-hidden="true" />
      <div className="blob b" aria-hidden="true" />
      <div className="blob c" aria-hidden="true" />
      <main>
        {status === 'loading' ? null : settings ? (
          <Settings today={today} onClose={() => setSettings(false)} showToast={showToast} />
        ) : tab === 'today' ? (
          <Today today={today} onOpenSettings={() => setSettings(true)} />
        ) : tab === 'cal' ? (
          <Calendar today={today} />
        ) : (
          <Stats today={today} />
        )}
      </main>
      {!settings && (
        <nav className="tabs" aria-label="메뉴">
          {TABS.map(([id, label, icon]) => (
            <button type="button" key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              {icon}
              {label}
            </button>
          ))}
        </nav>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
