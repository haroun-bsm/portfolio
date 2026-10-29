// debug-composite.mjs — verify dest-in feathering semantics on this sharp build
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const req = createRequire(fileURLToPath(new URL('../.10k/tools/package.json', import.meta.url)));
const sharp = req('sharp');
const root = fileURLToPath(new URL('..', import.meta.url));

const maskSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>';
const mask = await sharp(Buffer.from(maskSVG)).png().toBuffer();
const mm = await sharp(mask).metadata();
const base = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
const out = await sharp(base).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
const raw = await sharp(out).raw().toBuffer();
const px = (x, y) => [raw[(y * 100 + x) * 4], raw[(y * 100 + x) * 4 + 1], raw[(y * 100 + x) * 4 + 2], raw[(y * 100 + x) * 4 + 3]];
console.log('mask meta:', mm.width, 'x', mm.height, 'channels', mm.channels);
console.log('px(5,50):', px(5, 50), ' px(95,50):', px(95, 50));

// step 2: verify the portrait crop + resize actually produces pixels
const upright = await sharp(root + 'photos/profile.JPG').rotate().toBuffer();
const um = await sharp(upright).metadata();
console.log('upright:', um.width, 'x', um.height);
const crop = await sharp(upright).extract({ left: 245, top: 105, width: 1965, height: 2767 })
  .resize(980, 1380, { fit: 'fill' }).toBuffer();
const cm = await sharp(crop).metadata();
const cstats = await sharp(crop).stats();
console.log('crop:', cm.width, 'x', cm.height, 'channels', cm.channels, 'meanRGB:', cstats.channels.slice(0, 3).map(c => Math.round(c.mean)).join('/'));

// step 3: replicate feather() exactly and check its alpha map
async function feather(w, h, edges) {
  let img = sharp({ create: { width: w, height: h, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } });
  const grads = [];
  const lin = (id, x1, y1, x2, y2) =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`;
  const mk = [];
  if (edges.left) { mk.push(lin('l', 0, 0, 1, 0)); grads.push(`<rect x="0" y="0" width="${edges.left}" height="${h}" fill="url(#l)"/>`); }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs>${mk.join('')}</defs>${grads.join('\n')}</svg>`;
  const gradBuf = await sharp(Buffer.from(svg)).png().toBuffer();
  img = img.composite([{ input: gradBuf, blend: 'dest-out' }]);
  return img.png().toBuffer();
}
const fb = await feather(980, 1380, { left: 220, right: 46, top: 150, bottom: 320 });
const fr = await sharp(fb).raw().toBuffer();
const fpx = (x, y) => fr[(y * 980 + x) * 4 + 3];
console.log('feather alpha @(10,690):', fpx(10, 690), ' @(490,690):', fpx(490, 690), ' @(930,690):', fpx(930, 690));

// step 4: masked portrait
const masked = await sharp(crop).ensureAlpha().composite([{ input: fb, blend: 'dest-in' }]).png().toBuffer();
const mstats = await sharp(masked).stats();
console.log('masked meanRGB:', mstats.channels.slice(0, 3).map(c => Math.round(c.mean)).join('/'));
await sharp(masked).resize(300, null).jpeg({ quality: 80 }).toFile(root + 'review/pv-debug-masked.jpg');
console.log('debug masked preview written');
