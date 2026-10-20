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
  state.globalSite = 'jezero';
  state.cal = 'mars';
  state.timeWorld = 'mars';
  state.weatherWorld = 'mars';
  state.timeSites.mars = 'jezero';
  state.calSites.mars = 'jezero';
  state.weatherSites.mars = 'jezero';

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

  function afterWeather() {
    syncImmersiveChrome();
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
