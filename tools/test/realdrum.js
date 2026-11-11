// 本物の太鼓の録音（Hydrogen GMRockKit）を叩きとして流し、太鼓として受け付けるかを見る
const L = require('./lib'); const fs = require('fs'); const D = __dirname + '/../sep/hyd/data/drumkits/GMRockKit/'; const SR = 48000;
function rdw(fn) { const b = fs.readFileSync(fn); const ch = b.readUInt16LE(22), sr = b.readUInt32LE(24), bits = b.readUInt16LE(34); let off = 12; while (b.toString('ascii', off, off + 4) !== 'data') off += 8 + b.readUInt32LE(off + 4) + (b.readUInt32LE(off + 4) & 1); const by = bits / 8, n = b.readUInt32LE(off + 4) / by / ch; const x = new Float32Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < ch; c++) { const p = off + 8 + (i * ch + c) * by; s += by === 2 ? b.readInt16LE(p) / 32768 : by === 3 ? b.readIntLE(p, 3) / 8388608 : b.readInt32LE(p) / 2147483648; } x[i] = s / ch; }
  const m = Math.floor(n * SR / sr), y = new Float32Array(m); for (let i = 0; i < m; i++) { const q = i * sr / SR, a = Math.floor(q); y[i] = x[a] + (x[Math.min(n - 1, a + 1)] - x[a]) * (q - a); } return y; }
(async () => {
  let bad = 0;
  for (const [smp, drum, gap] of [['Tom1', 'テンタム', 2.6], ['Tom2', 'ハイタム', 2.6], ['TomFloor', 'フロアタム', 3.4], ['Kick', 'キック', 1.5], ['Snare', 'スネア', 1.5]]) {
    const b = new Float32Array(Math.floor(SR * gap * 6)); L.noise(b, 0.0005); let k = 0;
    for (const v of ['Hard', 'Med', 'Soft', 'Hard', 'Med', 'Soft']) { const s = rdw(D + smp + '-' + v + '.wav'); const at = Math.floor(SR * (0.4 + k * gap)); for (let i = 0; i < s.length && at + i < b.length; i++) b[at + i] += 0.25 * s[i]; k++; }
    L.wav(__dirname + '/wav/real.wav', b, SR);
    const o = await L.open({ wav: __dirname + '/wav/real.wav' }); const p = o.page; await L.start(p);
    await L.tab(p, 'kit'); await p.click('#presets [data-pre="t13"]'); await L.tab(p, 'tune');
    await p.click(`#drums button:text-is("${drum}")`); await p.click('#heads [data-head="fund"]');
    // 0.25秒ごとに画面を見て、記録された値と出た注意を集める
    const seen = new Set(), msgs = {};
    for (let t = 0; t < gap * 6 * 4 + 6; t++) { await p.waitForTimeout(250);
      const r = await p.evaluate(() => [document.getElementById('tS').textContent.replace(/\s+/g, ' '), document.getElementById('tDg').hidden ? '' : document.getElementById('tDg').textContent]);
      const m = /^([\d.]+) →/.exec(r[0].trim()); if (m) seen.add(m[1]);
      if (/太鼓の音ではない|安定しません/.test(r[1])) msgs[r[1].slice(0, 12)] = (msgs[r[1].slice(0, 12)] || 0) + 1; }
    const ok = seen.size >= 1 && !Object.keys(msgs).some(k => /太鼓の音ではない/.test(k)); if (!ok) bad++;
    console.log((ok ? 'ok  ' : 'NG  ') + `${smp} → ${drum} 実音：読めた値 [${[...seen].join(' ')}]　注意 ${JSON.stringify(msgs)}`);
    await o.browser.close();
  }
  console.log(bad ? 'REAL NG' : 'REAL OK'); process.exit(bad ? 1 : 0);
})();
