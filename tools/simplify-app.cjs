const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'web', 'js', 'app.js');
let s = fs.readFileSync(p, 'utf8');
let misses = [];
function rep(a, b, label) {
  if (!s.includes(a)) { misses.push(label); return; }
  s = s.replace(a, b);
}
function replaceBlock(start, end, replacement, label) {
  const i = s.indexOf(start);
  if (i < 0) { misses.push(label + ' start'); return; }
  const j = s.indexOf(end, i + start.length);
  if (j < 0) { misses.push(label + ' end'); return; }
  s = s.slice(0, i) + replacement + s.slice(j);
}

// meta language
rep("earth: { no: '01', name: '地球历', en: 'EARTH', icon: 'i-earth', palette: 'sun', kicker: '地球历 · 世界通用' }", "earth: { no: '01', name: '地球历', en: 'EARTH', icon: 'i-earth', palette: 'sun', kicker: '地球历 · 公历' }", 'meta earth');
rep("moon: { no: '02', name: '月球历', en: 'MOON', icon: 'i-moon', palette: 'moon', kicker: '月球历 · 朔望为月' }", "moon: { no: '02', name: '月球历', en: 'MOON', icon: 'i-moon', palette: 'moon', kicker: '月球历 · 按月相计月' }", 'meta moon');
rep("mars: { no: '03', name: '火星历', en: 'MARS', icon: 'i-mars', palette: 'mars', kicker: '火星历 · 太阳黄经分月' }", "mars: { no: '03', name: '火星历', en: 'MARS', icon: 'i-mars', palette: 'mars', kicker: '火星历 · 按太阳位置分月' }", 'meta mars');
rep("galaxy: { no: '04', name: '银河历', en: 'GALAXY', icon: 'i-galaxy', palette: 'galaxy', kicker: '银河历 · 近心为岁首' }", "galaxy: { no: '04', name: '银河历', en: 'GALAXY', icon: 'i-galaxy', palette: 'galaxy', kicker: '银河历 · 绕银河系一圈为一年' }", 'meta galaxy');
rep("cosmos: { no: '05', name: '宇宙历', en: 'COSMOS', icon: 'i-cosmos', palette: 'cosmos', kicker: '宇宙历 · 138 亿年压成一年' }", "cosmos: { no: '05', name: '宇宙历', en: 'COSMOS', icon: 'i-cosmos', palette: 'cosmos', kicker: '宇宙历 · 把宇宙历史压成一年' }", 'meta cosmos');

// remove GAL_NOTES
replaceBlock('  const GAL_NOTES = [', '\n  ];', '', 'gal notes remove');

// hero data moon/mars/galaxy/cosmos
rep("        sub: m.phaseName + ' · 月龄 ' + (m.phase * A.SYNODIC).toFixed(1) + ' 日 · 距望 ' + toFull.toFixed(1) + ' 日',\n        primary: '月龄 ' + (m.phase * A.SYNODIC).toFixed(1) + ' 日',\n        primaryIcon: 'i-moon',\n        secondary: '第 ' + m.year + ' 太阴年 · 本月 ' + m.monthLen + ' 日',\n        secondaryIcon: 'i-calendar',\n        seasonChar: '月',\n        seasonTitle: '朔望月历',", "        sub: m.phaseName + ' · 月龄 ' + (m.phase * A.SYNODIC).toFixed(1) + ' 天 · 距满月 ' + toFull.toFixed(1) + ' 天',\n        primary: '月龄 ' + (m.phase * A.SYNODIC).toFixed(1) + ' 天',\n        primaryIcon: 'i-moon',\n        secondary: '第 ' + m.year + ' 个月球年 · 本月 ' + m.monthLen + ' 天',\n        secondaryIcon: 'i-calendar',\n        seasonChar: '月',\n        seasonTitle: '按月相计月',", 'hero moon');

