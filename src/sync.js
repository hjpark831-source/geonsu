// 구글 계정 자동 백업 (Firebase Auth + Firestore) — 가계부 앱과 같은 방식
//
// - 기록은 늘 폰 안(IndexedDB)에 먼저 저장하고, 로그인되어 있으면 클라우드에 올린다.
// - 클라우드 위치: users/{내 계정 ID}/geonsu-days, users/{내 계정 ID}/geonsu-settings
// - 모든 기록에는 updatedAt(수정 시각)이 있다. 같은 기록이 양쪽에 있으면 더 늦게 고친 쪽을 남긴다.
// - 인터넷이 끊겨 못 올린 기록은 다음 동기화 때 다시 올린다.
// - Firebase 코드는 필요할 때만 구글 서버에서 불러온다 (첫 화면 속도에 영향 없음).

import { getAll, putMany, STORES } from './db.js';
import { firebaseConfig, isConfigured } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/11.0.2';
const LS_PUSH = 'geonsu.sync.lastPush';
const LS_PULL = 'geonsu.sync.lastPull';
const LS_DONE_FIRST = 'geonsu.sync.firstDone';

const ls = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, String(v));
    } catch {
      /* 저장 안 돼도 다음 동기화 때 다시 맞춘다 */
    }
  },
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* 무시 */
    }
  },
};

let fb;

async function loadFirebase() {
  if (fb) return fb;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(/* @vite-ignore */ `${SDK}/firebase-app.js`),
    import(/* @vite-ignore */ `${SDK}/firebase-auth.js`),
    import(/* @vite-ignore */ `${SDK}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  await authMod.setPersistence(auth, authMod.browserLocalPersistence);
  const db = fsMod.getFirestore(app);
  fb = { app, auth, db, authMod, fsMod };
  return fb;
}

export { isConfigured };

export async function watchUser(cb) {
  if (!isConfigured) return () => {};
  const { auth, authMod } = await loadFirebase();
  try {
    await authMod.getRedirectResult(auth);
  } catch (e) {
    console.warn('redirect sign-in', e);
  }
  return authMod.onAuthStateChanged(auth, cb);
}

export async function signIn() {
  const { auth, authMod } = await loadFirebase();
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await authMod.signInWithPopup(auth, provider);
  } catch (e) {
    // 홈 화면 앱에서 팝업이 막히면 페이지 이동 방식으로 다시 시도
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) {
      await authMod.signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

export async function signOutUser() {
  const { auth, authMod } = await loadFirebase();
  await authMod.signOut(auth);
  [LS_PUSH, LS_PULL, LS_DONE_FIRST].forEach(ls.del);
}

export function lastSyncedAt() {
  const v = Number(ls.get(LS_PUSH) || 0);
  return v || null;
}

function col(user, store) {
  const { db, fsMod } = fb;
  return fsMod.collection(db, 'users', user.uid, `geonsu-${store}`);
}

// 클라우드 → 폰: 더 새 기록만 반영
async function pull(user) {
  const { fsMod } = fb;
  const since = Number(ls.get(LS_PULL) || 0);
  let maxSeen = since;
  let changed = false;
  for (const store of STORES) {
    const q = since ? fsMod.query(col(user, store), fsMod.where('updatedAt', '>', since)) : col(user, store);
    const snap = await fsMod.getDocs(q);
    if (snap.empty) continue;
    const remote = snap.docs.map((d) => d.data());
    const byId = new Map((await getAll(store)).map((r) => [r.id, r]));
    const take = remote.filter((r) => {
      const mine = byId.get(r.id);
      return !mine || (r.updatedAt || 0) > (mine.updatedAt || 0);
    });
    if (take.length) {
      await putMany(store, take);
      changed = true;
    }
    for (const r of remote) maxSeen = Math.max(maxSeen, r.updatedAt || 0);
  }
  ls.set(LS_PULL, maxSeen);
  return changed;
}

// 폰 → 클라우드: 마지막으로 올린 뒤 바뀐 기록을 올린다
async function push(user) {
  const { db, fsMod } = fb;
  const since = Number(ls.get(LS_PUSH) || 0);
  const firstTime = !ls.get(LS_DONE_FIRST);
  const startedAt = Date.now();
  const writes = [];
  for (const store of STORES) {
    for (const r of await getAll(store)) {
      if (firstTime || (r.updatedAt || 0) > since) writes.push([store, r]);
    }
  }
  for (let i = 0; i < writes.length; i += 400) {
    const batch = fsMod.writeBatch(db);
    for (const [store, r] of writes.slice(i, i + 400)) batch.set(fsMod.doc(col(user, store), String(r.id)), r);
    await batch.commit();
  }
  ls.set(LS_PUSH, startedAt);
  ls.set(LS_DONE_FIRST, 1);
  return writes.length;
}

let running = null;
// 받고 → 올린다. 동시에 두 번 돌지 않게 묶는다. 폰 데이터가 바뀌었으면 true.
export function syncNow(user) {
  if (!running) {
    running = (async () => {
      await loadFirebase();
      const changed = await pull(user);
      await push(user);
      return changed;
    })().finally(() => {
      running = null;
    });
  }
  return running;
}
