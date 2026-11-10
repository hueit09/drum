// レシピ再現：青栁さんの実測レシピ（G♭ と E、街スタ13"構成と Heritage）が画面にそのまま出るか
const L = require('./lib');
const WANT = {
  'G♭': { キック: [69, 69], スネア: [233, 320], toms: [[220, 185], [175, 147], [147, 123], [117, 98]] },
  'E': { キック: [62, 62], スネア: [208, 285], toms: [[233, 196], [196, 165], [156, 131], [131, 110]] },
};
(async () => {
  let bad = 0;
  const o = await L.open({}); const p = o.page; await L.start(p);
  for (const pre of ['t13', 'heritage']) {
    await L.tab(p, 'kit'); await p.click(`#presets [data-pre="${pre}"]`);
    await L.tab(p, 'recipe');
    if (!(await p.evaluate(() => document.getElementById('keyPane').open))) { await p.click('#keySum'); await p.waitForTimeout(350); }
    for (const key of ['G♭', 'E']) {
      await p.click('#modes [data-mode="major"]');
      if (key === 'G♭') { await p.click('#accs [data-acc="-1"]'); await p.click('#keys .k:nth-child(5)'); }
      else { await p.click('#accs [data-acc="0"]'); await p.click('#keys .k:nth-child(3)'); }
      await p.waitForTimeout(150);
      const got = await p.evaluate(() => [...document.querySelectorAll('#cards .card')].map(c => ({
        name: c.querySelector('.badge').textContent, top: parseInt(c.querySelector('.hr.t .hrv').textContent), bot: parseInt(c.querySelector('.hr.b .hrv').textContent),
        warn: !!c.querySelector('.warn') })));
      const sum = await p.textContent('#keySum');
      const w = WANT[key]; let ti = 0; const line = [];
      for (const g of got) {
        const exp = w[g.name] || w.toms[ti++]; const tol = g.name === 'キック' ? 1 : 0;
        const ok = Math.abs(g.top - exp[0]) <= tol && Math.abs(g.bot - exp[1]) <= tol && !g.warn;
        if (!ok) { bad++; line.push(`NG ${g.name} ${g.top}/${g.bot} want ${exp}${g.warn ? ' (warn)' : ''}`); }
      }
      console.log(`${pre} ${key} [${sum.trim()}] ` + (line.length ? line.join('; ') : 'ok ' + got.map(g => g.top + '/' + g.bot).join(' ')));
    }
  }
  // 短調は平行長調と同じ値
  await p.click('#modes [data-mode="minor"]'); await p.click('#accs [data-acc="1"]'); await p.click('#keys .k:nth-child(1)'); // C#m
  const cm = await p.evaluate(() => [...document.querySelectorAll('#cards .card .hr.t .hrv')].map(e => parseInt(e.textContent)).join(','));
  if (cm !== '62,208,233,196,156,131') { bad++; console.log('NG C#m', cm); } else console.log('C#m = E ok');
  if (o.errs.length) { bad++; console.log(o.errs); }
  await o.browser.close();
  console.log(bad ? 'RECIPE NG' : 'RECIPE OK'); process.exit(bad ? 1 : 0);
})();