rep("        year: 'MY ' + m.year, month: m.monthName, day: String(m.day),\n        kicker: META.mars.kicker,\n        sub: 'Ls ' + m.ls.toFixed(1) + '° · 北半球' + m.season + ' · ' + m.weekName,\n        primary: 'MTC ' + m.timeText,\n        primaryIcon: 'i-clock',\n        secondary: 'MSD ' + Math.floor(m.sol + A.MSD_OFFSET) + ' · 本月 ' + m.monthLen + ' sol',\n        secondaryIcon: 'i-calendar',\n        seasonChar: m.season.charAt(0),\n        seasonTitle: '北半球' + m.season,", "        year: '第 ' + m.year + ' 年', month: m.monthName, day: String(m.day),\n        kicker: META.mars.kicker,\n        sub: '太阳黄经 ' + m.ls.toFixed(1) + '° · 北半球' + m.season + ' · ' + m.weekName,\n        primary: '火星时间 ' + m.timeText,\n        primaryIcon: 'i-clock',\n        secondary: '本月 ' + m.monthLen + ' 个火星日',\n        secondaryIcon: 'i-calendar',\n        seasonChar: m.season.charAt(0),\n        seasonTitle: '北半球' + m.season,", 'hero mars');

rep("        year: 'G ' + g.year, month: g.monthName + '月', day: String(g.day),\n        kicker: META.galaxy.kicker,\n        sub: '第 ' + g.year + ' 个银河年 · ' + g.season + ' · 近心相位 ' + (g.phase * 100).toFixed(1) + '%',\n        primary: '银时 ' + g.timeText,\n        primaryIcon: 'i-clock',\n        secondary: '1 银日 = 62.5 万年',\n        secondaryIcon: 'i-galaxy',\n        seasonChar: '银',\n        seasonTitle: g.season,", "        year: '第 ' + g.year + ' 年', month: g.monthName, day: String(g.day),\n        kicker: META.galaxy.kicker,\n        sub: '第 ' + g.year + ' 个银河年 · 轨道位置 ' + (g.phase * 100).toFixed(1) + '%',\n        primary: '轨道位置 ' + (g.phase * 100).toFixed(1) + '%',\n        primaryIcon: 'i-galaxy',\n        secondary: '1 个银河日 = 62.5 万年',\n        secondaryIcon: 'i-galaxy',\n        seasonChar: '银',\n        seasonTitle: '绕银河系一圈约 2.25 亿年',", 'hero galaxy');

rep("      year: '元年', month: co.monthName, day: String(co.day),\n      kicker: META.cosmos.kicker,\n      sub: '宇宙时刻 ' + co.timeText + ' · 大爆炸后 ' + (co.t / 1e8).toFixed(2) + ' 亿年',\n      primary: '宇宙时刻 ' + co.timeText,\n      primaryIcon: 'i-clock',\n      secondary: '1 宇宙秒 ≈ 437 地球年',\n      secondaryIcon: 'i-cosmos',\n      seasonChar: '末',\n      seasonTitle: '压缩年的最后一秒',", "      year: '第 1 年', month: co.monthName, day: String(co.day),\n      kicker: META.cosmos.kicker,\n      sub: '宇宙年龄 ' + (co.t / 1e8).toFixed(2) + ' 亿年 · 现在是最后 1 秒',\n      primary: '宇宙钟 ' + co.timeText,\n      primaryIcon: 'i-clock',\n      secondary: '1 宇宙秒 ≈ 437 地球年',\n      secondaryIcon: 'i-cosmos',\n      seasonChar: '末',\n      seasonTitle: '宇宙历史压成一年',", 'hero cosmos');

rep("      els.heroTime.textContent = 'MTC ' + C.marsFromJd(jd).timeText;", "      els.heroTime.textContent = '火星时间 ' + C.marsFromJd(jd).timeText;", 'live mars');
rep("      els.heroTime.textContent = '月龄 ' + (m.phase * A.SYNODIC).toFixed(1) + ' 日';", "      els.heroTime.textContent = '月龄 ' + (m.phase * A.SYNODIC).toFixed(1) + ' 天';", 'live moon');
rep("    } else if (state.cal === 'galaxy') {\n      els.heroTime.textContent = '银时 ' + C.galaxyFromJd(jd).timeText;\n    } else {\n      els.heroTime.textContent = '宇宙时刻 ' + C.cosmosFromJd(jd).timeText;\n    }", "    } else if (state.cal === 'galaxy') {\n      return;\n    } else {\n      els.heroTime.textContent = '宇宙钟 ' + C.cosmosFromJd(jd).timeText;\n    }", 'live galaxy');

// renderMini small labels
rep("      ['galaxy', '银河', g.monthName + g.day, 'G' + g.year],\n      ['cosmos', '宇宙', '12.31', co.timeText.slice(0, 8)]", "      ['galaxy', '银河', g.monthName + g.day, '第' + g.year + '年'],\n      ['cosmos', '宇宙', '12.31', '第1年']", 'mini labels');

