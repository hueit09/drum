// レシピの検算：全キー×全プリセットで、実音が音階に乗っているか・表裏の音程・実用レンジを確かめる
const L = require('./lib');
const MAJ = [0, 2, 4, 5, 7, 9, 11], KN = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const LA = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
const R3 = Math.sqrt(3);
(async () => {
  const o = await L.open({}); const p = o.page; await L.start(p);
  let worst = { tom: 0, iv: 0 }, warnT = 0, rows = [], bad = 0;
  for (const pre of ['std1', 'std2', 't13', 'cmp', 'heritage']) {
    await L.tab(p, 'kit'); await p.click(`#presets [data-pre="${pre}"]`); await L.tab(p, 'recipe');
    if (!(await p.evaluate(() => document.getElementById('keyPane').open))) { await p.click('#keySum'); await p.waitForTimeout(350); }
    await p.click('#modes [data-mode="major"]');
    for (let k = 0; k < 12; k++) {
      await p.click(`#accs [data-acc="${LA[k][1]}"]`); await p.click(`#keys .k:nth-child(${LA[k][0] + 1})`);
      const cards = await p.evaluate(() => [...document.querySelectorAll('#cards .card')].map(c => ({
        name: c.querySelector('.badge').textContent, kind: c.querySelector('.badge').className.split(' ')[1], sz: c.querySelector('.sz').textContent,
        top: parseInt(c.querySelector('.hr.t .hrv').textContent), bot: parseInt(c.querySelector('.hr.b .hrv').textContent),
        note: c.querySelector('.pv b').textContent, hz: parseFloat(c.querySelector('.pv span').textContent), warn: c.querySelector('.warn') ? c.querySelector('.warn b').textContent : '' })));
      const line = [];
      let prev = null;
      for (const c of cards) {
        // 実音が、そのキーの長音階のどの音から何セントか
        const semi = 12 * Math.log2(c.hz / 440) + 9 - k; let best = 99, deg = 0;
        for (let i = 0; i < 7; i++) { let d = ((semi - MAJ[i]) % 12 + 12) % 12; if (d > 6) d -= 12; if (Math.abs(d) < Math.abs(best)) { best = d; deg = i + 1; } }
        const cen = Math.round(best * 100);
        const iv = 12 * Math.log2(c.bot / c.top);            // 表裏の音程（半音）。整数Hzに丸めたあとの実際の値
        const f2 = Math.sqrt(c.top * c.bot) / R3; const rd = Math.round(1200 * Math.log2(f2 / c.hz)); // 丸めで実音が何セント動くか
        if (c.kind === 'tom') {
          worst.tom = Math.max(worst.tom, Math.abs(cen)); worst.iv = Math.max(worst.iv, Math.abs(iv + 3) * 100);
          if (c.warn) warnT++;
          if (prev && !(c.hz < prev)) { bad++; console.log('NG 並び', pre, KN[k], c.name); }
          prev = c.hz;
        }
        line.push(`${c.name}${c.sz} ${c.top}/${c.bot} 実音${c.hz}(${deg}度${cen >= 0 ? '+' : ''}${cen}¢) 表裏${iv >= 0 ? '+' : ''}${iv.toFixed(2)}半音 丸め${rd >= 0 ? '+' : ''}${rd}¢${c.warn ? ' ⚠' + c.warn : ''}`);
      }
      rows.push(`[${pre} ${KN[k]}] ` + line.join(' | '));
    }
  }
  if (process.argv.includes('-v')) console.log(rows.join('\n'));
  console.log(`タムの実音：音階からのずれ 最大 ${worst.tom}¢ ／ 表裏の音程：短3度からのずれ 最大 ${worst.iv.toFixed(0)}¢ ／ レンジ外の警告 ${warnT}件（全${5 * 12}組）`);
  console.log(rows.filter(r => /^\[(t13|heritage) (G♭|E|C|A)\]/.test(r)).join('\n'));
  console.log(rows.filter(r => /⚠/.test(r)).map(r => r.slice(0, 16) + ' … ' + (r.match(/[^|]*⚠[^|]*/g) || []).join(' ; ')).join('\n'));
  await o.browser.close();
})();
