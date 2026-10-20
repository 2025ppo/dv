/* 让 Node 直接 require 浏览器端脚本：脚本顶层用 window.X = ...，故先把 window 挂到 global */
const fs = require('fs');
const path = require('path');
global.window = global.window || {};
const dir = path.join(__dirname, '..', 'web', 'js');
const vendor = path.join(dir, 'vendor', 'astronomy.min.js');
if (fs.existsSync(vendor)) global.window.Astronomy = require(vendor);
for (const f of ['astro.js', 'calendars.js', 'festivals.js', 'weather.js']) {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) require(p);
}
module.exports = { ASTRO: window.ASTRO, CAL: window.CAL, FEST: window.FEST, WX: window.WX };
