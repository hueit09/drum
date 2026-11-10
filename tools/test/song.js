// 曲から：正解の分かる合成音源を読み込ませる
const L = require('./lib'); const SR = 44100; const W = __dirname + '/wav/';
const SER = [174.2935, 138.3474, 116.4761, 92.6013, 77.6338, 61.8223, 51.9884];
function drums(b, shift, ser, bpm) {
  const o = Math.pow(2, shift / 12), beat = 60 / bpm, kick = (ser <= 1 ? 40.1797 : 39.8372) * o, sn = 157.6494 * o;
  const toms = [0, 1, 2, 3].map(i => SER[ser + i] * o);
  const n = Math.floor(b.length / SR / beat);
  for (let i = 0; i < n; i++) {
    const at = Math.floor(i * beat * SR), bar = Math.floor(i / 4), q = i % 4;
    if (bar % 4 === 3 && q >= 2) {          // フィル：タムを上から
      for (let k = 0; k < 2; k++) L.hit(b, SR, at + Math.floor(k * beat / 2 * SR), toms[(q - 2) * 2 + k], 0.5, 0.7);
    } else if (q % 2 === 0) L.hit(b, SR, at, kick, 0.8, 0.35, { parts: [[1, 1, 1], [1.59, 0.3, 0.4]] });
    else L.hit(b, SR, at, sn, 0.5, 0.25, { parts: [[1, 1, 1], [1.59, 0.4, 0.5], [2.14, 0.3, 0.4]] });
    // ハイハット
    for (let k = 0; k < 2; k++) { const a = at + Math.floor(k * beat / 2 * SR); for (let j = 0; j < 1500 && a + j < b.length; j++) b[a + j] += 0.05 * L.rnd() * Math.exp(-j / 300); }
  }
}
function band(b, rootMidi, bpm) {   // I–V–vi–IV のコードとベース
  const beat = 60 / bpm, prog = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]];
  const n = Math.floor(b.length / SR / (beat * 4));
  for (let i = 0; i < n; i++) {
    const ch = prog[i % 4], a0 = Math.floor(i * beat * 4 * SR), len = Math.floor(beat * 4 * SR);
    for (let j = 0; j < len && a0 + j < b.length; j++) {
      const t = j / SR, env = Math.min(1, t / 0.02) * Math.min(1, (len - j) / 2000); let v = 0;
      for (const s of ch) { const f = 440 * Math.pow(2, (rootMidi + s - 69) / 12); v += Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t); }
      const fb = 440 * Math.pow(2, (rootMidi + ch[0] - 24 - 69) / 12);
      b[a0 + j] += env * (0.035 * v + 0.12 * Math.sin(2 * Math.PI * fb * t));
    }
  }
}
(async () => {
  let bad = 0; const say = (ok, s) => { if (!ok) bad++; console.log((ok ? 'ok  ' : 'NG  ') + s); };
  // A: ドラムだけ、G♭（13"構成のレシピそのもの）
  let b = new Float32Array(SR * 64); drums(b, 0, 2, 112); L.wav(W + 'songA.wav', b, SR);
  // B: ドラムだけ、E
  b = new Float32Array(SR * 64); drums(b, -2, 1, 96); L.wav(W + 'songB.wav', b, SR);
  // C: バンド入り、E メジャー
  b = new Float32Array(SR * 64); drums(b, -2, 1, 120); band(b, 64, 120); L.wav(W + 'songC.wav', b, SR);
  // D: バンド入り、A マイナー（→ C と同じ張り方）
  b = new Float32Array(SR * 64); drums(b, 6, 2, 100); band(b, 60, 100); L.wav(W + 'songD.wav', b, SR);
  const o = await L.open({}); const p = o.page; await L.start(p);
  await L.tab(p, 'kit'); await p.click('#presets [data-pre="t13"]'); await L.tab(p, 'song');
  async function run(f, only) {
    if ((await p.isChecked('#songDrums')) !== only) await p.click('.dchk');
    await p.setInputFiles('#songFile', W + f);
    await p.waitForFunction(() => !document.getElementById('songRes').hidden, null, { timeout: 120000 });
    return p.evaluate(() => ({ key: document.querySelector('#songRes .big2').childNodes[0].textContent, mode: document.querySelector('#songRes .big2 u').textContent, txt: document.getElementById('songRes').innerText.replace(/\n+/g, ' / '), btns: [...document.querySelectorAll('#songRes .go2')].map(b => b.textContent) }));
  }
  let r = await run('songA.wav', true);
  say(r.key === 'G♭' && r.mode === 'メジャー' && r.btns.some(x => /G♭ でこのレシピにする/.test(x)), 'ドラムだけ G♭ → ' + r.key + ' ' + r.mode + ' ｜ ' + r.btns.join('、'));
  await p.click('#songRes .go2:text("でこのレシピにする")'); await p.waitForTimeout(400);
  let v = await p.evaluate(() => [...document.querySelectorAll('#cards .card')].map(c => parseInt(c.querySelector('.hr.t .hrv').textContent)).join(','));
  say(v === '69,233,220,175,147,117', '「このレシピにする」→ ' + v);
  await L.tab(p, 'song');
  r = await run('songB.wav', true);
  say(r.key === 'E' && r.btns.some(x => /E でこのレシピにする/.test(x)), 'ドラムだけ E → ' + r.key + ' ｜ ' + r.btns.join('、'));
  await p.click('#songRes .go2:text("でこのレシピにする")'); await p.waitForTimeout(400);
  v = await p.evaluate(() => [...document.querySelectorAll('#cards .card')].map(c => parseInt(c.querySelector('.hr.t .hrv').textContent)).join(','));
  say(v === '62,208,233,196,156,131', '「このレシピにする」→ ' + v);
  await L.tab(p, 'song');
  r = await run('songC.wav', false);
  say(r.key === 'E' || r.key === 'C#m', 'バンド入り E メジャー → ' + r.key + ' ' + r.mode + '（' + (r.txt.match(/テンポ \/ 約 \d+ BPM/) || [''])[0] + '）');
  say(/約 (120|60|240) BPM/.test(r.txt), 'テンポ 120 → ' + (r.txt.match(/約 \d+ BPM/) || ['読めず'])[0]);
  r = await run('songD.wav', false);
  say(r.key === 'Am' || r.key === 'C', 'バンド入り A マイナー → ' + r.key + ' ' + r.mode);
  say(/約 (100|50|200) BPM/.test(r.txt), 'テンポ 100 → ' + (r.txt.match(/約 \d+ BPM/) || ['読めず'])[0]);
  say((r.key === 'Am') === (r.mode === 'マイナー'), '見出しの長短が合っている：' + r.key + ' ' + r.mode);
  // セットリストに自動で並ぶ
  say(await p.locator('#slList .slchip').count() >= 3, 'セットリストに自動で追加 ' + await p.locator('#slList .slchip').count() + '曲');
  // 読めないファイル
  require('fs').writeFileSync(W + 'bad.wav', 'not audio');
  await p.setInputFiles('#songFile', W + 'bad.wav'); await p.waitForTimeout(1500);
  say(/読み込めません|読めません/.test(await p.textContent('#songMsg')), '壊れたファイル → ' + (await p.textContent('#songMsg')).slice(0, 30));
  say(o.errs.length === 0, 'エラーなし ' + o.errs.join('|')); await o.browser.close();
  console.log(bad ? 'SONG NG' : 'SONG OK'); process.exit(bad ? 1 : 0);
})();
