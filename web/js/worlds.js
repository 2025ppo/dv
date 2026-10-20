/* worlds.js — 三个世界、站点、地图与可复算的环境模型
 * 站点与人口是设定；坐标、海拔、行星地图来自公开数据。
 * 月球环境是热平衡估算；火星环境是简化气候模型，均明确标注“模型”。
 */
window.WORLDS = (function () {
  const A = window.ASTRO;
  const C = window.CAL;
  const DEG = Math.PI / 180;
  const mod = A.mod;

  const WORLDS = {
    earth: {
      id: 'earth', name: '地球', en: 'EARTH', code: 'EARTH',
      standard: '北京时间', standardShort: 'UTC+8',
      map: 'assets/maps/earth.webp', mapCredit: 'NASA Blue Marble',
      day: '24 小时', color: '#2f6b5b'
    },
    moon: {
      id: 'moon', name: '月球', en: 'MOON', code: 'LUNA',
      standard: '协调世界时', standardShort: 'UTC',
      map: 'assets/maps/moon.webp', mapCredit: 'NASA LRO / LROC',
      day: '29.53 地球日', color: '#7a756c'
    },
    mars: {
      id: 'mars', name: '火星', en: 'MARS', code: 'MARS',
      standard: '火星标准时', standardShort: 'MTC',
      map: 'assets/maps/mars.webp', mapCredit: 'NASA / USGS Viking',
      day: '24 小时 39 分', color: '#a55437'
    }
  };

  const SITES = {
    earth: [
      { id: 'beijing', name: '北京', en: 'BEIJING', code: 'HQ-001', lat: 39.9042, lon: 116.4074, tz: 'Asia/Shanghai', role: '总部', population: '—' },
      { id: 'shanghai', name: '上海', en: 'SHANGHAI', code: 'CN-021', lat: 31.2304, lon: 121.4737, tz: 'Asia/Shanghai', role: '观测站', population: '—' },
      { id: 'singapore', name: '新加坡', en: 'SINGAPORE', code: 'SG-001', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore', role: '赤道站', population: '—' },
      { id: 'london', name: '伦敦', en: 'LONDON', code: 'UK-001', lat: 51.5072, lon: -0.1276, tz: 'Europe/London', role: '观测站', population: '—' },
      { id: 'newyork', name: '纽约', en: 'NEW YORK', code: 'US-001', lat: 40.7128, lon: -74.006, tz: 'America/New_York', role: '观测站', population: '—' },
      { id: 'sydney', name: '悉尼', en: 'SYDNEY', code: 'AU-001', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney', role: '南半球站', population: '—' }
    ],
    moon: [
      { id: 'tranquility', name: '静海站', en: 'TRANQUILLITY', code: 'LUN-01', lat: 0.674, lon: 23.473, role: '行政中心', population: 1284, level: '一级站' },
      { id: 'shackleton', name: '沙克尔顿站', en: 'SHACKLETON', code: 'LUN-02', lat: -89.9, lon: 0, role: '极地冰储', population: 862, level: '一级站' },
      { id: 'procellarum', name: '风暴洋站', en: 'PROCELLARUM', code: 'LUN-03', lat: 18.4, lon: -57.4, role: '工业与发射', population: 2060, level: '一级站' },
      { id: 'crisium', name: '危海站', en: 'CRISIUM', code: 'LUN-04', lat: 17.0, lon: 59.1, role: '通信中继', population: 740, level: '二级站' },
      { id: 'imbrium', name: '雨海站', en: 'IMBRIUM', code: 'LUN-05', lat: 32.8, lon: -15.6, role: '科研与居住', population: 1540, level: '一级站' }
    ],
    mars: [
      { id: 'jezero', name: '杰泽罗站', en: 'JEZERO', code: 'MAR-01', lat: 18.38, lon: 77.58, elev: -2600, role: '行政中心', population: 3120, level: '一级站' },
      { id: 'gale', name: '盖尔站', en: 'GALE', code: 'MAR-02', lat: -5.4, lon: 137.8, elev: -4500, role: '生命科学', population: 2260, level: '一级站' },
      { id: 'elysium', name: '埃律西昂站', en: 'ELYSIUM', code: 'MAR-03', lat: 4.5, lon: 135.9, elev: -2600, role: '气象基准', population: 1880, level: '一级站' },
      { id: 'olympus', name: '奥林帕斯站', en: 'OLYMPUS', code: 'MAR-04', lat: 18.65, lon: -133.8, elev: 21200, role: '高空观测', population: 460, level: '二级站' },
      { id: 'valles', name: '水手谷站', en: 'VALLES', code: 'MAR-05', lat: -13.9, lon: -59.2, elev: -5000, role: '资源开采', population: 940, level: '二级站' }
    ]
  };

  const COLONY = {
    moon: { sites: 5, population: 6486, label: '月球常驻站' },
    mars: { sites: 5, population: 8660, label: '火星常驻站' }
  };

  function sitesOf(world) { return SITES[world] || []; }
  function siteOf(world, id) {
    const list = sitesOf(world);
    return list.find((s) => s.id === id) || list[0];
  }
  function position(site) {
    return { x: ((site.lon + 180) / 360) * 100, y: ((90 - site.lat) / 180) * 100 };
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function deg(v, pos, neg) {
    if (v == null) return '—';
    const d = Math.abs(v);
    return d.toFixed(2) + '°' + (v >= 0 ? pos : neg);
  }
  function coordinate(site) {
    return deg(site.lat, 'N', 'S') + ' · ' + deg(site.lon, 'E', 'W');
  }
  function siteLine(site) {
    return site.code + ' · ' + coordinate(site) + (site.elev != null ? ' · 海拔 ' + site.elev.toLocaleString('en-US') + ' m' : '');
  }
  function total() {
    return Object.keys(COLONY).reduce((sum, k) => sum + COLONY[k].population, 0);
  }

  function formatInZone(date, tz, opts) {
    try {
      return new Intl.DateTimeFormat('zh-CN', Object.assign({ hour12: false, timeZone: tz }, opts)).format(date);
    } catch (e) {
      return '';
    }
  }
  function earthLocal(site, jd) {
    const d = A.dateOf(jd);
    const time = formatInZone(d, site.tz, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = formatInZone(d, site.tz, { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
    return { time, date, tz: site.tz, offset: site.tz.replace('Asia/', '').replace('America/', '').replace('Europe/', '').replace('Australia/', '') };
  }

  function moonState(site, jd) {
    const phase = A.moonPhase(jd);
    const m = C.moonFromJd(jd);
    const subsolar = mod(180 - phase * 360 + 180, 360) - 180;
    const delta = mod(site.lon - subsolar + 180, 360) - 180;
    const localHour = mod(12 + delta / 15, 24);
    const alt = Math.asin(Math.cos(site.lat * DEG) * Math.cos(delta * DEG)) / DEG;
    const day = Math.abs(delta) < 90;
    const illum = A.moonIllumination(phase);
    const tempK = day
      ? 108 + 282 * Math.pow(Math.max(0, Math.sin(alt * DEG)), 0.25)
      : 92 + 30 * Math.pow(Math.max(0, -Math.sin(alt * DEG)), 0.4);
    const tempC = tempK - 273.15;
    const radiation = 1361 * Math.max(0, Math.sin(alt * DEG));
    const toTerm = (day ? 90 - Math.abs(delta) : Math.abs(delta) - 90) / (360 / A.SYNODIC);
    const nearSide = Math.abs(site.lon) < 90;
    return {
      phase, phaseName: C.moonPhaseName(phase), illum, month: m.month, day: m.day, year: m.year, monthLen: m.monthLen,
      localHour, localTime: pad2(Math.floor(localHour)) + ':' + pad2(Math.floor(mod(localHour, 1) * 60)) + ':' + pad2(Math.floor(mod(localHour * 60, 1) * 60)),
      sunAltitude: alt, isDay: day, tempC, tempK, radiation, subsolar, delta,
      nextLightChangeDays: Math.max(0, toTerm), nearSide,
      earthVisible: nearSide,
      condition: day ? '月昼 · 真空' : '月夜 · 真空'
    };
  }

  function marsDeclination(ls) {
    return Math.asin(Math.sin(25.19 * DEG) * Math.sin(ls * DEG)) / DEG;
  }
  function marsSample(site, ls, localHour) {
    const lat = site.lat * DEG;
    const dec = marsDeclination(ls) * DEG;
    const H = (localHour - 12) * 15 * DEG;
    const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;
    const elev = site.elev != null ? site.elev : -2600;
    const dust = 0.24 + 0.34 * Math.max(0, Math.sin((ls - 200) * DEG));
    const seasonal = 15 * Math.cos(lat) * Math.sin(dec);
    const mean = -68 - 0.0025 * elev + seasonal - 0.22 * Math.abs(site.lat);
    const amp = (34 * Math.sqrt(Math.max(0.12, Math.cos(lat)))) + dust * 4;
    const tempC = mean + amp * Math.cos((2 * Math.PI * (localHour - 15)) / 24);
    const pressure = 590 * Math.exp(-elev / 11100) * (1 + 0.14 * Math.sin(ls * DEG + 0.8));
    const wind = 4 + 7 * (0.5 + 0.5 * Math.cos((2 * Math.PI * (localHour - 14)) / 24)) + dust * 8;
    return { tempC, pressure, wind, alt, dust, condition: dust >= 0.5 ? '尘雾 · 干燥' : '晴 · 干燥' };
  }
  function marsState(site, jd) {
    const m = C.marsFromJd(jd);
    const localHour = mod(m.mtc + site.lon / 15, 24);
    const dec = marsDeclination(m.ls);
    const sample = marsSample(site, m.ls, localHour);
    const min = marsSample(site, m.ls, 3).tempC;
    const max = marsSample(site, m.ls, 15).tempC;
    const near = m.ls >= 180 && m.ls <= 330;
    return {
      standardTime: m.timeText, localHour,
      localTime: pad2(Math.floor(localHour)) + ':' + pad2(Math.floor(mod(localHour, 1) * 60)) + ':' + pad2(Math.floor(mod(localHour * 60, 1) * 60)),
      ls: m.ls, season: m.season, year: m.year, month: m.month, day: m.day, monthLen: m.monthLen,
      sol: m.sol, declination: dec, tempC: sample.tempC, minC: min, maxC: max,
      pressurePa: sample.pressure, windMps: sample.wind, altitude: sample.alt, dust: sample.dust,
      condition: sample.condition, dustSeason: near, standardLabel: 'MTC'
    };
  }
  function marsForecast(site, jd, count) {
    const base = C.marsFromJd(jd);
    const out = [];
    for (let i = 0; i < (count || 4); i++) {
      const ls = mod(base.ls + i * 0.524, 360);
      const dayJd = jd + i * 1.02749125;
      const m = C.marsFromJd(dayJd);
      let min = Infinity, max = -Infinity, windSum = 0;
      for (let h = 0; h < 24; h += 2) {
        const s = marsSample(site, ls, h);
        if (s.tempC < min) min = s.tempC;
        if (s.tempC > max) max = s.tempC;
        windSum += s.wind;
      }
      const localHour = mod(base.mtc + site.lon / 15, 24);
      const cur = marsSample(site, ls, localHour);
      out.push({
        day: i, sol: m.sol, month: m.month, dayOfMonth: m.day, ls,
        minC: min, maxC: max, windMps: windSum / 12,
        pressurePa: cur.pressure, dust: cur.dust,
        condition: cur.condition,
        label: i === 0 ? '本火星日' : '第 ' + (i + 1) + ' 火星日'
      });
    }
    return out;
  }
  function marsHourly(site, jd, count) {
    const base = marsState(site, jd);
    const n = count || 24;
    const out = [];
    for (let i = 0; i < n; i++) {
      const localHour = mod(base.localHour + i, 24);
      const ls = mod(base.ls + (i / 24) * 0.524, 360);
      const sample = marsSample(site, ls, localHour);
      out.push({
        label: pad2(Math.floor(localHour)) + '时',
        hour: localHour,
        tempC: sample.tempC,
        windMps: sample.wind,
        condition: sample.condition,
        ls
      });
    }
    return out;
  }
  function moonHourly(site, jd, count) {
    const n = count || 24;
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = jd + i / 24;
      const s = moonState(site, t);
      out.push({
        label: pad2(Math.floor(s.localHour)) + '时',
        hour: s.localHour,
        tempC: s.tempC,
        sunAltitude: s.sunAltitude,
        isDay: s.isDay,
        condition: s.condition
      });
    }
    return out;
  }
  function moonForecast(site, jd, count) {
    const n = count || 7;
    const out = [];
    for (let i = 0; i < n; i++) {
      let min = Infinity, max = -Infinity;
      let dayHours = 0;
      for (let h = 0; h < 24; h += 2) {
        const s = moonState(site, jd + i + h / 24);
        if (s.tempC < min) min = s.tempC;
        if (s.tempC > max) max = s.tempC;
        if (s.isDay) dayHours++;
      }
      const mid = moonState(site, jd + i + 0.5);
      const d = A.dateOf(jd + i);
      out.push({
        day: i,
        label: i === 0 ? '今天' : i === 1 ? '明天' : (d.getUTCMonth() + 1) + '/' + d.getUTCDate(),
        minC: min, maxC: max,
        dayHours: dayHours * 2,
        condition: mid.condition,
        phase: mid.phaseName,
        phaseFrac: mid.phase,
        isDay: mid.isDay
      });
    }
    return out;
  }
  function moonNext(site, jd) {
    const s = moonState(site, jd);
    return {
      isDay: s.isDay,
      days: s.nextLightChangeDays,
      label: s.isDay ? '距日落' : '距日出',
      text: s.nextLightChangeDays < 1
        ? (s.nextLightChangeDays * 24).toFixed(1) + ' 小时'
        : s.nextLightChangeDays.toFixed(1) + ' 天'
    };
  }

  return {
    WORLDS, SITES, COLONY, sitesOf, siteOf, position, coordinate, siteLine, total,
    earthLocal, moonState, marsState, marsForecast, marsHourly, moonHourly, moonForecast, moonNext, marsDeclination
  };
})();
