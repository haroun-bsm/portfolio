// art.mjs — code-generated + user-supplied brand art for the site (free ladder: user assets → code art).
// Run: node scripts/art.mjs   (uses sharp from .10k/tools/node_modules — no global install)
//
// Hero = graded portrait (photos/profile.JPG, gold zellige wall) composed into 「 data as cinema 」
// artboards: subject right/center, calm dark type space left (band 1 top-left, band 2 bottom-left),
// data-field texture, champagne light zone. Depth maps mirror the layout: subject = near, field = far.
// Work shots come straight from the user's own project visuals in photos/.
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const sharp = require(fileURLToPath(new URL('../.10k/tools/node_modules/sharp', import.meta.url)));
import { writeFile } from 'fs/promises';

const site = (p) => fileURLToPath(new URL('../site/assets/' + p, import.meta.url));
const photo = (p) => fileURLToPath(new URL('../photos/' + p, import.meta.url));

const BG = '#0B0A08', SURF = '#14120F', TEXT = '#F4EFE6', MUTED = '#9A917F', ACC = '#D4A853', ACC2 = '#3E5C58';

// ---------- shared helpers ----------
async function grainBuffer(w, h) {
  const mid = 128, amp = 26;
  const noise = await sharp({ create: { width: w, height: h, channels: 3, noise: { type: 'gaussian', mean: mid, sigma: amp } } }).png().toBuffer();
  return sharp(noise).linear(0.22, mid * (1 - 0.22)).png().toBuffer(); // out = 0.22*in + ~100 → low-contrast noise
}

// Feather an image into the artboard: subtractive alpha edges (dest-out chain).
async function feather(w, h, edges) {
  let img = sharp({ create: { width: w, height: h, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } });
  const grads = [];
  const lin = (id, x1, y1, x2, y2) =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`;
  const mk = [];
  if (edges.left) { mk.push(lin('l', 0, 0, 1, 0)); grads.push(`<rect x="0" y="0" width="${edges.left}" height="${h}" fill="url(#l)"/>`); }
  if (edges.right) { mk.push(lin('r', 1, 0, 0, 0)); grads.push(`<rect x="${w - edges.right}" y="0" width="${edges.right}" height="${h}" fill="url(#r)"/>`); }
  if (edges.top) { mk.push(lin('t', 0, 0, 0, 1)); grads.push(`<rect x="0" y="0" width="${w}" height="${edges.top}" fill="url(#t)"/>`); }
  if (edges.bottom) { mk.push(lin('b', 0, 1, 0, 0)); grads.push(`<rect x="0" y="${h - edges.bottom}" width="${w}" height="${edges.bottom}" fill="url(#b)"/>`); }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs>${mk.join('')}</defs>${grads.join('\n')}</svg>`;
  const gradBuf = await sharp(Buffer.from(svg)).png().toBuffer(); // gradient rects, overlapping plainly
  img = img.composite([{ input: gradBuf, blend: 'dest-out' }]);     // subtract each gradient from full opacity
  return img.png().toBuffer();
}

// Load + orient the portrait once (EXIF 8), then crop/grade per artboard in a second
// sharp instance so extract() coordinates are guaranteed to be on the upright raster.
async function uprightPortrait() {
  return sharp(photo('profile.JPG')).rotate().toBuffer();
}

// Warm grade pass composited over a graded portrait (soft-light champagne ink).
async function warm(w, h) {
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 212, g: 168, b: 83, alpha: 0.16 } } })
    .png().toBuffer();
}

async function portraitCropped(byteBuf, crop, panelW, panelH) {
  return sharp(byteBuf)
    .extract(crop)
    .modulate({ brightness: 0.84, saturation: 0.9 })
    .linear(0.94, 10)
    .resize(panelW, panelH, { fit: 'fill' })
    .composite([{ input: await warm(panelW, panelH), blend: 'soft-light' }])
    .toBuffer();
}

