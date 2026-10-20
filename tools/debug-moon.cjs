const { ASTRO: A, CAL: C } = require('./load.cjs');
const stamp = (jd) => A.dateOf(jd).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const bjStamp = (jd) => {
  const dt = new Date(A.dateOf(jd).getTime() + 8 * 3600000);
  return dt.toISOString().slice(0, 16) + ' +08';
};

console.log('平朔时刻（本模型）2025-01 → 2027-04');
let k = A.newMoonIndexAt(A.jdOf(new Date('2025-01-01T00:00Z')));
for (let i = 0; i < 28; i++, k++) {
  const jd = A.newMoonJd(k);
  console.log(`k=${k}  ${stamp(jd)}   ${bjStamp(jd)}`);
}

console.log('\n2025 农历月结构');
let k25 = A.newMoonIndexAt(A.jdOf(new Date('2025-01-01T00:00Z'))) - 1;
for (let i = 0; i < 16; i++, k25++) {
  const m = C.lunarMonthInfo(k25);
  const l1 = A.sunLon(A.newMoonJd(k25));
  const l2 = l1 + A.mod(A.sunLon(A.newMoonJd(k25 + 1)) - l1 + 180, 360) - 180;
  const mid = Math.floor(l2 / 30) - Math.floor((l1 - 1e-6) / 30) > 0;
  console.log(`k=${k25} ${bjStamp(m.start).slice(0, 10)}  月${m.num}${m.isLeap ? '（闰）' : ''}  中气=${mid ? '有' : '无'}  λ ${l1.toFixed(1)}→${l2.toFixed(1)}`);
}
console.log('\n冬至：', stamp(C.winterSolstice(2024)), '|', stamp(C.winterSolstice(2025)), '|', stamp(C.winterSolstice(2026)));
console.log('k11(2024 冬至) =', A.newMoonIndexAt(C.winterSolstice(2024)), ' k11(2025 冬至) =', A.newMoonIndexAt(C.winterSolstice(2025)));
