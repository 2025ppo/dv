/* ============================================================
   宇宙日历 · 指数模块 (indices)
   参考手机气象 App 的卡片网格: 标题 / 大数值 / 图形 / 一行说明
   地月日内容随世界适配: 地球看月相, 月面看地像, 火星看地像+太阳
   ============================================================ */
(() => {
  const W = window.WORLDS;
  const A = window.ASTRO;
  const C = window.CAL;
  const cache = {};

  function el() { return document.getElementById('indicesWrap'); }

  /* ---------- SVG 图形 ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  function arc(pct, color) {
    const p = Math.max(0, Math.min(1, pct));
    const a0 = -220, a1 = 40, span = a1 - a0;
    const pt = (t, r) => { const a = (a0 + span * t) * Math.PI / 180; return [50 + r * Math.cos(a), 50 + r * Math.sin(a)]; };
    let ticks = '';
    for (let i = 0; i <= 10; i++) { const [x1, y1] = pt(i / 10, 34), [x2, y2] = pt(i / 10, 40); ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(255,255,255,.35)" stroke-width="${i / 10 <= p ? 3 : 1.4}"/>`; }
    const [nx, ny] = pt(p, 41);
    return `<svg viewBox="0 0 100 78" class="idx-svg">${ticks}<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="3.4" fill="${color}"/></svg>`;
  }
  function dial(value, min, max, unit) {
    const p = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const a = (-220 + 260 * p) * Math.PI / 180;
    const x2 = 50 + 30 * Math.cos(a), y2 = 50 + 30 * Math.sin(a);
    let ticks = '';
    for (let i = 0; i <= 8; i++) { const t = (-220 + 260 * i / 8) * Math.PI / 180; ticks += `<line x1="${(50 + 36 * Math.cos(t)).toFixed(1)}" y1="${(50 + 36 * Math.sin(t)).toFixed(1)}" x2="${(50 + 41 * Math.cos(t)).toFixed(1)}" y2="${(50 + 41 * Math.sin(t)).toFixed(1)}" stroke="rgba(255,255,255,.3)" stroke-width="1.4"/>`; }
    return `<svg viewBox="0 0 100 84" class="idx-svg">${ticks}<line x1="50" y1="50" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="50" cy="50" r="3" fill="#fff"/></svg>`;
  }
  function compass(deg, speed) {
    let ticks = '';
    for (let i = 0; i < 24; i++) { const t = i * 15 * Math.PI / 180; const r1 = i % 6 === 0 ? 30 : 34; ticks += `<line x1="${(50 + r1 * Math.cos(t)).toFixed(1)}" y1="${(50 + r1 * Math.sin(t)).toFixed(1)}" x2="${(50 + 40 * Math.cos(t)).toFixed(1)}" y2="${(50 + 40 * Math.sin(t)).toFixed(1)}" stroke="rgba(255,255,255,.32)" stroke-width="1.3"/>`; }
    const a = (deg - 90) * Math.PI / 180;
    const hx = 50 + 26 * Math.cos(a), hy = 50 + 26 * Math.sin(a);
    const tx = 50 - 26 * Math.cos(a), ty = 50 - 26 * Math.sin(a);
    return `<svg viewBox="0 0 100 100" class="idx-svg sq">${ticks}<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="50" cy="50" r="12" fill="rgba(255,255,255,.14)"/></svg>`;
  }
  function segments(v, max, n) {
    n = n || 10;
    const k = Math.round(Math.max(0, Math.min(1, v / max)) * n);
    let r = '';
    for (let i = 0; i < n; i++) r += `<rect x="${6 + i * 9.2}" y="30" width="7.4" height="22" rx="1.6" fill="rgba(255,255,255,${i < k ? 0.35 + 0.55 * (i / n) : 0.14})"/>`;
    const mx = 6 + (k - 0.5) * 9.2;
    return `<svg viewBox="0 0 100 60" class="idx-svg">${r}<path d="M ${mx.toFixed(1)} 24 l 4 -7 l -8 0 z" fill="#fff"/></svg>`;
  }
  function sunCurve(riseH, setH, nowH, spanH) {
    // 正弦弧: 地平线 + 太阳位置
    spanH = spanH || 24;
    const path = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = 6 + t * 88;
      const ph = (t * spanH - riseH);
      const y = 46 - 30 * Math.sin(Math.PI * ((ph) / Math.max(1, setH - riseH)));
      path.push(`${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const nt = Math.max(0, Math.min(1, nowH / spanH));
    const nx = 6 + nt * 88;
    const ph = (nt * spanH - riseH);
    const ny = 46 - 30 * Math.sin(Math.PI * (ph / Math.max(1, setH - riseH)));
    return `<svg viewBox="0 0 100 60" class="idx-svg"><line x1="4" y1="46" x2="96" y2="46" stroke="rgba(255,255,255,.35)" stroke-width="1"/><path d="${path.join(' ')}" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.6"/><circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="4" fill="#ffd27a"/></svg>`;
  }
  function disk(img, illum, waxing) {
    // 圆面 + 晨昏线(椭圆终止线)
    const r = 34, cx = 50, cy = 42;
    const f = Math.max(0, Math.min(1, illum));
    const rx = r * Math.abs(1 - 2 * f);
    const darkLeft = waxing ? false : true;   // 上弦: 右亮左暗
    const litSide = waxing ? 1 : -1;
    // 暗区 = 半圆(暗侧) + 半椭圆
    const sweepOuter = darkLeft ? 0 : 1;
    const sweepInner = (f > 0.5) ? (darkLeft ? 1 : 0) : (darkLeft ? 0 : 1);
    const d = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweepOuter} ${cx} ${cy + r} A ${rx.toFixed(1)} ${r} 0 0 ${sweepInner} ${cx} ${cy - r} Z`;
    return `<svg viewBox="0 0 100 84" class="idx-svg"><defs><clipPath id="dsk${img.replace(/\W/g, '')}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="#20242a"/><image href="${img}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#dsk${img.replace(/\W/g, '')})"/><path d="${d}" fill="rgba(6,8,12,.88)" clip-path="url(#dsk${img.replace(/\W/g, '')})"/></svg>`;
  }

  /* ---------- 卡片外壳 ---------- */
  function card(title, value, unit, graph, note, wide) {
    return `<div class="idx-card${wide ? ' wide' : ''}"><span class="idx-title">${title}</span><div class="idx-value">${value}${unit ? `<small>${unit}</small>` : ''}</div>${graph ? `<div class="idx-graph">${graph}</div>` : ''}<p class="idx-note">${note}</p></div>`;
  }

  /* ---------- 地球 ---------- */
  async function earthCards(site, jd) {
    const key = site.id;
    const now = Date.now();
    if (!cache[key] || now - cache[key].t > 600000) {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}&current=apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset,uv_index_max&timezone=auto`;
      try {
        const r = await fetch(u); const j = await r.json();
        cache[key] = { t: now, j };
      } catch (e) { cache[key] = { t: now, j: null }; }
    }
    const j = cache[key] && cache[key].j;
    if (!j) return [card('指数', '—', '', '', '观测暂不可用')];
    const c = j.current || {}, d = j.daily || {};
    const feels = c.apparent_temperature, rh = c.relative_humidity_2m, p = c.pressure_msl, ws = c.wind_speed_10m, wd = c.wind_direction_10m;
    const rise = d.sunrise && d.sunrise[0], set = d.sunset && d.sunset[0];
    const rhH = rise ? new Date(rise).getHours() + new Date(rise).getMinutes() / 60 : 6;
    const stH = set ? new Date(set).getHours() + new Date(set).getMinutes() / 60 : 18;
    const nowH = new Date().getHours() + new Date().getMinutes() / 60;
    const uv = d.uv_index_max ? d.uv_index_max[0] : 0;
    const cloth = feels >= 26 ? '短袖' : feels >= 18 ? '长袖' : feels >= 8 ? '外套' : '羽绒';
    const clothNote = feels >= 26 ? '炎热, 注意防晒补水' : feels >= 18 ? '不冷不热, 一件长袖' : feels >= 8 ? '偏凉, 加一件外套' : '寒冷, 需羽绒与围巾';
    const humNote = rh < 40 ? '空气干燥' : rh < 70 ? '湿度舒适' : '特别湿润';
    const dirName = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(((wd % 360) / 45)) % 8];
    const phase = A.moonPhase(jd);
    const illum = A.moonIllumination(phase);
    const age = (phase * 29.53).toFixed(1);
    return [
      card('体感温度', Math.round(feels), '°', '', feels >= (c.temperature_2m || feels) ? '高于实际温度' : '与实际温度相似'),
      card('风', Math.round(ws / 3.6), '级', compass(wd, ws), `阵风约 ${Math.round(ws)} km/h · ${dirName}风`),
      card('湿度', Math.round(rh), '%', arc(rh / 100, '#fff'), humNote),
      card('气压', Math.round(p), 'hPa', dial(p, 960, 1040), '海平面气压'),
      card('紫外线', uv.toFixed(0), '', arc(uv / 11, '#fff'), uv < 3 ? '辐射弱, 无需防护' : uv < 6 ? '中等, 建议防晒' : '较强, 注意遮挡'),
      card('穿衣', cloth, '', '', clothNote),
      card('日出', rise ? rise.slice(11, 16) : '—', '', sunCurve(rhH, stH, nowH), `日落 ${set ? set.slice(11, 16) : '—'} · 昼长 ${(stH - rhH).toFixed(1)} 小时`, true),
      card('月相', C.moonPhaseName(phase), '', disk('assets/planets/moon.webp', illum, phase < 0.5), `照明 ${Math.round(illum * 100)}% · 月龄 ${age} 日`, true)
    ];
  }

  /* ---------- 月球 ---------- */
  function moonCards(site, jd) {
    const s = W.moonState(site, jd);
    const earthIllum = 1 - s.illum;             // 从月面看地球, 地像与月相互补
    const rad = s.radiation;
    const pNote = '月面为超高真空';
    const earthNote = site.lon > -90 && site.lon < 90
      ? '地球高悬天区, 几乎不升落'
      : '本站位于月背, 地球不可见';
    const dayNote = s.isDay ? `月昼中 · 距晨昏线 ${s.nextLightChangeDays.toFixed(1)} 地球日` : `月夜中 · 距日出 ${s.nextLightChangeDays.toFixed(1)} 地球日`;
    const lun = s.phase; // 0..1 朔望周期位置
    return [
      card('地像', earthIllum > 0.5 ? '盈地' : '残地', '', disk('assets/planets/earth.webp', earthIllum, lun > 0.5), `照明 ${Math.round(earthIllum * 100)}% · ${earthNote}`, true),
      card('表面温度', Math.round(s.tempC), '°C', arc((s.tempC + 173) / 300, '#fff'), s.isDay ? '月昼受热' : '月夜辐射冷却'),
      card('太阳辐射', Math.round(rad), 'W/m²', arc(rad / 1361, '#fff'), rad > 0 ? '直射阳光下' : '无直射'),
      card('气压', '0', 'Pa', dial(0, 0, 1000), pNote),
      card('风', '0', 'm/s', compass(0, 0), '无大气, 无风'),
      card('日照', s.isDay ? '月昼' : '月夜', '', sunCurve(s.isDay ? 0 : 99, s.isDay ? 24 : -1, s.localHour), dayNote, true)
    ];
  }

  /* ---------- 火星 ---------- */
  function marsCards(site, jd) {
    const s = W.marsState(site, jd);
    const lat = site.lat * Math.PI / 180, dec = s.declination * Math.PI / 180;
    const cosH0 = -Math.tan(lat) * Math.tan(dec);
    const H0 = Math.abs(cosH0) <= 1 ? Math.acos(cosH0) * 180 / Math.PI : (cosH0 > 1 ? 0 : 180);
    const riseH = 12 - H0 / 15, setH = 12 + H0 / 15;
    // 从火星看地球的地像: 相位角 = 地球处 太阳-地球-火星 夹角
    let earthIllum = 0.5, distAU = 1.5, earthTxt = '—';
    try {
      const date = new Date((jd - 2440587.5) * 86400000);
      const E = Astronomy.HelioVector('Earth', date);
      const M = Astronomy.HelioVector('Mars', date);
      const se = [-E.x, -E.y, -E.z];
      const me = [M.x - E.x, M.y - E.y, M.z - E.z];
      const dot = se[0] * me[0] + se[1] * me[1] + se[2] * me[2];
      const mE = Math.hypot(...me), mS = Math.hypot(...se);
      const cosph = dot / (mE * mS);
      earthIllum = (1 + cosph) / 2;
      distAU = mE;
      earthTxt = `照明 ${Math.round(earthIllum * 100)}% · 距地球 ${distAU.toFixed(2)} AU`;
    } catch (e) { /* 引擎不可用时保留占位 */ }
    const dustPct = Math.max(0, Math.min(1, s.dust));
    return [
      card('太阳', s.localTime.slice(0, 5), '', sunCurve(riseH, setH, s.localHour), `日出 ${fmtH(riseH)} · 日落 ${fmtH(setH)} · 日长 24h39m`, true),
      card('地像', earthIllum > 0.5 ? '盈地' : '残地', '', disk('assets/planets/earth.webp', earthIllum, true), earthTxt),
      card('气压', Math.round(s.pressurePa), 'Pa', dial(s.pressurePa, 400, 900), `海拔 ${(site.elev != null ? site.elev : -2600).toLocaleString('en-US')} m`),
      card('风', s.windMps.toFixed(1), 'm/s', arc(s.windMps / 30, '#fff'), '模型估算 · 阵风更强'),
      card('尘暴指数', (dustPct * 100).toFixed(0), '', arc(dustPct, '#fff'), s.dustSeason ? '尘暴季 · 透明度下降' : '非尘暴季 · 透明度好'),
      card('温度', Math.round(s.tempC), '°C', arc((s.tempC + 120) / 160, '#fff'), `今日 ${Math.round(s.maxC)}° / ${Math.round(s.minC)}°`)
    ];
  }
  function fmtH(h) { const hh = Math.floor(((h % 24) + 24) % 24); const mm = Math.floor((h - Math.floor(h)) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; }

  /* ---------- 渲染 ---------- */
  let sig = '';
  async function render(force) {
    const host = el();
    const cs = window.CosmicState && window.CosmicState();
    if (!host || !cs || cs.module !== 'weather' || !cs.site) { if (host) host.hidden = true; return; }
    const s = cs.site;
    const key = `${cs.world}|${s.id}|${Math.floor(cs.jd * 2)}`;
    if (!force && key === sig && host.children.length) return;
    sig = key;
    host.hidden = false;
    let cards;
    if (cs.world === 'earth') cards = await earthCards(s, cs.jd);
    else if (cs.world === 'moon') cards = moonCards(s, cs.jd);
    else cards = marsCards(s, cs.jd);
    host.innerHTML = `<header class="panel-head"><span class="panel-title">更多指数</span><small>${cs.world === 'earth' ? 'OPEN-METEO · 实测' : 'MODEL · 站点模型'}</small></header><div class="idx-grid">${cards.join('')}</div>`;
  }

  function mount() {
    const mod = document.getElementById('moduleWeather');
    if (!mod || el()) return;
    const sec = document.createElement('section');
    sec.className = 'panel idx-panel';
    sec.id = 'indicesWrap';
    sec.hidden = true;
    mod.appendChild(sec);
    render(true);
    setInterval(() => render(false), 4000);
    document.addEventListener('click', () => setTimeout(() => render(false), 350));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
