import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { StoreProvider } from './store.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);

// 오프라인용: 지금 화면에 쓰인 파일과 아이콘을 서비스 워커에 저장해 달라고 보낸다
function precacheList() {
  const same = (u) => u.startsWith(location.origin);
  const used = performance.getEntriesByType('resource').map((e) => e.name).filter(same);
  const extra = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
  const scripts = [...document.querySelectorAll('script[src], link[rel=stylesheet][href]')].map((el) => el.src || el.href).filter(same);
  return [...new Set([...used, ...scripts, ...extra])];
}

if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  const send = (sw) => sw?.postMessage({ precache: precacheList() });
  navigator.serviceWorker.addEventListener('controllerchange', () => send(navigator.serviceWorker.controller));
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data === 'need-precache') send(navigator.serviceWorker.controller);
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => send(reg.active))
      .catch(() => {});
  });
}