// header
rep("      title = '地球历 · ' + v.y + ' 年 ' + C.EARTH_MONTHS[v.m - 1];\n      sub = '格里高利历 · 世界通用 · 日界北京时间';", "      title = '地球历 · ' + v.y + ' 年 ' + C.EARTH_MONTHS[v.m - 1];\n      sub = '公历 · 北京时间';", 'header earth');
rep("      title = '月球历 · ' + C.MOON_MONTHS[month - 1].full;\n      sub = '朔为月首 · 十二朔望月为一太阴年 · 月名取自月海';", "      title = '月球历 · ' + month + ' 月';\n      sub = '每月从新月开始 · 12 个月为一年';", 'header moon');
rep("      title = '火星历 · MY' + v.year + ' ' + C.MARS_MONTHS[v.month - 1];\n      sub = 'Ls 每 30° 为一月 · 7 sol 一周 · MTC 艾里平均太阳时';", "      title = '火星历 · 第 ' + v.year + ' 年 ' + v.month + ' 月';\n      sub = '每 30° 太阳黄经为一个月 · 7 个火星日为一周';", 'header mars');
rep("      title = '银河历 · G' + v.year + ' ' + C.GAL_MONTHS[v.month - 1] + '月';\n      sub = '225,000,000 地球年为一银河年 · 12 月 × 30 银日';", "      title = '银河历 · 第 ' + v.year + ' 年 ' + v.month + ' 月';\n      sub = '绕银河系一圈约 2.25 亿年 · 每月 30 个银河日';", 'header galaxy');
rep("      title = '宇宙历 · 元年 ' + C.COSMIC_MONTHS[v.month - 1];\n      sub = '138.7 亿年压缩为一年 · 人类全部历史在最后一秒';", "      title = '宇宙历 · 第 1 年 ' + v.month + ' 月';\n      sub = '宇宙历史 = 一年 · 现在是最后 1 秒';", 'header cosmos');

// moon panel and notes
rep("<div class=\"panel-stat\"><span>太阴年</span><b>第 ${year} 年</b></div>", "<div class=\"panel-stat\"><span>月球年</span><b>第 ${year} 年</b></div>", 'moon panel year');
rep("<div class=\"panel-stat\"><span>本月长度</span><b>${len} 个地球日</b></div>", "<div class=\"panel-stat\"><span>本月天数</span><b>${len} 天</b></div>", 'moon panel len');
rep("<div class=\"panel-stat\"><span>当天月相</span><b>${selected.phaseName} · ${(selected.illum * 100).toFixed(0)}%</b></div>", "<div class=\"panel-stat\"><span>月相</span><b>${selected.phaseName} · ${(selected.illum * 100).toFixed(0)}%</b></div>", 'moon panel phase');
rep("<div class=\"panel-stat\"><span>日界</span><b>北京时间</b></div>", "<div class=\"panel-stat\"><span>日期基准</span><b>北京时间</b></div>", 'moon panel tz');
rep("<div class=\"grid-heading\"><h3>从朔到朔</h3><span>${len} 个地球日 · 当前 ${selected.phaseName}</span></div>", "<div class=\"grid-heading\"><h3>从新月到下一次新月</h3><span>${len} 天 · 当前 ${selected.phaseName}</span></div>", 'moon grid head');
rep("一个朔望月为一个月，十二个月为一太阴年。月名借月海之名，<b>不置闰</b>，所以太阴年会相对地球年缓慢漂移。", "一个月从新月开始，到下一次新月前一天结束；12 个月为一月球年。<b>月份用数字</b>，方便和地球月份区分。", 'moon note');

