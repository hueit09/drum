// パーツごとの「拾いやすさ」を比べるための録音。条件を厳しくしてある
const L = require('./lib'); const SR = 48000;
function mk(sec) { return new Float32Array(Math.floor(SR * sec)); }
function room(b) { L.noise(b, 0.0006); L.hum(b, SR, 100, 0.0015); L.hum(b, SR, 50, 0.0008); }
// 高い側だけの雑音（スナッピーのざわつき、シンバルの残り、人の声の子音にあたる）
function hiss(b, at, amp, dec) { let p = 0; const n = Math.min(b.length - at, Math.floor(SR * dec * 4)); for (let i = 0; i < n; i++) { const w = L.rnd(); const v = w - p; p = w; b[at + i] += amp * v * Math.exp(-i / (SR * dec)); } }
function hissAll(b, amp) { let p = 0; for (let i = 0; i < b.length; i++) { const w = L.rnd(); b[i] += amp * (w - p); p = w; } }
const KP = { parts: [[1, 1, 1], [1.59, 0.5, 0.5], [2.3, 0.3, 0.3]] };
const P = { kick: [69, 0.7, KP, 1.4], snare: [233, 0.6, undefined, 1.2], snb: [320, 0.5, undefined, 1.2], floor: [117, 1.0, undefined, 1.2], tom: [220, 0.9, undefined, 1.2] };
for (const k in P) {
  const [f, t60, parts, gap] = P[k];
  // a) 静かな部屋で、ごく弱いデコピン
  for (const amp of [0.0015, 0.0025, 0.004, 0.006, 0.009, 0.013]) { const b = mk(13); room(b); for (let t = 0.7; t < 12; t += gap) L.hit(b, SR, Math.floor(t * SR), f, amp, t60, parts); L.wav(`ev/${k}_soft${amp}.wav`, b, SR); }
  // b) 高い側がざわついた部屋（人の話し声・シンバルの残り）で、ふつうのデコピン
  for (const nz of [0.01, 0.02]) { const b = mk(13); room(b); hissAll(b, nz); for (let t = 0.7; t < 12; t += gap) L.hit(b, SR, Math.floor(t * SR), f, 0.03, t60, parts); L.wav(`ev/${k}_hiss${nz}.wav`, b, SR); }
  // c) 叩くたびにスナッピーがざわつく
  { const b = mk(13); room(b); for (let t = 0.7; t < 12; t += gap) { L.hit(b, SR, Math.floor(t * SR), f, 0.03, t60, parts); hiss(b, Math.floor(t * SR), 0.03, 0.25); } L.wav(`ev/${k}_buzz.wav`, b, SR); }
  // d) 何も叩かない。高い側の雑音が出たり消えたりする（誤反応の確認）
  { const b = mk(13); room(b); for (let t = 0.7; t < 12; t += 0.9) hiss(b, Math.floor(t * SR), 0.04, 0.08); L.wav(`ev/${k}_nohit.wav`, b, SR); }
}
console.log('ev ok');
