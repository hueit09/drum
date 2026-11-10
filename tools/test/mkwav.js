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
console.log('wav ok');