// ---------- hero: desktop artboard 2560×1440 ----------
async function heroDesktop() {
  const W = 2560, H = 1440;

  // data-field texture, kept out of the type zones (band 1 top-left, band 2 bottom-left)
  const line = (d, stroke, op, w2 = 1.4, dash = '') =>
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-opacity="${op}" stroke-width="${w2}"${dash ? ' stroke-dasharray="' + dash + '"' : ''}/>`;
  const streams = [
    line('M-80 980 C 620 900, 1500 1040, 2480 860', ACC, 0.24, 1.5),
    line('M-80 1100 C 700 1030, 1560 1170, 2480 1000', ACC2, 0.18, 1.4, '2 22'),
    line('M-80 860 C 560 830, 1200 930, 2400 760', ACC, 0.15),
    line('M-80 730 C 600 690, 1300 800, 2420 640', ACC2, 0.12),
    line('M-80 1230 C 720 1190, 1520 1290, 2480 1140', ACC, 0.10),
    line('M-80 1010 C 640 960, 1440 1090, 2480 930', ACC, 0.18, 1.2, '2 26')
  ].join('\n  ');
  const nodes = [
    [300, 946, 3.2, ACC, 0.55], [520, 916, 2.2, ACC2, 0.7], [760, 952, 4.2, ACC, 0.6], [1010, 1010, 2.6, ACC, 0.4],
    [1240, 1032, 3.4, ACC2, 0.75], [1460, 1046, 2.0, ACC, 0.5], [640, 858, 2.4, ACC, 0.5], [980, 892, 1.8, ACC2, 0.65],
    [1330, 960, 2.6, ACC, 0.45], [1180, 1164, 3.0, ACC, 0.4], [860, 1214, 2.2, ACC2, 0.6], [420, 1124, 1.7, ACC, 0.45],
    [1620, 1080, 2.0, ACC, 0.35], [1520, 780, 1.7, ACC2, 0.5]
  ].map(n => `<circle cx="${n[0]}" cy="${n[1]}" r="${n[2]}" fill="${n[3]}" fill-opacity="${n[4]}"/>`).join('\n  ');
  // small tick/dash clusters along the stream diagonals — the "measured data" note-mark
  const ticks = [
    [240, 900, 18], [700, 930, 12], [1120, 1000, 16], [1380, 940, 10], [520, 1200, 14], [1460, 1230, 18]
  ].map(([x, y, s]) => `
    <path d="M${x} ${y} l ${s} ${-s * 0.10}" stroke="${TEXT}" stroke-opacity="0.12" stroke-width="1.2"/>
    <path d="M${x + s * 0.7} ${y + 10} l ${s} ${-s * 0.10}" stroke="${TEXT}" stroke-opacity="0.09" stroke-width="1.2"/>
    <path d="M${x + s * 1.4} ${y + 20} l ${s} ${-s * 0.10}" stroke="${TEXT}" stroke-opacity="0.06" stroke-width="1.2"/>`).join('\n  ');
  const graticule = Array.from({ length: 12 }, (_, i) =>
    `<path d="M${140 + i * 216} 120 L${140 + i * 216} ${H - 110}" stroke="${TEXT}" stroke-opacity="0.045" stroke-width="1"/>`).join('\n  ') +
    Array.from({ length: 6 }, (_, i) =>
    `<path d="M60 ${180 + i * 224} L${W - 60} ${180 + i * 224}" stroke="${TEXT}" stroke-opacity="0.03" stroke-width="1"/>`).join('\n  ');

  const baseSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <radialGradient id="gA" cx="0.78" cy="0.40" r="0.55">
    <stop offset="0" stop-color="#E9C77D" stop-opacity="0.30"/>
    <stop offset="0.45" stop-color="${ACC}" stop-opacity="0.10"/>
    <stop offset="1" stop-color="${BG}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gB" cx="0.62" cy="0.78" r="0.45">
    <stop offset="0" stop-color="${ACC2}" stop-opacity="0.28"/>
    <stop offset="0.55" stop-color="#234A44" stop-opacity="0.10"/>
    <stop offset="1" stop-color="${BG}" stop-opacity="0"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#gA)"/>
  <rect width="${W}" height="${H}" fill="url(#gB)"/>
  ${graticule}
  ${streams}
  ${nodes}
  ${ticks}
</svg>`;

  // portrait panel: 980×1380 at the right edge — head kept whole, tiles above it stay in frame
  const panelW = 980, panelH = 1380, panelX = W - panelW - 70, panelY = 30;
  const portrait = await portraitCropped(await uprightPortrait(),
    { left: 245, top: 105, width: 1965, height: 2767 }, panelW, panelH);
  const masked = await sharp(portrait)
    .ensureAlpha()
    .composite([{ input: await feather(panelW, panelH, { left: 220, right: 46, top: 150, bottom: 320 }), blend: 'dest-in' }])
    .png().toBuffer();

  const base = await sharp(Buffer.from(baseSVG)).png().toBuffer();
  const vign = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <linearGradient id="b2" x1="0" y1="1" x2="0" y2="0.55">
    <stop offset="0" stop-color="#060504" stop-opacity="0.78"/>
    <stop offset="0.55" stop-color="#060504" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#060504" stop-opacity="0"/>
  </linearGradient>
  <rect width="${W}" height="${H}" fill="url(#b2)"/>
  <radialGradient id="b1" cx="0.22" cy="0.16" r="0.42">
    <stop offset="0" stop-color="#060504" stop-opacity="0.5"/>
    <stop offset="1" stop-color="#060504" stop-opacity="0"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#b1)"/>
  <radialGradient id="vig" cx="0.5" cy="0.46" r="0.78">
    <stop offset="0.55" stop-color="#050403" stop-opacity="0"/>
    <stop offset="1" stop-color="#050403" stop-opacity="0.55"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;

  // sharp law: one .composite() call per pipeline — a chained second call REPLACES the first array
  const art = await sharp(base)
    .composite([
      { input: masked, left: panelX, top: panelY },
      { input: Buffer.from(vign) },
      { input: await grainBuffer(W, H), blend: 'soft-light' }
    ])
    .webp({ quality: 80 }).toBuffer();
  await sharp(art).toFile(site('hero-field.webp'));
  await sharp(art).resize(1280, 720).jpeg({ quality: 72, mozjpeg: true }).toFile(site('hero-poster.jpg'));
  // real og compose: 1200×630 cover-crop of the composed artboard. Width fits exactly at cover,
  // so the full composition (portrait right, dark type space left) survives into the share card.
  await sharp(art).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 76, mozjpeg: true }).toFile(site('og.jpg'));

  // depth: subject near (bright), field far (dark) — type zones stay dark so they never swim
  const depthSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <rect width="1280" height="720" fill="#000"/>
  <radialGradient id="s" cx="${(panelX + panelW * 0.52) / W * 1280}" cy="342" r="430" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#E8E8E8"/>
    <stop offset="0.45" stop-color="#6E6E6E"/>
    <stop offset="0.8" stop-color="#161616"/>
    <stop offset="1" stop-color="#000000"/>
  </radialGradient>
  <rect width="1280" height="720" fill="url(#s)"/>
