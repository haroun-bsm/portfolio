/* cine.js — bespoke cinematic layer for this page only (scene.js / fx.js / plex.js untouched).
   Luxury · Monochrome · Cinematic. Every effect is a pure function of scroll progress
   (+ a slow ambient clock), gates on IntersectionObserver, honours prefers-reduced-motion,
   and stops when settled or when the tab is hidden.

   modules
   1 pointer ring        difference-blend instrument cursor (fine pointers)
   2 measuring rail      document progress hairline + tiny percentage read
   3 nav choreography    hide/bow the header on the way down, return it on the way up,
                         and mark the room the visitor is currently standing in
   4 emulsion reveals    framed photography: clip-path mask + parallax pan inside the frame
   5 the record          track-record timeline draws itself with the scroll
   6 the sitter          signature 2.5-D portrait: WebGL luminance relief over the real
                         photograph — scroll camera push, pointer orbit, sweep light,
                         film grain. Depth comes from code, never from generated imagery. */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t * t * (3 - 2 * t);
  const setVar = (el, k, v) => { const s = typeof v === 'number' ? v.toFixed(4) : v; if (el['_' + k] !== s) { el['_' + k] = s; el.style.setProperty(k, s); } };
  const arrive = (el, vh) => { const r = el.getBoundingClientRect(); return clamp((vh - r.top) / (vh * 0.62 + r.height * 0.5)); };
  const pan = (el, vh) => { const r = el.getBoundingClientRect(); return clamp((vh * 0.55 - r.top) / (r.height + vh * 0.55)); };

  /* ---------- 2 · measuring rail ---------- */
  function rail() {
    const bar = document.createElement('div');
    bar.className = 'cine-rail'; bar.setAttribute('aria-hidden', 'true');
    bar.appendChild(document.createElement('i'));
    const read = document.createElement('p');
    read.className = 'cine-rail-read'; read.setAttribute('aria-hidden', 'true'); read.textContent = '00';
    document.body.append(bar, read);
    let lastRead = '';
    return {
      update() {
        const max = document.documentElement.scrollHeight - innerHeight;
        const p = max > 0 ? clamp(scrollY / max) : 0;
        setVar(bar, '--rp', p);
        const r = String(Math.round(p * 100)).padStart(2, '0');
        if (r !== lastRead) { lastRead = r; read.textContent = r; }
      }
    };
  }

  /* ---------- 1 · pointer ring ---------- */
  function pointerRing() {
    if (!FINE.matches || RM.matches) return;
    const c = document.createElement('div');
    c.className = 'cine-cursor'; c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    let x = -60, y = -60, tx = x, ty = y, raf = null, hot = false;
    const loop = () => {
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      raf = Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : null;
    };
    addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      if (!c.classList.contains('is-on')) c.classList.add('is-on');
      if (raf === null) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener('pointerover', e => {
      const h = !!(e.target && e.target.closest && e.target.closest('a, button, .copy-btn, input, textarea, [data-fx~="magnet"]'));
      if (h !== hot) { hot = h; c.classList.toggle('is-hot', h); }
    }, { passive: true });
    document.addEventListener('pointerleave', () => c.classList.remove('is-on'));
  }

  /* ---------- 3 · nav choreography ---------- */
  function navChoreo() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;
    if (RM.matches) return;
    let lastY = scrollY, away = false, ticking = false;
    const apply = () => {
      ticking = false;
      const y = scrollY, dy = y - lastY;
      lastY = y;
      if (y < 140) away = false;
      else if (dy > 6) away = true;       // reading down → the header bows out
      else if (dy < -6) away = false;     // it returns on the way up
      nav.classList.toggle('is-away', away);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
    addEventListener('scroll', onScroll, { passive: true });
    // the active room: the section under the midline marks its nav link
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    if ('IntersectionObserver' in window && byId.size) {
      const io = new IntersectionObserver(es => {
        es.forEach(e => {
          const a = byId.get(e.target.id);
          if (a && e.isIntersecting) { links.forEach(l => l.removeAttribute('data-current')); a.setAttribute('data-current', ''); }
        });
      }, { rootMargin: '-42% 0px -52% 0px' });
      byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  /* ---------- 4 · emulsion reveals (mask + pan) ---------- */
  function emulsion() {
    const frames = [...document.querySelectorAll('.card-media, .t-thumb, .id-card')].filter(f => f.querySelector('img'));
    frames.forEach(f => f.setAttribute('data-cine', 'frame'));
    if (RM.matches || !('IntersectionObserver' in window)) {
      frames.forEach(f => setVar(f, '--rv', 1));
      return;
    }
    const items = frames.map(el => ({ el, visible: true }));
    let raf = null;
    const tick = () => {
      raf = null;
      const vh = innerHeight;
      let busy = false;
      for (const it of items) {
        if (it.visible) {
          const r = arrive(it.el, vh);
          setVar(it.el, '--rv', r);
          setVar(it.el, '--pp', pan(it.el, vh));
          busy = busy || r < 0.999;
        }
      }
      if (busy) raf = requestAnimationFrame(tick);
    };
    const arm = () => { if (raf === null) raf = requestAnimationFrame(tick); };
    const io = new IntersectionObserver(es => es.forEach(e => {
      const it = items.find(i => i.el === e.target); if (it) { it.visible = e.isIntersecting; if (it.visible) arm(); }
    }), { rootMargin: '18% 0px' });
    items.forEach(i => io.observe(i.el));
    addEventListener('scroll', arm, { passive: true });
    addEventListener('resize', arm, { passive: true });
    arm();
  }

  /* ---------- 5 · the record draws itself ---------- */
  function record() {
    const tl = document.querySelector('.timeline');
    if (!tl) return;
    if (RM.matches) { setVar(tl, '--tlp', 1); return; }
    let raf = null;
    const tick = () => {
      raf = null;
      const vh = innerHeight, r = tl.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      setVar(tl, '--tlp', ease(clamp((vh * 0.56 - r.top) / (r.height + vh * 0.48))));
    };
    const arm = () => { if (raf === null) raf = requestAnimationFrame(tick); };
    addEventListener('scroll', arm, { passive: true });
    addEventListener('resize', arm, { passive: true });
    arm();
    return { update: tick };
  }

  /* ---------- 6 · the sitter ---------- */
  function sitter() {
    const section = document.querySelector('.sitter');
    const canvas = section && section.querySelector('.sitter-canvas');
    if (!section || !canvas) return;
    const strength = 0.024;                      // relief displacement, kept gentle for identity
    let gl = null, loc = {}, ok = false, visible = false, raf = null, last = 0;
    const S = { p: 0, target: 0, t: Math.random() * 60, in: 0, ptr: { x: 0, y: 0, tx: 0, ty: 0 } };

    const VS = 'attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;v.y=1.-v.y;gl_Position=vec4(a,0.,1.);}';
    const FS = [
      'precision mediump float;varying vec2 v;',
      'uniform sampler2D img;uniform vec2 uRes,uImg,uPtr;uniform float uP,uIn,uT;',
      'float lum(vec2 uv){vec3 c=texture2D(img,uv).rgb;return dot(c,vec3(.299,.587,.114));}',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'void main(){',
      ' float ca=uRes.x/uRes.y,ia=uImg.x/uImg.y;',
      ' vec2 cov=ca>ia?vec2(1.,ia/ca):vec2(ca/ia,1.);',
      ' float pe=uP*uP*(3.-2.*uP);',
      ' vec2 ctr=vec2(uPtr.x*.02,uPtr.y*.012-(pe-.45)*.05);',
      ' vec2 uv=(v-.5)*cov*(1.02+.085*pe)+ctr+.5;',
      ' vec2 e=vec2(1.5/uImg.x,1.5/uImg.y);',
      ' float l0=lum(uv);',
      ' float lx=lum(uv+vec2(e.x,0.))-lum(uv-vec2(e.x,0.));',
      ' float ly=lum(uv+vec2(0.,e.y))-lum(uv-vec2(0.,e.y));',
      ' vec2 uv2=uv+vec2(lx,ly)*(0.022*(0.6+l0));',
      ' float shade=clamp(1.-(lx*.34+ly*.22)*(.55+uPtr.x*.35),.9,1.16);',
      ' float gray=lum(clamp(uv2,vec2(.001),vec2(.999)));',
      ' vec3 col=vec3(gray)*shade*vec3(1.055,.902,.812);',
      ' float sw=fract(uT*.042+pe*.85);',
      ' float band=exp(-pow((v.x-sw)*3.6,2.));',
      ' col+=band*.05*(.35+gray);',
      ' col+=(hash(v*uRes+floor(uT*24.)*61.)-.5)*.048;',
      ' float d=length((v-.5)*vec2(1.08,1.));',
      ' col*=1.-.36*smoothstep(.5,1.05,d);',
      ' float mask=smoothstep(0.,.055,v.x)*smoothstep(1.,.945,v.x)*smoothstep(0.,.055,v.y)*smoothstep(1.,.945,v.y);',
      ' mask*=uIn;',
      ' gl_FragColor=vec4(col*mask,mask);}'
    ].join('\n');

    const pinP = () => {
      const r = section.getBoundingClientRect(), vh = innerHeight;
      const range = r.height - vh;
      return range > 0 ? clamp(-r.top / range) : clamp((vh - r.top) / (vh + r.height));
    };
    const approach = () => {
      const r = section.getBoundingClientRect();
      return clamp(1 - Math.max(0, r.top) / innerHeight);
    };

    function sh(type) {
      const s = gl.createShader(type);
      gl.shaderSource(s, type === gl.VERTEX_SHADER ? VS : FS);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    }
    async function boot() {
      try {
        gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
        if (!gl) throw new Error('no webgl');
        const prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
        gl.useProgram(prog);
        loc.img = gl.getUniformLocation(prog, 'img');
        ['uRes', 'uImg', 'uP', 'uIn', 'uT', 'uPtr'].forEach(k => (loc[k] = gl.getUniformLocation(prog, k)));
        gl.uniform1i(loc.img, 0);
        const img = new Image();
        img.decoding = 'async';
        img.src = canvas.dataset.portrait;
        await img.decode();
        gl.uniform2f(loc.uImg, img.naturalWidth, img.naturalHeight);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(w => gl.texParameteri(gl.TEXTURE_2D, w, gl.CLAMP_TO_EDGE));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const a = gl.getAttribLocation(prog, 'a');
        gl.enableVertexAttribArray(a);
        gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        ok = true;
        resize();
        kick();
      } catch (e) {
        section.classList.add('is-static');
      }
    }
    function resize() {
      if (!ok) return;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(loc.uRes, canvas.width, canvas.height);
    }
    function paint() {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(loc.uP, S.p);
      gl.uniform1f(loc.uIn, S.in);
      gl.uniform1f(loc.uT, S.t);
      gl.uniform2f(loc.uPtr, S.ptr.x, S.ptr.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function frame(now) {
      raf = null;
      const dt = last ? Math.min(100, now - last) : 16;
      last = now;
      S.t += dt / 1000;
      const k = 1 - Math.pow(1 - 0.09, dt / 16.667);
      S.p += (S.target - S.p) * k;
      S.ptr.x += (S.ptr.tx - S.ptr.x) * k;
      S.ptr.y += (S.ptr.ty - S.ptr.y) * k;
      const ap = approach();
      S.in = 1 - Math.pow(1 - ap, 2);                      // rises while the stage travels in
      S.in *= ease(clamp((1 - S.p) / 0.1));                // breathes out at the end of the pin
      setVar(section, '--sp', S.p);
      paint();
      if (visible && !document.hidden && !RM.matches) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    const kick = () => {
      if (!ok) return;
      if (RM.matches) {
        S.p = S.target = 0.42; S.in = 1; S.t = 12;
        setVar(section, '--sp', 0.42);
        paint();
        return;
      }
      S.target = pinP();
      if (raf === null && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '14% 0px' }).observe(section);
    }
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => { resize(); kick(); }, { passive: true });
    if (FINE.matches) addEventListener('pointermove', e => {
      S.ptr.tx = (e.clientX / innerWidth) * 2 - 1;
      S.ptr.ty = (e.clientY / innerHeight) * 2 - 1;
      kick();
    }, { passive: true });
    RM.addEventListener('change', kick);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) kick(); });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); ok = false; section.classList.add('is-static'); }, { once: true });
    boot();
  }

  /* ---------- start ---------- */
  function start() {
    if (RM.matches) document.documentElement.classList.add('cine-still');
    const mods = [];
    if (!RM.matches) mods.push(rail(), record());
    pointerRing();
    navChoreo();
    emulsion();
    sitter();
    if (mods.length) {
      let raf = null;
      const tickAll = () => { raf = null; mods.forEach(m => m.update()); };
      addEventListener('scroll', () => { if (raf === null) raf = requestAnimationFrame(tickAll); }, { passive: true });
      addEventListener('resize', tickAll, { passive: true });
      tickAll();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
