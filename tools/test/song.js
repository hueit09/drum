// 曲から：キー・テンポ（合成の伴奏）と、太鼓ごとの実音（本物のドラム音）を確かめる
const L = require('./lib'); const SR = 44100; const W = __dirname + '/wav/', FX = __dirname + '/fix/'; const fs = require('fs');
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
    for (let q = 0; q < 4; q++) { const a = a0 + Math.floor(q * beat * SR); for (let j = 0; j < 1500 && a + j < b.length; j++) b[a + j] += 0.08 * L.rnd() * Math.exp(-j / 300); }
  }
}
const cents = (a, b) => 1200 * Math.log2(a / b);
(async () => {
  let bad = 0; const say = (ok, s) => { if (!ok) bad++; console.log((ok ? 'ok  ' : 'NG  ') + s); };
  let b = new Float32Array(SR * 64); band(b, 64, 120); L.wav(W + 'songC.wav', b, SR);
  b = new Float32Array(SR * 64); band(b, 60, 100); L.wav(W + 'songD.wav', b, SR);
  const TR = JSON.parse(fs.readFileSync(FX + 'truth.json')).truth;
  const o = await L.open({}); const p = o.page; await L.start(p);
  await L.tab(p, 'kit'); await p.click('#presets [data-pre="t13"]'); await L.tab(p, 'song');
  const read = () => p.evaluate(() => ({ key: document.querySelector('#songRes .big2').childNodes[0].textContent, mode: document.querySelector('#songRes .big2 u').textContent,
    txt: document.getElementById('songRes').innerText.replace(/\n+/g, ' / '),
    rows: [...document.querySelectorAll('#songRes .drow')].map(r => ({ name: r.querySelector('span').textContent, hz: r.querySelector('b') ? parseFloat(r.querySelector('b').textContent) : 0, lug: r.querySelector('u') ? r.querySelector('u').textContent : '' })),
    btns: [...document.querySelectorAll('#songRes .go2')].map(b => b.textContent) }));
  async function run(f, mode, len) {
    await p.click(`#songModes [data-sm="${mode}"]`); if (len) await p.click(`#songLens [data-sl="${len}"]`);
    await p.evaluate(() => { document.getElementById('songRes').hidden = true; });
    await p.setInputFiles('#songFile', f);
    await p.waitForFunction(() => !document.getElementById('songRes').hidden, null, { timeout: 120000 });
    if (await p.locator('#sepGo').count()) { await p.click('#sepGo'); await p.waitForFunction(() => !document.getElementById('songRes').hidden && document.querySelector('#songRes .big2'), null, { timeout: 400000 }); }
    return read();
  }
  // 1) キーとテンポだけ
  let r = await run(W + 'songC.wav', 'off');
  say(r.key === 'E' || r.key === 'C#m', 'E メジャーの曲 → ' + r.key + ' ' + r.mode);
  say(/約 (120|60|240) BPM/.test(r.txt), 'テンポ 120 → ' + (r.txt.match(/約 \d+ BPM/) || ['読めず'])[0]);
  say(r.rows.length === 0 && /読んでいません/.test(r.txt), '「読まない」ではドラムを読まない');
  r = await run(W + 'songD.wav', 'off');
  say(r.key === 'Am' || r.key === 'C', 'A マイナーの曲 → ' + r.key + ' ' + r.mode);
  say((r.key === 'Am') === (r.mode === 'マイナー'), '見出しの長短が合っている：' + r.key + ' ' + r.mode);
  say(/約 (100|50|200) BPM/.test(r.txt), 'テンポ 100 → ' + (r.txt.match(/約 \d+ BPM/) || ['読めず'])[0]);
  // 2) ドラムだけの音源（本物のドラム音、正解あり）
  const near = (hz, list) => Math.min(...list.map(t => Math.abs(cents(hz, t))));
  const chk = (r, label) => {
    const k = r.rows.find(x => x.name === 'キック'), s = r.rows.find(x => x.name === 'スネア'), ts = r.rows.filter(x => /^タム/.test(x.name) && x.hz > 0);
    say(k && k.hz > 0 && near(k.hz, TR.kick) <= 40, `${label} キック ${k ? k.hz : '-'}Hz（正解 ${TR.kick.map(x => x.toFixed(1))}、${k && k.hz ? near(k.hz, TR.kick).toFixed(0) : '-'}¢）`);
    // このスネアは強く鳴る高さが5つある（単体で測った値）。どれかを読めていれば可とする
    const SM = [169.5, 183.6, 197.7, 231.7, 281].map(x => x * TR.snare[0] / 169.5);
    say(s && s.hz > 0 && near(s.hz, SM) <= 40, `${label} スネア ${s ? s.hz : '-'}Hz（このスネアの鳴り方 ${SM.map(x => x.toFixed(0)).join('/')} のどれか、${s && s.hz ? near(s.hz, SM).toFixed(0) : '-'}¢）`);
    const hit = TR.toms.filter(t => ts.some(x => near(x.hz, t) <= 40)).length, wrong = ts.filter(x => !TR.toms.some(t => near(x.hz, t) <= 40)).length;
    return { hit, wrong, ts };
  };
  r = await run(FX + 'drums_only.wav', 'solo', 60);
  let c = chk(r, 'ドラムだけ：');
  say(c.hit >= 3 && c.wrong === 0, `ドラムだけ： タム ${c.hit}/4 を当て、外れ ${c.wrong}本 [${c.ts.map(x => x.hz).join(' ')}]（正解 ${TR.toms.map(x => x[0].toFixed(0)).join(' ')}）`);
  say(r.rows.every(x => !x.hz || /打面 \d+ ／ 裏面 \d+/.test(x.lug)), 'ラグ値が出る：' + (r.rows[0] ? r.rows[0].lug : ''));
  // 3) 分離して読む（伴奏入り）。初回はダウンロードの確認が出る
  const t0 = Date.now();
  r = await run(FX + 'band_mix.wav', 'sep', 30);
  const dt = (Date.now() - t0) / 1000;
  c = chk(r, '分離：');
  say(c.wrong <= 1, `分離： タム ${c.hit}/4 を当て、外れ ${c.wrong}本 [${c.ts.map(x => x.hz).join(' ')}]　（30秒ぶんに ${dt.toFixed(0)}秒）`);
  say(r.btns.includes('取り出したドラムを聴く'), '取り出したドラムを聴ける');
  // 本物の曲（6秒）。ドラム単体を読んだ値：キック 50〜54Hz
  r = await run(FX + 'real_clip.wav', 'sep', 30);
  const k = r.rows.find(x => x.name === 'キック');
  say(k && k.hz >= 49 && k.hz <= 55, '本物の曲（6秒）：分離後のキック ' + (k ? k.hz : '-') + 'Hz（ドラム単体では 50〜54Hz）');
  // 4) この音をレシピにする
  r = await run(FX + 'drums_only.wav', 'solo', 60);
  const want = r.rows.filter(x => x.hz > 0 && x.lug).map(x => parseInt(x.lug.match(/打面 (\d+)/)[1]));
  await p.click('#songRes .go2:text-is("この音をレシピにする")'); await p.waitForTimeout(500);
  const tops = await p.evaluate(() => [...document.querySelectorAll('#cards .card .hr.t .hrv')].map(e => parseInt(e.textContent)));
  say(want.length >= 5 && want.every(v => tops.includes(v)), 'この音をレシピにする → 打面 ' + tops.join(',') + '（読み取り ' + want.join(',') + '）');
  say(/曲から読んだ実音を/.test(await p.textContent('#band')), '帯に「曲から」と出る');
  await p.click('#keySum'); await p.waitForTimeout(350); await p.click('#accs [data-acc="0"]'); await p.click('#keys .k:nth-child(1)');
  const tops2 = await p.evaluate(() => [...document.querySelectorAll('#cards .card .hr.t .hrv')].map(e => parseInt(e.textContent)));
  say(tops2.join() === tops.join(), 'キーを変えても、曲から入れた太鼓は動かない');
  await p.click('#fxOff'); await p.waitForTimeout(200);
  const tops3 = await p.evaluate(() => [...document.querySelectorAll('#cards .card .hr.t .hrv')].map(e => parseInt(e.textContent)));
  say(tops3.join() !== tops.join() && !/曲から読んだ/.test(await p.textContent('#band')), '「外して基準レシピに戻す」→ ' + tops3.join(','));
  // 5) 壊れたファイル
  await L.tab(p, 'song'); fs.writeFileSync(W + 'bad.wav', 'not audio');
  await p.setInputFiles('#songFile', W + 'bad.wav'); await p.waitForTimeout(1500);
  say(/読み込めません|読めません/.test(await p.textContent('#songMsg')), '壊れたファイル → ' + (await p.textContent('#songMsg')).slice(0, 30));
  say(o.errs.length === 0, 'エラーなし ' + o.errs.join('|')); await o.browser.close();
  console.log(bad ? 'SONG NG' : 'SONG OK'); process.exit(bad ? 1 : 0);
})();