</svg>`;
  await sharp(Buffer.from(depthSVG)).png().toFile(site('hero-field-depth.png'));
}

// ---------- hero: mobile artboard 1240×2685 (portrait composition for the phone frame) ----------
async function heroMobile() {
  const W = 1240, H = 2685;

  const line = (d, stroke, op, w2 = 1.4, dash = '') =>
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-opacity="${op}" stroke-width="${w2}"${dash ? ' stroke-dasharray="' + dash + '"' : ''}/>`;
  const streams = [
    line('M-40 2160 C 300 2100, 620 2180, 1280 2080', ACC, 0.22, 1.4),
    line('M-40 2320 C 360 2260, 760 2340, 1280 2260', ACC, 0.14, 1.2, '2 22'),
    line('M-40 2470 C 400 2430, 820 2500, 1280 2430', ACC2, 0.16),
    line('M-40 2000 C 340 1990, 700 2060, 1280 1994', ACC2, 0.10)
  ].join('\n  ');
  const nodes = [
    [240, 2130, 3.0, ACC, 0.55], [480, 2098, 2.2, ACC2, 0.7], [720, 2160, 3.6, ACC, 0.55], [960, 2130, 2.2, ACC, 0.4],
    [380, 2296, 2.4, ACC, 0.5], [660, 2320, 1.8, ACC2, 0.6], [900, 2338, 2.6, ACC, 0.4], [560, 2452, 2.0, ACC, 0.45]
  ].map(n => `<circle cx="${n[0]}" cy="${n[1]}" r="${n[2]}" fill="${n[3]}" fill-opacity="${n[4]}"/>`).join('\n  ');
  const ticks = [
    [220, 2060, 14], [640, 2080, 12], [900, 2200, 14]
  ].map(([x, y, s]) => `
    <path d="M${x} ${y} l ${s} ${-s * 0.10}" stroke="${TEXT}" stroke-opacity="0.12" stroke-width="1.1"/>
    <path d="M${x + s * 0.7} ${y + 10} l ${s} ${-s * 0.10}" stroke="${TEXT}" stroke-opacity="0.08" stroke-width="1.1"/>`).join('\n  ');
  const graticule = Array.from({ length: 9 }, (_, i) =>
    `<path d="M${120 + i * 132} 100 L${120 + i * 132} ${H - 90}" stroke="${TEXT}" stroke-opacity="0.04" stroke-width="1"/>`).join('\n  ');

  const baseSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <radialGradient id="mA" cx="0.5" cy="0.36" r="0.5">
    <stop offset="0" stop-color="#E9C77D" stop-opacity="0.20"/>
    <stop offset="0.5" stop-color="${ACC}" stop-opacity="0.07"/>
    <stop offset="1" stop-color="${BG}" stop-opacity="0"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#mA)"/>
  ${graticule}
  ${streams}
  ${nodes}
  ${ticks}
