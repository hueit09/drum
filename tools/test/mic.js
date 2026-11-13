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
  say(n205 >= 3 && n220 >= 12 && mid === 0, `追従: 205Hz の表示 ${n205}回 / 220Hz ${n220}回 / どちらでもない値 ${mid}回（全${c.length}打）` + (mid ? ' [' + c.map(x => x.hz).join(' ') + ']' : ''));
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
  // 7) 掴んだ高さの近くだけを拾う：他のラグが測ってあれば、330Hz が強い打でも 220Hz を読む
  const T13 = [{ id: 'kick', kind: 'kick', name: 'キック', dia: 22, dep: 16, lugs: 10, iv: 0, deg: 0 }, { id: 'snare', kind: 'snare', name: 'スネア', dia: 14, dep: 5.5, lugs: 10, iv: 5.4929, deg: 0 },
    { id: 't0', kind: 'tom', name: '', dia: 10, dep: 8, lugs: 6, iv: -3, deg: 0, floor: false }, { id: 't1', kind: 'tom', name: '', dia: 12, dep: 9, lugs: 6, iv: -3, deg: 0, floor: false },
    { id: 't2', kind: 'tom', name: '', dia: 13, dep: 10, lugs: 6, iv: -3, deg: 0, floor: false }, { id: 't3', kind: 'tom', name: '', dia: 16, dep: 16, lugs: 8, iv: -3, deg: 0, floor: true }];
  async function seeded(wavf, meas) {
    const o = await L.open({ wav: wavf, ls: { tuning4: JSON.stringify({ keys: [6], live: 6, mode: 'major', preset: 't13', kitKey: 'p:t13', drums: T13, tid: 't0', thead: 'top', meas }) } });
    const p = o.page; await L.start(p);
    await p.evaluate(() => { window.__c = []; const svg = document.getElementById('svg'); let had = false;
      new MutationObserver(() => { const h = svg.classList.contains('pop'); if (h && !had) { const m = /([\d.]+) Hz/.exec(document.getElementById('roNote').textContent); window.__c.push({ t: performance.now(), hz: m ? +m[1] : 0 }); } had = h; }).observe(svg, { attributes: true, attributeFilter: ['class'] }); });
    await p.click('#svg .lug[data-l="4"]');
    return o;
  }
  o = await seeded(W + 'modeB.wav', { 't0|top': [220, 221, 219, null, null, null] }); p = o.page;
  await p.waitForTimeout(9000); c = await commits(p); errs = c.map(x => Math.abs(cents(x.hz, 220)));
  say(c.length >= 5 && Math.max(...errs) <= 8, `掴んだ高さで読む（他のラグが測定済み・330Hzが強い打）: ${c.length}打、最大誤差 ${errs.length ? Math.max(...errs).toFixed(1) : '-'}¢ [${c.map(x => x.hz).join(' ')}]`);
  say(/に固定中/.test(await p.textContent('#lockB')), '表示: ' + await p.textContent('#lockB'));
  await o.browser.close();
  // 対照：何も測っていない状態で同じ音を流すと、強いほうの 330Hz を読む（＝掴みが効いていた証拠）
  o = await seeded(W + 'modeB.wav', {}); p = o.page;
  await p.waitForTimeout(7000); c = await commits(p);
  say(c.length >= 3 && c.every(x => Math.abs(cents(x.hz, 330)) <= 8), `対照（未測定）: 330Hz を読む [${c.map(x => x.hz).join(' ')}]`);
  await o.browser.close();
  // 8) 最初の素直な打で掴めば、そのあと 330Hz が強くなっても 220Hz のまま
  o = await seeded(W + 'modeAB.wav', {}); p = o.page;
  await p.waitForTimeout(24000); c = await commits(p); errs = c.map(x => Math.abs(cents(x.hz, 220)));
  say(c.length >= 14 && Math.max(...errs) <= 8, `1本目で掴んだ高さを保つ: ${c.length}打、最大誤差 ${errs.length ? Math.max(...errs).toFixed(1) : '-'}¢`);
  // 解除すると、次に読めた音で掴み直す
  await p.click('#lockB'); await p.waitForTimeout(300);
  say(await p.isHidden('#lockB'), 'タップで解除できる');
  await o.browser.close();
  // 8b) 固定したら、範囲の外の音が続いても飛びつかない。勝手に外れもしない
  o = await seeded(W + 'only330.wav', { 't0|top': [220, 221, 219, null, null, null] }); p = o.page;
  await p.waitForTimeout(6500);
  const midMsg = await p.textContent('#mn').catch(() => '');
  const allTxt = await p.evaluate(() => document.getElementById('vTune').innerText);
  await p.waitForTimeout(5500); c = await commits(p);
  say(c.length === 0, `固定中は範囲の外（330Hz）を記録しない: ${c.length}打 [${c.map(x => x.hz).join(' ')}]`);
  say(/固定した高さの近くで読めません/.test(allTxt), '読めない打が続くと外し方を案内する');
  say(/220\.0 Hz に固定中/.test(await p.textContent('#lockB')), '固定は外れない: ' + await p.textContent('#lockB'));
  await p.click('#lockB'); await p.waitForTimeout(300);
  say(await p.isHidden('#lockB'), '案内のとおりタップすると外れる');
  await o.browser.close();
  // 8c) 固定したまま締め上げても追える（半音ずつ 220→294Hz）
  o = await seeded(W + 'climb.wav', { 't0|top': [220, 221, 219, null, null, null] }); p = o.page;
  await p.waitForTimeout(16500); c = await commits(p);
  const lastHz = c.length ? c[c.length - 1].hz : 0;
  say(c.length >= 8 && Math.abs(cents(lastHz, 294)) <= 8, `固定したまま締め上げを追う: ${c.length}打、最後 ${lastHz}Hz [${c.map(x => x.hz).join(' ')}]`);
  await o.browser.close();
  // 9) 太鼓ではない音は記録しない
  for (const [f, nm] of [['voice', '伸ばした声'], ['voiceShort', '短く切った声'], ['guitar', '弾いた弦'], ['whistle', '口笛'], ['clap', '拍手']]) {
    o = await setup(W + f + '.wav', 't13', 'テンタム', 'top'); p = o.page;
    await p.waitForTimeout(9000); c = await commits(p);
    say(c.length === 0, `${nm}：記録 ${c.length}件` + (c.length ? ' [' + c.map(x => x.hz).join(' ') + ']' : ''));
    await o.browser.close();
  }
  // 10) パーツの範囲だけで拾う：弱いデコピン、範囲の外がうるさい部屋、範囲の外の音だけ
  const E = __dirname + '/ev/';
  for (const [f, drum, head, hz, nm, min] of [
    ['kick_soft0.013', 'キック', 'top', 69, 'キック：弱いデコピン', 6],
    ['snare_soft0.009', 'スネア', 'top', 233, 'スネア：弱いデコピン', 6],
    ['floor_soft0.009', 'フロアタム', 'top', 117, 'フロアタム：弱いデコピン', 6],
    ['snb_hiss0.02', 'スネア', 'bot', 320, 'スネア裏：高い側がうるさい部屋', 6],
    ['kick_hiss0.02', 'キック', 'top', 69, 'キック：高い側がうるさい部屋', 6],
    ['tom_buzz', 'テンタム', 'top', 220, 'テンタム：叩くたびにスナッピーがざわつく', 7],
    ['snare_nohit', 'スネア', 'top', 233, '範囲の外の音だけ（叩いていない）', -1],
    ['kick_nohit', 'キック', 'top', 69, '範囲の外の音だけ（キック・叩いていない）', -1]]) {
    o = await setup(E + f + '.wav', 't13', drum, head); p = o.page;
    await p.waitForTimeout(12500); c = await commits(p);
    const good = c.filter(x => Math.abs(cents(x.hz, hz)) <= 15).length;
    if (min < 0) say(c.length === 0, `${nm}：記録 ${c.length}件`);
    else say(good >= min && good === c.length, `${nm}：${c.length}打を記録、うち正しい値 ${good}`);
    say(o.errs.length === 0, 'エラーなし ' + o.errs.join('|'));
    await o.browser.close();
  }
  console.log(bad ? 'MIC NG' : 'MIC OK'); process.exit(bad ? 1 : 0);
})();
