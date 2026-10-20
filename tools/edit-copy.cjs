const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'web', 'js', 'calendars.js');
let s = fs.readFileSync(p, 'utf8');
let misses = [];
function rep(a, b, label) {
  if (!s.includes(a)) { misses.push(label); return; }
  s = s.replace(a, b);
}

const oldMoonMonths = s.match(/  const MOON_MONTHS = \[[\s\S]*?\n  \];/)[0];
rep(oldMoonMonths, `  const MOON_MONTHS = Array.from({ length: 12 }, (_, i) => ({
    name: (i + 1) + '月',
    full: (i + 1) + '月',
    note: '每个月从一次新月开始。'
  }));`, 'moon months');
rep("const MOON_PHASE_NAMES = ['朔', '蛾眉月', '上弦', '盈凸月', '望', '亏凸月', '下弦', '残月'];", "const MOON_PHASE_NAMES = ['新月', '月牙', '上弦月', '接近满月', '满月', '刚过满月', '下弦月', '残月'];", 'moon phases');
rep("      label: `月球历 ${cn(year)} 年 · ${info.full} ${cn(day)} 日`,\n      shortLabel: `${year} 年 · ${info.name}月${cn(day)}日`,\n      sub: `${moonPhaseName(phase)} · 月龄 ${(phase * A.SYNODIC).toFixed(1)} 日 · 本朔望月 ${len} 日`,\n      season: '朔望为月 · 十二月为一太阴年',", "      label: `月球历 ${year} 年 ${month} 月 ${day} 日`,\n      shortLabel: `${year} 年 · ${month} 月 ${day} 日`,\n      sub: `${moonPhaseName(phase)} · 月龄 ${(phase * A.SYNODIC).toFixed(1)} 天 · 本月 ${len} 天`,\n      season: '每月从一次新月开始',", 'moon labels');
rep("      timeLabel: '日界北京时间 UTC+8'", "      timeLabel: '日期按北京时间'", 'moon time label');

const oldMarsMonths = s.match(/  const MARS_MONTHS = \[[\s\S]*?\n  \];/)[0];
rep(oldMarsMonths, `  const MARS_MONTHS = Array.from({ length: 12 }, (_, i) => (i + 1) + '月');`, 'mars months');
const oldMarsNotes = s.match(/  const MARS_MONTH_NOTE = \[[\s\S]*?\n  \];/)[0];
rep(oldMarsNotes, `  const MARS_MONTH_NOTE = [
    '北半球春季开始，极地冰盖开始缩小。',
    '春季多风，局部会有沙尘。',
    '接近火星轨道的远日点，白天很长。',
    '北半球夏季，太阳最高。',
    '轨道速度较慢，天空常有灰尘。',
    '南半球夏季，南极几乎全天有阳光。',
    '昼夜平分，进入北半球秋季。',
    '秋季变冷，早晨会有霜。',
    '接近近日点，沙尘天气增多。',
    '北半球冬季，白天最短。',
    '冬季结束，极地冰盖重新变大。',
    '风沙减少，是一年中较平静的月份。'
  ];`, 'mars notes');
rep("const MARS_WEEK = ['火曜', '水曜', '金曜', '地曜', '木曜', '土曜', '天曜'];", "const MARS_WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];", 'mars week');
rep("      label: `火星历 ${my} 年 · ${MARS_MONTHS[month - 1]} ${cn(day)} 日`,\n      shortLabel: `MY${my} · ${MARS_MONTHS[month - 1]}${day}`,\n      sub: `Ls ${ls.toFixed(1)}° · 北半球${marsSeason(ls)}季 · ${MARS_WEEK[mod(sol - marsEpochSol(), 7)]}`,\n      season2: `MSD ${Math.floor(sol + A.MSD_OFFSET)} · 本月 ${len} sol`,\n      timeText: pad2(Math.floor(mtc)) + ':' + pad2(Math.floor(mod(mtc, 1) * 60)) + ':' + pad2(Math.floor(mod(mtc * 60, 1) * 60)),\n      timeLabel: 'MTC 艾里平均太阳时'", "      label: `火星历 ${my} 年 ${month} 月 ${day} 日`,\n      shortLabel: `第${my}年 · ${month}月${day}日`,\n      sub: `太阳黄经 ${ls.toFixed(1)}° · 北半球${marsSeason(ls)}季 · ${MARS_WEEK[mod(sol - marsEpochSol(), 7)]}`,\n      season2: `本月 ${len} 个火星日`,\n      timeText: pad2(Math.floor(mtc)) + ':' + pad2(Math.floor(mod(mtc, 1) * 60)) + ':' + pad2(Math.floor(mod(mtc * 60, 1) * 60)),\n      timeLabel: '火星当地时间'", 'mars labels');

