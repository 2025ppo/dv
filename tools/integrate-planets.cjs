const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'web', 'js', 'app.js');
let s = fs.readFileSync(p, 'utf8');
let misses = [];

function newSvgMoon(phase, seed, opts) {
  const o = opts || {};
  const p = mod(phase, 1);
  const R = 94;
  const cx = 210, cy = 210;
  const illum = A.moonIllumination(p);
  const waxing = p <= 0.5;
  const q = waxing ? p : 1 - p;
  const cos = Math.cos(2 * Math.PI * q);
  const rx = Math.abs(cos) * R;
  const baseSweep = waxing ? 1 : 0;
  const base = `M ${cx} ${cy - R} A ${R} ${R} 0 0 ${baseSweep} ${cx} ${cy + R} Z`;
  let adjust = '';
  if (rx > 0.35) {
    if (cos >= 0) adjust = `<path d="M ${cx} ${cy - R} A ${rx.toFixed(2)} ${R} 0 0 ${waxing ? 1 : 0} ${cx} ${cy + R} Z" fill="black"/>`;
    else adjust = `<path d="M ${cx} ${cy - R} A ${rx.toFixed(2)} ${R} 0 0 ${waxing ? 0 : 1} ${cx} ${cy + R} Z" fill="white"/>`;
  }
  const maskId = 'moonMask-' + seed;
  const haloId = 'moonHalo-' + seed;
  const clipId = 'moonClip-' + seed;
  let ticks = '';
  for (let i = 0; i < 29; i++) {
    const a = -Math.PI / 2 + (i / 29) * Math.PI * 2;
    const on = Math.floor(p * 29) % 29 === i;
    const r1 = R + 27, r2 = R + (on ? 36 : 32);
    ticks += `<line class="art-tick${on ? ' on' : ''}" x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(cy + Math.sin(a) * r1).toFixed(1)}" x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(cy + Math.sin(a) * r2).toFixed(1)}"/>`;
  }
  const labels = o.labels === false ? '' :
    `<text x="210" y="381" text-anchor="middle" class="art-label">${esc(C.moonPhaseName(p))}</text>
     <text x="210" y="399" text-anchor="middle" class="art-tiny">${(illum * 100).toFixed(0)}% 可见 · 月龄 ${Math.floor(mod(p, 1) * 29.53) + 1} 天</text>`;
  return `<svg viewBox="0 0 420 420" aria-hidden="true">
    <defs>
      <radialGradient id="${haloId}" cx="50%" cy="50%" r="50%">
        <stop offset="38%" stop-color="var(--accent-glow)" stop-opacity=".55"/>
        <stop offset="100%" stop-color="var(--accent-glow)" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
      <mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="420" height="420">
        <rect width="420" height="420" fill="black"/>
        <path d="${base}" fill="white"/>
        ${adjust}
      </mask>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${R + 56}" fill="url(#${haloId})"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="var(--ink)" opacity=".06"/>
    <g clip-path="url(#${clipId})">
      <image href="assets/planets/moon.webp" x="${cx - R}" y="${cy - R}" width="${R * 2}" height="${R * 2}" preserveAspectRatio="xMidYMid meet" opacity=".13"/>
    </g>
    <g class="art-float" clip-path="url(#${clipId})" mask="url(#${maskId})">
      <image href="assets/planets/moon.webp" x="${cx - R}" y="${cy - R}" width="${R * 2}" height="${R * 2}" preserveAspectRatio="xMidYMid meet"/>
    </g>
    <circle cx="${cx}" cy="${cy}" r="${R + .5}" fill="none" stroke="rgba(255,250,238,.25)" stroke-width=".8"/>
    <g>${ticks}</g>
    ${labels}
  </svg>`;
}

