// debug-composite2.mjs — find which staged composite loses the portrait
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const req = createRequire(fileURLToPath(new URL('../.10k/tools/package.json', import.meta.url)));
const sharp = req('sharp');
const root = fileURLToPath(new URL('..', import.meta.url));

const W = 2560, H = 1440;
const bgSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#131313"/><circle cx="1996" cy="576" r="500" fill="#221a10" fill-opacity="0.5"/></svg>`;
const base = await sharp(Buffer.from(bgSVG)).png().toBuffer();

const upright = await sharp(root + 'photos/profile.JPG').rotate().toBuffer();
const crop = await sharp(upright).extract({ left: 245, top: 105, width: 1965, height: 2767 })
  .resize(980, 1380, { fit: 'fill' }).toBuffer();
const cropInfo = await sharp(crop).metadata();
console.log('crop channels:', cropInfo.channels);

const one = await sharp(base).composite([{ input: crop, left: 1510, top: 30 }]).png().toBuffer();
const s1 = await sharp(one).stats();
console.log('after overlay crop, meanRGB:', s1.channels.slice(0, 3).map(c => Math.round(c.mean)).join('/'));
await sharp(one).resize(600, null).jpeg({ quality: 75 }).toFile(root + 'review/pv-debug-stage1.jpg');

// now with a mask applied (no feather)
const fullMask = await sharp({ create: { width: 980, height: 1380, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();
const maskedFull = await sharp(crop).ensureAlpha().composite([{ input: fullMask, blend: 'dest-in' }]).png().toBuffer();
const mfInfo = await sharp(maskedFull).metadata();
const mfRaw = await sharp(maskedFull).raw().toBuffer({ resolveWithObject: true });
console.log('maskedFull channels:', mfInfo.channels, 'size:', mfInfo.width, mfInfo.height, 'raw ch:', mfRaw.info.channels);
const a = mfRaw.data[(700 * 980 + 490) * 4 + 3];
console.log('maskedFull center alpha:', a);
const two = await sharp(one).composite([{ input: maskedFull, left: 1510, top: 30 }]).png().toBuffer();
const s2 = await sharp(two).stats();
console.log('after overlay maskedFull, meanRGB:', s2.channels.slice(0, 3).map(c => Math.round(c.mean)).join('/'));
await sharp(two).resize(600, null).jpeg({ quality: 75 }).toFile(root + 'review/pv-debug-stage2.jpg');
