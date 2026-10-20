const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'web', 'index.html');
let html = fs.readFileSync(p, 'utf8');

function between(startMarker, endMarker, label) {
  const i = html.indexOf(startMarker);
  if (i < 0) throw new Error('missing start ' + label);
  const j = html.indexOf(endMarker, i + startMarker.length);
  if (j < 0) throw new Error('missing end ' + label);
  return { i, j };
}

// Existing content blocks
const heroStart = html.indexOf('<article class="card hero-card" id="heroCard">');
const weatherCardStart = html.indexOf('<article class="card weather-card"');
if (heroStart < 0 || weatherCardStart < 0) throw new Error('hero/weather markers');
let heroCard = html.slice(heroStart, weatherCardStart);
// Remove the old calendar counter and the quick-switch foot.
heroCard = heroCard.replace(/\s*<span class="cal-counter" id="calCounter">01 \/ 05<\/span>/, '');
const footStart = heroCard.indexOf('<div class="hero-foot">');
const articleEnd = heroCard.lastIndexOf('</article>');
if (footStart >= 0 && articleEnd > footStart) heroCard = heroCard.slice(0, footStart) + heroCard.slice(articleEnd);

const festStart = html.indexOf('<article class="card festivals-card"');
const layoutClose = html.indexOf('</section>', festStart);
if (festStart < 0 || layoutClose < 0) throw new Error('festival markers');
const festivalsCard = html.slice(festStart, layoutClose);

const calendarStart = html.indexOf('<section class="card calendar-card"');
const closingStart = html.indexOf('<section class="closing-band"');
const mainClose = html.indexOf('</main>');
if (calendarStart < 0 || closingStart < 0 || mainClose < 0) throw new Error('calendar/closing markers');
const calendarSection = html.slice(calendarStart, closingStart);
let closingFooter = html.slice(closingStart, mainClose);
closingFooter = closingFooter.replace('“把一天借给地球，把一年借给火星，把一生借给银河。”', '“日历看宇宙，天气看眼前。”');

// Header module switch
const headerNav = between('<nav class="cal-switch"', '</nav>', 'header nav');
const moduleNav = `<nav class="module-switch" id="moduleSwitch" role="tablist" aria-label="选择模块">
        <span class="module-glider" aria-hidden="true"></span>
        <button class="module-tab" role="tab" data-module="time" aria-selected="false">
          <svg class="icon"><use href="#i-clock"/></svg><span>时间</span><small>TIME</small>
        </button>
        <button class="module-tab" role="tab" data-module="calendar" aria-selected="true">
          <svg class="icon"><use href="#i-calendar"/></svg><span>日历</span><small>CALENDAR</small>
        </button>
        <button class="module-tab" role="tab" data-module="weather" aria-selected="false">
          <svg class="icon"><use href="#i-sun"/></svg><span>气象</span><small>WEATHER</small>
        </button>
      </nav>`;
html = html.slice(0, headerNav.i) + moduleNav + html.slice(headerNav.j + '</nav>'.length);

// Remove the old mobile calendar dock.
const dockStart = html.indexOf('<nav class="cal-dock"');
if (dockStart >= 0) {
  const dockEnd = html.indexOf('</nav>', dockStart);
  html = html.slice(0, dockStart) + html.slice(dockEnd + '</nav>'.length);
}

// Remove the old weather dialog (it is replaced by the weather module).
const wdStart = html.indexOf('<dialog class="weather-dialog"');
if (wdStart >= 0) {
  const wdEnd = html.indexOf('</dialog>', wdStart);
  html = html.slice(0, wdStart) + html.slice(wdEnd + '</dialog>'.length);
}

