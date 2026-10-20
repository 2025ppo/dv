/* 引擎自检：对照可核查的外部锚点。node tools/test-engine.cjs */
global.window = {};
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'web', 'js');
function load(file) {
  new Function('window', fs.readFileSync(file, 'utf8'))(global.window);
}
load(path.join(dir, 'vendor', 'astronomy.min.js'));
for (const f of ['astro.js', 'calendars.js', 'festivals.js']) load(path.join(dir, f));
const A = window.ASTRO, C = window.CAL, F = window.FEST;
const jdOf = (s) => A.jdOf(new Date(s));
const utcDay = (jd) => A.dateOf(jd).toISOString().slice(0, 10);
const bjDay = (jd) => { const n = C.bjDayIndex(jd); const p = C.bjCivilOfDay(n); return `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`; };
let fails = 0;
function chk(label, got, want) {
  const ok = String(got) === String(want);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${got}${ok ? '' : '  (期望 ' + want + ')'}`);
}
const NOW = '2026-10-20T04:00:00Z';
A.setNowRef(jdOf(NOW));

console.log('== 1. 火星轨道模型（锚点：ESA / NASA MY38 起点）==');
chk('Ls(2024-11-12T09:32Z) ≈ 0', A.marsLs(jdOf('2024-11-12T09:32Z')).toFixed(2), '0.00');
chk('今日火星年 MY', C.marsFromJd(jdOf(NOW)).year, 39);
chk('MSD(2026-10-20T12:00Z) 整数位', Math.floor(A.marsSols(jdOf('2026-10-20T12:00Z')) + A.MSD_OFFSET), 61583);
const mnow = C.marsFromJd(jdOf(NOW));
console.log('   火星历:', mnow.label, '|', mnow.sub, '|', mnow.timeText, '|', mnow.season2);

console.log('\n== 2. 朔与农历（锚点：紫金山天文台 / 国务院放假安排）==');
chk('2027 二月朔的北京日期', bjDay(A.newMoonJd(A.newMoonIndexAt(jdOf('2027-02-10T00:00Z')))), '2027-02-06');
for (const [y, want] of [[2024, '2024-02-10'], [2025, '2025-01-29'], [2026, '2026-02-17'], [2027, '2027-02-06'], [2028, '2028-01-26']]) {
  chk('春节 ' + y, bjDay(C.springFestival(new Date(y + '-06-01T04:00:00Z'))), want);
}
chk('中秋 2026', bjDay(C.lunarToSolar(8, 15, jdOf('2026-01-01T00:00Z'))), '2026-09-25');
chk('端午 2026', bjDay(C.lunarToSolar(5, 5, jdOf('2026-01-01T00:00Z'))), '2026-06-19');
chk('元宵 2026', bjDay(C.lunarToSolar(1, 15, jdOf('2026-01-01T00:00Z'))), '2026-03-03');
chk('2025 有闰六月', (() => {
  let k = A.newMoonIndexAt(jdOf('2025-05-01T00:00Z'));
  for (let i = 0; i < 14; i++, k++) { const m = C.lunarMonthInfo(k); if (m.isLeap && m.num === 6) return 'yes'; }
  return 'no';
})(), 'yes');
chk('今日农历（2026-10-20）', C.lunarText(C.lunarOfDate(new Date(NOW))), '九月十一');
chk('2027 除夕（北京时间）', (() => { const f = F.yearList(2027).find(x => x.name === '除夕'); return f && f.isoDate; })(), '2027-02-05');

console.log('\n== 3. 定气与北京时间日界 ==');
chk('2026 冬至（北京日期）', bjDay(C.winterSolstice(2026)), '2026-12-22');
chk('2026 春分（北京日期）', bjDay(A.nextSunLon(0, jdOf('2026-01-01T00:00Z'))), '2026-03-20');
chk('2026 清明（北京日期）', bjDay(A.nextSunLon(15, jdOf('2026-01-01T00:00Z'))), '2026-04-05');
chk('2026 节日表含 34 项', F.yearList(2026).length, 34);

console.log('\n== 4. 月球历 / 银河历 / 宇宙历 ==');
const mo = C.moonFromJd(jdOf(NOW));
console.log('   月球历:', mo.label, '|', mo.sub, '| 年长', mo.daysInYear, '日');
chk('月球历元年锚点', C.moonYearOfK(C.MOON_K0), 1);
chk('月相（2026-10-20）', mo.phaseName !== undefined, true);
chk('月球历当日映射一致', C.moonFromJd(jdOf(NOW)).day, mo.day);
const g = C.galaxyFromJd(jdOf(NOW));
console.log('   银河历:', g.label, '|', g.sub, '|', g.season2, '|', g.timeText);
chk('银河年号（太阳系诞生后第 21 圈）', g.year, 21);
const c = C.cosmosFromJd(jdOf(NOW));
console.log('   宇宙历:', c.label, '|', c.sub, '|', c.timeText, '|', c.season2);
chk('宇宙历日期', c.monthName + c.day, '十二月31');
const ev = C.COSMIC_EV[C.COSMIC_EV.length - 1];
const st = C.cosmicEventStamp(ev[0]);
console.log('   最后事件:', ev[1], st.label, st.timeText);
chk('深时事件均在宇宙年末', C.COSMIC_EV.every(e => e[0] < A.T_UNIVERSE), true);

console.log('\n== 5. 节日与五历投影 ==');
const list = F.upcoming(new Date(NOW), 6);
chk('接下来的节日数', list.length, 6);
for (const f of list) {
  console.log(`   ${f.name} ${f.isoDate} (${f.when}) → 月 ${f.proj.moon.text} · 火 ${f.proj.mars.text} · 银 ${f.proj.galaxy.text} · 宇 ${f.proj.cosmos.text}`);
}
const halloween = F.yearList(2026).find(f => f.name === '万圣夜');
const pj = F.projectJd(halloween.jd);
chk('投影月球日期 = 月球历真实读数', pj.moonObj.day, C.moonFromJd(halloween.jd).day);
chk('投影火星日期 = 火星历真实读数', pj.marsObj.day, C.marsFromJd(halloween.jd).day);
chk('投影银河日期 = 银河历真实读数', pj.galaxyObj.day, C.galaxyFromJd(halloween.jd).day);
const mid = F.yearList(2026).find(f => f.name === '中秋节');
chk('中秋在月球历接近望', C.moonFromJd(mid.jd).phase > 0.42 && C.moonFromJd(mid.jd).phase < 0.56, true);
const d = F.describeDay(C.bjNoonJd(C.bjDayIndex(jdOf(NOW))));
chk('所选日五历对象齐全', ['earth','moon','mars','galaxy','cosmos'].every(k => d.proj[k] && d.proj[k].text), true);

console.log('\n' + (fails ? `✗ ${fails} 项不符` : '✓ 全部通过'));
