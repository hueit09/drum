// マイクで読む：録音を偽のマイクとして流し込み、実際の検出経路を通す
const L = require('./lib'); const SR = 48000; const W = __dirname + '/wav/';
const cents = (a, b) => 1200 * Math.log2(a / b);
async function setup(wavf, pre, drum, head) {
  const o = await L.open({ wav: wavf }); const p = o.page;
  await p.addInitScript(() => { });
  await L.start(p);
  await L.tab(p, 'kit'); await p.click(`#presets [data-pre="${pre}"]`); await L.tab(p, 'tune');
  await p.click(`#drums button:text-is("${drum}")`);
  if (head !== 'top') await p.click(`#heads [data-head="${head}"]`);
  // 記録のたびに付く pop を数える
  await p.evaluate(() => {
    window.__c = [];
    const svg = document.getElementById('svg');
    new MutationObserver(() => { if (svg.classList.contains('pop')) { const t = document.getElementById('roNote').textContent; const m = /([\d.]+) Hz/.exec(t); const last = window.__c[window.__c.length - 1]; const now = performance.now(); if (!last || now - last.t > 150) window.__c.push({ t: now, hz: m ? +m[1] : 0 }); } }).observe(svg, { attributes: true, attributeFilter: ['class'] });
  });
  return o;
}
const commits = p => p.evaluate(() => window.__c);
(async () => {
  let bad = 0; const say = (ok, s) => { if (!ok) bad++; console.log((ok ? 'ok  ' : 'NG  ') + s); };
  // 1) タム 220Hz（13"構成 G♭ のテンタム打面＝目標220）
  let o = await setup(W + 'tom220.wav', 't13', 'テンタム', 'top'); let p = o.page;
  await p.waitForTimeout(9000); let c = await commits(p);
  let errs = c.map(x => Math.abs(cents(x.hz, 220)));
  say(c.length >= 5 && Math.max(...errs) <= 5, `タム220Hz: ${c.length}打を記録、最大誤差 ${Math.max(...errs).toFixed(1)}¢`);
  say(await p.textContent('#roAct') === '合致', '合致の表示: ' + await p.textContent('#roAct'));
  say(o.errs.length === 0, 'エラーなし ' + o.errs.join('|')); await o.browser.close();
  // 2) キック 69Hz
  o = await setup(W + 'kick69.wav', 't13', 'キック', 'top'); p = o.page;
  await p.waitForTimeout(10000); c = await commits(p); errs = c.map(x => Math.abs(cents(x.hz, 69)));
  say(c.length >= 4 && Math.max(...errs) <= 8, `キック69Hz: ${c.length}打を記録、最大誤差 ${Math.max(...errs).toFixed(1)}¢`);
  await o.browser.close();
  // 3) ボルトを回した直後の追従
  o = await setup(W + 'change.wav', 't13', 'テンタム', 'top'); p = o.page;
  await p.waitForTimeout(30000); c = await commits(p);
  // 205Hz は1周に2打だけ。回した直後の1打で表示が動けば、205 が毎周2回ずつ出る
  const n205 = c.filter(x => Math.abs(cents(x.hz, 205)) <= 12).length, n220 = c.filter(x => Math.abs(cents(x.hz, 220)) <= 12).length;
  const mid = c.length - n205 - n220;
  say(n205 >= 3 && n220 >= 12 && mid === 0, `追従: 205Hz の表示 ${n205}回 / 220Hz ${n220}回 / どちらでもない値 ${mid}回（全${c.length}打）`);
  await o.browser.close();
  // 4) 何も叩いていないのに数字が出ない
  o = await setup(W + 'idle.wav', 't13', 'テンタム', 'top'); p = o.page;
  await p.waitForTimeout(8000); c = await commits(p);
  say(c.length === 0, `空調だけの部屋: 誤反応 ${c.length}件`);
  await o.browser.close();
  // 5) にぎやかな部屋：雑音だけでは反応せず、線が雑音より上に動き、打撃は読める
  o = await setup(W + 'noisy.wav', 't13', 'テンタム', 'top'); p = o.page;
  const pos = [];
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(500); pos.push(await p.evaluate(() => [parseFloat(document.getElementById('lvlT').style.left), parseFloat(document.getElementById('lvlI').style.width)])); }
  c = await commits(p); errs = c.map(x => Math.abs(cents(x.hz, 220)));
  const above = pos.filter(x => x[0] > x[1]).length;
  say(c.length >= 4 && Math.max(...errs) <= 10, `にぎやかな部屋: ${c.length}打を記録、最大誤差 ${errs.length ? Math.max(...errs).toFixed(1) : '-'}¢`);
  say(above >= 20, `線が部屋の音より上に出ている時間: ${above}/40`);
  await o.browser.close();
  // 6) 余韻：実音モードで、正解の分かる減衰を測る
  o = await setup(W + 'idle.wav', 't13', 'テンタム', 'fund'); p = o.page;
  const tg = parseFloat((await p.textContent('#tS')).match(/([\d.]+) Hz/)[1]);
  await o.browser.close();
  for (const T of [0.8, 2.0]) {
    const b = new Float32Array(SR * 16); L.noise(b, 0.0003);
    for (let t = 1; t < 15; t += 5) L.hit(b, SR, Math.floor(t * SR), tg, 0.25, T, { parts: [[1, 1, 1]] });
    L.wav(W + 'decay.wav', b, SR);
    o = await setup(W + 'decay.wav', 't13', 'テンタム', 'fund'); p = o.page;
    await p.waitForTimeout(17000);
    const ts = await p.textContent('#tS'); const m = /余韻 ([\d.]+) 秒/.exec(ts);
    const note = await p.textContent('#roNote'); const hz = parseFloat(note);
    say(m && Math.abs(+m[1] - T) / T <= 0.15, `余韻 ${T}秒 → 表示 ${m ? m[1] : 'なし'} 秒（実音 ${hz}Hz / 予測 ${tg}Hz）`);
    say(Math.abs(cents(hz, tg)) <= 5, `実音の読み ${Math.abs(cents(hz, tg)).toFixed(1)}¢`);
    await o.browser.close();
  }
  console.log(bad ? 'MIC NG' : 'MIC OK'); process.exit(bad ? 1 : 0);
})();
