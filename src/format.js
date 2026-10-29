export const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export const pad = (n) => String(n).padStart(2, '0');
export const won = (n) => Number(n || 0).toLocaleString('ko-KR');

// 'YYYY-MM-DD' (폰의 현지 날짜 기준)
export const dateKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const todayParts = () => {
  const t = new Date();
  return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
};
export const daysIn = (y, m) => new Date(y, m, 0).getDate();
export const dowOf = (y, m, d) => DOW[new Date(y, m - 1, d).getDay()];
export const addMonth = ({ y, m }, n) => {
  const t = new Date(y, m - 1 + n, 1);
  return { y: t.getFullYear(), m: t.getMonth() + 1 };
};

// 0~999 사이 정수로 맞춘다
export const clampCount = (v) => Math.max(0, Math.min(999, Math.floor(Number(v) || 0)));

// 한 달(1일~말일) 합계와 통계
export function monthStats(days, y, m) {
  const prefix = `${y}-${pad(m)}-`;
  let total = 0;
  let work = 0;
  let best = 0;
  let bestDay = 0;
  for (const [id, r] of Object.entries(days)) {
    if (!id.startsWith(prefix)) continue;
    const t = (r.am || 0) + (r.pm || 0);
    if (t > 0) {
      total += t;
      work += 1;
      if (t > best) {
        best = t;
        bestDay = Number(id.slice(8));
      }
    }
  }
  return { total, work, best, bestDay };
}
