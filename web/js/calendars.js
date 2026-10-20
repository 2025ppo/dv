/* calendars.js — 五套历法的读数、结构与投影规则
 * 统一时间基准：地球公历与月球历的民用日界取北京时间（UTC+8）；火星使用 MTC。
 * 月球历与银河历是本页的设计历法，规则写在页面的「历法说明」中。
 */
window.CAL = (function () {
  const A = window.ASTRO;
  const mod = A.mod;
  const BJ = 8 / 24;

  const pad2 = (n) => String(n).padStart(2, '0');
  const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
  const cn = (n) => (n >= 0 && n <= 20 ? CN_NUM[n] : String(n));

  /* ---------- 北京时间日号 ---------- */
  function bjDayIndex(jd) { return Math.floor(jd + 0.5 + BJ); }
  function bjCivilOfDay(N) {
    const d = A.dateOf(N - 1 / 6); // 该日 08:00（北京），足够安全地读取年月日
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
  }
  function bjNoonJd(N) { return N - 1 / 3; } // 北京正午 12:00 = UTC 04:00
  function dayKey(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }
  function earthPartsFromJd(jd) {
    const N = bjDayIndex(jd);
    const c = bjCivilOfDay(N);
    const wd = new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay();
    return { y: c.y, m: c.m, d: c.d, N, wd };
  }
  function bjClock(jd) {
    const dayFrac = mod(jd + 0.5 + BJ, 1); // 0 = 北京午夜
    return dayFrac * 86400;
  }
  function clockText(seconds) {
    const s = mod(seconds, 86400);
    const h = Math.floor(s / 3600), m = Math.floor(mod(s, 3600) / 60), sec = Math.floor(mod(s, 60));
    return pad2(h) + ':' + pad2(m) + ':' + pad2(sec);
  }

  /* ---------- 地球历（格里高利历） ---------- */
  const EARTH_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const EARTH_WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const EARTH_WEEK_SHORT = ['日', '一', '二', '三', '四', '五', '六'];
  function isGregLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function daysInGregMonth(y, m) {
    return [31, isGregLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  }
  function earthFromJd(jd) {
    const p = earthPartsFromJd(jd);
    const jan1N = bjDayIndex(A.jdOf(new Date(Date.UTC(p.y, 0, 1, 4))));
    const doy = p.N - jan1N + 1;
    const len = isGregLeap(p.y) ? 366 : 365;
    return {
      cal: 'earth', year: p.y, month: p.m, day: p.d, weekday: p.wd, N: p.N, jd,
      monthName: EARTH_MONTHS[p.m - 1], weekName: EARTH_WEEK[p.wd], weekShort: EARTH_WEEK_SHORT[p.wd],
      monthLen: daysInGregMonth(p.y, p.m), dayOfYear: doy, daysInYear: len, phase: (doy - 1) / len,
      label: `${p.y} 年 ${p.m} 月 ${p.d} 日`,
      sub: `${EARTH_WEEK[p.wd]} · 年内第 ${doy} 天 · ${isGregLeap(p.y) ? '闰年 366 日' : '平年 365 日'}`,
      timeText: clockText(bjClock(jd)),
      timeLabel: '北京时间 UTC+8'
    };
  }
  function earth(date) { return earthFromJd(A.jdOf(date)); }
  function earthMonthDays(y, m) {
    const n = daysInGregMonth(y, m);
    return Array.from({ length: n }, (_, i) => {
      const d = i + 1;
      const jd = A.jdOf(new Date(Date.UTC(y, m - 1, d, 4))); // 北京正午
      const p = earthPartsFromJd(jd);
      return { y, m, d, jd, weekday: p.wd, N: p.N, key: dayKey(y, m, d) };
    });
  }

  /* ---------- 月球历（朔望月为月，十二朔望月为一年，以北京时间日为日界） ---------- */
  const MOON_MONTHS = Array.from({ length: 12 }, (_, i) => ({
    name: (i + 1) + '月',
    full: (i + 1) + '月',
    note: '每个月从一次新月开始。'
  }));
  const MOON_PHASE_NAMES = ['新月', '月牙', '上弦月', '接近满月', '满月', '刚过满月', '下弦月', '残月'];
  function moonPhaseName(phase) {
    return MOON_PHASE_NAMES[Math.floor(mod(phase + 1 / 16, 1) * 8) % 8];
  }
  // 元年起点：阿波罗 11 号发射前最近的一次朔（1969-07-14）
  const APOLLO_JD = A.jdOf(new Date('1969-07-20T20:17:00Z'));
  const MOON_K0 = A.newMoonIndexAt(APOLLO_JD);
  function moonMonthLen(k) { return bjDayIndex(A.newMoonJd(k + 1)) - bjDayIndex(A.newMoonJd(k)); }
  function moonYearOfK(k) { return Math.floor((k - MOON_K0) / 12) + 1; }
  function moonMonthOfK(k) { return mod(k - MOON_K0, 12) + 1; }

  function moonFromJd(jd) {
    const k = A.newMoonIndexAt(jd);
    const startN = bjDayIndex(A.newMoonJd(k));
    const N = bjDayIndex(jd);
    const day = N - startN + 1;
    const len = moonMonthLen(k);
    const phase = A.moonPhase(jd);
    const month = moonMonthOfK(k);
    const year = moonYearOfK(k);
    const daysBefore = (() => {
      let sum = 0;
      for (let i = 0; i < month - 1; i++) sum += moonMonthLen(k - month + 1 + i);
      return sum;
    })();
    const info = MOON_MONTHS[month - 1];
    return {
      cal: 'moon', year, month, day, monthLen: len, phase, k, N, jd,
      illum: A.moonIllumination(phase),
      monthName: info.full, monthShort: info.name, monthNote: info.note,
      phaseName: moonPhaseName(phase),
      label: `月球历 ${year} 年 ${month} 月 ${day} 日`,
      shortLabel: `${year} 年 · ${month} 月 ${day} 日`,
      sub: `${moonPhaseName(phase)} · 月龄 ${(phase * A.SYNODIC).toFixed(1)} 天 · 本月 ${len} 天`,
      season: '每月从一次新月开始',
      dayOfYear: daysBefore + day,
      daysInYear: (() => { let s = 0; const k0 = k - (month - 1); for (let i = 0; i < 12; i++) s += moonMonthLen(k0 + i); return s; })(),
      timeLabel: '日期按北京时间'
    };
  }
  function moon(date) { return moonFromJd(A.jdOf(date)); }
  function moonMonthDays(k) {
    const startN = bjDayIndex(A.newMoonJd(k));
    const len = moonMonthLen(k);
    return Array.from({ length: len }, (_, i) => {
      const jd = bjNoonJd(startN + i);
      return { day: i + 1, N: startN + i, jd, phase: A.moonPhase(jd) };
    });
  }
  function moonDayJd(k, day) { return bjNoonJd(bjDayIndex(A.newMoonJd(k)) + day - 1); }

  /* ---------- 火星历（Ls 每 30° 一月，7 sol 一周） ---------- */
  const MARS_MONTHS = Array.from({ length: 12 }, (_, i) => (i + 1) + '月');
  const MARS_MONTH_NOTE = [
    '北半球春季开始，极地冰盖开始缩小。',
    '春季多风，局部会有沙尘。',
    '接近火星轨道的远日点，白天很长。',
    '北半球夏季，太阳最高。',
    '轨道速度较慢，天空常有灰尘。',
    '南半球夏季，南极几乎全天有阳光。',
    '昼夜平分，进入北半球秋季。',
    '秋季变冷，早晨会有霜。',
    '接近近日点，沙尘天气增多。',
    '北半球冬季，白天最短。',
    '冬季结束，极地冰盖重新变大。',
    '风沙减少，是一年中较平静的月份。'
  ];
  const MARS_WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const MARS_SEASONS = ['春', '夏', '秋', '冬'];
  // 科学锚点：MY1 起点 = 1955-04-11 的 Ls=0；MY39 = 2026-09-30。
  const MY1_CYCLE = -24;
  const solIndexOf = (jd) => Math.floor(A.marsSols(jd));
  function hToJd(hTarget) {
    return A.marsSolveH(hTarget, A.J2000 + (hTarget - 270.3871) / 0.524038496);
  }
  function marsBoundarySol(k30) { return solIndexOf(hToJd(30 * k30)); }
  function solToJd(sol) {
    return 2451549.5 + (sol - 44796.0 + 0.0009626) * A.SOL - 69.184 / 86400;
  }
  let _epochSol = null;
  function marsEpochSol() {
    if (_epochSol === null) _epochSol = solIndexOf(hToJd(360 * MY1_CYCLE));
    return _epochSol;
  }
  function marsSeason(ls) { return MARS_SEASONS[Math.floor(mod(ls, 360) / 90)]; }

  function marsFromJd(jd) {
    const h = A.marsH(jd);
    const k30 = Math.floor(h / 30);
    const month = mod(k30, 12) + 1;
    const my = Math.floor(h / 360) - MY1_CYCLE;
    const sol = solIndexOf(jd);
    const bSol = marsBoundarySol(k30);
    const day = sol - bSol + 1;
    const len = marsBoundarySol(k30 + 1) - bSol;
    const ls = A.marsLs(jd);
    const mtc = mod(A.marsSols(jd), 1) * 24;
    const yearStart = marsBoundarySol(12 * (my + MY1_CYCLE));
    const yearEnd = marsBoundarySol(12 * (my + MY1_CYCLE + 1));
    return {
      cal: 'mars', year: my, month, day, monthLen: len, ls, sol, mtc,
      monthName: MARS_MONTHS[month - 1], monthNote: MARS_MONTH_NOTE[month - 1],
      weekName: MARS_WEEK[mod(sol - marsEpochSol(), 7)],
      season: marsSeason(ls) + '季',
      phase: ls / 360, dayOfYear: sol - yearStart + 1, daysInYear: yearEnd - yearStart,
      label: `火星历 ${my} 年 ${month} 月 ${day} 日`,
      shortLabel: `第${my}年 · ${month}月${day}日`,
      sub: `太阳黄经 ${ls.toFixed(1)}° · 北半球${marsSeason(ls)}季 · ${MARS_WEEK[mod(sol - marsEpochSol(), 7)]}`,
      season2: `本月 ${len} 个火星日`,
      timeText: pad2(Math.floor(mtc)) + ':' + pad2(Math.floor(mod(mtc, 1) * 60)) + ':' + pad2(Math.floor(mod(mtc * 60, 1) * 60)),
      timeLabel: '火星当地时间'
    };
  }
  function mars(date) { return marsFromJd(A.jdOf(date)); }
  function marsYearTable(my) {
    const k0 = 12 * (my + MY1_CYCLE);
    const out = [];
    for (let i = 0; i < 12; i++) {
      const b = marsBoundarySol(k0 + i), n = marsBoundarySol(k0 + i + 1);
      out.push({ month: i + 1, name: MARS_MONTHS[i], startSol: b, len: n - b, note: MARS_MONTH_NOTE[i] });
    }
    return out;
  }
  function marsMonthDays(my, month) {
    const k30 = 12 * (my + MY1_CYCLE) + (month - 1);
    const b = marsBoundarySol(k30), n = marsBoundarySol(k30 + 1);
    return Array.from({ length: n - b }, (_, i) => {
      const sol = b + i;
      const jd = solToJd(sol + 0.28);
      const p = earthPartsFromJd(jd);
      return { day: i + 1, sol, jd, earth: p };
    });
  }
  function marsDateByLs(target, refDate) {
    const my = Math.floor(A.marsH(A.jdOf(refDate)) / 360);
    return hToJd(360 * my + mod(target, 360));
  }

  /* ---------- 银河历（自建：从离银河系中心最近的位置起算，一年 360 个银河日） ---------- */
  const GAL_MONTHS = Array.from({ length: 12 }, (_, i) => (i + 1) + '月');
  const GAL_SEASONS = ['第1季度', '第2季度', '第3季度', '第4季度'];
  function galaxyTime(phi) {
    const dayFrac = mod(phi * 360, 1);
    const h = dayFrac * 24;
    return pad2(Math.floor(h)) + ':' + pad2(Math.floor(mod(h, 1) * 60)) + ':' + pad2(Math.floor(mod(h * 60, 1) * 60));
  }
  function galaxyFromJd(jd) {
    const phi = A.galacticPhase(jd);
    const dayIdx = Math.floor(phi * 360);
    const month = Math.floor(phi * 12) + 1;
    const day = mod(dayIdx, 30) + 1;
    const yearsBefore = (A.jdOfNowRef() - jd) / A.TROP_YEAR;
    const age = A.SOL_SYS_BIRTH - yearsBefore;
    const gy = Math.floor((age - (phi - Math.floor(phi)) * A.GAL_YEAR) / A.GAL_YEAR) + 1;
    const season = GAL_SEASONS[Math.floor((month - 1) / 3)];
    return {
      cal: 'galaxy', year: gy, month, day, phase: phi,
      monthName: GAL_MONTHS[month - 1], season,
      label: `银河历 ${gy} 年 ${month} 月 ${day} 日`,
      shortLabel: `第${gy}年 · ${month}月${day}日`,
      sub: `第 ${gy} 个银河年 · 轨道位置 ${(phi * 100).toFixed(1)}%`,
      season2: `距下次经过银河系中心约 ${((1 - phi) * A.GAL_YEAR / 1e8).toFixed(2)} 亿年`,
      dayOfYear: dayIdx + 1, daysInYear: 360, monthLen: 30,
      sincePeri: phi * A.GAL_YEAR, toPeri: (1 - phi) * A.GAL_YEAR,
      timeText: galaxyTime(phi), timeLabel: '轨道位置与地球年不同'
    };
  }
  function galaxy(date) { return galaxyFromJd(A.jdOf(date)); }
  function galaxyDateByPhase(phi, refDate) {
    const g = galaxy(refDate);
    const p = mod(phi, 1);
    const dayIdx = Math.floor(p * 360);
    const month = Math.floor(p * 12) + 1;
    return {
      year: g.year, month, day: mod(dayIdx, 30) + 1, name: GAL_MONTHS[month - 1],
      label: `${g.year} 年 ${GAL_MONTHS[month - 1]} ${mod(dayIdx, 30) + 1} 日`,
      orbitYears: p * A.GAL_YEAR, season: GAL_SEASONS[Math.floor((month - 1) / 3)],
      timeText: galaxyTime(p)
    };
  }

  /* ---------- 宇宙历（把全部宇宙历史压成一年） ---------- */
  const COSMIC_MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月',
    '8月', '9月', '10月', '11月', '12月'];
  const COSMIC_MLEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const COSMIC_EV = [
    [0, '宇宙诞生', '时间、空间和热辐射的起点。'],
    [3.8e5, '宇宙变透明', '电子和质子结合，光可以自由传播。'],
    [2e8, '第一代恒星', '宇宙结束黑暗期，第一批恒星点亮。'],
    [1.0e9, '最早星系', '气体聚集，第一批星系开始发光。'],
    [9.22e9, '太阳系诞生', '太阳和地球在尘埃盘中形成。'],
    [9.99e9, '最早生命', '海底热泉附近，化学开始自我复制。'],
    [11.39e9, '氧气增加', '微生物让大气中的氧气增多。'],
    [11.99e9, '复杂细胞出现', '细胞有了细胞核，生命开始变得复杂。'],
    [13.19e9, '多细胞生命', '细胞开始合作，生命变得更大。'],
    [13.25e9, '动物大量出现', '眼睛、外壳和捕食关系在短时间内出现。'],
    [13.32e9, '植物登陆', '绿色植物爬上陆地，土壤开始形成。'],
    [13.56e9, '恐龙出现', '恐龙在地球上生活了一亿多年。'],
    [13.721e9, '小行星撞击', '非鸟恐龙消失，哺乳动物有了更多空间。'],
    [13.7807e9, '人类祖先出现', '约 700 万年前，人类和黑猩猩的祖先分开。'],
    [13.7867e9, '现代人出现', '约 30 万年前，非洲出现现代人。'],
    [13.78699e9, '农业与城市', '约 1 万年前，人类开始种植和定居。'],
    [13.786995e9, '文字出现', '约 5,000 年前，记忆可以离开大脑。'],
    [13.78699974e9, '工业与电力', '约 260 年前，人类开始大规模使用化石能源。'],
    [13.78699993e9, '信息与航天', '约 70 年来，人类开始从太空回望地球。']
  ];
  function cosmicDateFromPhi(phi) {
    const p = Math.max(0, Math.min(phi, 1 - 1e-12));
    const year = 1;
    let di = Math.min(364, Math.floor(p * 365));
    let m = 0;
    while (m < 11 && di >= COSMIC_MLEN[m]) { di -= COSMIC_MLEN[m]; m++; }
    const frac = (p * 365 - Math.floor(p * 365)) * 24;
    return {
      year, month: m + 1, day: di + 1, monthName: COSMIC_MONTHS[m],
      hour: Math.floor(frac), minute: Math.floor(mod(frac, 1) * 60),
      second: mod(frac * 3600, 60), dayOfYear: Math.min(365, Math.floor(p * 365) + 1)
    };
  }
  function cosmicTimeText(phi) {
    const c = cosmicDateFromPhi(phi);
    const s = Math.min(c.second, 59.999);
    return `${pad2(c.hour)}:${pad2(c.minute)}:${s.toFixed(3).padStart(6, '0')}`;
  }
  function cosmosFromJd(jd) {
    const phi = A.cosmicPhase(jd);
    const c = cosmicDateFromPhi(phi);
    const t = phi * A.T_UNIVERSE;
    return {
      cal: 'cosmos', year: 1, month: c.month, day: c.day, phase: phi,
      monthName: c.monthName, label: `宇宙历 第 1 年 · ${c.monthName} ${c.day} 日`,
      shortLabel: `第 1 年 · 12月31日`,
      sub: `宇宙年龄 ${(t / 1e8).toFixed(2)} 亿年 · 现在是最后 1 秒`,
      season: '把宇宙历史压成一年',
      season2: `1 宇宙秒 ≈ ${(A.T_UNIVERSE / 31536000).toFixed(1)} 地球年`,
      dayOfYear: c.dayOfYear, daysInYear: 365, monthLen: COSMIC_MLEN[c.month - 1],
      t, timeText: cosmicTimeText(phi), timeLabel: '宇宙钟 · 1 秒 ≈ 437 地球年'
    };
  }
  function cosmos(date) { return cosmosFromJd(A.jdOf(date)); }
  function cosmosDateByPhase(phi) {
    const p = mod(phi, 1);
    const c = cosmicDateFromPhi(p);
    const t = p * A.T_UNIVERSE;
    return { ...c, label: `${c.monthName}${c.day}日`, t, before: A.T_UNIVERSE - t, timeText: cosmicTimeText(p) };
  }
  function cosmicEventStamp(age) {
    const phi = Math.max(0, Math.min(age / A.T_UNIVERSE, 1 - 1e-12));
    const c = cosmicDateFromPhi(phi);
    const s = Math.min(c.second, 59.999);
    const clock = `${pad2(c.hour)}:${pad2(c.minute)}:${s.toFixed(3).padStart(6, '0')}`;
    return { phi, ...c, timeText: clock, label: `${c.monthName}${c.day}日`, full: `12月31日 ${clock}` };
  }
  function fmtEarthYears(y) {
    if (y >= 1e8) return (y / 1e8).toFixed(2) + ' 亿年';
    if (y >= 1e4) return (y / 1e4).toFixed(2) + ' 万年';
    if (y >= 1) return y.toFixed(0) + ' 年';
    return (y * 365.2425).toFixed(1) + ' 天';
  }
  function eventAtPhi(phi) {
    const t = mod(phi, 1) * A.T_UNIVERSE;
    let idx = 0;
    for (let i = 0; i < COSMIC_EV.length; i++) if (COSMIC_EV[i][0] <= t) idx = i;
    return { idx, ev: COSMIC_EV[idx], next: COSMIC_EV[Math.min(idx + 1, COSMIC_EV.length - 1)] };
  }

  /* ---------- 中国农历（定气·定朔·无中气置闰，北京时间为日界） ---------- */
  function winterSolstice(y) {
    return A.solveSunLon(270, A.J2000 + (y - 2000) * A.TROP_YEAR + 355);
  }
  const bjDayStart = (N) => N - 5 / 6;
  function midqiOfMonth(k) {
    const a = bjDayStart(bjDayIndex(A.newMoonJd(k)));
    const b = bjDayStart(bjDayIndex(A.newMoonJd(k + 1)));
    const l1 = A.sunLon(a);
    const l2 = l1 + mod(A.sunLon(b) - l1 + 180, 360) - 180;
    const out = [];
    for (let j = Math.ceil(l1 / 30 - 1e-9); j * 30 < l2 - 1e-9; j++) {
      const t = A.solveSunLon(mod(30 * j, 360), a + mod(30 * j - l1, 360) * A.TROP_YEAR / 360);
      if (t >= a - 1e-9 && t < b - 1e-9) out.push({ lon: mod(30 * j, 360), jd: t });
    }
    return out;
  }
  function hasMidqi(k) { return midqiOfMonth(k).length > 0; }
  function monthIndexOfDay(jd) {
    const N = bjDayIndex(jd);
    let k = A.newMoonIndexAt(jd);
    while (bjDayIndex(A.newMoonJd(k + 1)) <= N) k++;
    while (k > 0 && bjDayIndex(A.newMoonJd(k)) > N) k--;
    return k;
  }
  const _lunarCache = new Map();
  function lunarMonthInfo(k) {
    if (_lunarCache.has(k)) return _lunarCache.get(k);
    const start = A.newMoonJd(k);
    const startN = bjDayIndex(start);
    let y = A.dateOf(bjDayStart(startN) + 0.5).getUTCFullYear();
    if (bjDayIndex(winterSolstice(y)) > startN) y -= 1;
    const k11 = monthIndexOfDay(winterSolstice(y));
    const kEnd = monthIndexOfDay(winterSolstice(y + 1));
    let leapK = -1;
    if (kEnd - k11 === 13) {
      for (let i = k11 + 1; i < kEnd; i++) if (!hasMidqi(i)) { leapK = i; break; }
    }
    let n = k - k11, isLeap = false;
    if (leapK > 0 && k >= leapK) { isLeap = (k === leapK); n = k - k11 - 1; }
    const res = { k, num: mod(10 + n, 12) + 1, isLeap, cycleYear: y, start };
    _lunarCache.set(k, res);
    return res;
  }
  function lunarOfJd(jd) {
    const info = lunarMonthInfo(A.newMoonIndexAt(jd));
    const day = bjDayIndex(jd) - bjDayIndex(info.start) + 1;
    return { year: info.cycleYear + (info.num >= 11 ? 0 : 1), month: info.num, day, isLeap: info.isLeap };
  }
  function lunarOfDate(date) { return lunarOfJd(A.jdOf(date)); }
  const LUNAR_MONTH_CN = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  const LUNAR_DAY_CN = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  function lunarText(l) {
    return `${l.isLeap ? '闰' : ''}${LUNAR_MONTH_CN[l.month - 1]}月${LUNAR_DAY_CN[l.day - 1]}`;
  }
  function lunarToSolar(m, d, fromJd) {
    let k = A.newMoonIndexAt(fromJd) - 2;
    for (let i = 0; i < 40; i++, k++) {
      const info = lunarMonthInfo(k);
      if (info.num === m && !info.isLeap) {
        const jd = info.start + (d - 1);
        if (bjDayIndex(jd) >= bjDayIndex(fromJd)) return jd;
      }
    }
    return fromJd;
  }
  function springFestival(date) {
    const gy = earthPartsFromJd(A.jdOf(date)).y;
    let k = A.newMoonIndexAt(A.jdOf(date)) - 16;
    for (let i = 0; i < 40; i++, k++) {
      const info = lunarMonthInfo(k);
      if (info.num === 1 && !info.isLeap && info.cycleYear + 1 === gy) return info.start;
    }
    return lunarToSolar(1, 1, A.jdOf(date));
  }

  return {
    cn, pad2, EARTH_MONTHS, EARTH_WEEK, EARTH_WEEK_SHORT,
    MARS_MONTHS, MARS_MONTH_NOTE, MARS_WEEK, MARS_SEASONS,
    MOON_MONTHS, MOON_PHASE_NAMES, GAL_MONTHS, GAL_SEASONS,
    COSMIC_MONTHS, COSMIC_MLEN, COSMIC_EV, LUNAR_MONTH_CN, LUNAR_DAY_CN,
    earth, earthFromJd, earthMonthDays, earthPartsFromJd, daysInGregMonth,
    moon, moonFromJd, moonMonthDays, moonDayJd, moonMonthLen, moonYearOfK, moonMonthOfK, MOON_K0,
    mars, marsFromJd, marsYearTable, marsMonthDays, marsDateByLs, marsBoundarySol, solToJd,
    galaxy, galaxyFromJd, galaxyDateByPhase, galaxyTime,
    cosmos, cosmosFromJd, cosmicDateFromPhi, cosmicTimeText, cosmosDateByPhase, cosmicEventStamp,
    eventAtPhi, fmtEarthYears,
    lunarOfDate, lunarOfJd, lunarText, lunarToSolar, springFestival, winterSolstice, lunarMonthInfo,
    moonPhaseName, isGregLeap, dayKey, bjDayIndex, bjCivilOfDay, bjNoonJd, bjClock, clockText,
    hToJd, solIndexOf, MY1_CYCLE, APOLLO_JD
  };
})();
