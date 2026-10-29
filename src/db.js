// 폰 브라우저 안의 데이터베이스(IndexedDB)에 기록을 저장한다.
// 구글 백업(Firebase)은 이 저장소를 기준으로 클라우드와 주고받는다 (sync.js).
//
// days     : 하루 한 줄. { id: '2026-10-29', am: 12, pm: 15, updatedAt }
// months   : 그 달 매출(직접 입력 방식일 때). { id: '2026-10', sales: 4860000, updatedAt }
// settings : { id: 'rules', list: [인센티브 기준...], updatedAt }

const DB_NAME = 'geonsu';
const VERSION = 1; // days, months, settings

export const STORES = ['days', 'months', 'settings'];

let dbPromise;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          location.reload();
        };
        resolve(db);
      };
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function getAll(store) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putMany(store, items) {
  if (!items.length) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const item of items) os.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function put(store, item) {
  return putMany(store, [item]);
}
