const L = require('./lib'); const SR = 48000;
function mk(sec) { return new Float32Array(Math.floor(SR * sec)); }
function room(b) { L.noise(b, 0.0006); L.hum(b, SR, 100, 0.0015); L.hum(b, SR, 50, 0.0008); }
// タム：デコピン程度の小さい音。1.2秒おき
let b = mk(12); room(b); for (let t = 0.6; t < 11.5; t += 1.2) L.hit(b, SR, Math.floor(t * SR), 220, 0.045, 0.9); L.wav('wav/tom220.wav', b, SR);
b = mk(12); room(b); for (let t = 0.6; t < 11.5; t += 1.2) L.hit(b, SR, Math.floor(t * SR), 147, 0.045, 0.9); L.wav('wav/tom147.wav', b, SR);
// キック：低い。空調のハムが近い
b = mk(14); room(b); for (let t = 0.7; t < 13; t += 1.4) L.hit(b, SR, Math.floor(t * SR), 69, 0.07, 0.7, { parts: [[1, 1, 1], [1.59, 0.5, 0.5], [2.3, 0.3, 0.3]] }); L.wav('wav/kick69.wav', b, SR);
// 途中でボルトを回した想定：205Hz を6打 → 220Hz を6打
// 2打だけ205Hz、あとの8打は220Hz。直近5打の中央値のままだと、205は一度も表示に出てこない
b = mk(12.5); room(b); for (let i = 0; i < 10; i++) L.hit(b, SR, Math.floor((0.6 + i * 1.2) * SR), i < 2 ? 205 : 220, 0.045, 0.9); L.wav('wav/change.wav', b, SR);
// にぎやかな部屋：前半8秒は雑音だけ、後半に強めの打撃
b = mk(18); L.noise(b, 0.022); L.hum(b, SR, 100, 0.004); for (let t = 9; t < 17.5; t += 1.2) L.hit(b, SR, Math.floor(t * SR), 220, 0.35, 0.9); L.wav('wav/noisy.wav', b, SR);
// 静かな部屋で何も叩かない（空調だけ）
b = mk(10); room(b); L.wav('wav/idle.wav', b, SR);
// 別の倍音（1.5倍＝330Hz）のほうが強く鳴る打。掴んでいなければ 330 と読んでしまう
const PB = { parts: [[1, 0.55, 1], [1.5, 1.0, 1], [2.14, 0.2, 0.4]] };
b = mk(12); room(b); for (let t = 0.6; t < 11.5; t += 1.2) L.hit(b, SR, Math.floor(t * SR), 220, 0.05, 0.9, PB); L.wav('wav/modeB.wav', b, SR);
// 最初の3打は素直、あとは 330 が強い
b = mk(12); room(b); for (let i = 0; i < 10; i++) L.hit(b, SR, Math.floor((0.6 + i * 1.2) * SR), 220, 0.05, 0.9, i < 3 ? undefined : PB); L.wav('wav/modeAB.wav', b, SR);
// 固定の検証用：330Hz だけの打（固定した 220Hz の範囲の外）と、半音ずつ上がっていく打（締め上げ）
b = mk(12); room(b); for (let t = 0.6; t < 11.5; t += 1.2) L.hit(b, SR, Math.floor(t * SR), 330, 0.05, 0.9); L.wav('wav/only330.wav', b, SR);
b = mk(15.5); room(b); [220, 233, 233, 247, 247, 262, 262, 277, 277, 294, 294, 294].forEach((f, i) => L.hit(b, SR, Math.floor((0.6 + i * 1.2) * SR), f, 0.05, 0.9)); L.wav('wav/climb.wav', b, SR);
// 太鼓ではない音。どれも 220Hz 前後で、音程としては読めてしまうもの
function harm(b, at, f, amp, dur, dec, vib) { const n = Math.min(b.length - at, Math.floor(SR * dur)); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * f * (1 + (vib ? 0.012 * Math.sin(2 * Math.PI * 5.5 * t) : 0)) / SR; let v = 0; for (let k = 1; k <= 8; k++) v += Math.sin(k * ph) / k; const env = Math.min(1, t / 0.012) * Math.min(1, (n - i) / (SR * 0.03)) * (dec ? Math.exp(-6.908 * t / dec) : 1); b[at + i] += amp * 0.5 * v * env; } }
b = mk(12); room(b); for (let t = 0.6; t < 11; t += 1.3) harm(b, Math.floor(t * SR), 215, 0.06, 0.45, 0, true); L.wav('wav/voice.wav', b, SR);          // 伸ばした声
b = mk(12); room(b); for (let t = 0.6; t < 11; t += 0.9) harm(b, Math.floor(t * SR), 225, 0.06, 0.13, 0, false); L.wav('wav/voiceShort.wav', b, SR);   // 短く切った声
b = mk(12); room(b); for (let t = 0.6; t < 11; t += 1.3) harm(b, Math.floor(t * SR), 220, 0.07, 1.2, 1.6, false); L.wav('wav/guitar.wav', b, SR);       // 弾いた弦
b = mk(12); room(b); for (let t = 0.6; t < 11; t += 1.3) { const a = Math.floor(t * SR), n = Math.floor(SR * 0.5); for (let i = 0; i < n; i++) b[a + i] += 0.05 * Math.sin(2 * Math.PI * 220 * i / SR) * Math.min(1, i / 500) * Math.min(1, (n - i) / 1500); } L.wav('wav/whistle.wav', b, SR);   // 口笛
b = mk(12); room(b); for (let t = 0.6; t < 11; t += 1.1) { const a = Math.floor(t * SR); for (let i = 0; i < 3000; i++) b[a + i] += 0.2 * L.rnd() * Math.exp(-i / 500); } L.wav('wav/clap.wav', b, SR);   // 拍手
console.log('wav ok');
