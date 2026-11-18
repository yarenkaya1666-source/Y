// Render the reel: parallel Playwright frame capture -> x264 segments -> concat + audio mix.
// Usage: node render.js [outDir] [workers]
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'out'));
const WORKERS = +(process.argv[3] || 3);
const FPS = 30;
fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(OUT, 'tmp'); fs.mkdirSync(TMP, { recursive: true });

function run(cmd, args) { execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] }); }

async function renderChunk(browser, idx, f0, f1) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  const seg = path.join(TMP, `seg${idx}.mp4`);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), seg],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  for (let f = f0; f < f1; f++) {
    await page.evaluate(t => renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 150 === 0) console.log(`worker ${idx}: frame ${f - f0}/${f1 - f0}`);
  }
  ff.stdin.end();
  await done;
  await page.close();
  return seg;
}

// ---- SFX synthesis ----
const SFXDEF = {
  pop: ['0.6*sin(2*PI*(700-2600*t)*t)*exp(-28*t)', 0.14],
  ding: ['0.35*sin(2*PI*1318*t)*exp(-5*t)+0.22*sin(2*PI*1976*t)*exp(-7*t)+0.1*sin(2*PI*2637*t)*exp(-9*t)', 0.8],
  whoosh: ['0.5*(random(0)*2-1)*pow(sin(PI*t/0.45),2)', 0.45],
  stamp: ['0.9*sin(2*PI*(140-260*t)*t)*exp(-16*t)+0.25*(random(0)*2-1)*exp(-60*t)', 0.3],
  coin: ['0.3*sin(2*PI*1975*t)*exp(-14*t)+0.32*gt(t,0.075)*sin(2*PI*2637*(t-0.075))*exp(-9*(t-0.075))', 0.55],
};
function makeSfx() {
  for (const [k, [expr, d]] of Object.entries(SFXDEF)) {
    const extra = k === 'whoosh' ? ['-af', 'bandpass=f=1400:w=1800,volume=2'] : [];
    run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `aevalsrc='${expr}':s=44100:d=${d}`, ...extra, path.join(TMP, `${k}.wav`)]);
  }
}
function rumble(d, i) {
  const f = path.join(TMP, `rumble${i}.wav`);
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anoisesrc=c=brown:a=0.6:d=${d.toFixed(2)}:r=44100`,
    '-af', `lowpass=f=260,tremolo=f=11:d=0.5,afade=t=in:d=0.15,afade=t=out:st=${Math.max(0, d - 0.3).toFixed(2)}:d=0.3,volume=1.6`, f]);
  return f;
}

(async () => {
  const browser = await chromium.launch();
  // read timeline + cues from the page
  const p0 = await browser.newPage();
  await p0.goto('file://' + path.join(__dirname, 'index.html'));
  const { dur, sfx } = await p0.evaluate(() => ({ dur: window.DURATION, sfx: window.SFX }));
  await p0.close();
  const N = Math.ceil(dur * FPS);
  console.log(`duration ${dur}s, ${N} frames, ${WORKERS} workers`);

  const t0 = Date.now();
  const per = Math.ceil(N / WORKERS), jobs = [];
  for (let w = 0; w < WORKERS; w++) jobs.push(renderChunk(browser, w, w * per, Math.min(N, (w + 1) * per)));
  const segs = await Promise.all(jobs);
  await browser.close();
  console.log(`frames done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  fs.writeFileSync(path.join(TMP, 'list.txt'), segs.map(s => `file '${s}'`).join('\n'));
  const video = path.join(TMP, 'video.mp4');
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(TMP, 'list.txt'), '-c', 'copy', video]);

  // ---- audio ----
  makeSfx();
  const inputs = [], filters = [], labels = [];
  sfx.forEach((c, i) => {
    const file = c.type === 'rumble' ? rumble(c.d, i) : path.join(TMP, `${c.type}.wav`);
    inputs.push('-i', file);
    const ms = Math.max(0, Math.round(c.t * 1000));
    const vol = { pop: 0.45, ding: 0.35, whoosh: 0.3, stamp: 0.55, coin: 0.4, rumble: 0.35 }[c.type];
    filters.push(`[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${vol},adelay=${ms}|${ms}[s${i}]`);
    labels.push(`[s${i}]`);
  });
  const sfxWav = path.join(TMP, 'sfx.wav');
  run('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex',
    filters.join(';') + `;${labels.join('')}amix=inputs=${labels.length}:normalize=0,apad,atrim=0:${dur}[out]`, '-map', '[out]', sfxWav]);

  const voice = path.join(ROOT, 'assets/voice.mp3'), music = path.join(ROOT, 'assets/music.wav');
  const hasMusic = fs.existsSync(music);
  const final = path.join(OUT, 'bill-two-lots.mp4');
  const fc = hasMusic
    ? `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,apad[v];` +
      `[2:a]aformat=sample_rates=44100:channel_layouts=stereo,aloop=loop=-1:size=2e9,atrim=0:${dur},volume=0.16,afade=t=in:d=0.6,afade=t=out:st=${(dur - 1.8).toFixed(2)}:d=1.8[m];` +
      `[3:a]aformat=sample_rates=44100:channel_layouts=stereo[x];` +
      `[v][m][x]amix=inputs=3:normalize=0:duration=longest,atrim=0:${dur},loudnorm=I=-14:TP=-1.5:LRA=11[a]`
    : `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,apad[v];[2:a]aformat=sample_rates=44100:channel_layouts=stereo[x];` +
      `[v][x]amix=inputs=2:normalize=0:duration=longest,atrim=0:${dur},loudnorm=I=-14:TP=-1.5:LRA=11[a]`;
  const ins = hasMusic ? ['-i', video, '-i', voice, '-i', music, '-i', sfxWav] : ['-i', video, '-i', voice, '-i', sfxWav];
  run('ffmpeg', ['-v', 'error', '-y', ...ins, '-filter_complex', fc, '-map', '0:v', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-movflags', '+faststart', '-shortest', final]);
  console.log('wrote', final, hasMusic ? '(with music)' : '(no music)');
})().catch(e => { console.error(e); process.exit(1); });
