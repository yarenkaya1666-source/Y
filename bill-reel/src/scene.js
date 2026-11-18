// "Two Lots" — Bill explainer. Flat isometric diorama + Bill (Financial Nonsense).
// renderAt(t) draws the frame for time t (seconds). Driven frame-by-frame by render.js.
(() => {
const T = window.TIMING, L = T.lines, FPS = T.fps;
const svg = document.getElementById('s');

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eOut = t => 1 - Math.pow(1 - t, 3);
const eIn = t => t * t * t;
const back = t => { if (t <= 0) return 0; if (t >= 1) return 1; const c1 = 2.0, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const P = (t, a, d) => clamp((t - a) / d);
const f1 = v => Math.round(v * 10) / 10;
const pts = a => a.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
const ls = i => L[i].s, le = i => L[i].e;
function wt(i, frag) {
  const tx = L[i].text.toLowerCase(), k = tx.indexOf(frag.toLowerCase());
  if (k < 0) throw new Error('missing fragment: ' + frag);
  return L[i].s + (k / tx.length) * (L[i].e - L[i].s);
}
// visibility envelope: fades in at a (dur din), out at b (dur dout)
const vis = (t, a, b, din = .25, dout = .3) => Math.min(P(t, a, din), 1 - P(t, b, dout));

const C = {
  bg: '#F6EFE2', panel: '#EDE2CB', ink: '#1B1B1B', teal: '#2A9D8F', tealD: '#1F7A6F', cream: '#FBF4E6',
  red: '#E2503C', green: '#2E9E5B', grass: '#BCD290', dirt: '#B98A5E', dirtD: '#99704B', road: '#5C5754',
  yellow: '#FFD23F', orange: '#E8772E', blue: '#3D9BE0', gold: '#F5C542', gravel: '#DCCBA6',
  tree: ['#5E9E5A', '#4E8B54', '#70AE60', '#417E4F'],
};

// ---------- timeline ----------
const TL = {
  redLine: 0.35, greenLine: 0.85,
  tagHead: wt(0, 'same five') - 0.05,
  redPrice: wt(0, 'sixty-two'), greenPrice: wt(0, 'eleven'),
  dirt: wt(1, 'same dirt'), trees: wt(1, 'same trees'), six: wt(1, 'six times') - 0.35,
  mag0: ls(2), boring: wt(2, 'boring'),
  camRed: ls(3) - 0.35, front: wt(3, 'the road runs'),
  drive: wt(4, 'driveway'), putIt: wt(4, 'put it'), power: wt(4, 'power'), water: wt(4, 'water'),
  rightThere: wt(4, 'right there'), house: wt(4, 'easy to build'), sell: wt(4, 'easy to sell'),
  camGreen: ls(5) - 0.35, flag: wt(5, 'flag lot') - 0.15, skinny: wt(5, 'skinny') - 0.2,
  clearing: wt(6, 'clearing'), gravel: wt(6, 'long gravel'), d0: wt(6, 'clearing') - 0.45, d1: wt(6, 'just to reach') + 0.2,
  dollar: wt(7, 'every dollar'), off: wt(7, 'straight off'),
  camOver: ls(8) - 0.25, phoneIn: ls(8) + 0.05, sold: wt(8, 'sold for') - 0.1, price: wt(8, 'sixty-two'),
  frontage: wt(8, 'road frontage'), near: wt(8, 'right down'), phoneOut: ls(9) - 0.1,
  backs: wt(9, 'backs up'), slap: wt(9, 'slap') - 0.1, xmark: wt(9, 'same acres'), notSame: wt(9, 'not the same') - 0.25,
  access: wt(10, 'check the access'), camPit: wt(10, 'or that') - 0.4, bargain: wt(10, 'bargain'), pit: wt(10, 'money pit') - 0.45,
  end: ls(11) - 0.1,
};
const DURATION = T.total;

// ---------- isometric world + camera ----------
const K = 30, CX = Math.cos(Math.PI / 6);
const iso = (x, y, z = 0) => [(x - y) * K * CX, (x + y) * K * .5 - z * K];
const FOC = [540, 650];
const CAM = {
  intro: { fx: 7.5, fy: 7.2, s: 0.86 }, over: { fx: 7.5, fy: 7.2, s: 1.02 },
  red: { fx: 4.2, fy: 11, s: 1.62 }, green: { fx: 9.8, fy: 9.0, s: 1.5 },
  pit: { fx: 11.0, fy: 6.0, s: 1.42 }, end: { fx: 7.5, fy: 7.2, s: 0.9 },
};
const camKeys = [
  [0, CAM.intro, 0], [0.2, CAM.over, 3.0], [TL.camRed, CAM.red, 1.0], [TL.camGreen, CAM.green, 1.0],
  [TL.camOver, CAM.over, 0.9], [TL.camPit, CAM.pit, 0.9], [TL.end, CAM.end, 1.2],
];
function camAt(t) {
  let c = { ...camKeys[0][1] };
  for (let k = 1; k < camKeys.length; k++) {
    const [t0, cc, d] = camKeys[k];
    if (t < t0) break;
    const p = ease(P(t, t0, d));
    c = { fx: lerp(c.fx, cc.fx, p), fy: lerp(c.fy, cc.fy, p), s: lerp(c.s, cc.s, p) };
  }
  return c;
}
let cam = CAM.over;
function scr(x, y, z = 0) {
  const p = iso(x, y, z), f = iso(cam.fx, cam.fy);
  return [FOC[0] + (p[0] - f[0]) * cam.s, FOC[1] + (p[1] - f[1]) * cam.s];
}

// ---------- lots ----------
const RED = [[1, 5], [7, 5], [7, 14], [1, 14]];
const GREEN = [[8, 0], [14, 0], [14, 8], [9, 8], [9, 14], [8, 14]];
const STRIP = [[8, 8], [9, 8], [9, 14], [8, 14]];
const PIT = { x: 11.6, y: 5.2 };

// ---------- dozer path ----------
const dozerY = t => lerp(15.3, 5.4, ease(P(t, TL.d0, TL.d1 - TL.d0)));

// ---------- trees ----------
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(11);
const trees = [];
for (let gx = -0.5; gx < 15.9; gx += 1.0) for (let gy = -1.5; gy < 13.8; gy += 1.0) {
  const x = gx + (R() - .5) * .75, y = gy + (R() - .5) * .75;
  const skip = R() < 0.2, r = 0.36 + R() * 0.2, h = 0.8 + R() * 0.5, pine = R() < 0.4, c = C.tree[Math.floor(R() * 4)];
  if (skip || x < -0.7 || x > 15.7 || y < -1.7 || y > 13.6) continue;
  const tr = { x, y, r, h, pine, c, clear: Infinity };
  // house pad + driveway on red lot
  if ((x > 2.7 && x < 5.8 && y > 8.5 && y < 11.6) || (x > 3.4 && x < 4.8 && y > 10.5)) tr.clear = TL.house - 0.1 + (x - 2.7) * 0.03;
  // strip + entry cleared by the dozer
  if (x > 7.55 && x < 9.45 && y > 5.0) {
    for (let tt = TL.d0; tt <= TL.d1 + 0.01; tt += 0.02) if (dozerY(tt) <= y + 0.55) { tr.clear = tt; break; }
  }
  // money pit swallows trees
  const dp = Math.hypot(x - PIT.x, y - PIT.y);
  if (dp < 2.3) tr.clear = Math.min(tr.clear, TL.pit + 0.15 + dp * 0.18);
  trees.push(tr);
}
function treeSVG(tr, t) {
  const k = 1 - eIn(P(t, tr.clear, 0.28));
  if (k <= 0.01) return '';
  const [bx, by] = iso(tr.x, tr.y), h = tr.h * K, r = tr.r * K;
  const sway = Math.sin(t * 1.6 + tr.x * 0.7 + tr.y) * 1.2;
  let g = `<g transform="translate(${f1(bx)},${f1(by)}) scale(${f1(k * 100) / 100})">`;
  g += `<ellipse cx="${f1(r * .3)}" cy="2" rx="${f1(r * .95)}" ry="${f1(r * .48)}" fill="#000" opacity=".13"/>`;
  if (tr.pine) {
    const top = -h - r * .9, w = r * 1.1;
    g += `<line x1="0" y1="0" x2="0" y2="${-f1(h * .35)}" stroke="#6B4A2E" stroke-width="4"/>`;
    g += `<path d="M${f1(sway)} ${f1(top)} L${f1(w)} ${f1(-h * .3)} L${f1(-w)} ${f1(-h * .3)} Z" fill="${tr.c}" stroke="${C.ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
  } else {
    const cy = -(h * .6 + r * .7);
    g += `<line x1="0" y1="0" x2="0" y2="${-f1(h * .6)}" stroke="#6B4A2E" stroke-width="4"/>`;
    g += `<circle cx="${f1(sway)}" cy="${f1(cy)}" r="${f1(r)}" fill="${tr.c}" stroke="${C.ink}" stroke-width="2.6"/>`;
    g += `<circle cx="${f1(sway - r * .32)}" cy="${f1(cy - r * .3)}" r="${f1(r * .3)}" fill="#fff" opacity=".2"/>`;
  }
  return g + '</g>';
}

// ---------- static ground ----------
const line = (a, b, st, w, extra = '') => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${st}" stroke-width="${w}" ${extra}/>`;
const poly = (arr, fill, extra = '') => `<polygon points="${pts(arr)}" fill="${fill}" ${extra}/>`;
const GROUND = (() => {
  let s = '';
  const fl = [iso(-1, 17), iso(16, 17), iso(16, 17, -1.1), iso(-1, 17, -1.1)];
  const fr = [iso(16, -2), iso(16, 17), iso(16, 17, -1.1), iso(16, -2, -1.1)];
  s += `<ellipse cx="${f1(iso(7.5, 7.5)[0])}" cy="${f1(iso(16, 17)[1] + 60)}" rx="440" ry="38" fill="#000" opacity=".05"/>`;
  s += poly(fl, C.dirt, `stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"`);
  s += poly(fr, C.dirtD, `stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"`);
  s += `<polyline points="${pts([iso(-1, 17, -.5), iso(16, 17, -.5), iso(16, -2, -.5)])}" fill="none" stroke="#7d5a3c" stroke-width="2.5" stroke-dasharray="12 9"/>`;
  s += poly([iso(-1, -2), iso(16, -2), iso(16, 17), iso(-1, 17)], C.grass, `stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"`);
  // grass tufts
  const G = rng(5);
  for (let i = 0; i < 140; i++) {
    const x = -0.8 + G() * 16.6, y = -1.8 + G() * 15.8, [a, b] = iso(x, y);
    s += `<path d="M${f1(a - 4)} ${f1(b)} l3 -6 l3 6 l3 -5" fill="none" stroke="#9BB872" stroke-width="2" stroke-linecap="round"/>`;
  }
  s += poly([iso(-1, 14.4), iso(16, 14.4), iso(16, 16.6), iso(-1, 16.6)], C.road);
  s += line(iso(-1, 14.4), iso(16, 14.4), '#8A847F', 3) + line(iso(-1, 16.6), iso(16, 16.6), '#8A847F', 3);
  for (let x = -0.6; x < 15.8; x += 1.4) s += line(iso(x, 15.5), iso(x + .7, 15.5), C.yellow, 4, 'stroke-linecap="round"');
  return s;
})();

const isoPath = arr => 'M' + arr.map(q => { const a = iso(q[0], q[1], q[2] || 0); return f1(a[0]) + ' ' + f1(a[1]); }).join(' L') + ' Z';
function lotLine(arr, col, p, w = 7) {
  if (p <= 0) return '';
  const d = isoPath(arr), o = f1(1 - p);
  return `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w + 7}" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${o}" vector-effect="non-scaling-stroke" opacity=".95"/>` +
    `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${o}" vector-effect="non-scaling-stroke"/>`;
}

// ---------- world props ----------
function house(t) {
  const k = back(P(t, TL.house, 0.5)); if (k <= 0) return null;
  const x0 = 3.1, x1 = 5.3, y0 = 9.1, y1 = 10.9, h = 1.25, ym = 10, rh = h + .9;
  const [bx, by] = iso((x0 + x1) / 2, y1);
  const st = `stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"`;
  let s = `<g transform="translate(${f1(bx)},${f1(by)}) scale(${f1(k * 100) / 100}) translate(${-f1(bx)},${-f1(by)})">`;
  s += poly([iso(x0, y0 - .15, h), iso(x1, y0 - .15, h), iso(x1, ym, rh), iso(x0, ym, rh)], '#1F7A6F', st);
  s += poly([iso(x0, y1, 0), iso(x1, y1, 0), iso(x1, y1, h), iso(x0, y1, h)], '#F7F0E3', st);
  s += poly([iso(x1, y0, 0), iso(x1, y1, 0), iso(x1, y1, h), iso(x1, y0, h)], '#DCCFB8', st);
  s += poly([iso(x1, y0, h), iso(x1, y1, h), iso(x1, ym, rh)], '#EADFCB', st);
  s += poly([iso(x0, y1 + .15, h), iso(x1, y1 + .15, h), iso(x1, ym, rh), iso(x0, ym, rh)], C.teal, st);
  s += poly([iso(3.9, y1, 0), iso(4.5, y1, 0), iso(4.5, y1, .85), iso(3.9, y1, .85)], '#B5653F', st);
  s += poly([iso(3.3, y1, .45), iso(3.7, y1, .45), iso(3.7, y1, .85), iso(3.3, y1, .85)], '#BFE3F5', st);
  s += poly([iso(4.7, y1, .45), iso(5.1, y1, .45), iso(5.1, y1, .85), iso(4.7, y1, .85)], '#BFE3F5', st);
  s += poly([iso(x1, 9.5, .45), iso(x1, 10.1, .45), iso(x1, 10.1, .85), iso(x1, 9.5, .85)], '#BFE3F5', st);
  return { d: 4.2 + 11, s: s + '</g>' };
}
function soldSign(t) {
  const k = back(P(t, TL.sell, 0.45)); if (k <= 0) return null;
  const [bx, by] = iso(6.3, 13.4), top = iso(6.3, 13.4, 1.7);
  let s = `<g transform="translate(${f1(bx)},${f1(by)}) scale(${f1(k * 100) / 100}) translate(${-f1(bx)},${-f1(by)})">`;
  s += line([bx, by], top, '#6B4A2E', 5);
  s += `<g transform="translate(${f1(top[0])},${f1(top[1] + 12)}) rotate(-4)"><rect x="-38" y="-20" width="76" height="36" rx="5" fill="#fff" stroke="${C.ink}" stroke-width="3.5"/><text x="0" y="8" text-anchor="middle" font-size="22" font-weight="700" fill="${C.red}">SOLD</text></g>`;
  return { d: 6.3 + 13.4, s: s + '</g>' };
}
const POLES = [0.3, 3.3, 6.3, 9.7, 12.7, 15.5];
const poleT = i => TL.power + i * 0.07;
function poles(t) {
  const out = [];
  POLES.forEach((x, i) => {
    const k = back(P(t, poleT(i), 0.35)); if (k <= 0) return;
    const y = 14.15, b = iso(x, y), top = iso(x, y, 2.5 * k);
    let s = line(b, top, '#7A5534', 5, 'stroke-linecap="round"');
    s += line(iso(x - .35, y, 2.25 * k), iso(x + .35, y, 2.25 * k), '#7A5534', 4, 'stroke-linecap="round"');
    out.push({ d: x + y, s });
  });
  let w = '';
  for (let i = 0; i < POLES.length - 1; i++) {
    const k = P(t, poleT(i + 1) + 0.25, 0.3); if (k <= 0) continue;
    const a = iso(POLES[i], 14.15, 2.25), b = iso(POLES[i + 1], 14.15, 2.25), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 10];
    w += `<path d="M${f1(a[0])} ${f1(a[1])} Q${f1(m[0])} ${f1(m[1])} ${f1(b[0])} ${f1(b[1])}" fill="none" stroke="${C.ink}" stroke-width="1.8" opacity="${f1(k)}"/>`;
  }
  out.push({ d: 30, s: w });
  return out;
}
function flag(t) {
  const k = back(P(t, TL.flag, 0.45)); if (k <= 0) return null;
  const x = 8.5, y = 13.6, b = iso(x, y), top = iso(x, y, 2.7 * k);
  const wv = Math.sin(t * 6) * 4;
  let s = line(b, top, C.ink, 4, 'stroke-linecap="round"');
  s += `<path d="M${f1(top[0])} ${f1(top[1])} Q${f1(top[0] + 22)} ${f1(top[1] - 6 + wv)} ${f1(top[0] + 46 * k)} ${f1(top[1] + 10)} Q${f1(top[0] + 22)} ${f1(top[1] + 20 - wv)} ${f1(top[0])} ${f1(top[1] + 28 * k)} Z" fill="${C.green}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`;
  return { d: x + y + .2, s };
}
function dozer(t) {
  if (t < TL.d0 - 0.2 || t > TL.camOver + 0.6) return null;
  const y = dozerY(t), x = 8.5, [bx, by0] = iso(x, y), moving = t < TL.d1;
  const by = by0 + (moving ? Math.sin(t * 45) * 1.2 : 0);
  const op = 1 - P(t, TL.camOver, 0.5);
  let s = `<g transform="translate(${f1(bx)},${f1(by)})" opacity="${f1(op)}">`;
  s += `<ellipse cx="0" cy="4" rx="36" ry="10" fill="#000" opacity=".16"/>`;
  s += `<rect x="-32" y="-14" width="52" height="17" rx="8.5" fill="#3a3a3a" stroke="${C.ink}" stroke-width="3"/>`;
  for (const cx of [-22, -8, 6]) s += `<circle cx="${cx}" cy="-5.5" r="4" fill="#8a8a8a"/>`;
  s += `<rect x="-28" y="-40" width="42" height="27" rx="4" fill="#F2B33D" stroke="${C.ink}" stroke-width="3"/>`;
  s += `<rect x="-24" y="-64" width="25" height="26" rx="3" fill="#F2B33D" stroke="${C.ink}" stroke-width="3"/>`;
  s += `<rect x="-20" y="-60" width="17" height="13" rx="2" fill="#BFE3F5" stroke="${C.ink}" stroke-width="2"/>`;
  s += `<rect x="5" y="-56" width="5" height="17" fill="${C.ink}"/>`;
  s += `<path d="M14 -32 L30 -36 L38 4 L24 4 Z" fill="#E09B22" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`;
  if (moving) for (let i = 0; i < 3; i++) {
    const ph = ((t * 1.6 + i / 3) % 1);
    s += `<circle cx="${f1(7 + ph * 8)}" cy="${f1(-60 - ph * 40)}" r="${f1(5 + ph * 9)}" fill="#bbb" opacity="${f1((1 - ph) * .7)}"/>`;
  }
  return { d: x + y + .3, s: s + '</g>' };
}

// ---------- screen-space UI pieces ----------
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function pill(x, y, text, bg, fg, k = 1, fs = 34, rot = 0) {
  if (k <= 0) return '';
  const w = 44 + text.length * fs * .62, h = fs * 1.75;
  return `<g transform="translate(${f1(x)},${f1(y)}) rotate(${rot}) scale(${f1(k * 100) / 100})">` +
    `<rect x="${f1(-w / 2 + 4)}" y="${f1(-h / 2 + 5)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="#000" opacity=".18"/>` +
    `<rect x="${f1(-w / 2)}" y="${f1(-h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${bg}" stroke="${C.ink}" stroke-width="4"/>` +
    `<text x="0" y="${f1(fs * .36)}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${fg}" letter-spacing="1">${esc(text)}</text></g>`;
}
function tag(x, y, col, price, pricePop, k, extra = '') {
  if (k <= 0) return '';
  const ps = 0.6 + 0.4 * back(pricePop);
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f1(k * 100) / 100})">` +
    `<path d="M-113 -172 h226 a22 22 0 0 1 22 22 v106 a22 22 0 0 1 -22 22 h-95 l-18 22 l-18 -22 h-95 a22 22 0 0 1 -22 -22 v-106 a22 22 0 0 1 22 -22 Z" fill="#000" opacity=".18" transform="translate(6,7)"/>` +
    `<path d="M-113 -172 h226 a22 22 0 0 1 22 22 v106 a22 22 0 0 1 -22 22 h-95 l-18 22 l-18 -22 h-95 a22 22 0 0 1 -22 -22 v-106 a22 22 0 0 1 22 -22 Z" fill="#fff" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M-113 -172 h226 a22 22 0 0 1 22 22 v26 h-270 v-26 a22 22 0 0 1 22 -22 Z" fill="${col}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>` +
    `<text x="0" y="-135" text-anchor="middle" font-size="31" font-weight="700" fill="#fff" letter-spacing="2">5 ACRES</text>` +
    `<g transform="translate(0,-62) scale(${f1(ps * 100) / 100})"><text x="0" y="22" text-anchor="middle" font-size="62" font-weight="700" fill="${C.ink}">${price}</text></g>` +
    extra + '</g>';
}
function icon(kind, x, y, r = 25) {
  let s = '';
  const circ = col => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${C.ink}" stroke-width="3.5"/>`;
  if (kind === 'check') s = circ(C.green) + `<path d="M${x - 11} ${y + 1} l8 8 l15 -16" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  else if (kind === 'eq') s = circ(C.orange) + line([x - 11, y - 6], [x + 11, y - 6], '#fff', 5.5, 'stroke-linecap="round"') + line([x - 11, y + 6], [x + 11, y + 6], '#fff', 5.5, 'stroke-linecap="round"');
  else if (kind === 'minus') s = circ(C.red) + `<text x="${x}" y="${y + 9}" text-anchor="middle" font-size="25" font-weight="700" fill="#fff">-$</text>`;
  else if (kind === 'q') s = circ(C.orange) + `<text x="${x}" y="${y + 11}" text-anchor="middle" font-size="32" font-weight="700" fill="#fff">?</text>`;
  else if (kind === 'down') s = circ(C.red) + `<path d="M${x} ${y - 12} v22 M${x - 9} ${y + 2} l9 9 l9 -9" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  return s;
}
const CHIPS = [
  { slot: 0, text: 'SAME DIRT', icon: 'eq', t0: TL.dirt, t1: le(1) },
  { slot: 1, text: 'SAME TREES', icon: 'eq', t0: TL.trees, t1: le(1) },
  { slot: 0, text: '1 BORING DETAIL', icon: 'q', t0: TL.boring, t1: le(2) },
  { slot: 0, text: 'DRIVEWAY ANYWHERE', icon: 'check', t0: TL.putIt, t1: le(4) },
  { slot: 1, text: 'UTILITIES CLOSE', icon: 'check', t0: TL.rightThere, t1: le(4) },
  { slot: 2, text: 'EASY TO BUILD', icon: 'check', t0: TL.house, t1: le(4) },
  { slot: 3, text: 'EASY TO SELL', icon: 'check', t0: TL.sell, t1: le(4) },
  { slot: 0, text: 'CLEAR TREES', icon: 'minus', t0: TL.clearing, t1: le(7) },
  { slot: 1, text: 'LONG DRIVEWAY', icon: 'minus', t0: TL.gravel, t1: le(7) },
  { slot: 2, text: 'LOWER VALUE', icon: 'down', t0: TL.off, t1: le(7) },
  { slot: 0, text: 'CHECK ACCESS', icon: 'check', t0: TL.access, t1: le(10) },
];
function chip(c, t) {
  const a = P(t, c.t0, 0.4), out = P(t, c.t1 + 0.05, 0.3);
  if (a <= 0 || out >= 1) return '';
  const fs = 33, w = 90 + c.text.length * fs * .6, h = 74, x0 = 588, y0 = 1335 + c.slot * 90;
  const dx = (1 - eOut(a)) * 140 + eIn(out) * 160, k = back(a);
  return `<g transform="translate(${f1(x0 + dx)},${y0}) scale(${f1(k * 100) / 100})" opacity="${f1(clamp(a * 4) * (1 - out))}">` +
    `<rect x="5" y="6" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="#000" opacity=".16"/>` +
    `<rect x="0" y="0" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="#fff" stroke="${C.ink}" stroke-width="4"/>` +
    icon(c.icon, 38, 37) +
    `<text x="76" y="${37 + fs * .36}" font-size="${fs}" font-weight="700" fill="${C.ink}" letter-spacing=".5">${esc(c.text)}</text></g>`;
}
function coin(x, y, r = 15, op = 1) {
  return `<g opacity="${f1(op)}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${C.gold}" stroke="${C.ink}" stroke-width="3"/>` +
    `<text x="${f1(x)}" y="${f1(y + r * .4)}" text-anchor="middle" font-size="${f1(r * 1.15)}" font-weight="700" fill="#9A6B00">$</text></g>`;
}

// ---------- captions ----------
const chunks = [];
L.forEach(l => {
  const tx = l.text, words = tx.split(' ');
  let pos = 0, cur = [];
  const flush = () => { if (cur.length) chunks.push({ words: cur.map(c => c.w), times: cur.map(c => c.t) }); cur = []; };
  words.forEach(w => {
    const k = tx.indexOf(w, pos); pos = k + w.length;
    const t = l.s + (k / tx.length) * (l.e - l.s);
    const len = cur.reduce((a, c) => a + c.w.length + 1, 0) + w.length;
    if (cur.length && (cur.length >= 3 || len > 17)) flush();
    cur.push({ w, t });
    if (/[.?!,]$/.test(w)) flush();
  });
  flush();
});
chunks.forEach((c, i) => {
  c.t0 = c.times[0];
  const next = chunks[i + 1];
  c.t1 = next ? Math.min(next.times[0], c.times[c.times.length - 1] + 1.0) : c.t0 + 3;
});
function captions(t) {
  const c = chunks.find(c => t >= c.t0 - 0.03 && t < c.t1); if (!c) return '';
  const words = c.words.map(w => w.toUpperCase().replace(/[.,]$/, ''));
  const chars = words.join(' ').length;
  const fs = Math.min(84, 960 / (chars * .6));
  let active = 0; c.times.forEach((tt, i) => { if (t >= tt - 0.03) active = i; });
  const k = 0.82 + 0.18 * back(P(t, c.t0 - 0.03, 0.2));
  const sp = words.map((w, i) => `<tspan fill="${i === active ? C.orange : C.ink}">${esc(w)}</tspan>`).join(' ');
  return `<g transform="translate(540,1238) scale(${f1(k * 100) / 100})"><text x="0" y="0" text-anchor="middle" font-size="${f1(fs)}" font-weight="700" letter-spacing="1" stroke="${C.bg}" stroke-width="14" stroke-linejoin="round" paint-order="stroke">${sp}</text></g>`;
}

// ---------- Bill ----------
const POSES = {
  rest: { R: [10, 6] }, point: { R: [150, 166] }, shrug: { R: [62, 138] },
  finger: { R: [28, 172] }, wave: { R: [142, 172] },
};
const LPOSE = [14, -80];
const poseLine = ['point', 'shrug', 'finger', 'point', 'point', 'point', 'rest', 'shrug', 'point', 'finger', 'point', 'wave'];
function poseAt(t) {
  let i = 0; for (let k = 0; k < L.length; k++) if (t >= L[k].start - 0.15) i = k;
  const cur = POSES[poseLine[i]].R, prev = i ? POSES[poseLine[i - 1]].R : POSES.rest.R;
  const p = ease(P(t, i ? L[i].start - 0.15 : 0.35, 0.4));
  return { R: [lerp(prev[0], cur[0], p), lerp(prev[1], cur[1], p)], name: poseLine[i] };
}
function arm(sx, sy, side, a1, a2) {
  const r = d => d * Math.PI / 180;
  const ex = sx + side * Math.sin(r(a1)) * 110, ey = sy + Math.cos(r(a1)) * 110;
  const hx = ex + side * Math.sin(r(a2)) * 100, hy = ey + Math.cos(r(a2)) * 100;
  const d = `M${sx} ${sy} L${f1(ex)} ${f1(ey)} L${f1(hx)} ${f1(hy)}`;
  return {
    s: `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${C.teal}" stroke-width="31" stroke-linecap="round" stroke-linejoin="round"/>`,
    hx, hy, dx: Math.sin(r(a2)) * side, dy: Math.cos(r(a2)),
  };
}
function bill(t) {
  const fi = Math.min(T.env.length - 1, Math.max(0, Math.floor(t * FPS)));
  const amp = T.env[fi] || 0;
  const intro = back(P(t, 0, 0.6));
  const bob = Math.sin(t * 2.1) * 4 - amp * 5 + (1 - intro) * 420;
  const X = 282, Y = 1652 + bob;
  const tilt = Math.sin(t * 1.3) * 2.2 + Math.sin(t * 5.3) * amp * 2.5;
  const pose = poseAt(t);
  const look = pose.name === 'point' ? [5, -4] : [0, 0];
  const bt = (t + 0.4) % 3.6, blink = bt < 0.16 ? Math.sin(bt / 0.16 * Math.PI) : 0;
  const brow = (pose.name === 'shrug' || pose.name === 'finger') ? -9 : 0;
  let s = `<g transform="translate(${X},${f1(Y)})">`;
  // torso
  s += `<path d="M-176 72 Q-166 0 -60 -8 L60 -8 Q166 0 176 72 L202 340 L-202 340 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>`;
  s += `<path d="M-96 268 L-74 190 L74 190 L96 268" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>`;
  // head
  s += `<g transform="rotate(${f1(tilt)})">`;
  s += `<circle cx="0" cy="-150" r="178" fill="${C.teal}" stroke="${C.ink}" stroke-width="8"/>`;
  s += `<path d="M-46 4 L0 40 L46 4 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>`;
  s += `<circle cx="0" cy="-150" r="136" fill="${C.cream}" stroke="${C.ink}" stroke-width="8"/>`;
  for (const sd of [-1, 1]) {
    const ex = sd * 50 + look[0], ey = -160 + look[1];
    s += `<path d="M${sd * 74} ${-206 + brow} Q${sd * 52} ${-220 + brow} ${sd * 30} ${-208 + brow}" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>`;
    s += `<ellipse cx="${ex}" cy="${ey}" rx="14" ry="19" fill="${C.ink}"/>`;
    const cov = 11 + blink * 28, ly = ey - 19 + cov;
    s += `<path d="M${ex - 23} ${ey - 26} L${ex + 23} ${ey - 26} L${ex + 23} ${f1(ly)} Q${ex} ${f1(ly + 5)} ${ex - 23} ${f1(ly)} Z" fill="${C.cream}"/>`;
    s += `<path d="M${ex - 19} ${f1(ly)} Q${ex} ${f1(ly + 5)} ${ex + 19} ${f1(ly)}" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>`;
    s += `<path d="M${ex - 18} ${ey + 25} Q${ex} ${ey + 32} ${ex + 18} ${ey + 25}" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`;
    s += `<path d="M${ex - 10} ${ey + 33} Q${ex} ${ey + 37} ${ex + 10} ${ey + 33}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`;
  }
  const my = -92;
  if (amp < 0.07) s += `<path d="M-32 ${my} Q0 ${my + 17} 32 ${my}" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>`;
  else {
    const h = 8 + amp * 34, w = 30 + amp * 6;
    s += `<path d="M${f1(-w)} ${my} Q0 ${my + 6} ${f1(w)} ${my} Q${f1(w * .6)} ${f1(my + h)} 0 ${f1(my + h)} Q${f1(-w * .6)} ${f1(my + h)} ${f1(-w)} ${my} Z" fill="#4A2323" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>`;
    if (h > 18) s += `<ellipse cx="0" cy="${f1(my + h - 6)}" rx="${f1(w * .42)}" ry="5" fill="#E07A6E"/>`;
  }
  s += '</g>';
  // drawstrings
  for (const sd of [-1, 1]) s += line([sd * 32, 24], [sd * 37, 122], C.ink, 5, 'stroke-linecap="round"') + `<circle cx="${sd * 37}" cy="126" r="7" fill="${C.ink}"/>`;
  // left arm + coffee
  const la = arm(-160, 64, -1, LPOSE[0], LPOSE[1]);
  s += la.s;
  const cx = la.hx + 18, cy = la.hy - 22;
  s += `<g transform="translate(${f1(cx)},${f1(cy)})"><path d="M-25 -34 L25 -34 L19 34 L-19 34 Z" fill="#fff" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M-23 -10 L23 -10 L21 12 L-21 12 Z" fill="#9B6A43" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>` +
    `<rect x="-30" y="-46" width="60" height="14" rx="5" fill="#3B3B3B" stroke="${C.ink}" stroke-width="4"/></g>`;
  for (let i = 0; i < 2; i++) {
    const ph = (t * .5 + i * .5) % 1;
    s += `<path d="M${f1(cx - 6 + i * 10)} ${f1(cy - 56 - ph * 40)} q8 -10 0 -20" fill="none" stroke="#bbb" stroke-width="4" stroke-linecap="round" opacity="${f1((1 - ph) * .8)}"/>`;
  }
  s += `<circle cx="${f1(la.hx)}" cy="${f1(la.hy)}" r="18" fill="#2a2a2a" stroke="${C.ink}" stroke-width="4"/>`;
  // right arm
  let [a1, a2] = pose.R;
  a2 += Math.sin(t * 7) * amp * 8;
  if (pose.name === 'wave') a2 += Math.sin(t * 11) * 22;
  const ra = arm(160, 64, 1, a1, a2);
  s += ra.s;
  if (pose.name === 'point' || pose.name === 'finger') s += line([ra.hx, ra.hy], [ra.hx + ra.dx * 30, ra.hy + ra.dy * 30], '#2a2a2a', 13, 'stroke-linecap="round"');
  s += `<circle cx="${f1(ra.hx)}" cy="${f1(ra.hy)}" r="18" fill="#2a2a2a" stroke="${C.ink}" stroke-width="4"/>`;
  return s + '</g>';
}

// ---------- phone listing card ----------
function phone(t) {
  const a = P(t, TL.phoneIn, 0.55), o = P(t, TL.phoneOut, 0.45);
  if (a <= 0 || o >= 1) return '';
  const dx = (1 - eOut(a)) * 900 + eIn(o) * 900, rot = (1 - eOut(a)) * 12 - eIn(o) * 10;
  let s = `<g transform="translate(${f1(540 + dx)},655) rotate(${f1(rot)})">`;
  s += `<rect x="-272" y="-428" width="560" height="870" rx="64" fill="#000" opacity=".2"/>`;
  s += `<rect x="-280" y="-440" width="560" height="870" rx="64" fill="#1F1F1F" stroke="${C.ink}" stroke-width="5"/>`;
  s += `<rect x="-262" y="-422" width="524" height="834" rx="48" fill="#fff"/>`;
  s += `<rect x="-60" y="-414" width="120" height="26" rx="13" fill="#1F1F1F"/>`;
  s += `<text x="-228" y="-340" font-size="38" font-weight="700" fill="${C.ink}">Land Listings</text>`;
  s += `<text x="-228" y="-302" font-size="25" font-weight="500" fill="#8a8a8a">Recently sold nearby</text>`;
  // site-plan image
  s += `<g><clipPath id="ph"><rect x="-236" y="-276" width="472" height="322" rx="22"/></clipPath><g clip-path="url(#ph)">`;
  s += `<rect x="-236" y="-276" width="472" height="322" fill="${C.grass}"/>`;
  s += `<rect x="-236" y="-14" width="472" height="60" fill="${C.road}"/>`;
  for (let x = -220; x < 236; x += 64) s += `<rect x="${x}" y="13" width="32" height="6" rx="3" fill="${C.yellow}"/>`;
  const PT = rng(3);
  for (let i = 0; i < 26; i++) { const x = -225 + PT() * 450, y = -265 + PT() * 230; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(13 + PT() * 8)}" fill="${C.tree[i % 4]}" stroke="${C.ink}" stroke-width="2.5"/>`; }
  s += `<rect x="-120" y="-226" width="240" height="210" fill="${C.red}" fill-opacity=".2" stroke="#fff" stroke-width="13"/>`;
  s += `<rect x="-120" y="-226" width="240" height="210" fill="none" stroke="${C.red}" stroke-width="7"/>`;
  s += `</g><rect x="-236" y="-276" width="472" height="322" rx="22" fill="none" stroke="${C.ink}" stroke-width="4"/></g>`;
  // SOLD stamp
  const st = P(t, TL.sold, 0.3);
  if (st > 0) s += `<g transform="translate(120,-200) rotate(-14) scale(${f1((2.2 - 1.2 * eOut(st)) * 100) / 100})" opacity="${f1(clamp(st * 3))}"><rect x="-96" y="-42" width="192" height="84" rx="12" fill="#fff" fill-opacity=".85" stroke="${C.red}" stroke-width="8"/><text x="0" y="22" text-anchor="middle" font-size="62" font-weight="700" fill="${C.red}" letter-spacing="4">SOLD</text></g>`;
  const pp = P(t, TL.price, 0.35);
  if (pp > 0) s += `<g transform="translate(-228,140) scale(${f1(back(pp) * 100) / 100})"><text x="0" y="0" font-size="96" font-weight="700" fill="${C.ink}">$62,000</text></g>`;
  const fp = P(t, TL.frontage, 0.3);
  if (fp > 0) s += `<text x="-226" y="${f1(205 + (1 - eOut(fp)) * 20)}" font-size="33" font-weight="600" fill="#555" opacity="${f1(fp)}">5 ACRES · ROAD FRONTAGE</text>`;
  const np = P(t, TL.near, 0.3);
  if (np > 0) s += `<g opacity="${f1(np)}"><circle cx="-210" cy="254" r="11" fill="${C.teal}"/><text x="-186" y="265" font-size="31" font-weight="600" fill="${C.teal}">Down the street</text></g>`;
  s += `<rect x="-228" y="316" width="456" height="72" rx="36" fill="${C.teal}" stroke="${C.ink}" stroke-width="4"/><text x="0" y="364" text-anchor="middle" font-size="33" font-weight="700" fill="#fff" letter-spacing="1">THE COMP</text>`;
  return s + '</g>';
}

// ---------- big banners ----------
function banner(t) {
  const a = P(t, TL.notSame, 0.4), o = P(t, ls(10) + 0.3, 0.35);
  if (a <= 0 || o >= 1) return '';
  const k = back(a) * (1 - eIn(o));
  const neq = P(t, TL.notSame + 0.35, 0.3);
  let s = `<g transform="translate(540,350) scale(${f1(k * 100) / 100})">`;
  s += `<rect x="-404" y="-152" width="820" height="316" rx="40" fill="#000" opacity=".18"/>`;
  s += `<rect x="-412" y="-160" width="824" height="316" rx="40" fill="#fff" stroke="${C.ink}" stroke-width="6"/>`;
  s += `<text x="0" y="-62" text-anchor="middle" font-size="76" font-weight="700" fill="${C.ink}">SAME ACRES</text>`;
  if (neq > 0) {
    const q = back(neq);
    s += `<g transform="translate(0,6) scale(${f1(q * 100) / 100})">` + line([-34, -12], [34, -12], C.red, 11, 'stroke-linecap="round"') + line([-34, 12], [34, 12], C.red, 11, 'stroke-linecap="round"') + line([-16, 34], [16, -34], C.red, 11, 'stroke-linecap="round"') + '</g>';
    s += `<text x="0" y="${f1(116)}" text-anchor="middle" font-size="76" font-weight="700" fill="${C.red}" opacity="${f1(clamp(neq * 2))}">SAME VALUE</text>`;
  }
  return s + '</g>';
}
function hook(t) {
  const a = P(t, 0.15, 0.4), o = P(t, ls(1) - 0.35, 0.3);
  if (a <= 0 || o >= 1) return '';
  const k = back(a), op = 1 - o;
  return `<g opacity="${f1(op)}" transform="translate(540,0)">` +
    `<g transform="translate(0,262) scale(${f1(k * 100) / 100})"><text x="0" y="0" text-anchor="middle" font-size="64" font-weight="700" fill="${C.ink}" stroke="${C.panel}" stroke-width="12" paint-order="stroke" stroke-linejoin="round">SAME 5 ACRES.</text></g>` +
    `<g transform="translate(0,338) scale(${f1(back(P(t, 0.45, 0.4)) * 100) / 100})"><text x="0" y="0" text-anchor="middle" font-size="64" font-weight="700" fill="${C.orange}" stroke="${C.panel}" stroke-width="12" paint-order="stroke" stroke-linejoin="round">WHY 6× THE PRICE?</text></g></g>`;
}
function endCard(t) {
  const a = P(t, TL.end + 0.2, 0.5); if (a <= 0) return '';
  const k = back(a), f = back(P(t, TL.end + 0.7, 0.45));
  let s = `<g transform="translate(540,300) scale(${f1(k * 100) / 100})">`;
  s += `<rect x="-386" y="-80" width="780" height="168" rx="84" fill="#000" opacity=".18"/>`;
  s += `<rect x="-394" y="-88" width="788" height="168" rx="84" fill="${C.teal}" stroke="${C.ink}" stroke-width="6"/>`;
  s += `<text x="0" y="22" text-anchor="middle" font-size="68" font-weight="700" fill="#fff" letter-spacing="2">FINANCIAL NONSENSE</text></g>`;
  if (f > 0) s += pill(540, 458, 'CHECK THE ACCESS FIRST', '#fff', C.ink, f, 38);
  return s;
}

// ---------- SFX cue list (read by render.js) ----------
const SFX = [];
const cue = (t, type, extra = {}) => SFX.push({ t: +t.toFixed(3), type, ...extra });
cue(0.05, 'whoosh'); cue(TL.redLine, 'pop'); cue(TL.greenLine, 'pop'); cue(TL.tagHead, 'pop'); cue(TL.redPrice, 'ding'); cue(TL.greenPrice, 'ding');
cue(TL.dirt, 'pop'); cue(TL.trees, 'pop'); cue(TL.six, 'stamp'); cue(TL.mag0, 'whoosh'); cue(TL.boring, 'pop');
cue(TL.camRed, 'whoosh'); cue(TL.front, 'pop'); cue(TL.drive, 'pop'); cue(TL.drive + .25, 'pop'); cue(TL.drive + .5, 'pop');
cue(TL.putIt, 'pop'); cue(TL.power, 'pop'); cue(TL.water, 'pop'); cue(TL.rightThere, 'pop'); cue(TL.house, 'stamp'); cue(TL.sell, 'ding');
cue(TL.camGreen, 'whoosh'); cue(TL.flag, 'pop'); cue(TL.skinny, 'pop'); cue(TL.d0, 'rumble', { d: TL.d1 - TL.d0 });
cue(TL.clearing, 'pop'); cue(TL.gravel, 'pop'); cue(TL.dollar, 'coin'); cue(TL.off, 'pop');
cue(TL.camOver, 'whoosh'); cue(TL.sold, 'stamp'); cue(TL.price, 'ding'); cue(TL.phoneOut, 'whoosh');
cue(TL.backs, 'ding'); cue(TL.slap, 'whoosh'); cue(TL.xmark, 'stamp'); cue(TL.notSame, 'pop'); cue(TL.notSame + .35, 'stamp');
cue(TL.access, 'ding'); cue(TL.camPit, 'whoosh'); cue(TL.pit, 'rumble', { d: 0.9 }); cue(TL.pit + .3, 'coin'); cue(TL.end + .2, 'pop'); cue(TL.end + .7, 'ding');

// ---------- frame ----------
function renderAt(t) {
  cam = camAt(t);
  const s0 = cam.s * (0.75 + 0.25 * back(P(t, 0, 0.7)));
  cam = { ...cam, s: s0 };
  const f = iso(cam.fx, cam.fy);
  let out = '';
  out += `<rect width="1080" height="1920" fill="${C.bg}"/>`;
  out += `<defs><pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="18" cy="18" r="2.4" fill="#D9CAAE"/></pattern>` +
    `<clipPath id="pn"><rect x="28" y="150" width="1024" height="990" rx="44"/></clipPath></defs>`;
  out += `<rect x="28" y="150" width="1024" height="990" rx="44" fill="${C.panel}"/><rect x="28" y="150" width="1024" height="990" rx="44" fill="url(#dots)"/>`;
  out += `<g clip-path="url(#pn)">`;
  // world
  out += `<g transform="translate(${f1(FOC[0] - f[0] * cam.s)},${f1(FOC[1] - f[1] * cam.s)}) scale(${(Math.round(cam.s * 1000) / 1000)})">`;
  out += GROUND;
  const lotOp = P(t, 0.4, 0.6);
  out += `<path d="${isoPath(RED)}" fill="${C.red}" opacity="${f1(.2 * lotOp * 100) / 100}"/>`;
  out += `<path d="${isoPath(GREEN)}" fill="${C.green}" opacity="${f1(.2 * P(t, 0.9, 0.6) * 100) / 100}"/>`;
  // pipe
  const pp = P(t, TL.water - .1, 1.2);
  if (pp > 0) out += `<path d="${'M' + iso(-1, 14.22).map(f1).join(' ') + ' L' + iso(16, 14.22).map(f1).join(' ')}" stroke="${C.blue}" stroke-width="5" stroke-dasharray="14 8" fill="none" pathLength="1" stroke-dashoffset="0" opacity="${f1(.9 * pp)}" clip-path="none"/>`;
  // driveways (gravel)
  const hp = P(t, TL.house - .1, 0.4);
  if (hp > 0) out += `<path d="${isoPath([[3.8, 10.9], [4.6, 10.9], [4.6, 10.9 + 3.5 * eOut(hp)], [3.8, 10.9 + 3.5 * eOut(hp)]])}" fill="${C.gravel}" stroke="${C.ink}" stroke-width="2.5"/>`;
  if (t > TL.d0) {
    const gy = Math.max(dozerY(t) + 0.5, 5.6);
    if (gy < 14.3) out += `<path d="${isoPath([[8.15, gy], [8.85, gy], [8.85, 14.35], [8.15, 14.35]])}" fill="${C.gravel}" stroke="${C.ink}" stroke-width="2.5"/>`;
  }
  // ghost driveways
  [2.2, 4.2, 5.9].forEach((x, i) => {
    const a = back(P(t, TL.drive + i * .25, 0.35)), o = P(t, TL.house - .2, 0.3);
    if (a <= 0 || o >= 1) return;
    const len = 1.8 * a;
    out += `<path d="${isoPath([[x - .4, 14 - len], [x + .4, 14 - len], [x + .4, 14.05], [x - .4, 14.05]])}" fill="#fff" fill-opacity=".55" stroke="${C.ink}" stroke-width="3" stroke-dasharray="7 5" opacity="${f1(1 - o)}"/>`;
  });
  // strip pulse
  const sp = vis(t, TL.skinny, TL.d0 + .3, .25, .4);
  if (sp > 0) out += `<path d="${isoPath(STRIP)}" fill="${C.yellow}" opacity="${f1(sp * (.45 + .2 * Math.sin(t * 9)) * 100) / 100}"/>`;
  // money pit
  const pk = eOut(P(t, TL.pit, 0.7));
  if (pk > 0) {
    const [px, py] = iso(PIT.x, PIT.y), r = 2.0 * pk;
    out += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(r * 36.7)}" ry="${f1(r * 21.2)}" fill="${C.dirtD}" stroke="${C.ink}" stroke-width="4"/>`;
    out += `<ellipse cx="${f1(px)}" cy="${f1(py + 4 * pk)}" rx="${f1(r * 29)}" ry="${f1(r * 15.5)}" fill="#2B1D14"/>`;
    for (let i = 0; i < 3; i++) {
      const rr = ((t * .6 + i / 3) % 1);
      out += `<ellipse cx="${f1(px)}" cy="${f1(py + 4 * pk)}" rx="${f1(r * 26 * (1 - rr))}" ry="${f1(r * 13.5 * (1 - rr))}" fill="none" stroke="#5a3d2a" stroke-width="2" opacity="${f1(rr)}"/>`;
    }
  }
  // depth-sorted objects
  const objs = [];
  trees.forEach(tr => { if (t < tr.clear + 0.3) objs.push({ d: tr.x + tr.y, s: treeSVG(tr, t) }); });
  for (const o of [house(t), soldSign(t), flag(t), dozer(t)]) if (o) objs.push(o);
  poles(t).forEach(o => objs.push(o));
  objs.sort((a, b) => a.d - b.d);
  out += objs.map(o => o.s).join('');
  // lot outlines
  out += lotLine(RED, C.red, eOut(P(t, TL.redLine, 0.9)));
  out += lotLine(GREEN, C.green, eOut(P(t, TL.greenLine, 0.9)));
  // frontage highlight
  const fp = eOut(P(t, TL.front, 1.0)) * (1 - P(t, TL.camGreen, 0.4));
  if (fp > 0) {
    const a = iso(1, 14), b = iso(1 + 6 * fp, 14);
    out += line(a, b, C.ink, 20, 'stroke-linecap="round" vector-effect="non-scaling-stroke"') + line(a, b, C.yellow, 13, 'stroke-linecap="round" vector-effect="non-scaling-stroke"');
  }
  out += '</g>';

  // ----- screen overlays inside panel -----
  // tags
  const tagIn = back(P(t, TL.tagHead, 0.45)) * (1 - eIn(P(t, TL.camPit, 0.4)));
  const rP = scr(4, 9.5, 2.9), gP = scr(11, 4, 2.9);
  const green$ = t >= TL.greenPrice ? '$11,000' : '?', red$ = t >= TL.redPrice ? '$62,000' : '?';
  let shake = 0; if (t > TL.off && t < TL.off + .6) shake = Math.sin((t - TL.off) * 60) * 8 * (1 - P(t, TL.off, .6));
  let gExtra = '';
  const dn = back(P(t, TL.off, .35)) * (1 - P(t, TL.camOver, .3));
  if (dn > 0) gExtra += `<g transform="translate(128,-160) scale(${f1(dn * 100) / 100})">${icon('down', 0, 0, 30)}</g>`;
  // sticker on green tag (line 9)
  const sk = P(t, TL.slap, .55), sx = P(t, TL.xmark, .3), sfall = P(t, TL.xmark + .55, .5);
  let rExtra = '';
  const ck = back(P(t, TL.backs, .35)) * (1 - P(t, ls(10), .3));
  if (ck > 0) rExtra += `<g transform="translate(128,-160) scale(${f1(ck * 100) / 100})">${icon('check', 0, 0, 30)}</g>`;
  const tagS = clamp(0.8 + (cam.s - 1) * 0.35, 0.8, 1.05);
  out += tag(rP[0], rP[1], C.red, red$, P(t, TL.redPrice, .4), tagIn * tagS, rExtra);
  out += tag(gP[0] + shake, gP[1], C.green, green$, P(t, TL.greenPrice, .4), tagIn * tagS, gExtra);
  if (sk > 0 && sfall < 1) {
    const e = ease(sk), x = lerp(rP[0], gP[0], e), y = lerp(rP[1], gP[1], e) - Math.sin(e * Math.PI) * 160 + eIn(sfall) * 500;
    let st = `<g transform="translate(${f1(x)},${f1(y - 62 * tagS)}) rotate(${f1(-8 + e * 14 + sfall * 50)}) scale(${f1(tagS * 100) / 100})" opacity="${f1(1 - sfall)}">`;
    st += `<rect x="-128" y="-46" width="256" height="92" rx="18" fill="${C.yellow}" stroke="${C.ink}" stroke-width="5"/><text x="0" y="22" text-anchor="middle" font-size="60" font-weight="700" fill="${C.ink}">$62,000</text>`;
    if (sx > 0) { const q = back(sx); st += `<g transform="scale(${f1(q * 100) / 100})">` + line([-110, -60], [110, 60], C.red, 16, 'stroke-linecap="round"') + line([-110, 60], [110, -60], C.red, 16, 'stroke-linecap="round"') + '</g>'; }
    out += st + '</g>';
  }
  // 6x badge
  const six = back(P(t, TL.six, .4)) * (1 - P(t, ls(2) + .2, .3));
  if (six > 0) {
    const mx = (rP[0] + gP[0]) / 2, my = Math.min(rP[1], gP[1]) - 250;
    out += `<g transform="translate(${f1(mx)},${f1(my)}) rotate(-8) scale(${f1(six * 100) / 100})"><circle r="84" fill="#000" opacity=".18" cx="6" cy="7"/><circle r="84" fill="${C.orange}" stroke="${C.ink}" stroke-width="6"/>` +
      `<text y="-26" text-anchor="middle" font-size="26" font-weight="700" fill="#fff" letter-spacing="2">ALMOST</text><text y="44" text-anchor="middle" font-size="80" font-weight="700" fill="#fff">6×</text></g>`;
  }
  // magnifier
  const mg = vis(t, TL.mag0, le(2) - .1, .3, .3);
  if (mg > 0) {
    const e = ease(P(t, TL.mag0, le(2) - TL.mag0)), m = scr(lerp(0.5, 12, e), 14.6, 0.2);
    out += `<g transform="translate(${f1(m[0])},${f1(m[1] - 30)}) scale(${f1(back(clamp(mg)) * 100) / 100})" opacity="${f1(mg)}">` +
      line([40, 40], [96, 96], C.ink, 22, 'stroke-linecap="round"') + line([44, 44], [94, 94], C.teal, 12, 'stroke-linecap="round"') +
      `<circle r="62" fill="#fff" fill-opacity=".28" stroke="${C.ink}" stroke-width="9"/><circle r="62" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>` +
      `<text x="0" y="22" text-anchor="middle" font-size="64" font-weight="700" fill="${C.ink}">?</text></g>`;
  }
  // labels
  const rf = back(P(t, TL.front + .35, .4)) * (1 - P(t, TL.camGreen, .3));
  if (rf > 0) { const m = scr(4.3, 15.6); out += pill(m[0], m[1], 'ROAD FRONTAGE', C.yellow, C.ink, rf, 36, 30); }
  const ub = back(P(t, TL.power + .2, .4)) * (1 - P(t, TL.camGreen, .3));
  if (ub > 0) {
    const m = scr(3.3, 14.15, 3.2);
    out += `<g transform="translate(${f1(m[0])},${f1(m[1])}) scale(${f1(ub * 100) / 100})"><circle r="28" fill="#fff" stroke="${C.ink}" stroke-width="4"/><path d="M4 -18 L-10 3 L0 3 L-4 18 L10 -3 L0 -3 Z" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/></g>`;
  }
  const wb = back(P(t, TL.water, .4)) * (1 - P(t, TL.camGreen, .3));
  if (wb > 0) {
    const m = scr(5.6, 14.6, 1.6);
    out += `<g transform="translate(${f1(m[0])},${f1(m[1])}) scale(${f1(wb * 100) / 100})"><circle r="28" fill="#fff" stroke="${C.ink}" stroke-width="4"/><path d="M0 -17 C8 -5 12 1 12 6 A12 12 0 0 1 -12 6 C-12 1 -8 -5 0 -17 Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="3"/></g>`;
  }
  const fl = back(P(t, TL.flag + .2, .4)) * (1 - P(t, TL.camOver, .3));
  if (fl > 0) { const m = scr(12.2, 6.6, 0.4); out += pill(m[0], m[1], 'FLAG LOT', C.green, '#fff', fl, 38); }
  const sb = back(P(t, TL.skinny + .1, .4)) * (1 - P(t, TL.d0 + .2, .3));
  if (sb > 0) {
    const a = scr(8, 12.2, .05), b = scr(9, 12.2, .05);
    out += `<g opacity="${f1(clamp(sb))}">` + line(a, b, C.ink, 6, 'stroke-linecap="round"') + line([a[0], a[1] - 14], [a[0], a[1] + 14], C.ink, 6, 'stroke-linecap="round"') + line([b[0], b[1] - 14], [b[0], b[1] + 14], C.ink, 6, 'stroke-linecap="round"') + '</g>';
    out += pill((a[0] + b[0]) / 2 + 150, (a[1] + b[1]) / 2 + 40, 'SKINNY STRIP', C.yellow, C.ink, sb, 34);
  }
  const mp = back(P(t, wt(10, 'money pit'), .4));
  if (mp > 0) { const m = scr(PIT.x, PIT.y, 2.6); out += pill(m[0], m[1] - 40, 'MONEY PIT', C.red, '#fff', mp * (1 - P(t, TL.end, .3)), 44); }
  // coins (value draining off the green tag)
  for (let i = 0; i < 9; i++) {
    const t0 = TL.dollar + i * .09, p = P(t, t0, 1.0);
    if (p <= 0 || p >= 1) continue;
    const ang = -Math.PI / 2 + (i - 4) * .3, v = 420;
    const x = gP[0] + Math.cos(ang) * v * p, y = gP[1] - 80 + Math.sin(ang) * v * p + 600 * p * p;
    out += coin(x, y, 16, 1 - p * p);
  }
  // coins falling into the pit
  if (t > TL.bargain) {
    const m = scr(PIT.x, PIT.y, 0);
    for (let i = 0; i < 12; i++) {
      const t0 = TL.bargain + .2 + i * .14, p = P(t, t0, .7);
      if (p <= 0 || p >= 1) continue;
      const ox = ((i * 37) % 120) - 60;
      out += coin(m[0] + ox * (1 - p), m[1] - 380 + 380 * eIn(p), 15, p > .85 ? (1 - p) / .15 : 1);
    }
  }
  out += hook(t);
  out += banner(t);
  out += endCard(t);
  out += phone(t);
  out += `</g>`;
  out += `<rect x="28" y="150" width="1024" height="990" rx="44" fill="none" stroke="#DCCDB0" stroke-width="3"/>`;

  // ----- below panel -----
  out += captions(t);
  out += bill(t);
  CHIPS.forEach(c => out += chip(c, t));
  svg.innerHTML = out;
}

window.renderAt = renderAt;
window.DURATION = DURATION;
window.SFX = SFX;
renderAt(0);
})();
