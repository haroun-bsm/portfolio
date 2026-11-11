// build-site.mjs — the deploy build for site/: one CSS bundle + minified JS.
// Sources stay readable in site/; the page loads the generated files in site/assets/.
// Run: node scripts/build-site.mjs
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const site = path.join(root, 'site');
const out = path.join(site, 'assets');
const require = createRequire(import.meta.url);
const esbuild = require(path.join(root, '.10k/tools/node_modules/esbuild'));

const kb = n => `${(n / 1024).toFixed(1)} KiB`;

// Order is load-bearing: fonts first, style.css must override the fx tokens,
// cine.css layers last (same order the page used to ship).
const css = [];
for (const file of ['assets/fonts/fonts.css', 'scene.css', 'fx.css', 'style.css', 'cine.css']) {
  let text = await readFile(path.join(site, file), 'utf8');
  if (file === 'assets/fonts/fonts.css') {
    // bundle lives in /assets/, so make every font URL root-absolute
    text = text.replace(/url\((["']?)([^"')]+\.woff2)\1\)/g, (_, q, url) => `url(${q}/assets/fonts/${url}${q})`);
  }
  // page-level image URLs were written relative to site/index.html; keep them root-absolute
  text = text.replace(/url\((["']?)assets\//g, (_, q) => `url(${q}/assets/`);
  css.push(`/* ${file} */\n${text}`);
}
const cssBundle = await esbuild.transform(css.join('\n'), { loader: 'css', minify: true, charset: 'utf8' });
await writeFile(path.join(out, 'site.min.css'), cssBundle.code);

// JS: hero engine + page script stay eager; the enhancement layers become one idle chunk.
const js = async (files) => {
  const parts = [];
  for (const f of files) parts.push(await readFile(path.join(site, f), 'utf8'));
  const res = await esbuild.transform(parts.join('\n;\n'), { loader: 'js', minify: true, charset: 'utf8' });
  return res.code;
};
const write = async (name, code) => {
  const file = path.join(out, name);
  await writeFile(file, code);
  return (await stat(file)).size;
};

const sizes = {
  'site.min.css': await write('site.min.css', cssBundle.code),
  'site.min.js': await write('site.min.js', await js(['site.js'])),
  'boot.min.js': await write('boot.min.js', await js(['scene.js', 'plex.js', 'fx.js', 'cine.js'])),
};
for (const [file, size] of Object.entries(sizes)) console.log(`${file.padEnd(16)} ${kb(size)}`);
console.log('done');
