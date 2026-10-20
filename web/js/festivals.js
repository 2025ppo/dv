/* festivals.js — 地球节日清单，以及同一时刻在另外四套历法中的真实读数
 * 节日日期以北京时间编排；投影使用该日北京正午这一确定时刻，避免时区歧义。
 */
window.FEST = (function () {
  const A = window.ASTRO, C = window.CAL;

  /* kind: fixed 公历固定日 | solar 定气（太阳黄经）| lunar 农历 | nth 第 n 个星期 | chuxi 除夕 */
  const DEFS = [
    { name: '元旦', tag: '公历', kind: 'fixed', m: 1, d: 1, note: '格里高利历岁首，1912 年起中国改用' },
    { name: '立春', tag: '节气', kind: 'solar', lon: 315, note: '太阳黄经 315°，四时之始' },
    { name: '春节', tag: '农历', kind: 'lunar', lm: 1, ld: 1, note: '农历正月初一，岁首' },
    { name: '除夕', tag: '农历', kind: 'chuxi', note: '腊月最后一日，岁除' },
    { name: '元宵节', tag: '农历', kind: 'lunar', lm: 1, ld: 15, note: '正月十五，第一个望' },
    { name: '情人节', tag: '国际', kind: 'fixed', m: 2, d: 14, note: '罗马圣瓦伦丁纪念日' },
    { name: '龙抬头', tag: '农历', kind: 'lunar', lm: 2, ld: 2, note: '二月初二，东方苍龙七宿初现' },
    { name: '妇女节', tag: '公历', kind: 'fixed', m: 3, d: 8, note: '1975 年联合国确立' },
    { name: '春分', tag: '节气', kind: 'solar', lon: 0, note: '太阳黄经 0°，全球昼夜均分' },
    { name: '清明', tag: '节气', kind: 'solar', lon: 15, note: '太阳黄经 15°，唯一定气作节日' },
    { name: '上巳', tag: '农历', kind: 'lunar', lm: 3, ld: 3, note: '三月初三，曲水流觞' },
    { name: '劳动节', tag: '公历', kind: 'fixed', m: 5, d: 1, note: '1889 年第二国际确立' },
    { name: '青年节', tag: '公历', kind: 'fixed', m: 5, d: 4, note: '1919 年五四运动纪念日' },
    { name: '母亲节', tag: '国际', kind: 'nth', m: 5, wd: 0, n: 2, note: '5 月第二个星期日' },
    { name: '儿童节', tag: '公历', kind: 'fixed', m: 6, d: 1, note: '1950 年起实行' },
    { name: '端午节', tag: '农历', kind: 'lunar', lm: 5, ld: 5, note: '五月初五，仲夏驱疫' },
    { name: '夏至', tag: '节气', kind: 'solar', lon: 90, note: '太阳黄经 90°，北半球昼最长' },
    { name: '父亲节', tag: '国际', kind: 'nth', m: 6, wd: 0, n: 3, note: '6 月第三个星期日' },
    { name: '七夕', tag: '农历', kind: 'lunar', lm: 7, ld: 7, note: '七月初七，银河相会' },
    { name: '中元节', tag: '农历', kind: 'lunar', lm: 7, ld: 15, note: '七月十五，望日祭先' },
    { name: '教师节', tag: '公历', kind: 'fixed', m: 9, d: 10, note: '1985 年起设立' },
    { name: '秋分', tag: '节气', kind: 'solar', lon: 180, note: '太阳黄经 180°，昼夜均分' },
    { name: '中秋节', tag: '农历', kind: 'lunar', lm: 8, ld: 15, note: '八月十五，团圆之望' },
    { name: '国庆节', tag: '公历', kind: 'fixed', m: 10, d: 1, note: '1949 年中华人民共和国成立' },
    { name: '改历日', tag: '公历', kind: 'fixed', m: 10, d: 15, note: '1582 年格里高利历首次生效' },
    { name: '万圣夜', tag: '国际', kind: 'fixed', m: 10, d: 31, note: '诸圣日前夜' },
    { name: '重阳节', tag: '农历', kind: 'lunar', lm: 9, ld: 9, note: '九月初九，两阳相重' },
    { name: '双十一', tag: '公历', kind: 'fixed', m: 11, d: 11, note: '11 月 11 日，四一相扣' },
    { name: '感恩节', tag: '国际', kind: 'nth', m: 11, wd: 4, n: 4, note: '11 月第四个星期四' },
    { name: '冬至', tag: '节气', kind: 'solar', lon: 270, note: '太阳黄经 270°，北半球夜最长' },
    { name: '腊八', tag: '农历', kind: 'lunar', lm: 12, ld: 8, note: '腊月初八，年之预演' },
    { name: '平安夜', tag: '国际', kind: 'fixed', m: 12, d: 24, note: '圣诞前夜' },
    { name: '圣诞节', tag: '国际', kind: 'fixed', m: 12, d: 25, note: '12 月 25 日' },
    { name: '跨年', tag: '公历', kind: 'fixed', m: 12, d: 31, note: '格里高利历最后一日' }
  ];
  const TAG_COLOR = { 公历: 'civil', 节气: 'solar', 农历: 'lunar', 国际: 'world' };

  const bjNoonAt = (y, m, d) => A.jdOf(new Date(Date.UTC(y, m - 1, d, 4)));
  function nthWeekday(y, m, wd, n) {
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    return { y, m, d: 1 + ((wd - first + 7) % 7) + (n - 1) * 7 };
  }
  function partsOfN(N) { return C.bjCivilOfDay(N); }
  function weekdayOf(y, m, d) { return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
  function nOfParts(y, m, d) { return C.bjDayIndex(bjNoonAt(y, m, d)); }
  function isoOf(y, m, d) { return y + '-' + C.pad2(m) + '-' + C.pad2(d); }

  // 某公历年内，每个节日的“全部出现”（农历/公历错位时允许两次）
  const _yearCache = new Map();
  function yearList(y) {
    if (_yearCache.has(y)) return _yearCache.get(y);
    const out = [];
    const add = (def, N) => {
      const p = partsOfN(N);
      if (p.y !== y) return;
      out.push({
        def, name: def.name, tag: def.tag, cls: TAG_COLOR[def.tag], kind: def.kind, note: def.note,
        y: p.y, m: p.m, d: p.d, N, jd: C.bjNoonJd(N),
        isoDate: isoOf(p.y, p.m, p.d), weekday: weekdayOf(p.y, p.m, p.d),
        lunar: def.kind === 'lunar' ? `${C.LUNAR_MONTH_CN[def.lm - 1]}月${C.LUNAR_DAY_CN[def.ld - 1]}` :
          def.kind === 'chuxi' ? '腊月最后一日' : ''
      });
    };

    for (const def of DEFS) {
      if (def.kind === 'fixed') {
        add(def, nOfParts(y, def.m, def.d));
      } else if (def.kind === 'nth') {
        const c = nthWeekday(y, def.m, def.wd, def.n);
        add(def, nOfParts(c.y, c.m, c.d));
      } else if (def.kind === 'solar') {
        let jd = A.nextSunLon(def.lon, A.jdOf(new Date(Date.UTC(y, 0, 1, 0))) - 12);
        for (let i = 0; i < 2; i++) {
          const N = C.bjDayIndex(jd);
          const p = partsOfN(N);
          if (p.y === y) { add(def, N); break; }
          jd = A.nextSunLon(def.lon, jd + 2);
        }
      } else if (def.kind === 'lunar') {
        let start = A.jdOf(new Date(Date.UTC(y, 0, 1, 4))) - 80;
        for (let i = 0; i < 3; i++) {
          const jd = C.lunarToSolar(def.lm, def.ld, start);
          if (!jd || jd < start) break;
          const N = C.bjDayIndex(jd);
          const p = partsOfN(N);
          if (p.y === y) { add(def, N); break; }
          if (p.y > y) break;
          start = jd + 3;
        }
      } else if (def.kind === 'chuxi') {
        const sf = C.springFestival(new Date(Date.UTC(y, 5, 1, 4)));
        add(def, C.bjDayIndex(sf) - 1);
      }
    }
    out.sort((a, b) => a.N - b.N);
    _yearCache.set(y, out);
    return out;
  }
  function dayMap(y) {
    const map = new Map();
    for (const f of yearList(y)) {
      const key = C.dayKey(f.y, f.m, f.d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    }
    return map;
  }
  const _dayMapCache = new Map();
  function festivalsOn(y, m, d) {
    if (!_dayMapCache.has(y)) _dayMapCache.set(y, dayMap(y));
    return _dayMapCache.get(y).get(C.dayKey(y, m, d)) || [];
  }

  /* ---------- 同一时刻的五历读数 ---------- */
  function projectJd(jd) {
    const ep = C.earthPartsFromJd(jd);
    const mo = C.moonFromJd(jd);
    const ma = C.marsFromJd(jd);
    const ga = C.galaxyFromJd(jd);
    const co = C.cosmosFromJd(jd);
    return {
      jd, earthParts: ep, moonObj: mo, marsObj: ma, galaxyObj: ga, cosmosObj: co,
      earth: {
        text: `${C.EARTH_MONTHS[ep.m - 1]}${ep.d}日`,
        detail: `${ep.y} 年 · ${C.EARTH_WEEK[ep.wd]}`
      },
      moon: {
        text: `${mo.monthName}${C.cn(mo.day)}日`,
        detail: `月球历 ${C.cn(mo.year)} 年 · ${mo.phaseName}`,
        full: mo.label
      },
      mars: {
        text: `${ma.monthName}${ma.day}日`,
        detail: `MY${ma.year} · Ls ${ma.ls.toFixed(1)}°`,
        full: ma.label
      },
      galaxy: {
        text: `${ga.monthName}月${ga.day}日`,
        detail: `G${ga.year} · 银时 ${ga.timeText}`,
        full: ga.label
      },
      cosmos: {
        text: `12月31日`,
        detail: `宇宙时刻 ${co.timeText}`,
        full: co.label
      }
    };
  }
  function project(date) { return projectJd(A.jdOf(date)); }

  function upcoming(nowDate, limit) {
    const now = nowDate || new Date();
    const nowN = C.bjDayIndex(A.jdOf(now));
    const y = C.bjCivilOfDay(nowN).y;
    const pool = yearList(y).concat(yearList(y + 1));
    const seen = new Set();
    const list = pool
      .filter((f) => f.N >= nowN)
      .filter((f) => {
        const key = f.name + ':' + f.isoDate;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.N - b.N)
      .slice(0, limit || 12);
    return list.map((f) => {
      const p = projectJd(f.jd);
      return {
        ...f,
        daysAway: f.N - nowN,
        when: f.N === nowN ? '今天' : f.N === nowN + 1 ? '明天' : f.N - nowN + ' 天后',
        proj: p
      };
    });
  }

  function describeDay(jd) {
    const parts = C.earthPartsFromJd(jd);
    const dayFest = festivalsOn(parts.y, parts.m, parts.d);
    const proj = projectJd(jd);
    return { parts, festivals: dayFest, proj };
  }

  return {
    DEFS, TAG_COLOR, yearList, festivalsOn, project, projectJd, upcoming, describeDay,
    bjNoonAt, nthWeekday, isoOf
  };
})();