// mars panel and notes
rep("<div class=\"panel-stat\"><span>年号</span><b>MY ${panel.year}</b></div>", "<div class=\"panel-stat\"><span>火星年</span><b>第 ${panel.year} 年</b></div>", 'mars panel year');
rep("<div class=\"panel-stat\"><span>本月长度</span><b>${days.length} sol</b></div>", "<div class=\"panel-stat\"><span>本月天数</span><b>${days.length} 个火星日</b></div>", 'mars panel len');
rep("<div class=\"panel-stat\"><span>观测时刻</span><b>MTC ${panel.timeText}</b></div>", "<div class=\"panel-stat\"><span>火星时间</span><b>${panel.timeText}</b></div>", 'mars panel time');
rep("<div class=\"grid-heading\"><h3>${panel.monthName} · 火星日</h3><span>本月 ${days.length} sol · 7 sol 为一周</span></div>", "<div class=\"grid-heading\"><h3>${panel.monthName} · 火星日</h3><span>本月 ${days.length} 天 · 7 天为一周</span></div>", 'mars grid head');
rep("火星月按太阳黄经每 30° 切分，长度在 51–61 sol 之间；网格列为视觉节奏，<b>7 sol 为一周</b>。右侧日期是同一 sol 对应的地球日期。", "火星月按太阳黄经每 30° 切分，长度在 51–61 天之间；<b>7 个火星日为一周</b>。右下角日期是这一天对应的地球日期。", 'mars note');

// galaxy view block
rep("      <div class=\"gal-months\">${months}</div>", "      <div class=\"gal-months\">${months}</div>", 'noop');
rep("        <div class=\"gal-side\">\n          <h3>${esc(selectedName)}月</h3>\n          <p>${esc(GAL_NOTES[month - 1])}</p>", "        <div class=\"gal-side\">\n          <h3>第 ${month} 个月</h3>\n          <p>银河年的第 ${month} 个月。每个月有 30 个银河日，每个银河日约 62.5 万年。</p>", 'gal side desc');
rep("<div class=\"gal-spec\"><label>银河年</label><b>G ${now.year}</b></div>", "<div class=\"gal-spec\"><label>银河年</label><b>第 ${now.year} 年</b></div>", 'gal spec year');
rep("<div class=\"gal-spec\"><label>近心相位</label><b>${(now.phase * 100).toFixed(1)}%</b></div>", "<div class=\"gal-spec\"><label>轨道位置</label><b>${(now.phase * 100).toFixed(1)}%</b></div>", 'gal spec phase');
rep("<div class=\"gal-spec\"><label>已过近心点</label><b>${(now.phase * A.GAL_YEAR / 1e4).toFixed(0)} 万年</b></div>", "<div class=\"gal-spec\"><label>上次最近</label><b>3,000 万年前</b></div>", 'gal spec near');
rep("人类全部有记录的历史，在银河历里还不到一个银日的末尾。<b>${nextFest ? '下一个地球节日「' + esc(nextFest.name) + '」落在第 ' + nextFest.proj.galaxyObj.day + ' 银日' : '所有地球节日都落在同一银日'} </b>——这不是巧合，而是尺度。", "人类全部有记录的历史，在银河历里还不到一个银河日。<b>${nextFest ? '下一个地球节日「' + esc(nextFest.name) + '」落在第 ' + nextFest.proj.galaxyObj.day + ' 个银河日' : '所有地球节日都落在同一个银河日'} </b>——这不是巧合，而是尺度。", 'gal human note');
rep("<div class=\"gal-grid-head\"><h4>${esc(selectedName)}月 · 三十个银日</h4><span>1 银日 = 625,000 地球年</span></div>", "<div class=\"gal-grid-head\"><h4>${month} 月 · 30 个银河日</h4><span>1 个银河日 ≈ 62.5 万年</span></div>", 'gal grid head');
rep("银河历以太阳绕银心一圈为一年；每月 30 银日，每银日 62.5 万年。岁首定在近银心点，<b>上一次近银心点为 3,000 万年前的设定值</b>。", "银河历从太阳离银河系中心最近的位置开始算一年；一年 12 个月，每月 30 个银河日。<b>“上次最近”是本文的设定值</b>。", 'gal note');

