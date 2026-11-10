// 画面の崩れ：横はみ出し・文字の切れ・重なりを全タブ×幅×配色で見る
const L = require('./lib');
const SHOT = process.argv.includes('--shots');
(async () => {
  let bad = 0; const out = [];
  const widths = [320, 360, 375, 390, 430];
  for (const scheme of ['light', 'dark']) for (const w of widths) {
    const kit = { preset: 'heritage' };
    const o = await L.open({ viewport: { width: w, height: 800 }, scheme, dsf: SHOT ? 2 : 1 });
    const p = o.page;
    await L.start(p);
    await L.tab(p, 'kit'); await p.click('#presets [data-pre="heritage"]');
    for (const v of ['tune', 'recipe', 'kit', 'song', 'doc']) {
      await L.tab(p, v);
      if (v === 'recipe' || v === 'tune') { // キー欄も開いておく
        if (!(await p.evaluate(() => document.getElementById('keyPane').open))) { await p.click('#keySum'); await p.waitForTimeout(350); }
      }
      if (v === 'doc') { await p.evaluate(() => document.querySelectorAll('#vDoc details').forEach(d => d.open = true)); }
      if (v === 'song') { for (const k of [0, 3, 14, 20]) { await p.selectOption('#slPick', { index: k }); await p.click('#slAdd'); } }
      const r = await p.evaluate(() => {
        const iw = window.innerWidth, res = [];
        if (document.documentElement.scrollWidth > iw + 1) res.push('page scrollWidth ' + document.documentElement.scrollWidth + ' > ' + iw);
        const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const inScroller = e => { for (let x = e.parentElement; x; x = x.parentElement) { const s = getComputedStyle(x); if (/(auto|scroll|hidden)/.test(s.overflowX) && x !== document.body && x !== document.documentElement) return true; } return false; };
        document.querySelectorAll('body *').forEach(e => {
          if (!vis(e) || e.closest('#splash') || e.closest('svg')) return;
          const r = e.getBoundingClientRect();
          if ((r.right > iw + 1 || r.left < -1) && !inScroller(e)) res.push('off-screen <' + e.tagName + (e.id ? '#' + e.id : '') + '.' + e.className + '> ' + Math.round(r.left) + '..' + Math.round(r.right));
          if (/^(BUTTON|SELECT|LABEL|B|SPAN|EM|I|U|SUMMARY)$/.test(e.tagName) && e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible' && e.clientWidth > 2 && !(e.id === 'appUrl' && e.clientWidth >= 100))
            res.push('clipped text <' + e.tagName + (e.id ? '#' + e.id : '') + '.' + e.className + '> "' + (e.textContent || '').slice(0, 24) + '"');
        });
        // 押せるものの大きさ
        document.querySelectorAll('button,select,input,[role=button],[role=slider]').forEach(e => {
          if (!vis(e) || e.closest('#splash') || e.closest('svg')) return;
          const r = e.getBoundingClientRect();
          const af = getComputedStyle(e, '::after'); const aw = parseFloat(af.width) || 0, ah = parseFloat(af.height) || 0;
          const W2 = Math.max(r.width, aw), H2 = Math.max(r.height, ah); const big = Math.min(W2, H2) >= 30 && Math.max(W2, H2) >= 38;
          if (!big && !e.closest('label')) res.push('small target ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' <' + e.tagName + (e.id ? '#' + e.id : '') + '.' + e.className + '> "' + (e.textContent || '').slice(0, 12) + '"');
        });
        return res;
      });
      const uniq = [...new Set(r)];
      if (uniq.length) { bad += uniq.length; out.push(`[${scheme} ${w} ${v}]\n  ` + uniq.slice(0, 12).join('\n  ')); }
      if (SHOT && (w === 390 || w === 320)) await p.screenshot({ path: `shots/${v}-${w}-${scheme}.png`, fullPage: true });
    }
    if (o.errs.length) { bad += o.errs.length; out.push(`[${scheme} ${w}] errors: ` + o.errs.join(' | ')); }
    await o.browser.close();
  }
  console.log(out.join('\n'));
  console.log(bad ? 'LAYOUT NG ' + bad : 'LAYOUT OK');
  process.exit(bad ? 1 : 0);
})();
