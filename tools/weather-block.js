  function weatherKey(tab) { return tab === 'earth' ? 'earth' : tab === 'mars' ? 'mars' : 'space'; }
  function planetName(tab) { return tab === 'earth' ? '地球' : tab === 'mars' ? '火星' : '太阳'; }
  function planetScene(tab) { return tab === 'earth' ? 'earth' : tab === 'mars' ? 'mars' : 'sun'; }
  function planetCredit(tab) {
    return tab === 'earth' ? 'NASA STS-52' : tab === 'mars' ? 'NASA / JPL-Caltech' : 'NASA SDO/AIA 171';
  }
  function dayLabel(date, index) {
    if (index === 0) return '今天';
    if (index === 1) return '明天';
    return date.slice(5).replace('-', '/');
  }
  function rangeBar(min, max, lo, hi, tone) {
    const span = hi - lo || 1;
    const left = Math.max(0, Math.min(100, ((min - lo) / span) * 100));
    const width = Math.max(5, Math.min(100 - left, ((max - min) / span) * 100));
    return `<span class="wxf-bar${tone ? ' ' + tone : ''}"><i style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></i></span>`;
  }
  function marsCondition(wind) {
    const w = Number(wind);
    if (!isFinite(w)) return '低温';
    if (w >= 15) return '大风 · 极寒';
    if (w >= 8) return '有风 · 极寒';
    return '微风 · 极寒';
  }
  function aqiChip(d) {
    if (!d.air || d.air.usAqi == null) return '';
    return `<span class="wx-chip">${icon('i-air')}空气 ${Math.round(d.air.usAqi)} ${WX.aqiLabel(d.air.usAqi)}</span>`;
  }
  function earthAlert(d) {
    const cur = d.current || {};
    const aqi = d.air && d.air.usAqi;
    const rain = d.daily && d.daily[0] ? (d.daily[0].rainChance || 0) : 0;
    if (aqi != null && aqi > 100) {
      return { tone: 'warn', icon: 'i-air', title: '空气质量提示', text: `当前空气质量指数 ${Math.round(aqi)}，${WX.aqiLabel(aqi)}。建议减少长时间户外活动，关闭窗户。` };
    }
    if (rain >= 60) {
      return { tone: 'warn', icon: 'i-alert', title: '降雨提示', text: `今天降雨概率约 ${Math.round(rain)}%。出门带伞，注意路面湿滑。` };
    }
    if (cur.wind != null && cur.wind >= 30) {
      return { tone: 'warn', icon: 'i-wind', title: '大风提示', text: `当前风速约 ${WX.fmtTemp(cur.wind, 0)} km/h。注意高空坠物，骑行和开车放慢速度。` };
    }
    if (cur.temp != null && cur.temp >= 30) {
      return { tone: 'warn', icon: 'i-sun', title: '高温提示', text: `当前气温 ${WX.fmtTemp(cur.temp, 0)}°C。注意补水和防晒，避免长时间暴晒。` };
    }
    if (cur.temp != null && cur.temp <= 0) {
      return { tone: 'warn', icon: 'i-thermo', title: '低温提示', text: `当前气温 ${WX.fmtTemp(cur.temp, 0)}°C。注意保暖，路面可能结冰。` };
    }
    return { tone: 'calm', icon: 'i-spark', title: '天气平稳', text: `${cur.text || '当前天气平稳'}，体感 ${WX.fmtTemp(cur.feels, 0)}°C。可以按计划安排户外活动。` };
  }
  function dustStatus() {
    const now = C.marsFromJd(jdNow());
    const active = now.ls >= 180 && now.ls <= 330;
    return {
      active,
      short: active ? '尘季' : '非尘暴季',
      title: active ? '火星尘季提示' : '火星观测提示',
      text: active
        ? `当前火星太阳黄经 ${now.ls.toFixed(1)}°，南半球进入尘季，局地沙尘可能增多。InSight 数据是 2020 年的存档，不是实时天气。`
        : `当前火星太阳黄经 ${now.ls.toFixed(1)}°，不在全球尘暴高发期。InSight 的最后观测显示风速约 5.6 m/s、气压约 744 Pa；数据为 2020 年存档。`
    };
  }
  function sunAlert(d) {
    const kp = d.kp ? d.kp.value : null;
    if (kp != null && kp >= 5) {
      return { tone: 'warn', icon: 'i-alert', title: '地磁活动增强', text: `Kp 指数 ${WX.fmtTemp(kp, 1)}，可能出现极光；卫星通信、导航和电网可能受到短时影响。` };
    }
    return { tone: 'calm', icon: 'i-spark', title: '地磁平静', text: '当前太阳活动较低，空间天气平稳。负 Bz 时，极光更容易向低纬扩散。' };
  }
  function alertHTML(a) {
    return `<div class="wxf-alert ${a.tone}"><span class="wxf-alert-icon">${icon(a.icon)}</span><div><b>${esc(a.title)}</b><span>${esc(a.text)}</span></div></div>`;
  }
  function previewEarth(d) {
    const cur = d.current || {};
    const today = d.daily && d.daily[0];
    const hi = today ? today.max : cur.temp;
    const lo = today ? today.min : cur.temp;
    return `<div class="wx-preview">
      <div class="wx-placeline"><span class="wx-place">${icon('i-pin')}<span>地球 · ${esc(WX.locLabel(d.loc))}</span></span><button type="button" data-open-loc>更换</button></div>
      <div class="wx-big">${WX.fmtTemp(cur.temp, 0)}<sup>°C</sup></div>
      <div class="wx-condline">${esc(cur.text || '天气')} <span>体感 ${WX.fmtTemp(cur.feels, 0)}°</span></div>
      <div class="wx-highlow">最高 ${WX.fmtTemp(hi, 0)}° · 最低 ${WX.fmtTemp(lo, 0)}°</div>
      <div class="wx-chips">${aqiChip(d)}<span class="wx-chip">${icon('i-drop')}湿度 ${cur.humidity == null ? '—' : Math.round(cur.humidity) + '%'}</span><span class="wx-chip">${icon('i-wind')}${cur.wind == null ? '—' : WX.fmtTemp(cur.wind, 0) + ' km/h'}</span></div>
      <button class="wx-enter" type="button" data-open-weather>进入地球天气 ${icon('i-arrow-up-right')}</button>
    </div>`;
  }
  function previewMars(d) {
    const now = C.marsFromJd(jdNow());
    const dust = dustStatus();
    return `<div class="wx-preview">
      <div class="wx-placeline"><span class="wx-place">${icon('i-mars')}<span>火星 · InSight 着陆点</span></span><span>存档</span></div>
      <div class="wx-big">${WX.fmtTemp(d.temp.av, 0)}<sup>°C</sup></div>
      <div class="wx-condline">${esc(marsCondition(d.wind.av))} <span>观测于 2020 年</span></div>
      <div class="wx-highlow">最高 ${WX.fmtTemp(d.temp.mx, 0)}° · 最低 ${WX.fmtTemp(d.temp.mn, 0)}°</div>
      <div class="wx-chips"><span class="wx-chip">${icon('i-wind')}${WX.fmtTemp(d.wind.av, 1)} m/s</span><span class="wx-chip">${icon('i-gauge')}${WX.fmtTemp(d.pressure.av, 0)} Pa</span><span class="wx-chip">${icon('i-wind')}${esc(dust.short)}</span></div>
      <button class="wx-enter" type="button" data-open-weather>进入火星天气 ${icon('i-arrow-up-right')}</button>
    </div>`;
  }
  function previewSun(d) {
    const kp = d.kp;
    const level = kp ? WX.kpLevel(kp.value) : { label: '暂无读数' };
    return `<div class="wx-preview">
      <div class="wx-placeline"><span class="wx-place">${icon('i-sun')}<span>太阳 · 近地轨道</span></span><span>NOAA</span></div>
      <div class="wx-big">${kp ? WX.fmtTemp(kp.value, 1) : '—'}<sup>Kp</sup></div>
      <div class="wx-condline">${esc(level.label)} <span>太阳风 ${d.wind ? WX.fmtTemp(d.wind.speed, 0) + ' km/s' : '—'}</span></div>
      <div class="wx-highlow">Bz ${d.mag ? WX.fmtTemp(d.mag.bz, 0) + ' nT' : '—'} · X 射线 ${d.xray ? esc(d.xray.cls) : '—'}</div>
      <div class="wx-chips"><span class="wx-chip">${icon('i-wind')}太阳风 ${d.wind ? WX.fmtTemp(d.wind.speed, 0) + ' km/s' : '—'}</span><span class="wx-chip">${icon('i-gauge')}Bz ${d.mag ? WX.fmtTemp(d.mag.bz, 0) + ' nT' : '—'}</span><span class="wx-chip">${icon('i-sun')}${d.xray ? esc(d.xray.cls) : '—'}</span></div>
      <button class="wx-enter" type="button" data-open-weather>进入太阳天气 ${icon('i-arrow-up-right')}</button>
    </div>`;
  }
  function fullEarth(d) {
    const cur = d.current || {};
    const today = d.daily && d.daily[0];
    const hi = today ? today.max : cur.temp;
    const lo = today ? today.min : cur.temp;
    const days = (d.daily || []).map((day, i) => `<div class="wxf-day">
      <span class="day-name">${dayLabel(day.date, i)}</span>
      ${weatherIcon(day.icon)}
      <span class="day-cond">${esc(day.text)}</span>
      ${rangeBar(day.min, day.max, Math.min(...d.daily.map(x => x.min)), Math.max(...d.daily.map(x => x.max)))}
      <span class="wxf-range"><b>${WX.fmtTemp(day.max, 0)}°</b> <em>${WX.fmtTemp(day.min, 0)}°</em></span>
    </div>`).join('');
    return `<div class="wxf-place"><b>${icon('i-pin')}地球 · ${esc(WX.locLabel(d.loc))}</b><span>当地 ${esc((cur.time || '').slice(11, 16))} <button type="button" data-open-loc>更换观测点</button></span></div>
      <div class="wxf-hero">
        <div class="wxf-icon">${weatherIcon(cur.icon)}</div>
        <div class="wxf-temp">${WX.fmtTemp(cur.temp, 0)}<sup>°C</sup></div>
        <div class="wxf-cond"><b>${esc(cur.text)}</b><span>体感 ${WX.fmtTemp(cur.feels, 0)}° · 湿度 ${cur.humidity == null ? '—' : Math.round(cur.humidity) + '%'}</span><div class="wxf-highlow">最高 ${WX.fmtTemp(hi, 0)}° / 最低 ${WX.fmtTemp(lo, 0)}°</div></div>
      </div>
      <div class="wxf-pills">${aqiChip(d)}<span class="wxf-pill">${icon('i-wind')}${esc(cur.windText || '风向')} ${cur.wind == null ? '—' : WX.fmtTemp(cur.wind, 0) + ' km/h'}</span><span class="wxf-pill">${icon('i-gauge')}${cur.pressure == null ? '—' : Math.round(cur.pressure) + ' hPa'}</span><span class="wxf-pill">${icon('i-drop')}降水 ${cur.rain == null ? '—' : WX.fmtTemp(cur.rain, 1) + ' mm'}</span></div>
      ${alertHTML(earthAlert(d))}
      <div class="wxf-forecast"><h3>未来 5 天</h3>${days}</div>
      <div class="wxf-source"><span>数据：<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · 更新 ${WX.shortTime(d.updatedAt)} 北京</span><span>影像：NASA STS-52 · ${d.stale ? '缓存读数' : '公开气象模型'}</span></div>`;
  }
  function fullMars(d) {
    const dust = dustStatus();
    const series = d.series || [];
    const lo = series.length ? Math.min(...series.map(x => x.min)) : d.temp.mn;
    const hi = series.length ? Math.max(...series.map(x => x.max)) : d.temp.mx;
    const days = series.map((s) => `<div class="wxf-day">
      <span class="day-name">火星日 ${s.sol}</span>${icon('i-mars')}
      <span class="day-cond">${s.wind == null ? '—' : WX.fmtTemp(s.wind, 1) + ' m/s'}</span>
      ${rangeBar(s.min, s.max, lo, hi)}
      <span class="wxf-range"><b>${WX.fmtTemp(s.avg, 0)}°</b> <em>${WX.fmtTemp(s.min, 0)}°</em></span>
    </div>`).join('');
    return `<div class="wxf-place"><b>${icon('i-mars')}火星 · InSight 着陆点</b><span>NASA InSight 存档 <button type="button" data-open-loc>地球观测点</button></span></div>
      <div class="wxf-hero">
        <div class="wxf-icon">${icon('i-mars')}</div>
        <div class="wxf-temp">${WX.fmtTemp(d.temp.av, 0)}<sup>°C</sup></div>
        <div class="wxf-cond"><b>${esc(marsCondition(d.wind.av))}</b><span>最后观测 · 火星日 ${d.sol}</span><div class="wxf-highlow">最高 ${WX.fmtTemp(d.temp.mx, 0)}° / 最低 ${WX.fmtTemp(d.temp.mn, 0)}°</div></div>
      </div>
      <div class="wxf-pills"><span class="wxf-pill">${icon('i-wind')}风速 ${WX.fmtTemp(d.wind.av, 1)} m/s</span><span class="wxf-pill">${icon('i-gauge')}气压 ${WX.fmtTemp(d.pressure.av, 0)} Pa</span><span class="wxf-pill">${icon('i-mars')}存档 Sol ${d.sol}</span></div>
      ${alertHTML({ tone: dust.active ? 'warn' : 'calm', icon: 'i-wind', title: dust.title, text: dust.text })}
      <div class="wxf-forecast"><h3>最后 7 个火星日</h3>${days}</div>
      <div class="wxf-source"><span>数据：<a href="https://science.nasa.gov/mission/insight/" target="_blank" rel="noopener noreferrer">NASA InSight</a> · 任务已结束，非实时天气</span><span>影像：NASA / JPL-Caltech</span></div>`;
  }
  function fullSun(d) {
    const kp = d.kp;
    const level = kp ? WX.kpLevel(kp.value) : { label: '暂无读数' };
    const vals = (d.kpSeries || []).slice(-24);
    const bars = vals.map((x) => `<span class="wxf-kp-bar" style="height:${Math.max(3, Math.min(100, (x.v / 9) * 100))}%"></span>`).join('');
    return `<div class="wxf-place"><b>${icon('i-sun')}太阳 · 近地轨道</b><span>NOAA SWPC · 空间天气</span></div>
      <div class="wxf-space-top">
        <div class="wxf-kp">${kp ? WX.fmtTemp(kp.value, 1) : '—'}</div>
        <div class="wxf-kp-side"><b>${esc(level.label)}</b><span>Kp 指数 · 0 到 9</span></div>
      </div>
      <div class="wxf-pills"><span class="wxf-pill">${icon('i-wind')}太阳风 ${d.wind ? WX.fmtTemp(d.wind.speed, 0) + ' km/s' : '—'}</span><span class="wxf-pill">${icon('i-gauge')}Bz ${d.mag ? WX.fmtTemp(d.mag.bz, 0) + ' nT' : '—'}</span><span class="wxf-pill">${icon('i-sun')}X 射线 ${d.xray ? esc(d.xray.cls) : '—'}</span></div>
      ${alertHTML(sunAlert(d))}
      <div class="wxf-forecast"><h3>过去 72 小时的 Kp 指数</h3><div class="wxf-kp-chart">${bars || '<span class="wxf-kp-bar" style="height:3%"></span>'}</div><div class="wxf-kp-labels"><span>72 小时前</span><span>现在</span></div></div>
      <div class="wxf-source"><span>数据：<a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer">NOAA SWPC</a> · 更新 ${d.updatedAt ? WX.shortTime(d.updatedAt) : '—'}</span><span>影像：NASA SDO / AIA 171</span></div>`;
  }
  function renderWeatherFooter() {
    const tab = state.weatherTab;
    const key = weatherKey(tab);
    if (state.weather.loading[key] && !state.weather[key]) {
      els.weatherFoot.innerHTML = '<span>正在连接观测源…</span><span>数据源可能在境外</span>';
      return;
    }
    if (tab === 'earth') {
      els.weatherFoot.innerHTML = `<span>地球 · <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></span><span class="source-right">${state.weather.earth ? '更新 ' + WX.shortTime(state.weather.earth.updatedAt) + ' 北京' : '未连接'} · 影像 NASA</span>`;
    } else if (tab === 'mars') {
      els.weatherFoot.innerHTML = `<span>火星 · <a href="https://science.nasa.gov/mission/insight/" target="_blank" rel="noopener noreferrer">NASA InSight</a></span><span class="source-right">存档 · 非实时 · ${planetCredit('mars')}</span>`;
    } else {
      els.weatherFoot.innerHTML = `<span>太阳 · <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer">NOAA SWPC</a></span><span class="source-right">${state.weather.space && state.weather.space.stale ? '缓存读数' : '观测随源更新'} · 影像 NASA</span>`;
    }
  }
  function syncWeatherTabs() {
    $$('[data-wx]', els.wxTabs).concat($$('[data-wx]', els.weatherDialogTabs)).forEach((btn) => {
      const on = btn.dataset.wx === state.weatherTab;
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
    });
  }
  function renderWeather() {
    syncWeatherTabs();
    const tab = state.weatherTab;
    const key = weatherKey(tab);
    const data = state.weather[key];
    els.weatherCard.dataset.scene = planetScene(tab);
    if (!data) {
      if (state.weather.loading[key]) {
        els.weatherBody.innerHTML = skeletonHTML();
      } else {
        els.weatherBody.innerHTML = `<div class="wx-portal-error"><b>${planetName(tab)}天气暂时不可用</b><p>可能是网络限制，历法与节日读数不受影响。</p><button class="pill-btn ghost" type="button" data-wx-retry>重新连接</button></div>`;
      }
    } else if (tab === 'earth') {
      els.weatherBody.innerHTML = previewEarth(data);
    } else if (tab === 'mars') {
      els.weatherBody.innerHTML = previewMars(data);
    } else {
      els.weatherBody.innerHTML = previewSun(data);
    }
    renderWeatherFooter();
    els.weatherBody.setAttribute('aria-busy', state.weather.loading[key] ? 'true' : 'false');
    if (els.weatherDialog && els.weatherDialog.open) renderWeatherDialog();
  }
  function renderWeatherDialog() {
    if (!els.weatherDialog) return;
    const tab = state.weatherTab;
    const key = weatherKey(tab);
    const data = state.weather[key];
    els.weatherDialogScene.dataset.scene = planetScene(tab);
    els.weatherDialogTitle.textContent = planetName(tab) + '天气';
    syncWeatherTabs();
    if (!data) {
      els.weatherDialogBody.innerHTML = state.weather.loading[key]
        ? `<div class="wxf-loading"><div class="skel skel-round"></div><div class="skel-lines"><span class="skel"></span><span class="skel short"></span><span class="skel"></span></div></div>`
        : `<div class="wxf-error"><b>${planetName(tab)}天气暂时不可用</b><p>可能是网络限制或数据源暂时不可达。你可以关闭这一页，先继续看历法。</p><button class="pill-btn ghost" type="button" data-wx-retry>重新连接</button></div>`;
    } else if (tab === 'earth') {
      els.weatherDialogBody.innerHTML = fullEarth(data);
    } else if (tab === 'mars') {
      els.weatherDialogBody.innerHTML = fullMars(data);
    } else {
      els.weatherDialogBody.innerHTML = fullSun(data);
    }
    els.weatherDialogBody.scrollTop = 0;
  }
  function openWeatherDialog() {
    if (!els.weatherDialog) return;
    closePalette();
    if (state.infoOpen) closeInfo();
    if (window.CosmicAssistant) window.CosmicAssistant.close();
    renderWeatherDialog();
    openDialog(els.weatherDialog);
    setTimeout(() => { try { els.weatherDialogClose.focus(); } catch (e) {} }, 60);
  }
  function closeWeatherDialog() {
    if (els.weatherDialog && els.weatherDialog.open) closeDialog(els.weatherDialog);
  }