// cosmos view
rep("<span>365 日 = 13.787 Gyr</span>", "<span>365 天 = 137.87 亿年</span>", 'cosmos head');
rep("        <span>${ev.length ? ev.length + ' 个事件' : '深时空白'}</span>", "        <span>${ev.length ? ev.length + ' 个事件' : '没有收录事件'}</span>", 'cosmos month count');
rep("<div class=\"human-title\">最后一秒</div><span class=\"human-badge\">人类窗口</span>", "<div class=\"human-title\">最后 1 秒</div><span class=\"human-badge\">人类历史</span>", 'cosmos human title');
rep("<div class=\"cosmos-clock\"><small>此刻的宇宙时刻</small>${esc(now.timeText)}</div>", "<div class=\"cosmos-clock\"><small>现在的位置</small>${esc(now.timeText)}</div>", 'cosmos clock');
rep("1 宇宙秒 ≈ 437 地球年。人类文明只占这一秒里极窄的一小段。", "1 宇宙秒 ≈ 437 地球年。人类文明只占这一秒里很短的一段。", 'cosmos note');
rep("<div class=\"cosmos-events-head\"><h4>${C.COSMIC_MONTHS[v.month - 1]} · ${events.length} 个收录事件</h4>", "<div class=\"cosmos-events-head\"><h4>${v.month} 月 · ${events.length} 个收录事件</h4>", 'cosmos events head');
rep("宇宙历把整个宇宙史线性压缩进一个 365 日的年份。大爆炸在 1 月 1 日，太阳系在 9 月出现；十二月之后的事件，全部挤在 12 月 31 日的最后几毫秒。", "宇宙历把整个宇宙历史压缩进一年。宇宙诞生在 1 月 1 日，太阳系在 9 月出现；人类的事件全部挤在 12 月 31 日的最后几毫秒。", 'cosmos year note');
rep("这个月没有收录的深时里程碑。宇宙的大部分历史，落在十二月。", "这个月没有收录事件。宇宙的大部分历史都落在 12 月。", 'cosmos empty');

// five cal details
rep("${item('mars', p.mars.text, 'MY' + p.marsObj.year + ' · Ls ' + p.marsObj.ls.toFixed(1) + '°')}", "${item('mars', p.mars.text, '第' + p.marsObj.year + '年 · 太阳黄经 ' + p.marsObj.ls.toFixed(1) + '°')}", 'five mars');
rep("${item('galaxy', p.galaxy.text, 'G' + p.galaxyObj.year + ' · ' + p.galaxyObj.timeText)}", "${item('galaxy', p.galaxy.text, '第' + p.galaxyObj.year + '年 · 轨道位置 ' + (p.galaxyObj.phase * 100).toFixed(1) + '%')}", 'five galaxy');
rep("${item('cosmos', p.cosmos.text, p.cosmosObj.timeText + ' · 元年')}", "${item('cosmos', p.cosmos.text, '第1年 · ' + p.cosmosObj.timeText)}", 'five cosmos');

// detail notes
rep("kicker: 'SELECTED LUNAR DAY · 所选太阴日',", "kicker: '所选月球日',", 'detail moon kicker');
rep("note: '换算自该太阴日的正午。月球历以朔为月首、以北京时间零点为日界；十二个朔望月为一太阴年。'", "note: '换算自这一天中午。月球历每月从新月开始，12 个月为一年。'", 'detail moon note');
rep("kicker: 'SELECTED SOL · 所选火星日',", "kicker: '所选火星日',", 'detail mars kicker');
rep("note: '换算自该 sol 的中点。火星的一“日”为 24 小时 39 分 35 秒，不是地球日。'", "note: '换算自这个火星日的中点。一个火星日约 24 小时 39 分 35 秒，比地球日稍长。'", 'detail mars note');
rep("kicker: 'HUMAN WINDOW · 人类窗口',", "kicker: '下一个地球节日',", 'detail deep kicker');
rep("? '在银河历中，所有地球节日都落在同一个银日里，前后只差几秒钟。尺度把人类的历史压成一点。'", "? '在银河历中，所有地球节日都落在同一个银河日里，前后只差几秒钟。尺度把人类历史压成一点。'", 'detail galaxy note');
rep(": '在宇宙历中，所有地球节日都落在 12 月 31 日的同一宇宙秒里。这不是误差，而是 138 亿年被压进一年后的必然。'", ": '在宇宙历中，所有地球节日都落在 12 月 31 日的同一宇宙秒里。这不是误差，而是宇宙历史被压进一年后的结果。'", 'detail cosmos note');
rep("kicker: 'SELECTED DAY · 所选之日'", "kicker: '所选之日'", 'detail earth kicker');
rep("kicker: 'SELECTED MOMENT · 同一刻'", "kicker: '同一刻'", 'detail default kicker');
rep("'银河历与宇宙历使用同一绝对时刻，并未按季节重排节日。'", "'五套历法使用同一时刻换算。'", 'detail note default');

fs.writeFileSync(p, s);
console.log(misses.length ? 'MISSES: ' + misses.join(', ') : 'app copy simplified');
