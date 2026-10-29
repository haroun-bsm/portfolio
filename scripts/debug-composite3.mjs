// debug-composite3.mjs — reproduce the exact art.mjs composite failure:
// V1 = art.mjs chain (two chained .composite() calls)
// V2 = merged single .composite() call
// V0 = control (offset portrait only)
// Evidence: panel-region mean RGB per variant + 3 preview jpgs.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const req = createRequire(fileURLToPath(new URL('../.10k/tools/package.json', import.meta.url)));
const sharp = req('sharp');
const root = fileURLToPath(new URL('..', import.meta.url));

const W = 2560, H = 1440;
const BG = '#0B0A08', TEXT = '#F4EFE6', ACC = '#D4A853', ACC2 = '#3E5C58';
const panelW = 980, panelH = 1380, panelX = W - panelW - 70, panelY = 30;

const baseSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <radialGradient id="gA" cx="0.78" cy="0.40" r="0.55">
    <stop offset="0" stop-color="#E9C77D" stop-opacity="0.30"/>
    <stop offset="0.45" stop-color="${ACC}" stop-opacity="0.10"/>
    <stop offset="1" stop-color="${BG}" stop-opacity="0"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#gA)"/>
</svg>`;
const vign = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <linearGradient id="b2" x1="0" y1="1" x2="0" y2="0.55">
    <stop offset="0" stop-color="#060504" stop-opacity="0.78"/>
    <stop offset="0.55" stop-color="#060504" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#060504" stop-opacity="0"/>
  </linearGradient>
  <rect width="${W}" height="${H}" fill="url(#b2)"/>
</svg>`;

async function grainBuffer(w, h) {
  const mid = 128, amp = 26;
  const noise = await sharp({ create: { width: w, height: h, channels: 3, noise: { type: 'gaussian', mean: mid, sigma: amp } } }).png().toBuffer();
  return sharp(noise).linear(0.22, mid * (1 - 0.22)).png().toBuffer();
}
async function feather(w, h, edges) {
  const lin = (id, x1, y1, x2, y2) =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`;
  const mk = [], grads = [];
  if (edges.left) { mk.push(lin('l', 0, 0, 1, 0)); grads.push(`<rect x="0" y="0" width="${edges.left}" height="${h}" fill="url(#l)"/>`); }
  if (edges.right) { mk.push(lin('r', 1, 0, 0, 0)); grads.push(`<rect x="${w - edges.right}" y="0" width="${edges.right}" height="${h}" fill="url(#r)"/>`); }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs>${mk.join('')}</defs>${grads.join('\n')}</svg>`;
  const gradBuf = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
    .composite([{ input: gradBuf, blend: 'dest-out' }]).png().toBuffer();
}

// masked portrait — exact art.mjs desktop chain
const upright = await sharp(root + 'photos/profile.JPG').rotate().toBuffer();
const crop = await sharp(upright).extract({ left: 245, top: 105, width: 1965, height: 2767 })
  .resize(panelW, panelH, { fit: 'fill' }).toBuffer();
const masked = await sharp(crop).ensureAlpha()
  .composite([{ input: await feather(panelW, panelH, { left: 220, right: 46, top: 150, bottom: 320 }), blend: 'dest-in' }])
  .png().toBuffer();

const base = await sharp(Buffer.from(baseSVG)).png().toBuffer();
const grain = await grainBuffer(W, H);

const mk = async (name, pipeline, resizeW) => {
  const out = await pipeline;
  const st = await sharp(out).extract({ left: panelX, top: panelY, width: panelW, height: panelH }).stats();
  const mean = st.channels.slice(0, 3).map(c => Math.round(c.mean)).join('/');
  await sharp(out).resize(resizeW, null).jpeg({ quality: 80 }).toFile(root + 'review/pv-dbg-' + name + '.jpg');
  console.log(`${name}: panel meanRGB=${mean}`);
};

const offset = { input: masked, left: panelX, top: panelY };
await mk('v0', sharp(base).composite([offset]).png().toBuffer(), 800);
await mk('v1', sharp(base).composite([offset, { input: Buffer.from(vign) }])
  .composite([{ input: grain, blend: 'soft-light' }]).webp({ quality: 80 }).toBuffer(), 800);
await mk('v2', sharp(base).composite([offset, { input: Buffer.from(vign) }, { input: grain, blend: 'soft-light' }])
  .webp({ quality: 80 }).toBuffer(), 800);
console.log('expect: v0/v1/v2 all with portrait -> panel meanRGB far above bare base (~17/15/10)');
