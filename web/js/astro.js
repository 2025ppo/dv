/* astro.js — 天文计算内核
 * 朔、太阳视黄经与月相使用 Astronomy Engine（MIT，已本地内置）做高精度解算；
 * 火星太阳黄经采用 NASA GISS Mars24 的经典近似；银河/宇宙尺度是本页的历法设定。
 * 所有函数只做确定性的数值运算，读数可在页面「历法说明」中复核。
 */
window.ASTRO = (function () {
  const Astro = window.Astronomy || null;
  const DEG = Math.PI / 180;
  const MS_DAY = 86400000;
  const J2000 = 2451545.0;
  const TROP_YEAR = 365.2421897;      // 回归年（平太阳日）
  const SOL = 1.0274912514843263;     // 1 sol = 88775.244 s
  const SYNODIC = 29.530588853;       // 平均朔望月

  const mod = (x, m) => ((x % m) + m) % m;
  const sind = (x) => Math.sin(x * DEG);
  const cosd = (x) => Math.cos(x * DEG);

  /* ---------- 儒略日 ---------- */
  function jdOf(date) { return date.getTime() / MS_DAY + 2440587.5; }
  function dateOf(jd) { return new Date((jd - 2440587.5) * MS_DAY); }
  // TT − UTC：2017-01-01 起为 37 s 闰秒 + 32.184 s。误差 <10 s，对历法日期无影响。
  function jdTT(jd) { return jd + 69.184 / 86400; }
  function astroTime(jd) { return Astro ? Astro.MakeTime(dateOf(jd)) : null; }

  /* ---------- 太阳视黄经 ---------- */
  // Astronomy Engine 的地心视黄经；回退到 Meeus 低阶近似（约 ±0.01°）。
  function sunLonMeeus(jd) {
    const T = (jdTT(jd) - J2000) / 36525;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001559 * T * T - 0.00000048 * T * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(M)
      + (0.019993 - 0.000101 * T) * sind(2 * M)
      + 0.000289 * sind(3 * M);
    const w = 125.04 - 1934.136 * T;
    return mod(L0 + C - 0.00569 - 0.00478 * sind(w), 360);
  }
  function sunLon(jd) {
    if (!Astro) return sunLonMeeus(jd);
    return mod(Astro.SunPosition(astroTime(jd)).elon, 360);
  }
  // 求 sunLon == target 的儒略日；参考点附近单调，用牛顿迭代收敛到秒级。
  function solveSunLon(target, jdGuess) {
    let jd = jdGuess;
    for (let i = 0; i < 7; i++) {
      const d = mod(sunLon(jd) - target + 180, 360) - 180;
      if (Math.abs(d) < 1e-10) break;
      jd -= d / (360 / TROP_YEAR);
    }
    return jd;
  }
  function nextSunLon(target, fromJd) {
    const guess = fromJd + mod(target - sunLon(fromJd), 360) * TROP_YEAR / 360;
    let jd = solveSunLon(target, guess);
    if (jd <= fromJd) jd = solveSunLon(target, jd + TROP_YEAR);
    return jd;
  }

  /* ---------- 朔望月 ---------- */
  // 平均朔（只用作高精度搜索的起点）
  function meanNewMoonJd(k) {
    const T = k / 1236.85;
    return 2451550.09766 + SYNODIC * k
      + 0.00015437 * T * T - 0.000000150 * T * T * T + 0.00000000073 * T * T * T * T;
  }
  const _nmCache = new Map();
  function newMoonJd(k) {
    if (_nmCache.has(k)) return _nmCache.get(k);
    let jd;
    if (Astro) {
      const guess = meanNewMoonJd(k);
      const t = Astro.SearchMoonPhase(0, astroTime(guess - 3), 9);
      jd = t ? jdOf(t.date) : guess;
    } else {
      // 回退：Meeus 主周期项（约 ±0.02 日）
      const T = k / 1236.85;
      jd = meanNewMoonJd(k);
      const E = 1 - 0.002516 * T - 0.0000074 * T * T;
      const Mp = 201.5643 + 385.81691829 * k - 0.01075 * T * T;
      const M = 290.0118 + 12.19074912 * k - 0.00014034 * T * T;
      const F = 160.7108 + 13.22935059 * k - 0.0010218 * T * T;
      const Om = 124.7746 - 1.56375588 * k;
      const s = (a) => sind(a);
      jd += -0.40720 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp)
        + 0.01014 * s(2 * M) + 0.00739 * s(2 * Mp - M) - 0.00514 * s(2 * Mp + M)
        + 0.00208 * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * M) - 0.00057 * s(Mp + 2 * M)
        + 0.00056 * E * s(Mp + M) - 0.00042 * E * s(Mp - M) + 0.00042 * E * s(3 * Mp)
        + 0.00038 * E * s(4 * Mp - M) - 0.00024 * E * s(2 * Mp) + 0.00017 * s(Om);
      jd -= 69.184 / 86400;
    }
    _nmCache.set(k, jd);
    return jd;
  }
  function newMoonIndexAt(jd) {
    let k = Math.floor((jd - 2451550.09766) / SYNODIC);
    while (newMoonJd(k) > jd) k--;
    while (newMoonJd(k + 1) <= jd) k++;
    return k;
  }
  // 相位 0=朔，0.5=望。Astronomy Engine 的相位角更平滑、也更快。
  function moonPhase(jd) {
    if (Astro) return mod(Astro.MoonPhase(astroTime(jd)), 360) / 360;
    const k = newMoonIndexAt(jd);
    return mod((jd - newMoonJd(k)) / (newMoonJd(k + 1) - newMoonJd(k)), 1);
  }
  // 被照亮比例
  function moonIllumination(phase) { return (1 - Math.cos(phase * 2 * Math.PI)) / 2; }

  /* ---------- 火星 ---------- */
  // 连续日心角量 h（未取模），Ls = mod(h,360)。常数取自 NASA GISS Mars24 算法。
  function marsH(jd) {
    const d = jdTT(jd) - J2000;
    const M = 19.3871 + 0.52402073 * d;
    const eqc = 10.691 * sind(M) + 0.623 * sind(2 * M) + 0.050 * sind(3 * M)
      + 0.005 * sind(4 * M) + 0.0005 * sind(5 * M);
    return 270.3871 + 0.524038496 * d + eqc;
  }
  function marsLs(jd) { return mod(marsH(jd), 360); }
  function marsSolveH(target, jdGuess) {
    let jd = jdGuess;
    for (let i = 0; i < 10; i++) {
      const d = marsH(jd) - target;
      if (Math.abs(d) < 1e-9) break;
      jd -= d / (360 / (365.25 * SOL));
    }
    return jd;
  }
  // 连续 sol 计数（以 2000-01-06 00:00 TT 为 44796.0），小数部分即 MTC/24
  function marsSols(jd) {
    return (jdTT(jd) - 2451549.5) / 1.0274912517 + 44796.0 - 0.0009626;
  }
  const MSD_OFFSET = 7265.06;

  /* ---------- 深时尺度（本历设定） ---------- */
  const T_UNIVERSE = 13.787e9;   // 宇宙年龄（地球年，Planck 2018）
  const GAL_YEAR = 225e6;        // 银河年（地球年）
  const GAL_PERI_BP = 30e6;      // 上一次近银心点距今（本历设定值）
  const SOL_SYS_BIRTH = 4.57e9;  // 太阳系诞生距今
  // 宇宙历元年之末对齐到 2027-01-01 00:00 UTC；年份数字固定为元年。
  const COSMIC_END_JD = 2461406.5;
  const BB_JD = COSMIC_END_JD - T_UNIVERSE * TROP_YEAR;

  function cosmicPhase(jd) {
    const p = (jd - BB_JD) / (T_UNIVERSE * TROP_YEAR);
    return Math.max(0, Math.min(p, 1 - 1e-12));
  }
  function galacticPhase(jd) {
    // 岁首（相位 0）= 近银心点；设定上一次近银心点距今 GAL_PERI_BP 地球年
    const yearsBefore = (jdOfNowRef() - jd) / TROP_YEAR;
    return mod((GAL_PERI_BP - yearsBefore) / GAL_YEAR, 1);
  }
  let _nowRef = null;
  function setNowRef(jd) { _nowRef = jd; }
  function jdOfNowRef() { return _nowRef == null ? jdOf(new Date()) : _nowRef; }

  return {
    DEG, MS_DAY, J2000, TROP_YEAR, SOL, SYNODIC, mod, sind, cosd,
    jdOf, dateOf, jdTT, astroTime, sunLon, solveSunLon, nextSunLon,
    newMoonJd, newMoonIndexAt, moonPhase, moonIllumination,
    marsH, marsLs, marsSolveH, marsSols, MSD_OFFSET,
    T_UNIVERSE, GAL_YEAR, GAL_PERI_BP, SOL_SYS_BIRTH, BB_JD, COSMIC_END_JD,
    cosmicPhase, galacticPhase, setNowRef, jdOfNowRef
  };
})();
