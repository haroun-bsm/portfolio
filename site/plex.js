/* plex.js — two scroll-driven 3D scenes, raw WebGL, zero dependencies.
   "plexus" (hero): a data-pipeline constellation the camera flies through as the visitor
                    scrolls — nodes on a pipeline rack, connecting wires, and particle
                    streams that speed through them. Pointer adds a small orbit.
   "orb" (contact): a wireframe instrument shell that rotates in with the invitation,
                    parked right of the column on desktop, centered on phones.

   Shared contract with the rest of the engine family:
   - every frame is a pure function of scroll progress (+ a slow ambient pulse) →
     deterministic and reversible under scrubbing,
   - reduced motion paints one composed frame and never loops,
   - scenes pause off-screen and when the tab is hidden,
   - any WebGL failure hides the canvas; the page beneath is composed without it.
   One-off behavior lives here; engine files (scene.js / fx.js) stay untouched. */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const PHONE = matchMedia('(max-width: 720px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11);

  /* ---------- tiny mat4 + program helpers (column-major) ---------- */
  const sh = (gl, ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
  const prog = (gl, vs, fs) => { const p = gl.createProgram();
    gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link');
    return p; };
  const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2), d = 1 / (n - f);
    return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (n + f) * d, -1, 0, 0, 2 * n * f * d, 0]; };
  const mul = (a, b) => { const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o; };
  const rotY = t => [Math.cos(t), 0, -Math.sin(t), 0, 0, 1, 0, 0, Math.sin(t), 0, Math.cos(t), 0, 0, 0, 0, 1];
  const rotX = t => [1, 0, 0, 0, 0, Math.cos(t), Math.sin(t), 0, 0, -Math.sin(t), Math.cos(t), 0, 0, 0, 0, 1];
  const trs = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

  const VS = 'attribute vec3 aPos;attribute vec3 aCol;attribute float aSize;' +
    'uniform mat4 uPV;uniform float uPt;varying vec3 vCol;varying float vZ;' +
    'void main(){vec4 c=uPV*vec4(aPos,1.);vZ=c.w;gl_Position=c;' +
    'gl_PointSize=aSize*uPt/max(0.15,c.w);vCol=aCol;}';
  const FS_HEAD = 'precision mediump float;varying vec3 vCol;varying float vZ;uniform float uA;';
  /* points: soft round sprites; lines: plain (gl_PointCoord is undefined on lines) */
  const FS_PT = FS_HEAD + 'void main(){vec2 u=gl_PointCoord-vec2(.5);float a=smoothstep(.5,.1,length(u))*uA;' +
    'gl_FragColor=vec4(vCol*a,a);}';
  const FS_LN = FS_HEAD + 'void main(){gl_FragColor=vec4(vCol*uA,uA);}';

  /* ---------- interleaved batcher: pos3 + col3 + size1 ---------- */
  class batch {
    constructor(gl, program, mode) {
      this.gl = gl; this.prog = program; this.mode = mode; this.n = 0; this.buf = gl.createBuffer();
      this.aPos = gl.getAttribLocation(program, 'aPos');
      this.aCol = gl.getAttribLocation(program, 'aCol');
      this.aSize = gl.getAttribLocation(program, 'aSize');
      this.uPV = gl.getUniformLocation(program, 'uPV');
      this.uPt = gl.getUniformLocation(program, 'uPt');
      this.uA = gl.getUniformLocation(program, 'uA');
    }
    write(arr) { this.n = arr.length / 7; this.d = new Float32Array(arr); }
    draw(pv, pt, alpha) {
      if (!this.n || !this.d) return;
      const g = this.gl;
      g.useProgram(this.prog);
      g.bindBuffer(g.ARRAY_BUFFER, this.buf);
      g.bufferData(g.ARRAY_BUFFER, this.d, g.DYNAMIC_DRAW);
      for (const [loc, size, off] of [[this.aPos, 3, 0], [this.aCol, 3, 12], [this.aSize, 1, 24]]) {
        if (loc < 0) continue;
        g.enableVertexAttribArray(loc);
        g.vertexAttribPointer(loc, size, g.FLOAT, false, 28, off);
      }
      g.uniformMatrix4fv(this.uPV, false, pv);
      g.uniform1f(this.uPt, pt); g.uniform1f(this.uA, alpha);
      g.drawArrays(this.mode, 0, this.n);
    }
  }

  /* ============================== plexus geometry ==============================
     Four pipeline lanes across 7 columns: a rack the eye reads as Kafka rails,
     exchange columns, and long cross-shipments between them. */
  function plexusGeometry(small) {
    const lUse = () => (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(7);
    const R = lUse();
    const lanes = 4, cols = 7, N = [], E = [];
    for (let l = 0; l < lanes; l++) for (let i = 0; i < cols; i++) {
      const x = -10.5 + (21 * i) / (cols - 1);
      const y = (l - (lanes - 1) / 2) * 2.4 + (R() - 0.5) * 0.8;
      const z = (R() - 0.5) * 6.6;
      N.push({ x, y, z, hub: i === 0 || i === cols - 1 || R() > 0.82 });
    }
    const id = (l, i) => l * cols + i;
    for (let l = 0; l < lanes; l++) for (let i = 0; i < cols - 1; i++) E.push([id(l, i), id(l, i + 1), R() * 6.28]);
    for (const i of [0, 2, 4]) for (let l = 0; l < lanes - 1; l++) E.push([id(l, i), id(l + 1, i), R() * 6.28]);
    for (let k = 0; k < 5; k++) E.push([id((R() * lanes) | 0, (R() * cols) | 0), id((R() * lanes) | 0, (R() * cols) | 0), R() * 6.28]);
    const PC = small ? 160 : 240, P = [];
    for (let i = 0; i < PC; i++) P.push({ e: E[(R() * E.length) | 0], t: R(), s: 0.09 + R() * 0.2, sz: small ? 0.05 + R() * 0.07 : 0.05 + R() * 0.08 });
    return { N, E, P };
  }

  /* ============================== orb geometry ============================== */
  function orbBuild(small) {
    const R = 1.14, seg = 56, rings = [];
    for (let l = 1; l <= 4; l++) {
      const th = -Math.PI / 2 + (l * Math.PI) / 5, ry = Math.sin(th) * R, y = Math.cos(th) * R, pts = [];
      for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push([Math.cos(a) * ry, y, Math.sin(a) * ry]); }
      rings.push(pts);
    }
    for (let m = 0; m < 8; m++) {
      const a0 = (m / 8) * Math.PI * 2, pts = [];
      for (let i = 0; i <= seg; i++) { const th = -Math.PI / 2 + (i / seg) * Math.PI; pts.push([Math.cos(a0) * Math.cos(th) * R, Math.sin(th) * R, Math.sin(a0) * Math.cos(th) * R]); }
      rings.push(pts);
    }
    const lUse = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(31);
    const nodes = [];
    for (let i = 0; i < 42; i++) {
      const cth = -1 + 2 * (i + 0.5) / 42, sth = Math.sqrt(Math.max(0, 1 - cth * cth)), a = i * 2.39996;
      nodes.push([Math.cos(a) * sth * R, cth * R, Math.sin(a) * sth * R]);
    }
    const PC = small ? 16 : 26, sats = [];
    for (let i = 0; i < PC; i++) sats.push({ rr: R * (1.16 + lUse() * 0.36), th: lUse() * Math.PI - Math.PI / 2, a: lUse() * 6.28, s: 0.06 + lUse() * 0.15, sz: 0.02 + lUse() * 0.038 });
    return { rings, nodes, sats };
  }

  /* ============================ scene painters ============================ */
  /* two themes, one geometry language: the hero constellation is warm ink on cream,
     the contact instrument is cream-and-rose on the ink band. */
  const PC_WIRE = [0.38, 0.30, 0.22];   // ink-brown wire
  const PC_SAT = [0.86, 0.52, 0.40];    // clay-rose sparks
  const PC_DIM = [0.62, 0.52, 0.40];    // sand nodes
  const PC_EM = [0.56, 0.30, 0.21];     // deep rose hot nodes
  const OR_WIRE = [0.72, 0.62, 0.50];   // sand rings on ink
  const OR_NODE = [0.93, 0.87, 0.76];   // paper nodes
  const OR_SAT = [0.95, 0.68, 0.55];    // rose satellites

  function drawPlexus(s) {
    const { L, XP } = s, { N, E, P } = s.geo;
    const yaw = -0.34 + s.p * 0.52 + s.t * 0.012 + s.ptr.x * 0.07;
    const pitch = -0.08 + s.p * 0.18 - s.ptr.y * 0.05;
    const z = (s.small ? 34 : 27.5) - s.p * (s.small ? 17.5 : 15.5);
    const pv = mul(persp(0.78, s.asp, 1, 52), mul(trs(0, 0.55 + s.p * 0.5, -z), mul(rotY(yaw), rotX(pitch))));
    /* wires with a travelling energy pulse */
    const LE = [];
    for (const [a, b, ph] of E) {
      const A = N[a], B = N[b];
      const g = 0.28 + 0.72 * Math.max(0, Math.sin(s.t * 0.85 + ph));
      LE.push(A.x, A.y, A.z, PC_WIRE[0] * g, PC_WIRE[1] * g, PC_WIRE[2] * g, 0, B.x, B.y, B.z, PC_WIRE[0] * g, PC_WIRE[1] * g, PC_WIRE[2] * g, 0);
    }
    L.write(LE); L.draw(pv, s.pt, 0.42);
    /* nodes */
    const ND = [];
    N.forEach((n, i) => {
      const c = i % 9 === 4 ? PC_EM : n.hub ? PC_WIRE : PC_DIM;
      ND.push(n.x, n.y, n.z, c[0], c[1], c[2], n.hub ? 0.3 : 0.15);
    });
    XP.write(ND); XP.draw(pv, s.pt, 0.9);
    /* streams */
    const PD = [];
    for (const q of P) {
      q.t += q.s * s.dt; if (q.t > 1) q.t -= 1;
      const A = N[q.e[0]], B = N[q.e[1]], e = q.t * q.t * (3 - 2 * q.t);
      PD.push(A.x + (B.x - A.x) * e, A.y + (B.y - A.y) * e, A.z + (B.z - A.z) * e, PC_SAT[0], PC_SAT[1], PC_SAT[2], q.sz);
    }
    XP.write(PD); XP.draw(pv, s.pt, 0.7);
  }

  function drawOrb(s) {
    const { L, XP } = s, { rings, nodes, sats } = s.geo;
    const yaw = 0.55 + s.p * 2.2 + s.t * 0.05, pitch = -0.24 - s.ptr.y * 0.04;
    const tanH = Math.tan(0.35), zEye = s.small ? 5.0 : 5.2;
    /* park the shell right of the invitation copy on desktop (beside the headline); centered under it on phones */
    const ox = s.small ? 0 : 0.44 * (zEye * tanH) * s.asp;
    /* GL looks down -z: park the shell at negative eye-z so it survives the near clip */
    const pv = mul(persp(0.7, s.asp, 0.4, 12), mul(trs(s.small ? 0 : ox, s.small ? -0.34 : 1.08, -zEye), mul(rotY(yaw), rotX(pitch))));
    const LE = [];
    for (const pts of rings) for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i], B = pts[i + 1];
      LE.push(A[0], A[1], A[2], OR_WIRE[0], OR_WIRE[1], OR_WIRE[2], 0, B[0], B[1], B[2], OR_WIRE[0], OR_WIRE[1], OR_WIRE[2], 0);
    }
    L.write(LE); L.draw(pv, s.pt, 0.55 - s.p * 0.12);
    const ND = [];
    for (const n of nodes) ND.push(n[0], n[1], n[2], OR_NODE[0], OR_NODE[1], OR_NODE[2], 0.11);
    XP.write(ND); XP.draw(pv, s.pt, 0.85);
    const PD = [];
    for (const q of sats) {
      q.a += q.s * s.dt;
      const th = q.th + s.p * 0.7;
      PD.push(Math.cos(q.a) * Math.sin(th) * q.rr, Math.cos(th) * q.rr, Math.sin(q.a) * Math.sin(th) * q.rr, OR_SAT[0], OR_SAT[1], OR_SAT[2], q.sz);
    }
    XP.write(PD); XP.draw(pv, s.pt, 0.55);
  }

  /* ============================== scene shell ============================== */
  function makeScene(cv, kind) {
    const s = { cv, kind, p: 0, t: Math.random() * 60, dt: 0.016, ptr: { x: 0, y: 0, tx: 0, ty: 0 }, asp: 1.6, small: PHONE.matches };
    const host = kind === 'plexus' ? (cv.closest('[data-k-hero]') || cv) : (cv.closest('section') || cv);
    let gl, raf = null, last = 0, visible = false, ok = false;

    /* progress: the pinned hero spans 0→1 across its locked travel; the orb travels in with its section */
    const progress = () => {
      const r = host.getBoundingClientRect(), vh = innerHeight;
      if (kind === 'plexus') { const range = r.height - vh; return range > 0 ? clamp(-r.top / range) : clamp((vh - r.top) / (vh + r.height)); }
      return clamp((vh * 0.92 - r.top) / (vh * 0.8));
    };

    const resize = () => {
      if (!ok) return;
      const dpr = Math.min(devicePixelRatio || 1, 1.75);
      const w = cv.clientWidth || 1, h = cv.clientHeight || 1;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
      s.asp = w / h;
      /* uPt converts world-space diameters to device pixels: perspective half-FOV 0.39 (plexus) / 0.35 (orb) */
      s.pt = cv.height / (2 * Math.max(0.2, s.kind === 'plexus' ? Math.tan(0.39) : Math.tan(0.35)));
    };

    const fail = () => { ok = false; cv.style.display = 'none'; };

    const boot = () => {
      try {
        gl = cv.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true }) ||
             cv.getContext('experimental-webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
        if (!gl) throw new Error('no webgl');
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        s.L = new batch(gl, prog(gl, VS, FS_LN), gl.LINES);
        const pm = prog(gl, VS, FS_PT);
        s.XP = new batch(gl, pm, gl.POINTS);
        s.geo = kind === 'plexus' ? plexusGeometry(s.small) : orbBuild(s.small);
        s.gl = gl;
        ok = true;
        resize();
      } catch (e) { fail(); return; }
      if (RM.matches) { s.p = progress(); frame(0, true); }
      else kick();
    };

    const kick = () => { if (!ok) return; if (RM.matches) { s.p = progress(); frame(0, true); return; } if (raf === null) raf = requestAnimationFrame(frame); };

    function frame(now, once) {
      raf = null;
      const dms = last ? Math.min(100, now - last) : 16;
      last = now;
      s.dt = dms / 1000;
      s.t += s.dt;
      s.p += (progress() - s.p) * (1 - Math.pow(1 - 0.12, dms / 16.667));
      s.ptr.x += (s.ptr.tx - s.ptr.x) * 0.08; s.ptr.y += (s.ptr.ty - s.ptr.y) * 0.08;
      if (ok) draw();
      if (once) { last = 0; return; }
      if (visible && !RM.matches && !document.hidden) raf = requestAnimationFrame(frame);
      else last = 0;
    }

    function draw() {
      const g = s.gl;
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
      if (s.kind === 'plexus') drawPlexus(s); else drawOrb(s);
    }

    if (kind === 'plexus') {
      addEventListener('scroll', kick, { passive: true });
      addEventListener('resize', () => { resize(); kick(); }, { passive: true });
      if (FINE.matches) addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        s.ptr.tx = (e.clientX / innerWidth) * 2 - 1; s.ptr.ty = (e.clientY / innerHeight) * 2 - 1; kick();
      }, { passive: true });
    }
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '12% 0px' }).observe(host);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) kick(); });
    PHONE.addEventListener('change', () => { s.small = PHONE.matches; resize(); kick(); });
    RM.addEventListener('change', () => kick());
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fail(); }, { once: true });

    boot();
  }

  const boot = () => document.querySelectorAll('canvas[data-plex]').forEach(cv => makeScene(cv, cv.getAttribute('data-plex')));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
