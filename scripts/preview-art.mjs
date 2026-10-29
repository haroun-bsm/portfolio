// preview-art.mjs — small review copies of the four composed/depth assets for eyes-on judgment
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const req = createRequire(fileURLToPath(new URL('../.10k/tools/package.json', import.meta.url)));
const sharp = req('sharp');
const root = fileURLToPath(new URL('..', import.meta.url));
const A = root + 'site/assets/';

await sharp(A + 'hero-field.webp').resize(900, null).jpeg({ quality: 82 }).toFile(root + 'review/pv-hero-d.jpg');
await sharp(A + 'hero-field-m.webp').resize(420, null).jpeg({ quality: 82 }).toFile(root + 'review/pv-hero-m.jpg');
await sharp(A + 'hero-field-depth.png').resize(700, null).jpeg({ quality: 82 }).toFile(root + 'review/pv-depth-d.jpg');
await sharp(A + 'hero-field-m-depth.png').resize(300, null).jpeg({ quality: 82 }).toFile(root + 'review/pv-depth-m.jpg');
console.log('previews: review/pv-hero-d.jpg pv-hero-m.jpg pv-depth-d.jpg pv-depth-m.jpg');