function newSvgEarth(e) {
  const cx = 210, cy = 210, R = 91;
  const markerAngle = -Math.PI / 2 + (e.dayOfYear / e.daysInYear) * Math.PI * 2;
  const mx = cx + Math.cos(markerAngle) * 154;
  const my = cy + Math.sin(markerAngle) * 154;
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    const on = i === e.month - 1;
    const r1 = 143, r2 = on ? 156 : 151;
    ticks += `<line class="art-tick${on ? ' on' : ''}" x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(cy + Math.sin(a) * r1).toFixed(1)}" x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(cy + Math.sin(a) * r2).toFixed(1)}"/>`;
  }
  const seasons = ['春', '夏', '秋', '冬'].map((s, i) => {
    const a = -Math.PI / 2 + (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = cx + Math.cos(a) * 181, y = cy + Math.sin(a) * 181;
    return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle" class="art-tiny">${s}</text>`;
  }).join('');
  return `<svg viewBox="0 0 420 420" aria-hidden="true">
    <defs>
      <radialGradient id="earthHalo" cx="50%" cy="50%" r="50%">
        <stop offset="30%" stop-color="var(--accent-glow)" stop-opacity=".38"/>
        <stop offset="100%" stop-color="var(--accent-glow)" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="earthShade" cx="40%" cy="34%" r="62%">
        <stop offset="60%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#031018" stop-opacity=".3"/>
      </radialGradient>
      <clipPath id="earthClip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${R + 56}" fill="url(#earthHalo)"/>
    <circle cx="${cx}" cy="${cy}" r="148" class="art-ring-dashed"/>
    <g>${ticks}</g>
    ${seasons}
    <line x1="${cx}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" class="art-axis" opacity=".65"/>
    <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="13" fill="none" stroke="var(--accent)" stroke-width=".8" opacity=".22"/>
    <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="4.2" fill="var(--accent)"/>
    <g class="art-float">
      <circle cx="${cx}" cy="${cy}" r="${R + 5}" fill="none" stroke="var(--accent)" stroke-opacity=".14" stroke-width="1.6"/>
      <g clip-path="url(#earthClip)">
        <image href="assets/planets/earth.webp" x="${cx - R}" y="${cy - R}" width="${R * 2}" height="${R * 2}" preserveAspectRatio="xMidYMid meet"/>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#earthShade)"/>
      </g>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(210,240,250,.32)" stroke-width=".8"/>
    </g>
    <text x="210" y="384" text-anchor="middle" class="art-label">公历 · ${e.year} 年</text>
    <text x="210" y="401" text-anchor="middle" class="art-tiny">第 ${e.dayOfYear} 天 / ${e.daysInYear} 天 · ${e.daysInYear === 366 ? '闰年' : '平年'}</text>
  </svg>`;
}

function newSvgMars(m, seed) {
  const sid = seed || 'heroMars';
  const cx = 210, cy = 210, R = 87;
  const markerAngle = -Math.PI / 2 + (m.ls / 360) * Math.PI * 2;
  const mx = cx + Math.cos(markerAngle) * 151;
  const my = cy + Math.sin(markerAngle) * 151;
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    const on = i === m.month - 1;
    const r1 = 142, r2 = on ? 155 : 150;
    ticks += `<line class="art-tick${on ? ' on' : ''}" x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(cy + Math.sin(a) * r1).toFixed(1)}" x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(cy + Math.sin(a) * r2).toFixed(1)}"/>`;
  }
  const seasons = ['春', '夏', '秋', '冬'].map((s, i) => {
    const a = -Math.PI / 2 + (i / 4) * Math.PI * 2;
    const x = cx + Math.cos(a) * 178, y = cy + Math.sin(a) * 178;
    return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle" class="art-tiny">${s}</text>`;
  }).join('');
  return `<svg viewBox="0 0 420 420" aria-hidden="true">
    <defs>
      <radialGradient id="marsHalo-${sid}" cx="50%" cy="50%" r="50%">
        <stop offset="30%" stop-color="var(--accent-glow)" stop-opacity=".42"/>
        <stop offset="100%" stop-color="var(--accent-glow)" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="marsShade-${sid}" cx="40%" cy="34%" r="62%">
        <stop offset="58%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#1a0803" stop-opacity=".28"/>
      </radialGradient>
      <clipPath id="marsClip-${sid}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${R + 58}" fill="url(#marsHalo-${sid})"/>
    <circle cx="${cx}" cy="${cy}" r="150" class="art-ring-dashed"/>
    <g>${ticks}</g>
    ${seasons}
    <line x1="${cx}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" class="art-axis" opacity=".65"/>
    <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="4.2" fill="var(--accent)"/>
    <g class="art-float-2">
      <g transform="translate(${cx} ${cy}) rotate(-12)">
        <ellipse rx="${R + 8}" ry="${R * .28}" fill="none" stroke="var(--accent)" stroke-opacity=".32" stroke-width="1" stroke-dasharray="2 7"/>
      </g>
      <g clip-path="url(#marsClip-${sid})">
        <image href="assets/planets/mars.webp" x="${cx - R}" y="${cy - R}" width="${R * 2}" height="${R * 2}" preserveAspectRatio="xMidYMid meet"/>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#marsShade-${sid})"/>
      </g>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(255,222,200,.3)" stroke-width=".9"/>
    </g>
    <g class="art-spin" style="animation-duration:46s">
      <ellipse cx="${cx}" cy="${cy}" rx="128" ry="48" fill="none" stroke="var(--line)" stroke-width=".6" stroke-dasharray="1 7" transform="rotate(-18 ${cx} ${cy})"/>
      <circle cx="${cx - 119}" cy="${cy + 20}" r="2.2" fill="var(--accent)" opacity=".8"/>
    </g>
    <text x="210" y="384" text-anchor="middle" class="art-label">火星历 ${m.year} 年 · 太阳黄经 ${m.ls.toFixed(1)}°</text>
    <text x="210" y="401" text-anchor="middle" class="art-tiny">${m.month} 月 · 第 ${m.day} 个火星日</text>
  </svg>`;
}

