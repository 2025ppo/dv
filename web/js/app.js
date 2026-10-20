/* app.js — 宇宙日历 v4
 * 三个模块：行星时间 / 行星历法 / 行星环境
 * 三个世界：地球 / 月球 / 火星
 * 站点与地图：真实坐标与真实全球底图；殖民地设定为概念数据。
 */
(function () {
  'use strict';

  const A = window.ASTRO;
  const C = window.CAL;
  const F = window.FEST;
  const WX = window.WX;
  const W = window.WORLDS;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const STORE = 'cosmic-almanac-v4';
  const MODULES = ['time', 'calendar', 'weather'];
  const WORLDS = ['earth', 'moon', 'mars'];
  const CAL_META = {
    earth: { label: '地球历', en: 'GREGORIAN', icon: 'i-earth', standard: '北京时间 UTC+8' },
    moon: { label: '月球历', en: 'LUNAR SYNODIC', icon: 'i-moon', standard: '协调世界时 UTC' },
    mars: { label: '火星历', en: 'MARTIAN SOLAR', icon: 'i-mars', standard: '火星标准时 MTC' }
  };
  const DEFAULT_SITES = { earth: 'beijing', moon: 'tranquility', mars: 'jezero' };

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]);
  const icon = (id, cls) => `<svg class="icon ${cls || ''}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const pad2 = (n) => String(n).padStart(2, '0');
  const mod = (x, m) => ((x % m) + m) % m;
  const jdNow = () => A.jdOf(new Date());
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtNum = (n, d) => n == null || !isFinite(n) ? '—' : (Math.round(n * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toFixed(d || 0);
  const metric = (label, value, small) => `<div class="metric"><span>${esc(label)}</span><b>${esc(value)}</b>${small ? `<small>${esc(small)}</small>` : ''}</div>`;
  const iconOfWx = (name) => icon('i-wx-' + (name || 'cloud'));

  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; }
  }
  function savePrefs() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        theme: state.theme,
        module: state.module,
        cal: state.cal,
        timeWorld: state.timeWorld,
        weatherWorld: state.weatherWorld,
        timeSites: state.timeSites,
        calSites: state.calSites,
        weatherSites: state.weatherSites
      }));
    } catch (e) {}
  }
  function validWorld(w) { return WORLDS.indexOf(w) >= 0; }
  function validSite(world, id) { return W.sitesOf(world).some((s) => s.id === id); }
  function safeSite(world, id) { return validSite(world, id) ? id : DEFAULT_SITES[world]; }

  const prefs = loadPrefs();
  const hash = (location.hash || '').replace('#', '');
  const initialModule = MODULES.indexOf(hash) >= 0 ? hash : (MODULES.indexOf(prefs.module) >= 0 ? prefs.module : 'calendar');
  const initialTimeWorld = validWorld(prefs.timeWorld) ? prefs.timeWorld : 'earth';
  const initialWeatherWorld = validWorld(prefs.weatherWorld) ? prefs.weatherWorld : 'earth';
  const initialTimeSites = Object.assign({}, DEFAULT_SITES, prefs.timeSites || {});
  const initialCalSites = Object.assign({}, DEFAULT_SITES, prefs.calSites || {});
  const initialWeatherSites = Object.assign({}, DEFAULT_SITES, prefs.weatherSites || {});
  WORLDS.forEach((w) => {
    initialTimeSites[w] = safeSite(w, initialTimeSites[w]);
    initialCalSites[w] = safeSite(w, initialCalSites[w]);
    initialWeatherSites[w] = safeSite(w, initialWeatherSites[w]);
  });
  const initialJd = jdNow();
  A.setNowRef(initialJd);
  const initialEarth = C.earthFromJd(initialJd);
  const initialMoon = C.moonFromJd(initialJd);
  const initialMars = C.marsFromJd(initialJd);

  const state = {
    module: initialModule,
    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    cal: WORLDS.indexOf(prefs.cal) >= 0 ? prefs.cal : 'earth',
    timeWorld: initialTimeWorld,
    weatherWorld: initialWeatherWorld,
    timeSites: initialTimeSites,
    calSites: initialCalSites,
    weatherSites: initialWeatherSites,
    timeMode: 'live',
    timeFixedJd: null,
    views: {
      earth: { y: initialEarth.year, m: initialEarth.month },
      moon: { k: initialMoon.k },
      mars: { year: initialMars.year, month: initialMars.month }
    },
    earth: null,
    earthLoading: false,
    earthError: null,
    earthSite: null,
    earthToken: 0,
    marsRef: null,
    holidays: [],
    holidayIndex: null,
    lastDayN: initialEarth.N,
    infoOpen: false,
    timers: {},
    lastFocus: null
  };

  const els = {
    headerClock: $('#headerClock'), headerDate: $('#headerDate'),
    themeBtn: $('#themeBtn'), infoBtn: $('#infoBtn'), footerInfoBtn: $('#footerInfoBtn'),
    moduleNav: $('#moduleNav'),
    timeWorld: $('#timeWorld'), timeSite: $('#timeSite'),
    timeMetaLeft: $('#timeMetaLeft'), timeModeTag: $('#timeModeTag'),
    timeWorldLabel: $('#timeWorldLabel'), timeLocal: $('#timeLocal'), timeLocalDate: $('#timeLocalDate'),
    timeStandard: $('#timeStandard'), timeStandardLabel: $('#timeStandardLabel'),
    timeSiteName: $('#timeSiteName'), timeSiteCode: $('#timeSiteCode'), timeCoords: $('#timeCoords'), timeSiteRole: $('#timeSiteRole'),
    timeFacts: $('#timeFacts'), timeDate: $('#timeDate'), timeClockInput: $('#timeClockInput'), timeNowBtn: $('#timeNowBtn'),
    timeInspectorNote: $('#timeInspectorNote'),
    timeMap: $('#timeMap'), timeMapMarkers: $('#timeMapMarkers'), timeMapCredit: $('#timeMapCredit'), timeMapSite: $('#timeMapSite'),
    timeTable: $('#timeTable'), colonyGrid: $('#colonyGrid'),
    calendarSelect: $('#calendarSelect'), calendarSite: $('#calendarSite'),
    calendarSummaryLabel: $('#calendarSummaryLabel'), calendarTag: $('#calendarTag'),
    calendarWorldLabel: $('#calendarWorldLabel'), calendarDateBig: $('#calendarDateBig'), calendarDateSub: $('#calendarDateSub'),
    calendarFacts: $('#calendarFacts'), calendarMethod: $('#calendarMethod'),
    calendarMap: $('#calendarMap'), calendarMapMarkers: $('#calendarMapMarkers'), calendarMapCredit: $('#calendarMapCredit'), calendarMapSite: $('#calendarMapSite'),
    calendarTitle: $('#calendarTitle'), calendarSub: $('#calendarSub'),
    calendarPrev: $('#calendarPrev'), calendarNext: $('#calendarNext'), calendarToday: $('#calendarToday'),
    calendarBody: $('#calendarBody'), holidayList: $('#holidayList'), holidayInfoBtn: $('#holidayInfoBtn'),
    calendarMetaLeft: $('#calendarMetaLeft'),
    weatherWorld: $('#weatherWorld'), weatherSite: $('#weatherSite'), weatherRefresh: $('#weatherRefresh'),
    weatherMode: $('#weatherMode'), weatherWorldLabel: $('#weatherWorldLabel'),
    weatherMetric: $('#weatherMetric'), weatherUnit: $('#weatherUnit'), weatherCondition: $('#weatherCondition'), weatherRange: $('#weatherRange'),
    weatherSiteName: $('#weatherSiteName'), weatherSiteCode: $('#weatherSiteCode'), weatherLocal: $('#weatherLocal'),
    weatherFacts: $('#weatherFacts'), weatherAlert: $('#weatherAlert'),
    weatherForecastWrap: $('#weatherForecastWrap'), weatherForecastSummary: $('#weatherForecastSummary'), weatherForecast: $('#weatherForecast'),
    weatherSource: $('#weatherSource'),
    weatherMap: $('#weatherMap'), weatherMapMarkers: $('#weatherMapMarkers'), weatherMapCredit: $('#weatherMapCredit'), weatherMapSite: $('#weatherMapSite'),
    weatherMetaRight: $('#weatherMetaRight'),
    holidayDialog: $('#holidayDialog'), holidayTitle: $('#holidayTitle'), holidayBody: $('#holidayBody'), holidayClose: $('#holidayClose'),
    infoLayer: $('#infoLayer'), infoClose: $('#infoClose'),
    toast: $('#toast')
  };

  function applyTheme(theme) {
    state.theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = state.theme;
    els.themeBtn.setAttribute('aria-label', state.theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式');
    savePrefs();
  }
  function toggleTheme() { applyTheme(state.theme === 'dark' ? 'light' : 'dark'); }

  function toast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(state.timers.toast);
    state.timers.toast = setTimeout(() => els.toast.classList.remove('show'), ms || 2200);
  }

  function utcClock(jd) { return C.clockText(mod(jd + 0.5, 1) * 86400); }
  function utcParts(jd) {
    const d = A.dateOf(jd);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay() };
  }
  function siteWorld(world) { return W.WORLDS[world]; }
  function siteObj(world, id) { return W.siteOf(world, id); }
  function positionOf(site) { return W.position(site); }

  function populateSiteSelect(select, world, selected) {
    const sites = W.sitesOf(world);
    select.innerHTML = sites.map((s) => {
      const pop = s.population && s.population !== '—' ? ` · ${s.population.toLocaleString('en-US')} 人` : '';
      return `<option value="${s.id}"${s.id === selected ? ' selected' : ''}>${esc(s.name)} · ${esc(s.code)}${pop}</option>`;
    }).join('');
    select.value = selected;
  }

  function setModule(module, opts) {
    if (MODULES.indexOf(module) < 0) return;
    const o = opts || {};
    const changed = module !== state.module;
    state.module = module;
    $$('[data-module-panel]').forEach((p) => { p.hidden = p.dataset.modulePanel !== module; });
    $$('.module-tab', els.moduleNav).forEach((b) => {
      const on = b.dataset.module === module;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    if (module === 'time') renderTime(true);
    else if (module === 'calendar') renderCalendar(true);
    else renderWeather();
    document.title = (module === 'time' ? '行星时间' : module === 'calendar' ? '行星历法' : '行星环境') + ' · 宇宙日历';
    if (changed && !o.noScroll) window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    if (!o.silent) {
      try { history.replaceState(null, '', '#' + module); } catch (e) {}
      savePrefs();
    }
  }

  /* ============================================================
     maps
     ============================================================ */
  function renderMap(mapEl, markersEl, creditEl, siteEl, world, siteId) {
    if (!mapEl || !markersEl) return;
    const meta = W.WORLDS[world];
    const site = W.siteOf(world, siteId);
    mapEl.style.backgroundImage = `url("${meta.map}")`;
    creditEl.textContent = meta.mapCredit;
    markersEl.innerHTML = W.sitesOf(world).map((s) => {
      const p = W.position(s);
      const px = Math.max(3, Math.min(97, p.x));
      const py = Math.max(3, Math.min(97, p.y));
      return `<button class="map-marker${s.id === site.id ? ' active' : ''}" type="button" data-site="${s.id}" style="left:${px.toFixed(3)}%;top:${py.toFixed(3)}%" aria-label="${esc(s.name)}，${esc(W.coordinate(s))}"><span>${esc(s.name)}</span></button>`;
    }).join('');
    const authority = world === 'earth' ? '观测站' : (site.level || '常驻站');
    const population = site.population && site.population !== '—' ? ` · 常驻 ${site.population.toLocaleString('en-US')} 人` : '';
    const elev = site.elev != null ? ` · 海拔 ${site.elev.toLocaleString('en-US')} m` : '';
    siteEl.innerHTML = `<b>${esc(site.name)} <span class="map-site-code">${esc(site.code)}</span></b>
      <div class="map-site-meta">${esc(W.coordinate(site))}${elev}</div>
      <div class="map-site-meta">${esc(authority)} · ${esc(site.role)}${population}</div>
      <div class="map-site-note">${esc(meta.name)} · 底图：${esc(meta.mapCredit)} · 点击地图上的标记可切换站点</div>`;
  }

  function mapMarkersClickMarkers(markersEl, select) {
    markersEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-site]');
      if (b) select(b.dataset.site);
    });
  }

  /* ============================================================
     time module
     ============================================================ */
  function currentTimeJd() { return state.timeMode === 'fixed' && state.timeFixedJd ? state.timeFixedJd : jdNow(); }

  function timeRowData(world, siteId, jd) {
    if (world === 'earth') {
      const std = C.earthFromJd(jd);
      const site = siteObj('earth', siteId);
      const local = W.earthLocal(site, jd);
      return { world, site, standard: C.clockText(C.bjClock(jd)), standardLabel: '北京时间', local: local.time, note: site.name + ' · ' + local.tz };
    }
    if (world === 'moon') {
      const site = siteObj('moon', siteId);
      const local = W.moonState(site, jd);
      return { world, site, standard: utcClock(jd), standardLabel: 'UTC', local: local.localTime, note: site.name + ' · 月面真太阳时' };
    }
    const site = siteObj('mars', siteId);
    const local = W.marsState(site, jd);
    return { world, site, standard: local.standardTime, standardLabel: 'MTC', local: local.localTime, note: site.name + ' · 站点真太阳时' };
  }

  function buildTimeTable(jd) {
    return WORLDS.map((w) => {
      const r = timeRowData(w, state.timeSites[w], jd);
      return `<div class="time-row${state.timeWorld === w ? ' active' : ''}" data-time-world="${w}">
        <span class="world">${icon(W.WORLDS[w].id === 'earth' ? 'i-earth' : w === 'moon' ? 'i-moon' : 'i-mars')}${W.WORLDS[w].name} · ${W.WORLDS[w].standard}</span>
        <span class="std"><b data-time-cell="${w}Std">${esc(r.standard)}</b> <small>${esc(r.standardLabel)}</small></span>
        <span class="local" data-time-cell="${w}Local">${esc(r.local)}</span>
        <span class="note" data-time-cell="${w}Note">${esc(r.note)}</span>
      </div>`;
    }).join('');
  }

  function timeTableRowClick(world) {
    if (state.timeWorld === world) return;
    state.timeWorld = world;
    els.timeWorld.value = world;
    populateSiteSelect(els.timeSite, world, state.timeSites[world]);
    savePrefs();
    renderTime(true);
  }

  function renderTime(animate) {
    const jd = currentTimeJd();
    A.setNowRef(jd);
    const world = state.timeWorld;
    const site = siteObj(world, state.timeSites[world]);
    const r = timeRowData(world, site.id, jd);
    const meta = W.WORLDS[world];
    if (els.timeWorldLabel) {
      els.timeWorldLabel.textContent = `${meta.name} · ${world === 'earth' ? '站点当地时间' : '站点真太阳时'}`;
    }
    updateTimeMain(jd, world, site);
    els.timeStandardLabel.textContent = world === 'earth' ? '北京时间 UTC+8' : world === 'moon' ? '协调世界时 UTC' : '火星标准时 MTC';
    els.timeModeTag.textContent = state.timeMode === 'live' ? '实时' : '已固定';
    els.timeModeTag.classList.toggle('fixed', state.timeMode !== 'live');
    els.timeInspectorNote.textContent = state.timeMode === 'live' ? '当前为实时读数。' : '当前为固定时刻；修改日期或时间可重新校时。';
    els.timeSiteName.textContent = site.name;
    els.timeSiteCode.textContent = site.code + (site.level ? ' · ' + site.level : '');
    els.timeCoords.textContent = W.coordinate(site);
    els.timeSiteRole.textContent = site.role + (site.population && site.population !== '—' ? ' · 常驻 ' + site.population.toLocaleString('en-US') + ' 人' : '');
    renderTimeFacts(jd, world, site);
    els.timeTable.innerHTML = buildTimeTable(jd);
    renderMap(els.timeMap, els.timeMapMarkers, els.timeMapCredit, els.timeMapSite, world, site.id);
    setTimeInputs(jd);
  }

  function updateTimeMain(jd, world, site) {
    if (world === 'earth') {
      const e = C.earthFromJd(jd);
      const local = W.earthLocal(site, jd);
      els.timeLocal.textContent = local.time;
      els.timeLocalDate.textContent = `${local.date} · ${local.tz}`;
      els.timeStandard.textContent = C.clockText(C.bjClock(jd));
    } else if (world === 'moon') {
      const m = C.moonFromJd(jd);
      const s = W.moonState(site, jd);
      els.timeLocal.textContent = s.localTime;
      els.timeLocalDate.textContent = `月球历 ${m.year} 年 ${m.month} 月 ${m.day} 日 · ${s.phaseName} · ${s.condition}`;
      els.timeStandard.textContent = utcClock(jd);
    } else {
      const m = C.marsFromJd(jd);
      const s = W.marsState(site, jd);
      els.timeLocal.textContent = s.localTime;
      els.timeLocalDate.textContent = `火星历 第 ${m.year} 年 ${m.month} 月 ${m.day} 日 · MTC ${s.standardTime} · 太阳黄经 ${m.ls.toFixed(1)}°`;
      els.timeStandard.textContent = s.standardTime;
    }
  }

  function renderTimeFacts(jd, world, site) {
    if (world === 'earth') {
      const e = C.earthFromJd(jd);
      const local = W.earthLocal(site, jd);
      els.timeFacts.innerHTML =
        metric('标准日期', `${e.year}-${pad2(e.month)}-${pad2(e.day)}`, e.weekName) +
        metric('站点时区', local.tz, local.date) +
        metric('年内进度', `${e.dayOfYear} / ${e.daysInYear}`, e.daysInYear === 366 ? '闰年' : '平年') +
        metric('站点坐标', W.coordinate(site), site.role);
    } else if (world === 'moon') {
      const s = W.moonState(site, jd);
      const n = W.moonNext(site, jd);
      els.timeFacts.innerHTML =
        metric('月相', s.phaseName, `${(s.illum * 100).toFixed(0)}% 可见 · 第 ${s.month} 月 ${s.day} 日`) +
        metric('太阳高度', `${s.sunAltitude.toFixed(1)}°`, s.isDay ? '月昼' : '月夜') +
        metric('月面温度', `${s.tempC.toFixed(0)} °C`, '模型估算') +
        metric(n.label, n.text, s.isDay ? '下一次日落' : '下一次日出');
    } else {
      const s = W.marsState(site, jd);
      els.timeFacts.innerHTML =
        metric('太阳黄经', `${s.ls.toFixed(1)}°`, `北半球${s.season}`) +
        metric('站点风速', `${s.windMps.toFixed(1)} m/s`, '模型估算') +
        metric('站点气压', `${Math.round(s.pressurePa)} Pa`, site.elev != null ? `海拔 ${site.elev.toLocaleString('en-US')} m` : '') +
        metric('站点真太阳时', s.localTime, `标准时 ${s.standardTime} MTC`);
    }
  }

  function updateTimeLive(jd) {
    if (state.module !== 'time' || state.timeMode !== 'live') return;
    const world = state.timeWorld;
    const site = siteObj(world, state.timeSites[world]);
    updateTimeMain(jd, world, site);
    WORLDS.forEach((w) => {
      const row = timeRowData(w, state.timeSites[w], jd);
      const stdCell = $(`[data-time-cell="${w}Std"]`, els.timeTable);
      const localCell = $(`[data-time-cell="${w}Local"]`, els.timeTable);
      if (stdCell) stdCell.textContent = row.standard;
      if (localCell) localCell.textContent = row.local;
    });
  }

  function setTimeInputs(jd) {
    if (!els.timeDate || !els.timeClockInput) return;
    const e = C.earthFromJd(jd);
    const date = `${e.year}-${pad2(e.month)}-${pad2(e.day)}`;
    const clock = C.clockText(C.bjClock(jd));
    if (document.activeElement !== els.timeDate) els.timeDate.value = date;
    if (document.activeElement !== els.timeClockInput) els.timeClockInput.value = clock;
  }
  function handleTimeInput() {
    const date = els.timeDate.value;
    const clock = els.timeClockInput.value || '00:00:00';
    if (!date) return;
    const dp = date.split('-').map(Number);
    const tp = clock.split(':').map(Number);
    if (dp.length !== 3 || tp.length < 2) return;
    const jd = A.jdOf(new Date(Date.UTC(dp[0], dp[1] - 1, dp[2], tp[0] - 8, tp[1], tp[2] || 0)));
    if (!isFinite(jd)) return;
    state.timeMode = 'fixed';
    state.timeFixedJd = jd;
    renderTime(true);
  }
  function resetTime() {
    state.timeMode = 'live';
    state.timeFixedJd = null;
    renderTime(true);
    setTimeInputs(jdNow());
  }

  /* ============================================================
     calendar module
     ============================================================ */
  function calendarSnapshot(world, jd) {
    if (world === 'earth') {
      const e = C.earthFromJd(jd);
      const site = siteObj('earth', state.calSites.earth);
      return { world, e, site, local: W.earthLocal(site, jd) };
    }
    if (world === 'moon') {
      const m = C.moonFromJd(jd);
      const site = siteObj('moon', state.calSites.moon);
      return { world, m, site, local: W.moonState(site, jd) };
    }
    const m = C.marsFromJd(jd);
    const site = siteObj('mars', state.calSites.mars);
    return { world, m, site, local: W.marsState(site, jd) };
  }

  function renderCalendar(animate) {
    const jd = jdNow();
    A.setNowRef(jd);
    const world = state.cal;
    const snap = calendarSnapshot(world, jd);
    const meta = CAL_META[world];
    els.calendarSelect.value = world;
    populateSiteSelect(els.calendarSite, world, state.calSites[world]);
    els.calendarSummaryLabel.textContent = `${meta.label} / ${meta.en}`;
    els.calendarTag.textContent = '标准日期';
    const site = snap.site;
    if (world === 'earth') {
      const e = snap.e;
      els.calendarWorldLabel.textContent = `地球 · ${e.year} 年`;
      els.calendarDateBig.textContent = `${e.monthName} ${e.day} 日`;
      const lunar = C.lunarOfJd(jd);
      els.calendarDateSub.textContent = `${e.weekName} · 农历 ${C.lunarText(lunar)} · 年内第 ${e.dayOfYear} 天`;
      els.calendarFacts.innerHTML =
        metric('标准时', `${C.clockText(C.bjClock(jd))}`, '北京时间 UTC+8') +
        metric('站点当地时间', snap.local.time, `${site.name} · ${snap.local.tz}`) +
        metric('农历', C.lunarText(lunar), '北京日界') +
        metric('月长', `${e.monthLen} 天`, e.daysInYear === 366 ? '闰年' : '平年');
      els.calendarMethod.innerHTML = '<p>地球历采用格里高利历，12 个月、365 或 366 天。标准时间以北京时间（UTC+8）编排；站点当地时间按 IANA 时区显示。</p><p>节日与节气使用北京时间；月球历与火星历的投影见节日详情。</p>';
    } else if (world === 'moon') {
      const m = snap.m;
      const local = snap.local;
      els.calendarWorldLabel.textContent = `月球 · 第 ${m.year} 年`;
      els.calendarDateBig.textContent = `${m.month} 月 ${m.day} 日`;
      els.calendarDateSub.textContent = `${m.phaseName} · 月龄 ${(m.phase * A.SYNODIC).toFixed(1)} 天 · 本月 ${m.monthLen} 天`;
      els.calendarFacts.innerHTML =
        metric('标准时', utcClock(jd), '协调世界时 UTC') +
        metric('站点真太阳时', local.localTime, `${site.name} · 月面时间`) +
        metric('月相', m.phaseName, `${(m.illum * 100).toFixed(0)}% 可见`) +
        metric('下一次光照变化', W.moonNext(site, jd).text, W.moonNext(site, jd).label);
      els.calendarMethod.innerHTML = '<p>月球历以新月为月初、满月为月中；十二个朔望月为一年。月份用数字编号，便于与地球月份区分。</p><p>标准日期按北京时间编排；站点真太阳时由月亮相位与站点经度计算，用于描述当地作业时间。</p>';
    } else {
      const m = snap.m;
      const local = snap.local;
      els.calendarWorldLabel.textContent = `火星 · 第 ${m.year} 年`;
      els.calendarDateBig.textContent = `${m.month} 月 ${m.day} 日`;
      els.calendarDateSub.textContent = `太阳黄经 ${m.ls.toFixed(1)}° · 北半球${m.season} · 本月 ${m.monthLen} 个火星日`;
      els.calendarFacts.innerHTML =
        metric('标准时', m.timeText, '火星标准时 MTC') +
        metric('站点真太阳时', local.localTime, `${site.name} · 当地`) +
        metric('太阳黄经', `${m.ls.toFixed(1)}°`, `北半球${m.season}`) +
        metric('站点风速', `${local.windMps.toFixed(1)} m/s`, '模型估算');
      els.calendarMethod.innerHTML = '<p>火星历按太阳黄经每 30° 分为一个月，共 12 个月；以火星日计日，七个火星日为一周。</p><p>标准日期采用火星标准时 MTC；站点真太阳时由 MTC 与站点经度差计算，用于描述当地作业时间。</p>';
    }
    renderMap(els.calendarMap, els.calendarMapMarkers, els.calendarMapCredit, els.calendarMapSite, world, site.id);
    renderCalendarGrid(jd);
    renderHolidays();
  }

  function renderCalendarGrid(jd) {
    const world = state.cal;
    const now = C.earthFromJd(jd);
    if (world === 'earth') {
      const v = state.views.earth;
      const first = new Date(Date.UTC(v.y, v.m - 1, 1));
      const lead = (first.getUTCDay() + 6) % 7;
      let cells = '';
      for (let i = 0; i < 42; i++) {
        const dt = new Date(Date.UTC(v.y, v.m - 1, 1 - lead + i));
        const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
        const dayJd = A.jdOf(new Date(Date.UTC(y, m - 1, d, 4)));
        const p = C.earthPartsFromJd(dayJd);
        const lunar = C.lunarOfJd(dayJd);
        const fest = F.festivalsOn(y, m, d);
        const outside = m !== v.m;
        const today = p.N === now.N;
        const lunarLabel = lunar.day === 1 ? `${lunar.isLeap ? '闰' : ''}${C.LUNAR_MONTH_CN[lunar.month - 1]}月` : C.LUNAR_DAY_CN[lunar.day - 1];
        const feast = fest.length ? fest[0].name : '';
        cells += `<div class="day-cell${outside ? ' outside' : ''}${today ? ' today' : ''}" title="${esc(`${y}年${m}月${d}日 · 农历${C.lunarText(lunar)}${fest.length ? ' · ' + fest.map((f) => f.name).join('、') : ''}`)}">
          ${fest.length ? '<span class="cell-dots"><i></i></span>' : ''}
          <span class="dnum">${d}</span><span class="dlunar">${esc(lunarLabel)}</span>${feast ? `<span class="dfeast">${esc(feast)}</span>` : ''}
        </div>`;
      }
      els.calendarTitle.textContent = `地球历 · ${v.y} 年 ${v.m} 月`;
      els.calendarSub.textContent = '公历 · 北京时间 · 周一为一周之始';
      els.calendarBody.innerHTML = `<div class="cal-week-head">${['一', '二', '三', '四', '五', '六', '日'].map((d) => `<span>周${d}</span>`).join('')}</div><div class="cal-grid">${cells}</div><p class="cal-note">铜色圆点表示当天有地球节日或节气；农历小字按北京日界标注。点击地图可切换站点，日历标准日期不随站点移动。</p>`;
      return;
    }
    if (world === 'moon') {
      const v = state.views.moon;
      const k = v.k;
      const month = C.moonMonthOfK(k);
      const year = C.moonYearOfK(k);
      const len = C.moonMonthLen(k);
      const days = C.moonMonthDays(k);
      const cells = days.map((d) => {
        const p = C.earthPartsFromJd(d.jd);
        const fest = F.festivalsOn(p.y, p.m, p.d)[0];
        const today = d.N === C.bjDayIndex(jd);
        return `<div class="moon-cell${today ? ' today' : ''}" title="${esc(`${p.y}年${p.m}月${p.d}日 · 月龄 ${(d.phase * A.SYNODIC).toFixed(1)} 天`)}">
          ${fest ? '<span class="cell-dots"><i></i></span>' : ''}
          <span class="mnum">${d.day}</span>
          <span class="mphase" style="--shadow:${(A.moonIllumination(d.phase) * 100).toFixed(0)}%"></span>
          <span class="mdate">${p.m}/${p.d}</span>${fest ? `<span class="mfest">${esc(fest.name)}</span>` : ''}
        </div>`;
      }).join('');
      const first = C.moonFromJd(C.moonDayJd(k, 1));
      els.calendarTitle.textContent = `月球历 · 第 ${month} 月`;
      els.calendarSub.textContent = `第 ${year} 年 · 从新月到下一次新月 · ${len} 个地球日`;
      els.calendarBody.innerHTML = `<div class="grid-heading"><h3>第 ${month} 月 · ${len} 天</h3><span>每格底部为对应的地球日期</span></div><div class="moon-grid">${cells}</div><p class="cal-note">月球历每月从新月开始；日期按北京时间编排。站点真太阳时在右侧地图与时间模块中显示。</p>`;
      return;
    }
    const v = state.views.mars;
    const days = C.marsMonthDays(v.year, v.month);
    const nowMars = C.marsFromJd(jd);
    const cells = days.map((d) => {
      const p = d.earth;
      const fest = F.festivalsOn(p.y, p.m, p.d)[0];
      const today = d.sol === nowMars.sol;
      return `<div class="mars-cell${today ? ' today' : ''}" title="${esc(`${p.y}年${p.m}月${p.d}日 · 火星日 ${d.sol}`)}">
        ${fest ? '<span class="cell-dots"><i></i></span>' : ''}
        <span class="mnum">${d.day}</span><span class="mdate">${p.m}/${p.d}</span>${fest ? `<span class="mfest">${esc(fest.name)}</span>` : ''}
      </div>`;
    }).join('');
    const firstLs = (v.month - 1) * 30;
    els.calendarTitle.textContent = `火星历 · 第 ${v.year} 年 ${v.month} 月`;
    els.calendarSub.textContent = `太阳黄经 ${firstLs}°–${firstLs + 30}° · 7 个火星日为一周`;
    els.calendarBody.innerHTML = `<div class="grid-heading"><h3>${v.month} 月 · ${days.length} 个火星日</h3><span>每格底部为对应的地球日期</span></div><div class="mars-grid">${cells}</div><p class="cal-note">火星历的月份按太阳黄经每 30° 切分；日期采用火星标准时 MTC。站点真太阳时另见时间模块。</p>`;
  }

  function shiftCalendar(delta) {
    if (state.cal === 'earth') {
      const v = state.views.earth;
      const idx = v.y * 12 + (v.m - 1) + delta;
      v.y = Math.floor(idx / 12); v.m = mod(idx, 12) + 1;
    } else if (state.cal === 'moon') {
      state.views.moon.k += delta;
    } else {
      const v = state.views.mars;
      v.month += delta;
      if (v.month > 12) { v.month = 1; v.year++; }
      if (v.month < 1) { v.month = 12; v.year--; }
    }
    renderCalendarGrid(jdNow());
  }
  function calendarToday() {
    const jd = jdNow();
    onDayOrNow(jd);
    renderCalendar(true);
  }
  function onDayOrNow(jd) {
    const e = C.earthFromJd(jd), mo = C.moonFromJd(jd), ma = C.marsFromJd(jd);
    state.views.earth = { y: e.year, m: e.month };
    state.views.moon = { k: mo.k };
    state.views.mars = { year: ma.year, month: ma.month };
  }

  function renderHolidays() {
    state.holidays = F.upcoming(new Date(), 8).slice(0, 4);
    if (!state.holidays.length) {
      els.holidayList.innerHTML = '<p class="muted" style="font-size:9px">正在计算接下来的地球节日…</p>';
      return;
    }
    els.holidayList.innerHTML = state.holidays.map((f, i) => `<button class="holiday-row" type="button" data-holiday="${i}">
      <span class="holiday-date"><b>${f.d}</b><span>${f.m} 月</span></span>
      <span class="holiday-main"><b>${esc(f.name)}</b><span>月 ${esc(f.proj.moon.text)} · 火 ${esc(f.proj.mars.text)}</span></span>
      <span class="holiday-when">${esc(f.when)}<small>${esc(f.tag)}</small></span>
    </button>`).join('');
  }

  function openHoliday(index) {
    const f = state.holidays[index];
    if (!f) return;
    const p = F.projectJd(f.jd);
    const e = p.earthParts;
    els.holidayTitle.textContent = f.name;
    els.holidayBody.innerHTML = `<div class="holiday-summary">
      <div class="holiday-badge"><b>${f.d}</b><span>${f.m} 月</span></div>
      <div><h3>${esc(f.name)}</h3><p>${esc(f.note)}</p><p>${e.y} 年 ${e.m} 月 ${e.d} 日 · ${C.EARTH_WEEK[e.wd]} · 北京时间正午</p></div>
    </div>
    <div class="projection-table">
      <div class="projection-row"><span class="p-label">${icon('i-earth')}地球历</span><div><b>${e.y} 年 ${e.m} 月 ${e.d} 日</b><small>${C.EARTH_WEEK[e.wd]}</small></div></div>
      <div class="projection-row"><span class="p-label">${icon('i-moon')}月球历</span><div><b>${esc(p.moonObj.label)}</b><small>${esc(p.moonObj.phaseName)} · 月龄 ${(p.moonObj.phase * A.SYNODIC).toFixed(1)} 天</small></div></div>
      <div class="projection-row"><span class="p-label">${icon('i-mars')}火星历</span><div><b>${esc(p.marsObj.label)}</b><small>太阳黄经 ${p.marsObj.ls.toFixed(1)}° · ${esc(p.marsObj.weekName)}</small></div></div>
    </div>
    <p class="source-line">投影使用该节日当天北京正午的时刻；月球历与火星历按各自标准日编排。</p>`;
    openDialog(els.holidayDialog);
  }

  /* ============================================================
     weather module
     ============================================================ */
  function weatherSite() { return siteObj(state.weatherWorld, state.weatherSites[state.weatherWorld]); }

  function loadEarthWeather() {
    if (state.weatherWorld !== 'earth') return;
    const site = weatherSite();
    const token = ++state.earthToken;
    state.earthLoading = true;
    state.earthError = null;
    state.earthSite = site.id;
    renderWeather();
    WX.getEarth({ name: site.name, admin: 'Earth', lat: site.lat, lon: site.lon, tz: site.tz })
      .then((data) => {
        if (token !== state.earthToken) return;
        state.earth = data;
        state.earthLoading = false;
        state.earthError = null;
        renderWeather();
      })
      .catch((err) => {
        if (token !== state.earthToken) return;
        state.earthLoading = false;
        state.earthError = err.message || '观测不可用';
        renderWeather();
      });
  }

  function earthAlert(data) {
    const cur = data.current || {};
    const aqi = data.air && data.air.usAqi;
    const rain = data.daily && data.daily[0] ? (data.daily[0].rainChance || 0) : 0;
    if (aqi != null && aqi > 100) return { tone: 'warn', title: '空气质量提示', text: `空气质量指数 ${Math.round(aqi)}，${WX.aqiLabel(aqi)}。建议减少长时间户外活动。` };
    if (rain >= 60) return { tone: 'warn', title: '降雨提示', text: `今日降雨概率约 ${Math.round(rain)}%，出门请带伞。` };
    if (cur.wind != null && cur.wind >= 30) return { tone: 'warn', title: '大风提示', text: `当前风速约 ${Math.round(cur.wind)} km/h，注意高空坠物与行车安全。` };
    if (cur.temp != null && cur.temp >= 30) return { tone: 'warn', title: '高温提示', text: `当前气温 ${Math.round(cur.temp)}°C，注意补水和防晒。` };
    if (cur.temp != null && cur.temp <= 0) return { tone: 'warn', title: '低温提示', text: `当前气温 ${Math.round(cur.temp)}°C，注意保暖与路面结冰。` };
    return { tone: 'calm', title: '天气平稳', text: `${cur.text || '当前天气平稳'}，体感 ${Math.round(cur.feels)}°C。可按计划安排户外活动。` };
  }

  function setWeatherMode(mode, text) {
    els.weatherMode.textContent = text || mode;
    els.weatherMode.style.color = mode === 'model' ? 'var(--brass-2)' : 'var(--green)';
    els.weatherMode.style.borderColor = mode === 'model' ? 'var(--brass)' : 'var(--green)';
  }

  function renderWeather() {
    const world = state.weatherWorld;
    const site = weatherSite();
    const meta = W.WORLDS[world];
    els.weatherWorld.value = world;
    populateSiteSelect(els.weatherSite, world, state.weatherSites[world]);
    renderMap(els.weatherMap, els.weatherMapMarkers, els.weatherMapCredit, els.weatherMapSite, world, site.id);
    els.weatherSiteName.textContent = site.name;
    els.weatherSiteCode.textContent = site.code + (site.level ? ' · ' + site.level : '');
    const jd = jdNow();
    if (world === 'earth') {
      const local = W.earthLocal(site, jd);
      els.weatherWorldLabel.textContent = '地球 · 站点天气';
      els.weatherLocal.textContent = `${local.date} · ${local.time} · ${local.tz}`;
      els.weatherUnit.textContent = '°C';
      renderEarthWeather(site);
    } else if (world === 'moon') {
      const s = W.moonState(site, jd);
      const m = C.moonFromJd(jd);
      els.weatherWorldLabel.textContent = '月球 · 月面环境';
      els.weatherLocal.textContent = `${s.condition} · 月面真太阳时 ${s.localTime}`;
      els.weatherUnit.textContent = '°C';
      els.weatherMetric.textContent = s.tempC.toFixed(0);
      els.weatherCondition.textContent = s.condition;
      els.weatherRange.textContent = `太阳高度 ${s.sunAltitude.toFixed(1)}° · 入射辐射 ${Math.round(s.radiation)} W/m²`;
      const n = W.moonNext(site, jd);
      els.weatherFacts.innerHTML =
        metric('月相', s.phaseName, `${(s.illum * 100).toFixed(0)}% 可见 · 第 ${m.month} 月 ${m.day} 日`) +
        metric('太阳高度', `${s.sunAltitude.toFixed(1)}°`, s.isDay ? '月昼' : '月夜') +
        metric('月面温度', `${s.tempC.toFixed(0)} °C`, '热平衡模型') +
        metric(n.label, n.text, s.isDay ? '下一次日落' : '下一次日出');
      els.weatherAlert.className = 'weather-alert ' + (s.isDay ? 'warn' : 'warn');
      els.weatherAlert.innerHTML = `<b>${s.isDay ? '月昼环境提示' : '月夜环境提示'}</b><span>${s.isDay ? '日照区表面温度高、辐射强；舱外活动需按月面作业规范执行。' : '月夜无日照、表面温度低；以电池与热控为主。月球无大气，本页不提供常规天气。'}</span>`;
      els.weatherForecastWrap.hidden = true;
      els.weatherSource.innerHTML = `数据：月相与太阳高度由 Astronomy Engine 解算；温度为月面热平衡模型估算，不是实测天气。<br>地图：NASA LRO/LROC。`;
      setWeatherMode('model', '模型');
      els.weatherMetaRight.textContent = '模型 · 月面热平衡 · 非实测天气';
    } else {
      const s = W.marsState(site, jd);
      const m = C.marsFromJd(jd);
      els.weatherWorldLabel.textContent = '火星 · 站点环境';
      els.weatherLocal.textContent = `${s.condition} · 站点真太阳时 ${s.localTime} · 标准时 ${s.standardTime} MTC`;
      els.weatherUnit.textContent = '°C';
      els.weatherMetric.textContent = s.tempC.toFixed(0);
      els.weatherCondition.textContent = s.condition;
      els.weatherRange.textContent = `最高 ${s.maxC.toFixed(0)}° / 最低 ${s.minC.toFixed(0)}° · 太阳黄经 ${s.ls.toFixed(1)}°`;
      els.weatherFacts.innerHTML =
        metric('站点风速', `${s.windMps.toFixed(1)} m/s`, '模型估算') +
        metric('站点气压', `${Math.round(s.pressurePa)} Pa`, site.elev != null ? `海拔 ${site.elev.toLocaleString('en-US')} m` : '') +
        metric('太阳黄经', `${s.ls.toFixed(1)}°`, `北半球${s.season}`) +
        metric('火星标准时', `${s.standardTime} MTC`, `站点真太阳时 ${s.localTime}`);
      els.weatherAlert.className = 'weather-alert ' + (s.dustSeason ? 'warn' : 'calm');
      els.weatherAlert.innerHTML = s.dustSeason
        ? `<b>南半球尘季</b><span>太阳黄经 ${s.ls.toFixed(1)}°，进入南半球尘季。模型显示局地沙尘风险上升；本页未同化实时沙尘观测。</span>`
        : `<b>非全球尘暴高发期</b><span>太阳黄经 ${s.ls.toFixed(1)}°，当前不在全球尘暴高发期。站点数据为模型估算。</span>`;
      const forecast = W.marsForecast(site, jd, 4);
      const all = forecast.reduce((a, x) => a.concat([x.minC, x.maxC]), []);
      const low = Math.min.apply(null, all), high = Math.max.apply(null, all);
      els.weatherForecastSummary.textContent = '未来 4 个火星日';
      els.weatherForecastWrap.hidden = false;
      els.weatherForecast.innerHTML = `<div class="forecast-table">${forecast.map((f) => {
        const left = ((f.minC - low) / (high - low || 1)) * 100;
        const width = Math.max(5, ((f.maxC - f.minC) / (high - low || 1)) * 100);
        return `<div class="forecast-row"><span class="fday">${esc(f.label)}<small>太阳黄经 ${f.ls.toFixed(1)}°</small></span>${icon('i-mars')}<span class="fbar"><i style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></i></span><span class="frange"><b>${f.maxC.toFixed(0)}°</b> <em>${f.minC.toFixed(0)}°</em></span></div>`;
      }).join('')}</div>`;
      const ref = state.marsRef;
      const refText = ref ? `；NASA InSight 最后公开实测：Sol ${ref.sol}，平均 ${ref.temp.av.toFixed(1)}°C，风速 ${ref.wind.av.toFixed(1)} m/s，气压 ${Math.round(ref.pressure.av)} Pa（2020 年存档）` : '';
      els.weatherSource.innerHTML = `数据：站点温度为简化火星气候模型（纬度、海拔、太阳黄经、昼夜周期），标注为“模型”${refText}。<br>地图：NASA / USGS Viking MDIM21。`;
      setWeatherMode('model', '模型 + 实测校核');
      els.weatherMetaRight.textContent = '模型估算 · InSight 存档校核 · 非实时';
    }
  }

  function renderEarthWeather(site) {
    const data = state.earth;
    if (!data) {
      els.weatherMetric.textContent = '—';
      els.weatherCondition.textContent = state.earthLoading ? '正在读取站点观测…' : '观测暂不可用';
      els.weatherRange.textContent = state.earthError ? state.earthError : 'Open-Meteo';
      els.weatherFacts.innerHTML = metric('湿度', '—') + metric('风速', '—') + metric('气压', '—') + metric('空气', '—');
      els.weatherAlert.className = 'weather-alert loading';
      els.weatherAlert.innerHTML = `<b>${state.earthLoading ? '正在连接 Open-Meteo…' : '数据源未连接'}</b><span>${state.earthLoading ? '请求实况与五日预报。' : '可以点击右上角刷新，或检查网络后重试。'}</span>`;
      els.weatherForecastWrap.hidden = true;
      els.weatherSource.textContent = '数据：Open-Meteo（实况 / 预报 / 空气质量）';
      setWeatherMode('live', '实测');
      els.weatherMetaRight.textContent = state.earthLoading ? '正在连接观测源…' : '观测源未连接';
      return;
    }
    const cur = data.current || {};
    const today = data.daily && data.daily[0];
    els.weatherMetric.textContent = WX.fmtTemp(cur.temp, 0);
    els.weatherCondition.textContent = `${cur.text || '天气'}${cur.feels != null ? ' · 体感 ' + WX.fmtTemp(cur.feels, 0) + '°' : ''}`;
    els.weatherRange.textContent = `最高 ${WX.fmtTemp(today ? today.max : cur.temp, 0)}° / 最低 ${WX.fmtTemp(today ? today.min : cur.temp, 0)}° · 站点 ${site.name}`;
    els.weatherFacts.innerHTML =
      metric('湿度', cur.humidity == null ? '—' : Math.round(cur.humidity) + '%') +
      metric('风速', cur.wind == null ? '—' : WX.fmtTemp(cur.wind, 0) + ' km/h', cur.windText) +
      metric('气压', cur.pressure == null ? '—' : Math.round(cur.pressure) + ' hPa', '海平面') +
      metric('空气质量', data.air && data.air.usAqi != null ? `${Math.round(data.air.usAqi)} ${WX.aqiLabel(data.air.usAqi)}` : '—', data.air ? 'US AQI' : '无观测');
    const alert = earthAlert(data);
    els.weatherAlert.className = 'weather-alert ' + alert.tone;
    els.weatherAlert.innerHTML = `<b>${esc(alert.title)}</b><span>${esc(alert.text)}</span>`;
    els.weatherForecastSummary.textContent = '未来 5 天';
    els.weatherForecastWrap.hidden = false;
    const days = data.daily || [];
    const mins = days.map((d) => d.min), maxs = days.map((d) => d.max);
    const low = Math.min.apply(null, mins), high = Math.max.apply(null, maxs);
    els.weatherForecast.innerHTML = `<div class="forecast-table">${days.map((d, i) => {
      const w = WX.weatherOf(d.code, 1);
      const left = ((d.min - low) / (high - low || 1)) * 100;
      const width = Math.max(5, ((d.max - d.min) / (high - low || 1)) * 100);
      const label = i === 0 ? '今天' : i === 1 ? '明天' : d.date.slice(5).replace('-', '/');
      return `<div class="forecast-row"><span class="fday">${label}<small>${esc(d.text)}</small></span>${iconOfWx(w.icon)}<span class="fbar"><i style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></i></span><span class="frange"><b>${WX.fmtTemp(d.max, 0)}°</b> <em>${WX.fmtTemp(d.min, 0)}°</em></span></div>`;
    }).join('')}</div>`;
    setWeatherMode('live', '实测');
    els.weatherSource.innerHTML = `数据：<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · 更新 ${WX.shortTime(data.updatedAt)} 北京 · 空气质量 Open-Meteo Air Quality。<br>地图：NASA Blue Marble。${data.stale ? ' 当前显示缓存读数。' : ''}`;
    els.weatherMetaRight.textContent = data.stale ? '缓存读数 · 网络恢复后可刷新' : 'Open-Meteo · 实况与五日预报';
  }

  /* ============================================================
     dialogs / info
     ============================================================ */
  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  }
  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    if (!document.querySelector('dialog[open]')) document.body.style.overflow = '';
  }
  function openInfo() {
    if (window.CosmicAssistant) window.CosmicAssistant.close();
    state.lastFocus = document.activeElement;
    state.infoOpen = true;
    els.infoLayer.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      els.infoLayer.classList.add('is-open');
      els.infoClose.focus();
    });
  }
  function closeInfo() {
    if (!state.infoOpen) return;
    state.infoOpen = false;
    els.infoLayer.classList.remove('is-open');
    document.body.style.overflow = '';
    clearTimeout(state.timers.info);
    state.timers.info = setTimeout(() => { els.infoLayer.hidden = true; }, 350);
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
  }

  /* ============================================================
     colony overview
     ============================================================ */
  function renderColony() {
    els.colonyGrid.innerHTML = `
      <div class="colony-item"><span>月球常驻站</span><b>${W.COLONY.moon.sites}</b><small>${W.COLONY.moon.population.toLocaleString('en-US')} 人 · 静海 / 沙克尔顿 / 风暴洋 / 危海 / 雨海</small></div>
      <div class="colony-item"><span>火星常驻站</span><b>${W.COLONY.mars.sites}</b><small>${W.COLONY.mars.population.toLocaleString('en-US')} 人 · 杰泽罗 / 盖尔 / 埃律西昂 / 奥林帕斯 / 水手谷</small></div>
      <div class="colony-item"><span>地月火常驻网络</span><b>${(W.COLONY.moon.population + W.COLONY.mars.population).toLocaleString('en-US')}</b><small>人 · 月球与火星合计 · 概念设定</small></div>`;
  }

  /* ============================================================
     tick + assistant context + init
     ============================================================ */
  function tick(force) {
    const jd = jdNow();
    A.setNowRef(jd);
    const e = C.earthFromJd(jd);
    els.headerClock.textContent = C.clockText(C.bjClock(jd));
    const lunar = C.lunarOfJd(jd);
    els.headerDate.textContent = `${e.year} 年 ${e.month} 月 ${e.day} 日 · ${e.weekName} · 北京时间`;
    if (state.module === 'time' && state.timeMode === 'live') updateTimeLive(jd);
    if (e.N !== state.lastDayN || force) {
      state.lastDayN = e.N;
      if (state.module === 'calendar') renderCalendar(true);
      if (state.module === 'time' && state.timeMode === 'live') renderTime(true);
    }
  }

  function makeAssistantContext() {
    const jd = jdNow();
    const tWorld = state.timeWorld;
    const timeRows = WORLDS.map((w) => {
      const r = timeRowData(w, state.timeSites[w], jd);
      return { world: W.WORLDS[w].name, standard: r.standard + ' ' + r.standardLabel, local: r.local, site: r.note };
    });
    const site = weatherSite();
    let weather = null;
    if (state.weatherWorld === 'earth' && state.earth) {
      const d = state.earth;
      weather = { world: '地球', site: site.name, tempC: d.current.temp, condition: d.current.text, highC: d.daily && d.daily[0] ? d.daily[0].max : null, lowC: d.daily && d.daily[0] ? d.daily[0].min : null, aqi: d.air ? d.air.usAqi : null };
    } else if (state.weatherWorld === 'moon') {
      const s = W.moonState(site, jd);
      weather = { world: '月球', site: site.name, tempC: s.tempC, condition: s.condition, sunAltitude: s.sunAltitude, model: true };
    } else if (state.weatherWorld === 'mars') {
      const s = W.marsState(site, jd);
      weather = { world: '火星', site: site.name, tempC: s.tempC, condition: s.condition, windMps: s.windMps, pressurePa: s.pressurePa, ls: s.ls, season: s.season, model: true };
    }
    return {
      officialTime: `${C.earthFromJd(jd).label} ${C.clockText(C.bjClock(jd))} 北京时间`,
      selectedTimeWorld: W.WORLDS[tWorld].name,
      timeStandards: timeRows,
      calendar: { world: W.WORLDS[state.cal].name, date: calendarSnapshot(state.cal, jd).world === 'earth' ? C.earthFromJd(jd).label : calendarSnapshot(state.cal, jd).world === 'moon' ? C.moonFromJd(jd).label : C.marsFromJd(jd).label, site: state.calSites[state.cal] },
      weather,
      nextHolidays: state.holidays.map((f) => ({ name: f.name, date: f.isoDate, when: f.when, moon: f.proj.moon.text, mars: f.proj.mars.text })),
      sites: { time: state.timeSites, calendar: state.calSites, weather: state.weatherSites },
      colony: { moon: W.COLONY.moon, mars: W.COLONY.mars }
    };
  }

  function closeOtherPanelsForAssistant() {
    if (state.infoOpen) closeInfo();
    if (els.holidayDialog && els.holidayDialog.open) closeDialog(els.holidayDialog);
  }
  window.CosmicState = () => ({ module: state.module, world: state.weatherWorld, site: weatherSite(), jd: jdNow() });
  window.CosmicContext = makeAssistantContext;
  window.CosmicApp = { closeOtherPanelsForAssistant };

  /* ============================================================
     events
     ============================================================ */
  function bindEvents() {
    $$('.module-tab', els.moduleNav).forEach((b) => b.addEventListener('click', () => setModule(b.dataset.module)));
    els.moduleNav.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const tabs = $$('.module-tab', els.moduleNav);
      const idx = tabs.findIndex((b) => b.dataset.module === state.module);
      if (idx < 0) return;
      e.preventDefault();
      const next = tabs[mod(idx + (e.key === 'ArrowRight' ? 1 : -1), tabs.length)];
      setModule(next.dataset.module);
      next.focus();
    });

    els.timeWorld.addEventListener('change', () => {
      state.timeWorld = els.timeWorld.value;
      populateSiteSelect(els.timeSite, state.timeWorld, state.timeSites[state.timeWorld]);
      savePrefs();
      renderTime(true);
    });
    els.timeSite.addEventListener('change', () => {
      state.timeSites[state.timeWorld] = els.timeSite.value;
      savePrefs();
      renderTime(true);
    });
    mapMarkersClickMarkers(els.timeMapMarkers, (id) => {
      state.timeSites[state.timeWorld] = id;
      els.timeSite.value = id;
      savePrefs();
      renderTime(true);
    });
    els.timeTable.addEventListener('click', (e) => {
      const row = e.target.closest('[data-time-world]');
      if (row) {
        state.timeWorld = row.dataset.timeWorld;
        els.timeWorld.value = state.timeWorld;
        populateSiteSelect(els.timeSite, state.timeWorld, state.timeSites[state.timeWorld]);
        savePrefs();
        renderTime(true);
      }
    });
    els.timeDate.addEventListener('change', handleTimeInput);
    els.timeClockInput.addEventListener('change', handleTimeInput);
    els.timeNowBtn.addEventListener('click', resetTime);

    els.calendarSelect.addEventListener('change', () => {
      state.cal = els.calendarSelect.value;
      populateSiteSelect(els.calendarSite, state.cal, state.calSites[state.cal]);
      onDayOrNow(jdNow());
      savePrefs();
      renderCalendar(true);
    });
    els.calendarSite.addEventListener('change', () => {
      state.calSites[state.cal] = els.calendarSite.value;
      savePrefs();
      renderCalendar(true);
    });
    mapMarkersClickMarkers(els.calendarMapMarkers, (id) => {
      state.calSites[state.cal] = id;
      els.calendarSite.value = id;
      savePrefs();
      renderCalendar(true);
    });
    els.calendarPrev.addEventListener('click', () => shiftCalendar(-1));
    els.calendarNext.addEventListener('click', () => shiftCalendar(1));
    els.calendarToday.addEventListener('click', calendarToday);
    els.holidayList.addEventListener('click', (e) => {
      const row = e.target.closest('[data-holiday]');
      if (row) openHoliday(+row.dataset.holiday);
    });
    els.holidayInfoBtn.addEventListener('click', openInfo);

    els.weatherWorld.addEventListener('change', () => {
      state.weatherWorld = els.weatherWorld.value;
      populateSiteSelect(els.weatherSite, state.weatherWorld, state.weatherSites[state.weatherWorld]);
      savePrefs();
      if (state.weatherWorld === 'earth') loadEarthWeather(); else renderWeather();
    });
    els.weatherSite.addEventListener('change', () => {
      state.weatherSites[state.weatherWorld] = els.weatherSite.value;
      savePrefs();
      if (state.weatherWorld === 'earth') loadEarthWeather(); else renderWeather();
    });
    mapMarkersClickMarkers(els.weatherMapMarkers, (id) => {
      state.weatherSites[state.weatherWorld] = id;
      els.weatherSite.value = id;
      savePrefs();
      if (state.weatherWorld === 'earth') loadEarthWeather(); else renderWeather();
    });
    els.weatherRefresh.addEventListener('click', () => {
      if (state.weatherWorld === 'earth') loadEarthWeather();
      else renderWeather();
    });

    els.themeBtn.addEventListener('click', toggleTheme);
    els.infoBtn.addEventListener('click', openInfo);
    els.footerInfoBtn.addEventListener('click', openInfo);
    els.infoClose.addEventListener('click', closeInfo);
    els.infoLayer.addEventListener('click', (e) => { if (e.target.closest('[data-close-info]')) closeInfo(); });
    els.holidayClose.addEventListener('click', () => closeDialog(els.holidayDialog));
    els.holidayDialog.addEventListener('click', (e) => { if (e.target === els.holidayDialog) closeDialog(els.holidayDialog); });
    els.holidayDialog.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) document.body.style.overflow = ''; });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.infoOpen) closeInfo();
    });
    window.addEventListener('hashchange', () => {
      const h = (location.hash || '').replace('#', '');
      if (MODULES.indexOf(h) >= 0 && h !== state.module) setModule(h);
    });
    window.addEventListener('resize', () => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(true); });
  }

  /* ============================================================
     init
     ============================================================ */
  function init() {
    document.documentElement.dataset.theme = state.theme;
    els.timeWorld.value = state.timeWorld;
    els.weatherWorld.value = state.weatherWorld;
    els.calendarSelect.value = state.cal;
    populateSiteSelect(els.timeSite, state.timeWorld, state.timeSites[state.timeWorld]);
    populateSiteSelect(els.calendarSite, state.cal, state.calSites[state.cal]);
    populateSiteSelect(els.weatherSite, state.weatherWorld, state.weatherSites[state.weatherWorld]);
    renderColony();
    bindEvents();
    renderTime(true);
    renderCalendar(true);
    renderWeather();
    loadEarthWeather();
    if (WX.getMars) WX.getMars().then((data) => { state.marsRef = data; if (state.weatherWorld === 'mars') renderWeather(); }).catch(() => {});
    setModule(state.module, { silent: true, noScroll: true });
    tick(true);
    setInterval(() => tick(false), 1000);
    applyTheme(state.theme);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {});
  }

  /* ============================================================
     v5 immersive shell: global location, star map, hourly/daily
     ============================================================ */
  const $v = (s) => document.querySelector(s);
  const locChip = $v('#locationChip');
  const locName = $v('#locName');
  const locIcon = $v('#locIcon');
  const starDialog = $v('#starDialog');
  const starWorlds = $v('#starWorlds');
  const starMapBg = $v('#starMapBg');
  const starMapMarkers = $v('#starMapMarkers');
  const starInfo = $v('#starInfo');
  const starClose = $v('#starClose');
  const hourlyPanel = $v('#hourlyPanel');
  const hourlyBody = $v('#hourlyBody');
  const hourlyTitle = $v('#hourlyTitle');
  const hourlySub = $v('#hourlySub');
  const calTypeRow = $v('#calTypeRow');
  let starWorld = 'mars';
  let show14 = false;

  // immersive default: Mars, Jezero, dark, weather
  state.module = 'weather';
  state.theme = 'dark';
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.dataset.world = 'mars';
  state.globalWorld = 'mars';
  state.globalSite = 'valles';
  state.cal = 'mars';
  state.timeWorld = 'mars';
  state.weatherWorld = 'mars';
  state.timeSites.mars = 'valles';
  state.calSites.mars = 'valles';
  state.weatherSites.mars = 'valles';

  function worldIcon(world) { return world === 'earth' ? 'i-earth' : world === 'moon' ? 'i-moon' : 'i-mars'; }
  function locationText() {
    const site = W.siteOf(state.globalWorld, state.globalSite);
    return `${W.WORLDS[state.globalWorld].name} · ${site.name}`;
  }
  function syncHiddenSelects() {
    if (els.timeWorld) els.timeWorld.value = state.timeWorld;
    if (els.timeSite) populateSiteSelect(els.timeSite, state.timeWorld, state.timeSites[state.timeWorld]);
    if (els.weatherWorld) els.weatherWorld.value = state.weatherWorld;
    if (els.weatherSite) populateSiteSelect(els.weatherSite, state.weatherWorld, state.weatherSites[state.weatherWorld]);
    if (els.calendarSelect) els.calendarSelect.value = state.cal;
    if (els.calendarSite) populateSiteSelect(els.calendarSite, state.cal, state.calSites[state.cal]);
  }
  function syncImmersiveChrome() {
    const world = state.globalWorld;
    document.documentElement.dataset.world = world;
    locName.textContent = locationText();
    locIcon.innerHTML = icon(worldIcon(world));
    locChip.dataset.world = world;
    const tp = $v('.time-panel'); if (tp) tp.dataset.world = state.timeWorld;
    const cp = $v('.calendar-summary'); if (cp) cp.dataset.world = state.cal;
    const wp = $v('.weather-panel'); if (wp) wp.dataset.world = state.weatherWorld;
    if (calTypeRow) {
      Array.from(calTypeRow.querySelectorAll('[data-cal]')).forEach((b) => {
        const on = b.dataset.cal === state.cal;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    document.documentElement.dataset.cal = state.cal;
  }
  function applyGlobal(world, siteId, quiet) {
    const site = W.siteOf(world, siteId);
    state.globalWorld = world;
    state.globalSite = site.id;
    state.timeWorld = world;
    state.weatherWorld = world;
    state.cal = world;
    state.timeSites[world] = site.id;
    state.calSites[world] = site.id;
    state.weatherSites[world] = site.id;
    syncHiddenSelects();
    if (world === 'earth') {
      state.earth = null;
      loadEarthWeather();
    }
    renderTime(true);
    renderCalendar(true);
    renderWeather();
    syncImmersiveChrome();
    savePrefs();
    if (!quiet) toast(`地点：${W.WORLDS[world].name} · ${site.name}`);
  }

  // ---- star map ----
  function renderStarMap() {
    const globalSiteId = state.globalSite;
    starWorlds.innerHTML = ['earth', 'moon', 'mars'].map((w) => {
      const meta = W.WORLDS[w];
      const site = W.siteOf(w, w === state.globalWorld ? globalSiteId : (state.timeSites[w] || W.sitesOf(w)[0].id));
      const pop = site.population && site.population !== '—' ? `${site.population.toLocaleString('en-US')} 人` : '观测网络';
      return `<button class="star-world${w === starWorld ? ' active' : ''}" type="button" data-star-world="${w}" data-world="${w}">
        <span class="star-globe"><img src="assets/planets/${w}.webp" alt=""></span>
        <span class="star-world-copy"><small>${meta.en}</small><b>${meta.name}</b><em>${pop}</em></span>
        <span class="star-world-mark">${w === state.globalWorld ? '当前' : '选择'}</span>
      </button>`;
    }).join('');
    const meta = W.WORLDS[starWorld];
    starMapBg.style.backgroundImage = `url("${meta.map}")`;
    starMapMarkers.innerHTML = W.sitesOf(starWorld).map((s) => {
      const p = W.position(s);
      const active = starWorld === state.globalWorld && s.id === globalSiteId;
      return `<button class="star-marker${active ? ' active' : ''}" type="button" data-star-site="${s.id}" style="left:${Math.max(3, Math.min(97, p.x)).toFixed(2)}%;top:${Math.max(3, Math.min(97, p.y)).toFixed(2)}%" aria-label="${esc(s.name)}"><i></i><span>${esc(s.name)}</span></button>`;
    }).join('');
    const current = W.siteOf(starWorld, starWorld === state.globalWorld ? globalSiteId : W.sitesOf(starWorld)[0].id);
    starInfo.innerHTML = `<div class="star-info-head"><span>${meta.name}站点</span><span>${meta.standard}</span></div>
      <div class="star-site-list">${W.sitesOf(starWorld).map((s) => `<button class="star-site-row${s.id === current.id ? ' active' : ''}" type="button" data-star-site="${s.id}">
        <span><b>${esc(s.name)}</b><small>${esc(s.code)} · ${esc(W.coordinate(s))}</small></span>
        <em>${s.population && s.population !== '—' ? s.population.toLocaleString('en-US') + ' 人' : '观测站'}</em>
      </button>`).join('')}</div>
      <p class="star-info-note">${esc(meta.mapCredit)} · 点击站点完成定位。</p>`;
  }
  function openStarMap() {
    starWorld = state.globalWorld;
    renderStarMap();
    openDialog(starDialog);
  }
  if (locChip) locChip.addEventListener('click', openStarMap);
  if (starClose) starClose.addEventListener('click', () => closeDialog(starDialog));
  if (starDialog) {
    starDialog.addEventListener('click', (e) => { if (e.target === starDialog) closeDialog(starDialog); });
    starDialog.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) document.body.style.overflow = ''; });
    starWorlds.addEventListener('click', (e) => {
      const b = e.target.closest('[data-star-world]');
      if (!b) return;
      starWorld = b.dataset.starWorld;
      renderStarMap();
    });
    starMapMarkers.addEventListener('click', (e) => {
      const b = e.target.closest('[data-star-site]');
      if (!b) return;
      closeDialog(starDialog);
      applyGlobal(starWorld, b.dataset.starSite);
    });
    starInfo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-star-site]');
      if (!b) return;
      closeDialog(starDialog);
      applyGlobal(starWorld, b.dataset.starSite);
    });
  }

  // ---- calendar type chips ----
  if (calTypeRow) {
    calTypeRow.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cal]');
      if (!b) return;
      state.cal = b.dataset.cal;
      const siteId = state.cal === state.globalWorld ? state.globalSite : W.sitesOf(state.cal)[0].id;
      state.calSites[state.cal] = siteId;
      if (els.calendarSelect) els.calendarSelect.value = state.cal;
      if (els.calendarSite) populateSiteSelect(els.calendarSite, state.cal, siteId);
      renderCalendar(true);
      syncImmersiveChrome();
      savePrefs();
    });
  }

  // ---- time table becomes a global locator ----
  if (els.timeTable) {
    els.timeTable.addEventListener('click', (e) => {
      const row = e.target.closest('[data-time-world]');
      if (!row) return;
      e.preventDefault();
      e.stopPropagation();
      const w = row.dataset.timeWorld;
      applyGlobal(w, state.timeSites[w] || W.sitesOf(w)[0].id);
    }, true);
  }

  // ---- hourly forecast ----
  function hourlyChart(vals) {
    if (!vals.length) return '';
    const w = 720, h = 100, pad = 8;
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max - min < 2) { min -= 1; max += 1; }
    const pts = vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
      return [x, y];
    });
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ` L${w - pad} ${h} L${pad} ${h} Z`;
    return `<svg class="hourly-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="hourlyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><path class="hourly-area" d="${area}" fill="url(#hourlyFill)"/><path class="hourly-line" d="${line}"/><circle cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="3.2"/></svg>`;
  }
  function renderHourly() {
    if (!hourlyPanel || !hourlyBody) return;
    const world = state.weatherWorld;
    const site = W.siteOf(world, state.weatherSites[world]);
    const jd = jdNow();
    let title = '未来 24 小时', sub = 'HOURLY FORECAST';
    let items = [], vals = [];
    if (world === 'earth') {
      const d = state.earth;
      if (!d) {
        hourlyTitle.textContent = '未来 24 小时';
        hourlySub.textContent = state.earthLoading ? '正在读取 Open-Meteo…' : '观测不可用';
        hourlyBody.innerHTML = '<div class="hourly-loading">正在读取逐小时预报…</div>';
        return;
      }
      const hs = d.hourly || [];
      items = hs.map((x) => {
        const w = WX.weatherOf(x.code, 1);
        return `<div class="hour-item"><span class="hour-time">${x.label}</span>${icon('i-wx-' + w.icon)}<b>${WX.fmtTemp(x.temp, 0)}°</b><small>${x.rain != null ? x.rain + '%' : ''}</small></div>`;
      });
      vals = hs.map((x) => x.temp).filter((v) => typeof v === 'number');
      sub = 'OPEN-METEO · 实测';
    } else if (world === 'mars') {
      const hs = W.marsHourly(site, jd, 24);
      items = hs.map((x) => `<div class="hour-item"><span class="hour-time">${x.label}</span>${icon('i-mars')}<b>${x.tempC.toFixed(0)}°</b><small>${x.windMps.toFixed(1)} m/s</small></div>`);
      vals = hs.map((x) => x.tempC);
      title = '未来 24 个火星时';
      sub = 'MODEL · 站点模型';
    } else {
      const hs = W.moonHourly(site, jd, 24);
      items = hs.map((x) => `<div class="hour-item"><span class="hour-time">${x.label}</span><span class="hour-daydot ${x.isDay ? 'day' : 'night'}"></span><b>${x.tempC.toFixed(0)}°</b><small>${x.isDay ? '昼' : '夜'}</small></div>`);
      vals = hs.map((x) => x.tempC);
      title = '未来 24 小时';
      sub = 'MODEL · 月面热平衡';
    }
    hourlyTitle.textContent = title;
    hourlySub.textContent = sub;
    hourlyBody.innerHTML = `${hourlyChart(vals)}<div class="hourly-scroll">${items.join('')}</div>`;
  }

  // ---- daily forecast enhancements ----
  function forecastRange(min, max, lo, hi) {
    const left = ((min - lo) / (hi - lo || 1)) * 100;
    const width = Math.max(5, ((max - min) / (hi - lo || 1)) * 100);
    return `<span class="fbar"><i style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></i></span>`;
  }
  function renderDaily() {
    const wrap = $v('#weatherForecastWrap');
    const box = $v('#weatherForecast');
    const summary = $v('#weatherForecastSummary');
    if (!wrap || !box) return;
    const world = state.weatherWorld;
    const site = W.siteOf(world, state.weatherSites[world]);
    const jd = jdNow();
    if (world === 'earth') {
      const d = state.earth;
      if (!d || !d.daily || !d.daily.length) { wrap.hidden = true; return; }
      const rows = Array.from(box.querySelectorAll('.forecast-row'));
      if (!rows.length) return;
      rows.forEach((r, i) => { r.hidden = !show14 && i >= 7; });
      const more = box.querySelector('.forecast-more');
      if (rows.length > 7) {
        if (!more) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'forecast-more';
          b.dataset.moreDays = '1';
          b.textContent = show14 ? '收起为 7 天' : '查看 14 天';
          box.appendChild(b);
        } else {
          more.textContent = show14 ? '收起为 7 天' : '查看 14 天';
        }
      }
      summary.textContent = '未来 7 天';
      wrap.hidden = false;
      wrap.open = true;
      return;
    }
    if (world === 'mars') {
      const fs = W.marsForecast(site, jd, 7);
      const all = fs.reduce((a, x) => a.concat([x.minC, x.maxC]), []);
      const lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
      box.innerHTML = `<div class="forecast-table">${fs.map((f) => `<div class="forecast-row"><span class="fday">${esc(f.label)}<small>${esc(f.condition)}</small></span>${icon('i-mars')}${forecastRange(f.minC, f.maxC, lo, hi)}<span class="frange"><b>${f.maxC.toFixed(0)}°</b> <em>${f.minC.toFixed(0)}°</em></span></div>`).join('')}</div>`;
      const old = box.querySelector('.forecast-more'); if (old) old.remove();
      if (summary) summary.textContent = '未来 7 个火星日';
      wrap.hidden = false;
      wrap.open = true;
      return;
    }
    const fs = W.moonForecast(site, jd, 7);
    const all = fs.reduce((a, x) => a.concat([x.minC, x.maxC]), []);
    const lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    box.innerHTML = `<div class="forecast-table">${fs.map((f) => `<div class="forecast-row"><span class="fday">${esc(f.label)}<small>${esc(f.phase)}</small></span>${icon('i-moon')}${forecastRange(f.minC, f.maxC, lo, hi)}<span class="frange"><b>${f.maxC.toFixed(0)}°</b> <em>${f.minC.toFixed(0)}°</em></span></div>`).join('')}</div>`;
    const old = box.querySelector('.forecast-more'); if (old) old.remove();
    if (summary) summary.textContent = '未来 7 个地球日 · 模型';
    wrap.hidden = false;
    wrap.open = true;
  }

  function moveForecastCard() {
    const wrap = document.querySelector('#weatherForecastWrap');
    if (!wrap || wrap.closest('.daily-panel')) return;
    const panel = document.querySelector('.weather-panel');
    if (!panel) return;
    const source = panel.querySelector('.source-line');
    const daily = document.createElement('section');
    daily.className = 'panel daily-panel';
    daily.id = 'dailyPanel';
    daily.innerHTML = '<header class="panel-head"><span>预报 / FORECAST</span><span class="panel-credit" id="dailyCredit">DAILY</span></header>';
    daily.appendChild(wrap);
    if (source) daily.appendChild(source);
    if (hourlyPanel) hourlyPanel.insertAdjacentElement('afterend', daily);
    else panel.insertAdjacentElement('afterend', daily);
  }
  function afterWeather() {
    syncImmersiveChrome();
    moveForecastCard();
    renderHourly();
    renderDaily();
  }

  // wrap base renderers
  const baseRenderWeather = renderWeather;
  renderWeather = function () {
    baseRenderWeather.apply(null, arguments);
    afterWeather();
  };
  const baseRenderTime = renderTime;
  renderTime = function () {
    baseRenderTime.apply(null, arguments);
    syncImmersiveChrome();
  };
  const baseRenderCalendar = renderCalendar;
  renderCalendar = function () {
    baseRenderCalendar.apply(null, arguments);
    syncImmersiveChrome();
  };

  // more-days button (delegated)
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-more-days]')) return;
    show14 = !show14;
    renderDaily();
  });

  const baseInit = init;
  init = function () {
    baseInit();
    syncHiddenSelects();
    syncImmersiveChrome();
    afterWeather();
  };

  init();
})();
