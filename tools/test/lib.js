// 共通：ページを開く・WAVを作る
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL0 = process.env.TAUT_URL || 'http://127.0.0.1:8765/index.html';
function wav(file, samples, sr) {
  const n = samples.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { let v = Math.max(-1, Math.min(1, samples[i])); b.writeInt16LE(Math.round(v * 32767), 44 + i * 2); }
  fs.writeFileSync(file, b);
}
let seed = 12345;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; }
// 膜っぽい1打：基音＋非整数倍音＋アタックの雑音
function hit(buf, sr, at, f, amp, t60, opt) {
  opt = opt || {};
  const parts = opt.parts || [[1, 1, 1], [1.59, 0.35, 0.45], [2.14, 0.22, 0.35], [2.65, 0.12, 0.25]];
  const n = Math.min(buf.length - at, Math.floor(sr * Math.max(0.4, t60 * 1.3)));
  for (let i = 0; i < n; i++) {
    const t = i / sr; let v = 0;
    for (const p of parts) v += p[1] * Math.sin(2 * Math.PI * f * p[0] * t) * Math.exp(-6.908 * t / (t60 * p[2]));
    v += 0.5 * rnd() * Math.exp(-t / 0.004);
    const att = Math.min(1, t / 0.002);
    buf[at + i] += amp * v * att;
  }
}
function noise(buf, amp) { for (let i = 0; i < buf.length; i++) buf[i] += amp * rnd(); }
function hum(buf, sr, f, amp) { for (let i = 0; i < buf.length; i++) buf[i] += amp * Math.sin(2 * Math.PI * f * i / sr); }
async function open(opts) {
  opts = opts || {};
  const args = ['--autoplay-policy=no-user-gesture-required'];
  if (opts.wav) args.push('--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-audio-capture=' + opts.wav);
  const browser = await chromium.launch({ args });
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 390, height: 844 }, deviceScaleFactor: opts.dsf || 1,
    colorScheme: opts.scheme || 'light', serviceWorkers: 'block', hasTouch: true, isMobile: true,
    permissions: opts.wav ? ['microphone'] : [],
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  if (opts.ls) await page.addInitScript(v => { try { for (const k in v) localStorage.setItem(k, v[k]); } catch (e) { } }, opts.ls);
  await page.goto(URL0, { waitUntil: 'load' });
  return { browser, ctx, page, errs };
}
async function start(page) {   // 起動画面を抜ける
  await page.click('#btnStart');
  await page.waitForTimeout(300);
  if (await page.locator('#btnStart').isVisible().catch(() => false)) {
    const t = await page.textContent('#btnStart');
    if (/手入力/.test(t)) await page.click('#btnStart');
  }
  await page.waitForFunction(() => document.getElementById('splash').hidden, null, { timeout: 5000 });
}
async function tab(page, v) { await page.click('.tab[data-v="' + v + '"]'); await page.waitForTimeout(350); }
module.exports = { chromium, wav, hit, noise, hum, rnd, open, start, tab, fs, path };
