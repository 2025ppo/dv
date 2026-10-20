/* weather.js — 三个真实观测源
 * 地球：Open-Meteo（免密钥，全球预报）
 * 火星：NASA InSight 气象存档（任务已结束，读数为最后公开的 sol）
 * 太阳：NOAA SWPC（Kp、太阳风、GOES X 射线）
 * 所有数据都带来源与时间；网络失败时明确标注缓存/离线快照，不伪装成实时。
 */
window.WX = (function () {
  const DEFAULT_LOCATION = { name: '北京', admin: '中国', lat: 39.9042, lon: 116.4074, tz: 'Asia/Shanghai' };
  const PRESETS = [
    { name: '北京', admin: '中国', lat: 39.9042, lon: 116.4074, tz: 'Asia/Shanghai' },
    { name: '上海', admin: '中国', lat: 31.2304, lon: 121.4737, tz: 'Asia/Shanghai' },
    { name: '广州', admin: '广东', lat: 23.1291, lon: 113.2644, tz: 'Asia/Shanghai' },
    { name: '深圳', admin: '广东', lat: 22.5431, lon: 114.0579, tz: 'Asia/Shanghai' },
    { name: '成都', admin: '四川', lat: 30.5728, lon: 104.0668, tz: 'Asia/Shanghai' },
    { name: '香港', admin: '中国', lat: 22.3193, lon: 114.1694, tz: 'Asia/Hong_Kong' },
    { name: '台北', admin: '台湾', lat: 25.033, lon: 121.5654, tz: 'Asia/Taipei' },
    { name: '东京', admin: '日本', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
    { name: '新加坡', admin: '新加坡', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' },
    { name: '伦敦', admin: '英国', lat: 51.5072, lon: -0.1276, tz: 'Europe/London' },
    { name: '纽约', admin: '美国', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
    { name: '悉尼', admin: '澳大利亚', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' }
  ];

  const WMO = {
    0: ['晴', 'sun'], 1: ['大部晴朗', 'sun'], 2: ['局部多云', 'partly'], 3: ['阴', 'cloud'],
    45: ['雾', 'fog'], 48: ['雾凇', 'fog'],
    51: ['毛毛雨', 'drizzle'], 53: ['毛毛雨', 'drizzle'], 55: ['毛毛雨', 'drizzle'],
    56: ['冻毛毛雨', 'drizzle'], 57: ['冻毛毛雨', 'drizzle'],
    61: ['小雨', 'rain'], 63: ['中雨', 'rain'], 65: ['大雨', 'rain'],
    66: ['冻雨', 'rain'], 67: ['冻雨', 'rain'],
    71: ['小雪', 'snow'], 73: ['中雪', 'snow'], 75: ['大雪', 'snow'], 77: ['米雪', 'snow'],
    80: ['阵雨', 'rain'], 81: ['阵雨', 'rain'], 82: ['强阵雨', 'rain'],
    85: ['阵雪', 'snow'], 86: ['强阵雪', 'snow'],
    95: ['雷暴', 'thunder'], 96: ['雷暴冰雹', 'thunder'], 99: ['雷暴冰雹', 'thunder']
  };
  function weatherOf(code, isDay) {
    const row = WMO[code] || ['未知', 'cloud'];
    let icon = row[1];
    if (icon === 'sun' && isDay === 0) icon = 'moon';
    return { text: row[0], icon, code };
  }
  function windDir(deg) {
    const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    if (deg == null) return '';
    return dirs[Math.round(((deg % 360) / 45)) % 8] + '风';
  }
  function fmtTemp(v, digits) {
    if (v == null || !isFinite(v)) return '--';
    return (Math.round(v * 10) / 10).toFixed(digits || 0);
  }
  function fmtTimeIn(iso, tz) {
    if (!iso) return '--:--';
    try {
      return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz || 'Asia/Shanghai' })
        .format(new Date(iso));
    } catch (e) { return iso.slice(11, 16); }
  }
  function fmtDateIn(iso, tz) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', timeZone: tz || 'Asia/Shanghai' })
        .format(new Date(iso));
    } catch (e) { return iso.slice(5, 10); }
  }
  function shortTime(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' })
        .format(new Date(iso));
    } catch (e) { return iso.slice(11, 16); }
  }
  function aqiLabel(v) {
    if (v == null || !isFinite(v)) return '—';
    if (v <= 50) return '优';
    if (v <= 100) return '良';
    if (v <= 150) return '轻度污染';
    if (v <= 200) return '中度污染';
    if (v <= 300) return '重度污染';
    return '严重污染';
  }
  function locLabel(loc) {
    if (!loc) return DEFAULT_LOCATION.name;
    if (loc.custom) return loc.name || '当前位置';
    return loc.name + (loc.admin && loc.admin !== loc.name ? ' · ' + loc.admin : '');
  }

  async function fetchJSON(url, timeout) {
    const ms = timeout || 14000;
    if (typeof AbortController === 'undefined') return (await fetch(url)).json();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(timer); }
  }
  function readCache(key) {
    try {
      const raw = localStorage.getItem('cosmic-wx:' + key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.at) return null;
      return obj;
    } catch (e) { return null; }
  }
  function writeCache(key, data) {
    try { localStorage.setItem('cosmic-wx:' + key, JSON.stringify({ at: Date.now(), data })); } catch (e) {}
  }

  async function getEarth(loc) {
    const l = loc || DEFAULT_LOCATION;
    const cacheKey = 'earth:' + l.lat.toFixed(2) + ',' + l.lon.toFixed(2);
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + l.lat.toFixed(4) +
      '&longitude=' + l.lon.toFixed(4) +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max' +
      '&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m' +
      '&timezone=auto&forecast_days=14';
    try {
      const airUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + l.lat.toFixed(4) +
        '&longitude=' + l.lon.toFixed(4) + '&current=us_aqi,european_aqi,pm2_5,pm10&timezone=auto';
      const [raw, airRaw] = await Promise.all([
        fetchJSON(url),
        fetchJSON(airUrl, 10000).catch(() => null)
      ]);
      const cur = raw.current || {};
      const airCur = airRaw && airRaw.current ? airRaw.current : null;
      const wx = weatherOf(cur.weather_code, cur.is_day);
      const daily = (raw.daily?.time || []).map((t, i) => {
        const code = raw.daily.weather_code[i];
        const w = weatherOf(code, 1);
        return {
          date: t, code, text: w.text, icon: w.icon,
          max: raw.daily.temperature_2m_max[i], min: raw.daily.temperature_2m_min[i],
          sunrise: raw.daily.sunrise[i], sunset: raw.daily.sunset[i],
          rainChance: raw.daily.precipitation_probability_max?.[i]
        };
      });
      const hourlyRaw = raw.hourly || {};
      const htimes = hourlyRaw.time || [];
      const startAt = (cur.time || '').slice(0, 13) + ':00';
      let hi = htimes.findIndex((t) => t >= startAt);
      if (hi < 0) hi = 0;
      const hourly = htimes.slice(hi, hi + 24).map((t, i) => {
        const code = hourlyRaw.weather_code?.[hi + i];
        const w = weatherOf(code, 1);
        return {
          time: t, label: t.slice(11, 16), temp: hourlyRaw.temperature_2m?.[hi + i],
          code, text: w.text, icon: w.icon, rain: hourlyRaw.precipitation_probability?.[hi + i],
          wind: hourlyRaw.wind_speed_10m?.[hi + i]
        };
      });
      const data = {
        loc: { ...l, tz: raw.timezone || l.tz },
        tz: raw.timezone || l.tz,
        current: {
          temp: cur.temperature_2m, feels: cur.apparent_temperature, humidity: cur.relative_humidity_2m,
          pressure: cur.pressure_msl, wind: cur.wind_speed_10m, windDir: cur.wind_direction_10m,
          windText: windDir(cur.wind_direction_10m), rain: cur.precipitation, cloud: cur.cloud_cover,
          isDay: cur.is_day === 1, time: cur.time, ...wx
        },
        daily,
        hourly,
        air: airCur ? {
          usAqi: airCur.us_aqi, euAqi: airCur.european_aqi,
          pm25: airCur.pm2_5, pm10: airCur.pm10, time: airCur.time
        } : null,
        updatedAt: new Date().toISOString(),
        source: 'Open-Meteo',
        stale: false
      };
      writeCache(cacheKey, data);
      return data;
    } catch (err) {
      const cached = readCache(cacheKey);
      if (cached) return { ...cached.data, stale: true, error: err.message };
      throw err;
    }
  }

  /* NASA InSight 最后 7 个 sol 的公开存档；网络失败时作为明确标注的离线快照 */
  const MARS_SNAPSHOT = [
    { sol: 675, first: '2020-10-19T18:32:20Z', last: '2020-10-20T19:11:55Z', at: { av: -62.314, mn: -96.872, mx: -15.908 }, hws: { av: 7.233, mn: 1.051, mx: 22.455 }, pre: { av: 750.563, mn: 722.09, mx: 768.791 }, north: '初冬' },
    { sol: 676, first: '2020-10-20T19:11:55Z', last: '2020-10-21T19:51:31Z', at: { av: -62.812, mn: -96.912, mx: -16.499 }, hws: { av: 8.526, mn: 1.11, mx: 26.905 }, pre: { av: 749.09, mn: 722.473, mx: 767.143 }, north: '初冬' },
    { sol: 677, first: '2020-10-21T19:51:31Z', last: '2020-10-22T20:31:06Z', at: { av: -63.056, mn: -97.249, mx: -16.853 }, hws: { av: 7.887, mn: 0.511, mx: 23.197 }, pre: { av: 748.698, mn: 720.587, mx: 767.425 }, north: '仲冬' },
    { sol: 678, first: '2020-10-22T20:31:06Z', last: '2020-10-23T21:10:41Z', at: { av: -62.562, mn: -97.728, mx: -9.055 }, hws: { av: 5.246, mn: 0.244, mx: 18.399 }, pre: { av: 743.741, mn: 717.725, mx: 760.283 }, north: '仲冬' },
    { sol: 679, first: '2020-10-23T21:10:41Z', last: '2020-10-24T21:50:16Z', at: { av: -62.551, mn: -96.644, mx: -11.561 }, hws: { av: 5.565, mn: 0.231, mx: 19.409 }, pre: { av: 744.529, mn: 719.418, mx: 763.272 }, north: '仲冬' },
    { sol: 680, first: '2020-10-24T21:50:16Z', last: '2020-10-25T22:29:51Z', at: { av: -61.789, mn: -96.811, mx: -15.298 }, hws: { av: 6.517, mn: 0.275, mx: 24.235 }, pre: { av: 743.99, mn: 717.14, mx: 764.009 }, north: '仲冬' },
    { sol: 681, first: '2020-10-25T22:29:51Z', last: '2020-10-26T23:09:26Z', at: { av: -62.434, mn: -95.447, mx: -4.444 }, hws: { av: 5.632, mn: 0.228, mx: 18.577 }, pre: { av: 743.55, mn: 718.463, mx: 760.224 }, north: '仲冬' }
  ];
  function normalizeMars(rows, stale) {
    const arr = rows.filter(x => x.at && x.at.av != null).sort((a, b) => a.sol - b.sol);
    const latest = arr[arr.length - 1];
    return {
      sol: latest.sol, first: latest.first, last: latest.last,
      temp: latest.at, wind: latest.hws, pressure: latest.pre,
      north: latest.north || latest.Northern_season || '',
      series: arr.slice(-7).map(x => ({ sol: x.sol, avg: x.at.av, min: x.at.mn, max: x.at.mx, wind: x.hws ? x.hws.av : null })),
      updatedAt: latest.last, source: 'NASA InSight', stale: !!stale
    };
  }
  async function getMars() {
    try {
      const raw = await fetchJSON('https://api.nasa.gov/insight_weather/?api_key=DEMO_KEY&feedtype=json&ver=1.0', 16000);
      const rows = Object.keys(raw).filter(k => /^\d+$/.test(k)).map(k => ({
        sol: +k, first: raw[k].First_UTC, last: raw[k].Last_UTC,
        at: raw[k].AT, hws: raw[k].HWS, pre: raw[k].PRE,
        north: raw[k].Northern_season || raw[k].Season
      }));
      if (!rows.length) throw new Error('empty');
      const data = normalizeMars(rows, false);
      writeCache('mars', data);
      return data;
    } catch (err) {
      const cached = readCache('mars');
      if (cached) return { ...cached.data, stale: true, error: err.message };
      return { ...normalizeMars(MARS_SNAPSHOT, true), error: err.message };
    }
  }

  function xrayClass(flux) {
    if (!(flux > 0)) return '—';
    if (flux >= 1e-4) return 'X' + (flux / 1e-4).toFixed(1);
    if (flux >= 1e-5) return 'M' + (flux / 1e-5).toFixed(1);
    if (flux >= 1e-6) return 'C' + (flux / 1e-6).toFixed(1);
    if (flux >= 1e-7) return 'B' + (flux / 1e-7).toFixed(1);
    return 'A' + (flux / 1e-8).toFixed(1);
  }
  function kpLevel(kp) {
    if (kp == null) return { label: '—', level: 0 };
    if (kp >= 9) return { label: 'G5 极端磁暴', level: 5 };
    if (kp >= 8) return { label: 'G4 严重磁暴', level: 4 };
    if (kp >= 7) return { label: 'G3 强磁暴', level: 3 };
    if (kp >= 6) return { label: 'G2 中等磁暴', level: 2 };
    if (kp >= 5) return { label: 'G1 小磁暴', level: 1 };
    if (kp >= 4) return { label: '地磁活跃', level: 0 };
    return { label: '地磁平静', level: 0 };
  }
  async function getSpace() {
    const urls = {
      kp: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
      wind: 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json',
      mag: 'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json',
      xray: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json'
    };
    const keys = Object.keys(urls);
    const results = await Promise.allSettled(keys.map(k => fetchJSON(urls[k], 12000)));
    const out = { source: 'NOAA SWPC', stale: false, errors: [] };
    results.forEach((r, i) => { if (r.status === 'rejected') out.errors.push(keys[i]); });
    const kpR = results[0].status === 'fulfilled' ? results[0].value : null;
    if (Array.isArray(kpR) && kpR.length) {
      const rows = kpR.filter(x => x.Kp != null).slice(-24);
      const last = rows[rows.length - 1];
      out.kp = { value: +last.Kp, time: last.time_tag, label: kpLevel(+last.Kp).label, level: kpLevel(+last.Kp).level };
      out.kpSeries = rows.map(x => ({ t: x.time_tag, v: +x.Kp }));
    }
    const windR = results[1].status === 'fulfilled' ? results[1].value : null;
    if (Array.isArray(windR) && windR.length) {
      const w = windR[0];
      out.wind = { speed: w.proton_speed, time: w.time_tag };
    }
    const magR = results[2].status === 'fulfilled' ? results[2].value : null;
    if (Array.isArray(magR) && magR.length) {
      out.mag = { bt: magR[0].bt, bz: magR[0].bz_gsm, time: magR[0].time_tag };
    }
    const xrR = results[3].status === 'fulfilled' ? results[3].value : null;
    if (Array.isArray(xrR) && xrR.length) {
      const long = xrR.filter(x => x.energy === '0.1-0.8nm' && x.flux > 0);
      if (long.length) {
        const last = long[long.length - 1];
        out.xray = { flux: last.flux, cls: xrayClass(last.flux), time: last.time_tag };
        out.xraySeries = long.slice(-80).map(x => x.flux);
      }
    }
    out.updatedAt = new Date().toISOString();
    if (!out.kp && !out.wind && !out.mag && !out.xray) {
      const cached = readCache('space');
      if (cached) return { ...cached.data, stale: true };
      throw new Error('空间天气暂不可用');
    }
    writeCache('space', out);
    return out;
  }

  async function geocode(q, signal) {
    const url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) +
      '&count=6&language=zh&format=json';
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return (data.results || []).map(x => ({
      name: x.name, admin: x.admin1 || x.admin2 || '', country: x.country || '',
      lat: x.latitude, lon: x.longitude, tz: x.timezone || 'auto'
    }));
  }
  function locate() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('设备不支持定位'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          name: '当前位置', admin: '设备定位', lat: pos.coords.latitude, lon: pos.coords.longitude,
          tz: 'auto', custom: true
        }),
        (err) => reject(new Error(err.code === 1 ? '定位权限未开启' : '暂时无法定位')),
        { timeout: 10000, maximumAge: 600000 }
      );
    });
  }

  return {
    DEFAULT_LOCATION, PRESETS, MARS_SNAPSHOT,
    weatherOf, windDir, fmtTemp, fmtTimeIn, fmtDateIn, shortTime, locLabel, kpLevel, xrayClass, aqiLabel,
    getEarth, getMars, getSpace, geocode, locate
  };
})();