</svg>`;

  // head-and-chest panel between the two caption zones: x 60..1180, y 740..1900
  const panelW = 1120, panelH = 1160, panelX = 60, panelY = 740;
  const portrait = await portraitCropped(await uprightPortrait(),
    { left: 368, top: 167, width: 1719, height: 1781 }, panelW, panelH);
  const masked = await sharp(portrait)
    .ensureAlpha()
    .composite([{ input: await feather(panelW, panelH, { left: 150, right: 170, top: 210, bottom: 330 }), blend: 'dest-in' }])
    .png().toBuffer();

  const base = await sharp(Buffer.from(baseSVG)).png().toBuffer();
  const vign = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <linearGradient id="b2" x1="0" y1="1" x2="0" y2="0.7">
    <stop offset="0" stop-color="#060504" stop-opacity="0.85"/>
    <stop offset="0.55" stop-color="#060504" stop-opacity="0.4"/>
    <stop offset="1" stop-color="#060504" stop-opacity="0"/>
  </linearGradient>
  <rect width="${W}" height="${H}" fill="url(#b2)"/>
  <linearGradient id="t1" x1="0" y1="0" x2="0" y2="0.22">
    <stop offset="0" stop-color="#060504" stop-opacity="0.42"/>
    <stop offset="1" stop-color="#060504" stop-opacity="0"/>
  </linearGradient>
  <rect width="${W}" height="${H}" fill="url(#t1)"/>
</svg>`;

  // sharp law: one .composite() call per pipeline — a chained second call REPLACES the first array
  const art = await sharp(base)
    .composite([
      { input: masked, left: panelX, top: panelY },
      { input: Buffer.from(vign) },
      { input: await grainBuffer(W, H), blend: 'soft-light' }
    ])
    .webp({ quality: 80 }).toBuffer();
  await sharp(art).toFile(site('hero-field-m.webp'));

  const depthSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="1343">
  <rect width="620" height="1343" fill="#000"/>
  <radialGradient id="s" cx="310" cy="660" r="360" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#E8E8E8"/>
    <stop offset="0.45" stop-color="#6E6E6E"/>
    <stop offset="0.8" stop-color="#161616"/>
    <stop offset="1" stop-color="#000000"/>
  </radialGradient>
  <rect width="620" height="1343" fill="url(#s)"/>