function replaceBetween(startMarker, endMarker, replacement, label) {
  const i = s.indexOf(startMarker);
  if (i < 0) { misses.push(label + ' start'); return; }
  const j = s.indexOf(endMarker, i + startMarker.length);
  if (j < 0) { misses.push(label + ' end'); return; }
  s = s.slice(0, i) + replacement + s.slice(j);
}
function indentFn(fn, oldName, newName) {
  return '  ' + fn.toString().replace('function ' + oldName, 'function ' + newName).split('\n').join('\n  ') + '\n\n';
}
replaceBetween('  function svgMoon(', '  function svgEarth(', indentFn(newSvgMoon, 'newSvgMoon', 'svgMoon'), 'moon');
replaceBetween('  function svgEarth(', '  function svgMars(', indentFn(newSvgEarth, 'newSvgEarth', 'svgEarth'), 'earth');
replaceBetween('  function svgMars(', '  function spiralArm(', indentFn(newSvgMars, 'newSvgMars', 'svgMars'), 'mars');

function rep(a, b, label) {
  if (!s.includes(a)) { misses.push(label); return; }
  s = s.replace(a, b);
}
rep("['近心', '半渡', '回澜', '临心']", "['起点', '1/4', '1/2', '3/4']", 'galaxy cardinal labels');
rep("<text x=\"210\" y=\"391\" text-anchor=\"middle\" class=\"art-label\">GALACTIC YEAR ${g.year} · 225 MYR</text>\n      <text x=\"210\" y=\"406\" text-anchor=\"middle\" class=\"art-tiny\">${esc(g.season)} · 近心相位 ${(g.phase * 100).toFixed(1)}%</text>", "<text x=\"210\" y=\"391\" text-anchor=\"middle\" class=\"art-label\">银河历 ${g.year} 年 · 绕银河系一圈约 2.25 亿年</text>\n      <text x=\"210\" y=\"406\" text-anchor=\"middle\" class=\"art-tiny\">第 ${g.month} 月 · 轨道位置 ${(g.phase * 100).toFixed(1)}%</text>", 'galaxy labels');
rep("const events = [\n      [0, '大爆炸'], [0.067, '第一代恒星'], [0.669, '太阳系'], [0.964, '寒武纪'], [0.9996, '人类'], [1, '此刻']\n    ]", "const events = [\n      [0, '宇宙诞生'], [0.067, '第一代恒星'], [0.669, '太阳系'], [0.964, '动物出现'], [0.9996, '现代人'], [1, '此刻']\n    ]", 'cosmos events');
rep("<text x=\"210\" y=\"377\" text-anchor=\"middle\" class=\"art-label\">13.787 GYR → ONE COSMIC YEAR</text>\n      <text x=\"210\" y=\"395\" text-anchor=\"middle\" class=\"art-tiny\">NOW · 12月31日 ${esc(co.timeText)}</text>", "<text x=\"210\" y=\"377\" text-anchor=\"middle\" class=\"art-label\">宇宙年龄 137.87 亿年 · 压成一年</text>\n      <text x=\"210\" y=\"395\" text-anchor=\"middle\" class=\"art-tiny\">现在 · 12月31日 ${esc(co.timeText)}</text>", 'cosmos labels');

fs.writeFileSync(p, s);
console.log(misses.length ? 'MISSES: ' + misses.join(', ') : 'planet integration applied');
