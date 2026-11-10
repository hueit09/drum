// 通し操作：実際に押して回り、機能ごとに結果を確かめる
const L = require('./lib'); const W = __dirname + '/wav/';
let bad = 0; const say = (ok, s) => { if (!ok) bad++; console.log((ok ? 'ok  ' : 'NG  ') + s); };
const popWatch = p => p.evaluate(() => { window.__n = 0; window.__r = 0; const svg = document.getElementById('svg'); let had = false; new MutationObserver(() => { const h = svg.classList.contains('pop'); if (h && !had) window.__n++; had = h; }).observe(svg, { attributes: true, attributeFilter: ['class'] });
  const g = AnalyserNode.prototype.getFloatTimeDomainData; AnalyserNode.prototype.getFloatTimeDomainData = function (b) { window.__r++; return g.call(this, b); }; });
const reads = p => p.evaluate(() => { const r = window.__r; window.__r = 0; return r; });
const pops = p => p.evaluate(() => window.__n);
const T = (p, s) => p.textContent(s);
(async () => {
  // ───── マイクあり ─────
  let o = await L.open({ wav: W + 'tom220.wav' }); let p = o.page; await L.start(p);
  await L.tab(p, 'kit'); await p.click('#presets [data-pre="t13"]'); await L.tab(p, 'tune');
  await p.click('#drums button:text-is("テンタム")'); await popWatch(p);
  await p.waitForTimeout(3500);
  say(await pops(p) >= 2, 'チューナー：叩くと読む ' + await pops(p) + '打');
  say((await p.getAttribute('#nxt', 'opacity')) === '0.95', '合ったら次のラグに点線の輪が出る');
  // レシピ → 行をタップしてチューナーへ。マイクが生きているか
  await L.tab(p, 'recipe'); await p.waitForTimeout(600);
  let n0 = await pops(p); await reads(p);
  await p.waitForTimeout(2500);
  say(await pops(p) === n0 && await reads(p) === 0, 'レシピを見ている間はマイクを読まない');

  await p.click('#cards .card:nth-child(3) .hr.b');           // テンタムの裏面
  await p.waitForTimeout(4000);
  say(await p.getAttribute('.tab[data-v="tune"]', 'aria-pressed') === 'true' && await p.getAttribute('#heads [data-head="bot"]', 'aria-pressed') === 'true', 'レシピの行から、その面のチューナーへ移る');
  let rd = await reads(p);
  say(await pops(p) - n0 >= 2 && rd > 100, 'レシピから入ったあともマイクが動いている（以前は止まっていた） ' + (await pops(p) - n0) + '打 / 読み取り ' + rd + '回');
  await L.tab(p, 'recipe'); n0 = await pops(p);
  await p.click('#cards .card:nth-child(3) .cf .go'); await p.waitForTimeout(3500);
  rd = await reads(p);
  say(await pops(p) - n0 >= 2 && rd > 100, '「合わせる」から入ってもマイクが動いている ' + (await pops(p) - n0) + '打 / 読み取り ' + rd + '回');
  // 目標音を鳴らしている間は読まない
  await p.click('#roDev'); await p.waitForTimeout(700); n0 = await pops(p);
  say(await p.evaluate(() => document.getElementById('roDev').classList.contains('ring')), '中央の数字で目標音が鳴る');
  await p.waitForTimeout(3500);
  say(await pops(p) === n0, '目標音を鳴らしている間は読まない（以前は読んでしまっていた） +' + (await pops(p) - n0));
  await p.click('#roDev'); await p.waitForTimeout(3500);
  say(await pops(p) - n0 >= 1, '止めると読み取りが戻る +' + (await pops(p) - n0));
  // 自動送りで全ラグを埋める → 次へ
  await p.click('.opt summary'); await p.waitForTimeout(400); await p.click('#advs [data-adv="auto"]');
  await p.waitForFunction(() => !document.getElementById('nextB').hidden, null, { timeout: 20000 }).catch(() => { });
  say(await T(p, '#nextB') === '裏面へ進む', '打面が揃うと「' + await T(p, '#nextB') + '」が出る');
  await p.click('#nextB'); await p.waitForTimeout(300);
  say(await p.getAttribute('#heads [data-head="bot"]', 'aria-pressed') === 'true', '押すと裏面へ');
  await p.click('#advs [data-adv="manual"]');
  // キットごとの測定値
  await L.tab(p, 'recipe');
  const cnt = () => p.evaluate(() => document.querySelector('#cards .card:nth-child(3) .hr.t .hrc').textContent);
  say(await cnt() === '6 / 6 ラグ', '13"構成のテンタム打面：' + await cnt());
  await L.tab(p, 'kit'); await p.click('#presets [data-pre="heritage"]'); await L.tab(p, 'recipe');
  say(await cnt() === '0 / 8 ラグ', 'Heritage に替えると測定値は空：' + await cnt());
  await L.tab(p, 'kit'); await p.click('#presets [data-pre="t13"]'); await L.tab(p, 'recipe');
  say(await cnt() === '6 / 6 ラグ', '13"構成に戻すと測定値が戻る：' + await cnt());
  await p.reload(); await L.start(p); await L.tab(p, 'recipe');
  say(await cnt() === '6 / 6 ラグ', '開き直しても残っている：' + await cnt());
  say(o.errs.length === 0, 'エラーなし ' + o.errs.join(' | ')); await o.browser.close();

  // ───── マイクなし（手入力） ─────
  o = await L.open({}); p = o.page; await L.start(p);
  say(await p.isHidden('#tIn') && !(await p.isHidden('#mn')) && /手で入力/.test(await T(p, '#guide')), 'マイクが無いと案内が出る。手入力はオプションの中');
  await p.click('.opt summary'); await p.waitForTimeout(400);
  say(!(await p.isHidden('#tIn')), 'オプションを開くと手入力欄がある');
  await p.fill('#tIn', '175'); await p.waitForTimeout(800);
  say(await T(p, '#roAct') === '合致', '手入力 175 → ' + await T(p, '#roAct'));
  await p.click('#svg .lug[data-l="3"]'); await p.waitForTimeout(100);
  say(await p.inputValue('#tIn') === '', 'ラグを替えると入力欄が空になる');
  await p.fill('#tIn', '180'); await p.press('#tIn', 'Enter'); await p.waitForTimeout(100);
  say(await T(p, '#roAct') === 'ゆるめる', '180 → ' + await T(p, '#roAct'));
  say(/ゆるめる/.test(await T(p, '#guide')) && /反時計回り/.test(await T(p, '#guide')) && await p.getAttribute('#turn', 'opacity') === '1' && /scale\(-1,1\)/.test(await p.getAttribute('#turn', 'transform')), '案内と矢印が「反時計回りにゆるめる」を示す：' + (await T(p, '#guide')).replace(/\s+/g, ' '));
  await p.fill('#tIn', '168'); await p.press('#tIn', 'Enter'); await p.waitForTimeout(100);
  say(/しめる/.test(await T(p, '#guide')) && /時計回り/.test(await T(p, '#guide')) && !/scale/.test(await p.getAttribute('#turn', 'transform')), '低いときは「時計回りにしめる」：' + (await T(p, '#guide')).replace(/\s+/g, ' '));
  await p.fill('#tIn', '175'); await p.press('#tIn', 'Enter'); await p.waitForTimeout(100);
  say(/合いました/.test(await T(p, '#guide')) && await p.getAttribute('#turn', 'opacity') === '0', '合うと矢印が消える：' + (await T(p, '#guide')).replace(/\s+/g, ' '));
  // ラグ数をその場で変える
  await p.click('#tLug'); await p.click('#tEdUp'); await p.click('#tEdOk');
  say(await p.locator('#svg .lug').count() === 7 && await T(p, '#tLug') === '7 ラグ', 'ラグ数チップで 6→7');
  await p.click('#tLug'); await p.click('#tEdDn'); await p.click('#tEdOk');
  await p.click('#tDia'); await p.click('#tEdUp'); await p.click('#tEdOk');
  say(/13"/.test(await T(p, '#tDia')), '口径チップで 12→13');
  await p.click('#tDia'); await p.click('#tEdDn'); await p.click('#tEdOk');
  // 実音 → 次のドラムへ
  await p.click('#heads [data-head="fund"]'); await p.fill('#tIn', '138'); await p.press('#tIn', 'Enter');
  say(/次のドラムへ/.test(await T(p, '#nextB')), '実音を入れると「' + await T(p, '#nextB') + '」');
  await p.click('#tClr');
  say(await p.isHidden('#nextB') && await p.inputValue('#tIn') === '', 'クリアで消える');
  // キー
  await L.tab(p, 'recipe'); await p.click('#keySum'); await p.waitForTimeout(400);
  await p.click('#accs [data-acc="0"]'); await p.click('#keys .k:nth-child(3)');
  say((await T(p, '#keySum')).trim() === 'E', 'キーを替えても比較に積まれない：' + (await T(p, '#keySum')).trim());
  await p.click('#pinB'); await p.click('#accs [data-acc="-1"]'); await p.click('#keys .k:nth-child(5)');
  say(/G♭.*比較 2キー/.test(await T(p, '#keySum')) && !(await p.isHidden('#cmpWrap')), '「比較に残す」で比較表が出る：' + (await T(p, '#keySum')).trim());
  await p.click('#picked .pk button'); 
  say(await p.isHidden('#cmpWrap'), '× で比較から外れる');
  await p.click('#modes [data-mode="free"]');
  say(await T(p, '#cards .card .hrv') === '—' && await p.isHidden('#band'), '指定なし：値を出さない');
  await p.click('#modes [data-mode="major"]');
  // タムの高さ：低め・真ん中・高め
  const tomTops = () => p.evaluate(() => [...document.querySelectorAll('#cards .card')].filter(c => c.querySelector('.badge.tom')).map(c => parseInt(c.querySelector('.hr.t .hrv').textContent)));
  const mid = await tomTops();
  say(await p.getAttribute('#hgts [data-hgt="0"]', 'aria-pressed') === 'true', 'タムの高さは「真ん中」から始まる');
  await p.click('#hgts [data-hgt="1"]'); const hi = await tomTops();
  await p.click('#hgts [data-hgt="-1"]'); const lo = await tomTops();
  say(hi.every((v, i) => v > mid[i]) && lo.every((v, i) => v < mid[i]), `高め ${hi.join('/')} ＞ 真ん中 ${mid.join('/')} ＞ 低め ${lo.join('/')}`);
  say(/→/.test(await T(p, '#hgts [data-hgt="1"] small')), '各ボタンに実音の範囲が出る：' + await T(p, '#hgts [data-hgt="1"] small'));
  await p.click('#hgts [data-hgt="0"]');
  say((await tomTops()).join() === mid.join(), '真ん中に戻すと元の値');
  // 音作りの輪
  await p.click('#cards .card:nth-child(3) .rbtn'); await p.waitForTimeout(350);
  say(!(await p.isHidden('#wheelSheet')), '輪が開く');
  const top0 = await T(p, '#cards .card:nth-child(3) .hr.t .hrv');
  const bx = await p.locator('#whSvg').boundingBox();
  await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height * (120 - 79) / 240); await p.mouse.down(); await p.mouse.move(bx.x + bx.width * 0.8, bx.y + bx.height * 0.4, { steps: 5 }); await p.mouse.up();
  say(await T(p, '#cards .card:nth-child(3) .hr.t .hrv') !== top0, '輪を回すと表裏の開きが変わる ' + top0 + ' → ' + await T(p, '#cards .card:nth-child(3) .hr.t .hrv'));
  await p.keyboard.press('Escape'); say(await p.isHidden('#wheelSheet'), 'Esc で閉じる');
  // キット
  await L.tab(p, 'kit');
  await p.click('#voices [data-voice="base"]');
  await p.click('#tomUp'); say(await T(p, '#tomN') === '4 本', 'タムを増やす');
  await p.click('#tomDn'); say(await T(p, '#tomN') === '3 本', 'タムを減らす');
  await p.fill('#mkName', 'テスト'); await p.click('#mkSave'); await p.waitForTimeout(100);
  say(await p.locator('#mkSaved .kitchip').count() === 1, 'キットを保存');
  await p.click('#mkSaved .kx'); say(await p.locator('#mkSaved .kitchip').count() === 1 && await T(p, '#mkSaved .kx') === '消す', '× 1回目では消えない');
  await p.click('#mkSaved .kx'); say(await p.locator('#mkSaved .kitchip').count() === 0, '2回目で消える');
  await p.click('#kExp'); say(/TAUT v1.0/.test(await p.inputValue('#kOut')), '書き出し');
  await p.click('#kTsv'); say(/日時\t端末/.test(await p.inputValue('#kOut')), '表計算用の書き出し');
  // 配色
  await p.click('#thm [data-thm="dark"]'); await L.tab(p, 'tune');
  const rim = await p.evaluate(() => [document.getElementById('rim').getAttribute('stroke').toLowerCase(), getComputedStyle(document.documentElement).getPropertyValue('--rim').trim().toLowerCase()]);
  say(rim[0] === rim[1], 'ダークに替えるとヘッドの絵も描き直される');
  // セットリスト
  await L.tab(p, 'song');
  for (const i of [6, 4, 13]) { await p.selectOption('#slPick', { index: i }); await p.click('#slAdd'); }
  say(await p.locator('#slList .slchip').count() === 3 && !(await p.isHidden('#slRes')), 'セットリスト3曲 → 提案 ' + await T(p, '#slRes .shead2 b'));
  await p.fill('#slName', '本番'); await p.click('#slSave'); await p.click('#slClr'); await p.click('#slSaved .nm');
  say(await p.locator('#slList .slchip').count() === 3, 'セットリストの保存と呼び戻し');
  await p.click('#slRes .go2'); say(await p.getAttribute('.tab[data-v="recipe"]', 'aria-pressed') === 'true', '「で張る」でレシピへ');
  await L.tab(p, 'doc'); await p.click('#vDoc details:first-child summary'); await p.waitForTimeout(400);
  say(/この版　\d{8}-\d{6}/.test(await T(p, '#buildSt')), '説明に版が出る：' + await T(p, '#buildSt'));
  say(o.errs.length === 0, 'エラーなし ' + o.errs.join(' | ')); await o.browser.close();

  // ───── 壊れた保存データでも起動する ─────
  const good = { keys: [6], live: 6, mode: 'major', drums: [{ id: 'kick', kind: 'kick', name: 'キック', dia: 22, dep: 16, lugs: 10, iv: 0, deg: 0 }, { id: 'snare', kind: 'snare', name: 'スネア', dia: 14, dep: 5.5, lugs: 10, iv: 5.4929, deg: 0 }, { id: 't0', kind: 'tom', name: '', dia: 12, dep: 9, lugs: 6, iv: -3, deg: 0 }] };
  const cases = { '文字列': '"abc"', '途中で切れた': '{"keys":[6],"dri', 'null': 'null', '配列': '[]',
    'drumsが変': JSON.stringify({ ...good, drums: [1, 2, 3] }), '口径が文字': JSON.stringify({ ...good, drums: good.drums.map(d => ({ ...d, dia: 'x' })) }),
    'キック無し': JSON.stringify({ ...good, drums: good.drums.filter(d => d.kind !== 'kick').concat(good.drums[2], { ...good.drums[2], id: 't9' }) }),
    'measが配列': JSON.stringify({ ...good, meas: [1, 2] }), 'bankが変': JSON.stringify({ ...good, bank: { a: 1, b: { meas: 3 } }, pins: ['x', 99], myKits: [{ name: 'x', drums: 'no' }, null], saved: [{ name: 1 }], setlist: [{ pc: 40 }] }),
    '巨大な値': JSON.stringify({ ...good, drums: good.drums.map(d => ({ ...d, dia: 1e9, lugs: 500, iv: 1e9, deg: 1e9 })), sensT: 1e9, ser: 99, tid: 'zzz', thead: 'q', view: 'nope' }),
    '旧版(keys複数・serAuto)': JSON.stringify({ ...good, keys: [4, 6], live: 4, serAuto: false, ser: 1, preset: 'std', meas: { 't0|top': [175, 176, null, 174, 175, 175], 't0|fund': 100 } }) };
  for (const k in cases) {
    o = await L.open({ ls: { tuning4: cases[k] } }); p = o.page; let ok = true, why = '';
    try {
      await L.start(p);
      for (const v of ['recipe', 'tune', 'kit', 'song', 'doc']) await L.tab(p, v);
      await L.tab(p, 'recipe');
      const n = await p.locator('#cards .card').count(); const hz = await T(p, '#cards .card:nth-child(3) .hr.t .hrv');
      if (n < 3 || !/^\d+Hz$/.test(hz)) { ok = false; why = 'cards ' + n + ' top ' + hz; } else why = n + '台 ' + hz;
    } catch (e) { ok = false; why = String(e).slice(0, 80); }
    if (o.errs.length) { ok = false; why += ' ' + o.errs.join('|'); }
    say(ok, '壊れた保存データ「' + k + '」→ ' + why); await o.browser.close();
  }
  console.log(bad ? 'FLOW NG ' + bad : 'FLOW OK'); process.exit(bad ? 1 : 0);
})();