const oldGalMonths = s.match(/  const GAL_MONTHS = \[[\s\S]*?\n  \];/)[0];
rep(oldGalMonths, `  const GAL_MONTHS = Array.from({ length: 12 }, (_, i) => (i + 1) + '月');`, 'gal months');
rep("  const GAL_SEASONS = ['银夏', '银秋', '银冬', '银春'];", "  const GAL_SEASONS = ['第1季度', '第2季度', '第3季度', '第4季度'];", 'gal seasons');
rep("      label: `银河历 ${gy} 年 · ${GAL_MONTHS[month - 1]}月 ${cn(day)} 日`,\n      shortLabel: `G${gy} · ${GAL_MONTHS[month - 1]}${day}`,\n      sub: `第 ${gy} 个银河年 · ${season} · 银时 ${galaxyTime(phi)}`,\n      season2: `已过近银心点 ${(phi * A.GAL_YEAR / 1e4).toFixed(0)} 万年 · 距下一次 ${((1 - phi) * A.GAL_YEAR / 1e4).toFixed(0)} 万年`,", "      label: `银河历 ${gy} 年 ${month} 月 ${day} 日`,\n      shortLabel: `第${gy}年 · ${month}月${day}日`,\n      sub: `第 ${gy} 个银河年 · 轨道位置 ${(phi * 100).toFixed(1)}%`,\n      season2: `距下次经过银河系中心约 ${((1 - phi) * A.GAL_YEAR / 1e8).toFixed(2)} 亿年`,", 'gal labels');
rep("      timeText: galaxyTime(phi), timeLabel: '银时 24h/银日 · 1 银秒 ≈ 7.2 地球年'", "      timeText: galaxyTime(phi), timeLabel: '轨道位置与地球年不同'", 'gal time label');

rep("const COSMIC_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月',\n    '八月', '九月', '十月', '十一月', '十二月'];", "const COSMIC_MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月',\n    '8月', '9月', '10月', '11月', '12月'];", 'cosmic months');
const oldCosmicEvents = s.match(/  const COSMIC_EV = \[[\s\S]*?\n  \];/)[0];
rep(oldCosmicEvents, `  const COSMIC_EV = [
    [0, '宇宙诞生', '时间、空间和热辐射的起点。'],
    [3.8e5, '宇宙变透明', '电子和质子结合，光可以自由传播。'],
    [2e8, '第一代恒星', '宇宙结束黑暗期，第一批恒星点亮。'],
    [1.0e9, '最早星系', '气体聚集，第一批星系开始发光。'],
    [9.22e9, '太阳系诞生', '太阳和地球在尘埃盘中形成。'],
    [9.99e9, '最早生命', '海底热泉附近，化学开始自我复制。'],
    [11.39e9, '氧气增加', '微生物让大气中的氧气增多。'],
    [11.99e9, '复杂细胞出现', '细胞有了细胞核，生命开始变得复杂。'],
    [13.19e9, '多细胞生命', '细胞开始合作，生命变得更大。'],
    [13.25e9, '动物大量出现', '眼睛、外壳和捕食关系在短时间内出现。'],
    [13.32e9, '植物登陆', '绿色植物爬上陆地，土壤开始形成。'],
    [13.56e9, '恐龙出现', '恐龙在地球上生活了一亿多年。'],
    [13.721e9, '小行星撞击', '非鸟恐龙消失，哺乳动物有了更多空间。'],
    [13.7807e9, '人类祖先出现', '约 700 万年前，人类和黑猩猩的祖先分开。'],
    [13.7867e9, '现代人出现', '约 30 万年前，非洲出现现代人。'],
    [13.78699e9, '农业与城市', '约 1 万年前，人类开始种植和定居。'],
    [13.786995e9, '文字出现', '约 5,000 年前，记忆可以离开大脑。'],
    [13.78699974e9, '工业与电力', '约 260 年前，人类开始大规模使用化石能源。'],
    [13.78699993e9, '信息与航天', '约 70 年来，人类开始从太空回望地球。']
  ];`, 'cosmic events');
rep("      label: `宇宙历 元年 · ${c.monthName} ${c.day} 日`,\n      shortLabel: `元年 · 12月31日`,\n      sub: `宇宙时刻 ${cosmicTimeText(phi)} · 大爆炸后 ${(t / 1e8).toFixed(2)} 亿年`,\n      season: '138 亿年压缩为一年',\n      season2: `1 宇宙秒 ≈ ${(A.T_UNIVERSE / 31536000).toFixed(1)} 地球年`,", "      label: `宇宙历 第 1 年 · ${c.monthName} ${c.day} 日`,\n      shortLabel: `第 1 年 · 12月31日`,\n      sub: `宇宙年龄 ${(t / 1e8).toFixed(2)} 亿年 · 现在是最后 1 秒`,\n      season: '把宇宙历史压成一年',\n      season2: `1 宇宙秒 ≈ ${(A.T_UNIVERSE / 31536000).toFixed(1)} 地球年`,", 'cosmos labels');
rep("      timeText: cosmicTimeText(phi), timeLabel: '宇宙时刻 · 1 秒 ≈ 437 地球年'", "      timeText: cosmicTimeText(phi), timeLabel: '宇宙钟 · 1 秒 ≈ 437 地球年'", 'cosmos time label');

fs.writeFileSync(p, s);
console.log(misses.length ? 'MISSES: ' + misses.join(', ') : 'all copy edits applied');
