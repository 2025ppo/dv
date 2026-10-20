  /* ============================================================
     modules + time + star map
     ============================================================ */
  const MODULE_TITLES = { time: '时间', calendar: '日历', weather: '气象' };
  const TIME_META = {
    earth: { icon: 'i-earth', kicker: '地球 · 北京时间', label: '地球' },
    mars: { icon: 'i-mars', kicker: '火星 · 当地太阳时', label: '火星' },
    moon: { icon: 'i-moon', kicker: '月球 · 月龄', label: '月球' },
    galaxy: { icon: 'i-galaxy', kicker: '银河 · 轨道位置', label: '银河' },
    cosmos: { icon: 'i-cosmos', kicker: '宇宙 · 宇宙钟', label: '宇宙' }
  };
  const STAR_AVAILABLE = {
    time: ['earth', 'moon', 'mars', 'galaxy', 'cosmos'],
    calendar: ['earth', 'moon', 'mars', 'galaxy', 'cosmos'],
    weather: ['earth', 'mars', 'sun']
  };

  function setModule(module, opts) {
    if (VALID_MODULES.indexOf(module) < 0) return;
    const o = opts || {};
    const changed = module !== state.module;
    state.module = module;
    $$('[data-module-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.modulePanel !== module;
    });
    syncModuleTabs();
    if (module === 'time') {
      renderTime(false);
    } else if (module === 'calendar') {
      syncCalendarSelect();
      renderHero(false);
      renderCalendar(false);
      updateDetailForState();
    } else {
      renderWeather();
    }
    document.title = MODULE_TITLES[module] + ' · 宇宙日历';
    document.documentElement.dataset.module = module;
    if (!o.noScroll && changed) {
      window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
    if (!o.silent) {
      try { history.replaceState(null, '', '#' + module); } catch (e) {}
      savePrefs();
    }
    closePalette();
  }

  function timeJd() {
    return state.timeMode === 'fixed' && state.timeFixedJd ? state.timeFixedJd : jdNow();
  }
  function timeSnapshot(jd) {
    return {
      e: C.earthFromJd(jd),
      m: C.moonFromJd(jd),
      ma: C.marsFromJd(jd),
      g: C.galaxyFromJd(jd),
      co: C.cosmosFromJd(jd)
    };
  }
  function setTimeInputs(jd) {
    if (!els.timeDate || !els.timeClockInput) return;
    const e = C.earthFromJd(jd);
    const date = e.year + '-' + C.pad2(e.month) + '-' + C.pad2(e.day);
    const time = C.clockText(C.bjClock(jd));
    if (document.activeElement !== els.timeDate) els.timeDate.value = date;
    if (document.activeElement !== els.timeClockInput) els.timeClockInput.value = time;
  }
  function timeRows(jd) {
    const s = timeSnapshot(jd);
    const rows = [
      { id: 'earth', icon: 'i-earth', label: '地球', value: C.clockText(C.bjClock(jd)), detail: s.e.monthName + s.e.day + '日 · ' + s.e.weekName },
      { id: 'moon', icon: 'i-moon', label: '月球', value: (s.m.phase * A.SYNODIC).toFixed(1) + ' 天', detail: s.m.phaseName + ' · 第 ' + s.m.month + ' 月 ' + s.m.day + ' 日' },
      { id: 'mars', icon: 'i-mars', label: '火星', value: s.ma.timeText, detail: '太阳黄经 ' + s.ma.ls.toFixed(1) + '° · 第 ' + s.ma.month + ' 月 ' + s.ma.day + ' 日' },
      { id: 'galaxy', icon: 'i-galaxy', label: '银河', value: (s.g.phase * 100).toFixed(1) + '%', detail: '第 ' + s.g.year + ' 年 · 第 ' + s.g.month + ' 月 ' + s.g.day + ' 日' },
      { id: 'cosmos', icon: 'i-cosmos', label: '宇宙', value: s.co.timeText, detail: '第 1 年 · ' + s.co.monthName + s.co.day + '日' }
    ];
    return rows.map((r) => `<button class="time-item${state.timeFrame === r.id ? ' active' : ''}" type="button" data-time-frame="${r.id}" aria-pressed="${state.timeFrame === r.id ? 'true' : 'false'}">
      <span class="time-item-icon">${icon(r.icon)}</span>
      <span class="time-item-copy"><b>${esc(r.label)}</b><small>${esc(r.detail)}</small></span>
      <span class="time-item-value" data-time-value="${r.id}">${esc(r.value)}</span>
    </button>`).join('');
  }
  function renderTime(animate) {
    const jd = timeJd();
    A.setNowRef(jd);
    const s = timeSnapshot(jd);
    const frame = state.timeFrame;
    let big = '';
    let sub = '';
    let chips = '';
    let art = '';
    if (frame === 'earth') {
      big = C.clockText(C.bjClock(jd));
      sub = s.e.label + ' · ' + s.e.weekName + ' · 北京时间（UTC+8）';
      chips = chip('i-clock', '北京时间 UTC+8') + chip('i-calendar', '第 ' + s.e.dayOfYear + ' 天 / ' + s.e.daysInYear, true);
      art = svgEarth(s.e);
    } else if (frame === 'mars') {
      big = s.ma.timeText;
      sub = '火星历 第 ' + s.ma.year + ' 年 ' + s.ma.month + ' 月 ' + s.ma.day + ' 日 · 太阳黄经 ' + s.ma.ls.toFixed(1) + '°';
      chips = chip('i-clock', '火星当地时间') + chip('i-mars', '本月 ' + s.ma.monthLen + ' 个火星日', true);
      art = svgMars(s.ma, 'timeMars');
    } else if (frame === 'moon') {
      big = (s.m.phase * A.SYNODIC).toFixed(1) + ' 天';
      sub = '月球历 第 ' + s.m.year + ' 年 ' + s.m.month + ' 月 ' + s.m.day + ' 日 · ' + s.m.phaseName;
      chips = chip('i-moon', '月龄 ' + (s.m.phase * A.SYNODIC).toFixed(1) + ' 天') + chip('i-calendar', '本月 ' + s.m.monthLen + ' 天', true);
      art = svgMoon(s.m.phase, 'timeMoon', { labels: true });
    } else if (frame === 'galaxy') {
      big = (s.g.phase * 100).toFixed(1) + '%';
      sub = '银河历 第 ' + s.g.year + ' 年 ' + s.g.month + ' 月 ' + s.g.day + ' 日 · 绕银河系一圈约 2.25 亿年';
      chips = chip('i-galaxy', '轨道位置 ' + (s.g.phase * 100).toFixed(1) + '%') + chip('i-clock', '1 个银河日 ≈ 62.5 万年', true);
      art = svgGalaxy(s.g, 'timeGalaxy', { labels: false });
    } else {
      big = s.co.timeText;
      sub = '宇宙历 第 1 年 ' + s.co.monthName + ' ' + s.co.day + ' 日 · 宇宙年龄 ' + (s.co.t / 1e8).toFixed(2) + ' 亿年';
      chips = chip('i-clock', '宇宙钟 ' + s.co.timeText) + chip('i-cosmos', '1 宇宙秒 ≈ 437 地球年', true);
      art = svgCosmos(s.co);
    }
    if (!els.timeBig) return;
    els.timeKicker.textContent = TIME_META[frame].kicker;
    els.timeBig.className = 'time-big' + (frame === 'cosmos' ? ' is-long' : '');
    els.timeBig.textContent = big;
    els.timeSub.textContent = sub;
    els.timeChips.innerHTML = chips;
    els.timeArt.innerHTML = art;
    els.timeList.innerHTML = timeRows(jd);
    els.timeStatus.textContent = state.timeMode === 'live' ? '实时' : '已固定';
    els.timeStatus.classList.toggle('fixed', state.timeMode !== 'live');
    if (els.timeSelect) els.timeSelect.value = frame;
    setTimeInputs(jd);
    state.timeInitialized = true;
  }
  function updateTimeLive(jd) {
    if (state.module !== 'time' || state.timeMode !== 'live') return;
    const frame = state.timeFrame;
    if (frame === 'earth') {
      const text = C.clockText(C.bjClock(jd));
      if (els.timeBig) els.timeBig.textContent = text;
      const cell = $('[data-time-value="earth"]', els.timeList);
      if (cell) cell.textContent = text;
    } else if (frame === 'mars') {
      const text = C.marsFromJd(jd).timeText;
      if (els.timeBig) els.timeBig.textContent = text;
      const cell = $('[data-time-value="mars"]', els.timeList);
      if (cell) cell.textContent = text;
    }
  }
  function handleTimeInput() {
    if (!els.timeDate || !els.timeClockInput) return;
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
    renderTime(false);
  }
  function resetTime() {
    state.timeMode = 'live';
    state.timeFixedJd = null;
    renderTime(false);
    setTimeInputs(jdNow());
  }

  function openStarMap() {
    if (!els.starDialog) return;
    closePalette();
    if (state.infoOpen) closeInfo();
    if (window.CosmicAssistant) window.CosmicAssistant.close();
    const module = state.module;
    const available = STAR_AVAILABLE[module] || [];
    $$('.star-target', els.starMap).forEach((g) => {
      const t = g.dataset.star;
      const on = available.indexOf(t) >= 0;
      g.classList.toggle('is-disabled', !on);
      g.classList.toggle('is-available', on);
      g.setAttribute('aria-disabled', on ? 'false' : 'true');
      let selected = false;
      if (module === 'time') selected = t === state.timeFrame;
      else if (module === 'calendar') selected = t === state.cal;
      else selected = t === state.weatherTab;
      g.classList.toggle('is-selected', on && selected);
    });
    els.starHint.textContent = module === 'weather'
      ? '点选地球、火星或太阳，查看对应的天气。'
      : '点选一个世界，切换这一模块的定位。';
    openDialog(els.starDialog);
    state.starOpen = true;
  }
  function selectStarTarget(target) {
    if (!target) return;
    const module = state.module;
    if ((STAR_AVAILABLE[module] || []).indexOf(target) < 0) return;
    if (module === 'time') {
      state.timeFrame = target;
      syncTimeSelect();
      renderTime(true);
    } else if (module === 'calendar') {
      setCal(target);
    } else {
      state.weatherTab = target;
      syncWeatherSelect();
      renderWeather();
    }
    closeDialog(els.starDialog);
  }