const moduleHead = (num, en, title, desc, selectId, selectLabel, options, starId, extra) => `
    <header class="module-head card">
      <div class="module-title">
        <p class="eyebrow">VIEW ${num} · ${en}</p>
        <h1>${title}</h1>
        <p>${desc}</p>
      </div>
      <div class="module-controls">
        <label class="select-field"><span>${selectLabel}</span><select id="${selectId}">${options}</select></label>
        <button class="pill-btn star-btn" id="${starId}" type="button"><svg class="icon"><use href="#i-galaxy"/></svg>星图定位</button>
        ${extra || ''}
      </div>
    </header>`;

const timeModule = `
    <section class="module" id="moduleTime" data-module-panel="time" hidden>
      ${moduleHead('01', 'TIME', '同一刻，不同世界的时间', '同一个瞬间，在地球、月球、火星、银河与宇宙中有不同的读法。', 'timeSelect', '时间基准',
        `<option value="earth">地球 · 北京时间</option>
         <option value="mars">火星 · 当地太阳时</option>
         <option value="moon">月球 · 月龄</option>
         <option value="galaxy">银河 · 轨道位置</option>
         <option value="cosmos">宇宙 · 宇宙钟</option>`, 'timeStarBtn')}
      <div class="time-layout">
        <article class="card time-main">
          <div class="time-copy">
            <p class="eyebrow" id="timeKicker">地球 · 北京时间</p>
            <div class="time-big" id="timeBig">--:--:--</div>
            <p class="time-sub" id="timeSub">正在读取此刻…</p>
            <div class="time-chips" id="timeChips"></div>
          </div>
          <div class="time-art" id="timeArt" aria-hidden="true"></div>
        </article>
        <aside class="card time-side">
          <div class="side-head"><h2>查看另一个时刻</h2><span class="status-pill" id="timeStatus">实时</span></div>
          <div class="time-travel">
            <label><span>日期</span><input type="date" id="timeDate"></label>
            <label><span>时间</span><input type="time" id="timeClockInput" step="1"></label>
            <button class="pill-btn" id="timeNowBtn" type="button">回到此刻</button>
          </div>
          <div class="time-list" id="timeList"></div>
          <p class="side-note">同一瞬间，用五种方式读数。修改日期或时间，查看另一个时刻。</p>
        </aside>
      </div>
    </section>`;

const calendarModule = `
    <section class="module" id="moduleCalendar" data-module-panel="calendar">
      ${moduleHead('02', 'CALENDAR', '不同世界的日历', '地球历、月球历、火星历、银河历、宇宙历。选择一套，或从星图上定位一个世界。', 'calendarSelect', '选择历法',
        `<option value="earth">地球历 · 公历</option>
         <option value="moon">月球历 · 按月相计月</option>
         <option value="mars">火星历 · 按太阳位置分月</option>
         <option value="galaxy">银河历 · 绕银河系一圈为一年</option>
         <option value="cosmos">宇宙历 · 把宇宙历史压成一年</option>`, 'calendarStarBtn')}
      <div class="calendar-top">
        ${heroCard}
        ${festivalsCard}
      </div>
      ${calendarSection}
    </section>`;

const weatherModule = `
    <section class="module" id="moduleWeather" data-module-panel="weather" hidden>
      ${moduleHead('03', 'WEATHER', '落到一颗星球', '日历是宇宙视角，气象是进入具体视角。选择一颗星球，看看此刻的天气。', 'weatherSelect', '选择星球',
        `<option value="earth">地球</option>
         <option value="mars">火星</option>
         <option value="sun">太阳</option>`, 'weatherStarBtn',
        `<button class="round-btn" id="weatherRefresh" type="button" aria-label="刷新天气" title="刷新天气"><svg class="icon"><use href="#i-refresh"/></svg></button>`)}
      <article class="weather-stage" id="weatherStage" data-scene="earth">
        <div class="wxd-scene" id="weatherScene" data-scene="earth" aria-hidden="true">
          <div class="wxd-layer wxd-earth"></div>
          <div class="wxd-layer wxd-mars"></div>
          <div class="wxd-layer wxd-sun"></div>
          <div class="wxd-shade"></div>
        </div>
        <div class="wxd-inner">
          <div class="wxd-scroll weather-stage-scroll" id="weatherModuleBody" aria-live="polite">
            <div class="wxf-loading"><div class="skel skel-round"></div><div class="skel-lines"><span class="skel"></span><span class="skel short"></span><span class="skel"></span></div></div>
          </div>
        </div>
      </article>
    </section>`;

