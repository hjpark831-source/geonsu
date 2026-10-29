// 메모장에 적어 둔 기록을 읽어 날짜별 오전/오후 건수로 바꾼다.
//
// 읽을 수 있는 줄 (한 줄에 하루):
//   10/1 22 + 21 = 43      → 오전 22, 오후 21 (= 뒤 합계는 확인용으로만 씀)
//   10/3 23                → 숫자가 하나면 오전 23, 오후 0
//   2026-10-05 31 / 10.6 18 20 / 10월 8일 17+24 도 읽는다
// 연도가 없으면 올해로 보고, 그 날짜가 오늘보다 뒤면 작년으로 본다.

import { dateKey } from './format.js';

export function parseRecords(text, today) {
  const rows = [];
  const bad = [];
  const todayStamp = today.y * 10000 + today.m * 100 + today.d;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(?:(\d{4})\s*[-./년]\s*)?(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?\s*(.*)$/);
    if (!m) {
      bad.push(line);
      continue;
    }
    let y = m[1] ? Number(m[1]) : today.y;
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!m[1] && y * 10000 + mo * 100 + d > todayStamp) y -= 1;
    const rest = m[4] || '';
    const [left, right] = rest.split('=');
    const nums = (left.match(/\d+/g) || []).map(Number);
    const check = right ? Number((right.match(/\d+/) || [])[0]) : null;
    const valid = mo >= 1 && mo <= 12 && d >= 1 && d <= new Date(y, mo, 0).getDate();
    if (!valid || nums.length === 0 || nums.length > 2) {
      bad.push(line);
      continue;
    }
    const am = nums[0];
    const pm = nums[1] || 0;
    rows.push({ key: dateKey(y, mo, d), y, m: mo, d, am, pm, mismatch: check != null && check !== am + pm });
  }
  // 같은 날짜가 두 번 있으면 뒤쪽을 쓴다
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return { rows: [...byKey.values()].sort((a, b) => (a.key < b.key ? -1 : 1)), bad };
}