</svg>`;
  await sharp(Buffer.from(depthSVG)).png().toFile(site('hero-field-m-depth.png'));
}

// ---------- work shots from the user's own project visuals ----------
async function workShots() {
  // flagship: the InvoiceGuard review queue (real system screen)
  await sharp(photo('InvoiceGuard — Intelligent Utility Billing Audit & Anomaly Detection System.png'))
    .resize(1320, 604, { fit: 'cover' }).webp({ quality: 80 }).toFile(site('work/case-0.webp'));
  // card 1: VIF Cosmetics skin-analysis interface (real product UI)
  await sharp(photo('ai skin analysis.png'))
    .resize(1030, 644, { fit: 'cover' }).webp({ quality: 78 }).toFile(site('work/case-1.webp'));
  // card 2: RAG assistant graphic (left tile of the overview sheet)
  await sharp(photo('Tech Portfolio_ AI, Analytics, and Data Systems.png'))
    .extract({ left: 0, top: 512, width: 1024, height: 512 })
    .resize(1030, 515, { fit: 'cover' }).webp({ quality: 78 }).toFile(site('work/case-2.webp'));
  // card 3: fraud stream — stylized code-art placeholder (announced as such on the card)
  await (await fraudArt()).webp({ quality: 78 }).toFile(site('work/case-3.webp'));
  // card 4: banking warehouse graphic (right tile of the overview sheet)
  await sharp(photo('Tech Portfolio_ AI, Analytics, and Data Systems.png'))
    .extract({ left: 1024, top: 512, width: 512, height: 512 })
    .resize(512, 320, { fit: 'cover' }).webp({ quality: 78 }).toFile(site('work/case-4.webp'));
}

async function fraudArt() {
  const W = 1648, H = 1030;
  let bars = '';
  for (let b = 0; b < 34; b++) {
    const x = 150 + b * 44, hh = Math.round(110 + Math.abs(Math.sin(b * 1.7)) * 480), hot = b % 5 === 3;
    bars += `<rect x="${x}" y="${870 - hh}" width="16" height="${hh}" fill="${hot ? ACC : MUTED}" fill-opacity="${hot ? 0.35 : 0.12}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${SURF}"/>
  ${bars}
  <rect x="0" y="876" width="${W}" height="1.2" fill="${TEXT}" fill-opacity="0.14"/>
  <radialGradient id="w3" cx="0.5" cy="0.42" r="0.85">
    <stop offset="0.5" stop-color="#000000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.5"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#w3)"/>
</svg>`;
  return sharp(Buffer.from(svg)).png(); // pipeline node (baked to webp in main)
}

// ---------- favicon: pipeline mark (unchanged) ----------
const faviconSVG = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${SURF}"/>
  <path d="M14 46 L28 34 L44 20" stroke="${ACC}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <circle cx="14" cy="46" r="4.6" fill="${ACC}"/>
  <circle cx="28" cy="34" r="3.4" fill="${ACC}" fill-opacity="0.75"/>
  <circle cx="44" cy="20" r="5.6" fill="${ACC}" stroke="${BG}" stroke-width="1"/>
  <circle cx="52" cy="34" r="2.2" fill="${ACC2}"/>
  <circle cx="10" cy="26" r="1.8" fill="${MUTED}" fill-opacity="0.8"/>
</svg>`;

async function main() {
  await heroDesktop();
  await heroMobile();
  await workShots();
  await sharp(Buffer.from(faviconSVG(32))).png().toFile(site('favicon-32.png'));
  await sharp(Buffer.from(faviconSVG(180))).png().toFile(site('apple-touch-180.png'));
  await writeFile(site('favicon.svg'), faviconSVG(64), 'utf8');
  console.log('art: OK (portrait hero desktop+mobile, work shots, icons)');
}
main().catch((e) => { console.error(e); process.exit(1); });