const starDialog = `
  <dialog class="star-dialog" id="starDialog" aria-labelledby="starTitle">
    <header class="star-head">
      <div>
        <p class="eyebrow">STAR MAP · 星图定位</p>
        <h2 id="starTitle">选择一个位置</h2>
        <p>当前模块可用的位置会亮起。点选后，模块会切换到对应的世界。</p>
      </div>
      <button class="icon-btn on-dark" id="starClose" type="button" aria-label="关闭星图">
        <svg class="icon"><use href="#i-close"/></svg>
      </button>
    </header>
    <div class="star-map" id="starMap">
      <svg viewBox="0 0 920 500" role="img" aria-label="太阳系与银河系星图">
        <defs>
          <radialGradient id="starBg" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stop-color="#162238"/>
            <stop offset="58%" stop-color="#0a101d"/>
            <stop offset="100%" stop-color="#05080f"/>
          </radialGradient>
          <radialGradient id="starSun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fff9e9"/>
            <stop offset="38%" stop-color="#f6c86d"/>
            <stop offset="100%" stop-color="#c9682a"/>
          </radialGradient>
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity=".38"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="920" height="500" fill="url(#starBg)"/>
        <g stroke="rgba(255,255,255,.055)" stroke-width="1">
          <path d="M0 120h920M0 250h920M0 380h920"/>
          <path d="M160 0v500M360 0v500M560 0v500M760 0v500"/>
          <circle cx="470" cy="250" r="216" fill="none" stroke-dasharray="1 10"/>
          <circle cx="470" cy="250" r="314" fill="none" stroke-dasharray="1 14"/>
        </g>
        <g fill="#fff" opacity=".55">
          <circle cx="70" cy="65" r="1.2"/><circle cx="148" cy="396" r=".9"/><circle cx="238" cy="82" r="1.4"/><circle cx="300" cy="430" r="1"/><circle cx="410" cy="62" r=".8"/><circle cx="610" cy="74" r="1.3"/><circle cx="842" cy="88" r="1"/><circle cx="870" cy="220" r="1.4"/><circle cx="700" cy="430" r=".9"/><circle cx="540" cy="410" r="1.2"/><circle cx="890" cy="430" r=".8"/><circle cx="50" cy="300" r="1"/><circle cx="460" cy="462" r="1.1"/><circle cx="340" cy="300" r=".8"/><circle cx="790" cy="270" r=".9"/>
        </g>
        <g class="star-orbits" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="1">
          <path d="M205 250c85-88 195-105 298-61" stroke-dasharray="2 7"/>
          <path d="M205 250c130-22 248 5 335 54" stroke-dasharray="2 7"/>
          <path d="M205 250c58 38 91 100 91 152" stroke-dasharray="2 7"/>
        </g>
        <g class="star-target" data-star="sun" transform="translate(160 250)">
          <rect x="-70" y="-70" width="140" height="150" fill="transparent"/>
          <circle r="67" fill="url(#starGlow)"/>
          <circle r="42" fill="url(#starSun)"/>
          <circle r="49" fill="none" stroke="rgba(255,210,133,.45)" stroke-width="1"/>
          <text y="78" text-anchor="middle" class="star-label">太阳</text>
          <text y="94" text-anchor="middle" class="star-sub">SUN</text>
        </g>
        <g class="star-target" data-star="earth" transform="translate(355 190)">
          <rect x="-58" y="-58" width="116" height="126" fill="transparent"/>
          <circle r="57" fill="url(#starGlow)"/>
          <image href="assets/planets/earth.webp" x="-36" y="-36" width="72" height="72"/>
          <circle r="38" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1"/>
          <text y="66" text-anchor="middle" class="star-label">地球</text>
          <text y="82" text-anchor="middle" class="star-sub">EARTH</text>
        </g>
        <g class="star-target" data-star="moon" transform="translate(452 285)">
          <rect x="-42" y="-42" width="84" height="102" fill="transparent"/>
          <circle r="36" fill="url(#starGlow)" opacity=".55"/>
          <image href="assets/planets/moon.webp" x="-22" y="-22" width="44" height="44"/>
          <text y="46" text-anchor="middle" class="star-label">月球</text>
          <text y="62" text-anchor="middle" class="star-sub">MOON</text>
        </g>
        <g class="star-target" data-star="mars" transform="translate(560 155)">
          <rect x="-52" y="-52" width="104" height="118" fill="transparent"/>
          <circle r="48" fill="url(#starGlow)" opacity=".65"/>
          <image href="assets/planets/mars.webp" x="-30" y="-30" width="60" height="60"/>
          <circle r="34" fill="none" stroke="rgba(255,210,180,.24)" stroke-width="1"/>
          <text y="56" text-anchor="middle" class="star-label">火星</text>
          <text y="72" text-anchor="middle" class="star-sub">MARS</text>
        </g>
        <g class="star-target" data-star="galaxy" transform="translate(725 175)">
          <rect x="-66" y="-66" width="132" height="146" fill="transparent"/>
          <circle r="60" fill="url(#starGlow)" opacity=".6"/>
          <g fill="none" stroke="var(--accent)" stroke-linecap="round">
            <path d="M-7 2c14-16 37-14 44 4 7 19-14 34-32 28-24-8-31-38-14-58 18-22 54-22 72 2" stroke-width="2" opacity=".8"/>
            <path d="M-7 2c-14 16-37 14-44-4-7-19 14-34 32-28" stroke-width="1.5" opacity=".45"/>
          </g>
          <circle r="3.4" fill="#fff6df"/>
          <text y="78" text-anchor="middle" class="star-label">银河系</text>
          <text y="94" text-anchor="middle" class="star-sub">GALAXY</text>
        </g>
        <g class="star-target" data-star="cosmos" transform="translate(790 355)">
          <rect x="-66" y="-66" width="132" height="146" fill="transparent"/>
          <circle r="58" fill="url(#starGlow)" opacity=".4"/>
          <g fill="none" stroke="rgba(255,255,255,.65)" stroke-width="1.2">
            <path d="M0 -24L7 -7 24 0 7 7 0 24 -7 7 -24 0 -7 -7Z"/>
          </g>
          <g fill="#fff" opacity=".55"><circle cx="-35" cy="20" r="1.5"/><circle cx="30" cy="-22" r="1.2"/><circle cx="33" cy="28" r="1"/></g>
          <text y="50" text-anchor="middle" class="star-label">宇宙</text>
          <text y="66" text-anchor="middle" class="star-sub">COSMOS</text>
        </g>
      </svg>
    </div>
    <p class="star-hint" id="starHint">同一个位置，在时间、日历与气象里含义不同。</p>
  </dialog>`;

// New main
const newMain = `<main class="page" id="page">
${timeModule}
${calendarModule}
${weatherModule}
${closingFooter}
  </main>`;
const mainStart = html.indexOf('<main class="page" id="page">');
if (mainStart < 0) throw new Error('main start');
html = html.slice(0, mainStart) + newMain + html.slice(mainClose + '</main>'.length);

// Add star dialog and assistant script
const assistantBtn = html.indexOf('<button class="assistant-fab"');
html = html.slice(0, assistantBtn) + starDialog + '\n\n  ' + html.slice(assistantBtn);
html = html.replace('<script src="js/app.js"></script>', '<script src="js/app.js"></script>\n  <script src="js/assistant.js"></script>');

fs.writeFileSync(p, html);
console.log('restructured index.html');
