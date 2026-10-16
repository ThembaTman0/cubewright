(function (root) {
  const C30 = Math.cos(Math.PI / 6);
  const S30 = 0.5;

  const THEMES = {
    light: {
      tones: {
        floor: "#ecebe7", base: "#e2e0db", frame: "#c9c6bf", mid: "#d6d3cd",
        hi: "#fbfaf8", lit: "#26262a", accent: "#ff6b3d", ok: "#3ba776", bad: "#e5534b", glass: "#b7c9d6",
      },
      edge: 0.9, side: [0.74, 0.16],
    },
    dark: {
      tones: {
        floor: "#2c2c30", base: "#38383d", frame: "#4a4a50", mid: "#5a5a61",
        hi: "#d9d8d4", lit: "#f6f5f2", accent: "#ff7a4d", ok: "#4cc08a", bad: "#f0645c", glass: "#3e5566",
      },
      edge: 0.84, side: [0.66, 0.2],
    },
  };

  const rgbCache = new Map();
  function rgbOf(hex) {
    let rgb = rgbCache.get(hex);
    if (!rgb) {
      const n = parseInt(hex.slice(1), 16);
      rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      rgbCache.set(hex, rgb);
    }
    return rgb;
  }
  function tone(rgb, f, lift) {
    const c = rgb.map((v) => Math.round(Math.min(255, v * f + (255 - v * f) * lift)));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const SIDE_CORNERS = { "1,0": [1, 3, 7, 5], "-1,0": [0, 2, 6, 4], "0,1": [2, 3, 7, 6], "0,-1": [0, 1, 5, 4] };
  const TOP = [4, 5, 7, 6];

  function part(name, info = "") {
    return {
      name, info, voxels: [], at: [0, 0, 0], scale: 1, alpha: 1, hidden: false, glow: 0, pickable: !!info, _faces: null,
      set(x, y, z, t) { this.voxels.push([x, y, z, t]); this._faces = null; return this; },
      box(x, y, z, w, d, h, t) {
        for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) for (let k = 0; k < h; k++) this.set(x + i, y + j, z + k, t);
        return this;
      },
      shell(x, y, z, w, d, h, t) {
        for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) for (let k = 0; k < h; k++) {
          if (k === 0 || i === 0 || j === 0 || i === w - 1 || j === d - 1) this.set(x + i, y + j, z + k, t);
        }
        return this;
      },
      clear() { this.voxels.length = 0; this._faces = null; return this; },
      faces() {
        if (this._faces) return this._faces;
        const occ = new Set(this.voxels.map(([x, y, z]) => x + "," + y + "," + z));
        this._faces = this.voxels.map(([x, y, z, t]) => ({
          x, y, z, t,
          top: !occ.has(x + "," + y + "," + (z + 1)),
          sides: SIDES.filter(([dx, dy]) => !occ.has(x + dx + "," + (y + dy) + "," + z)),
        }));
        return this._faces;
      },
    };
  }

  function scene(canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    const S = {
      parts: [], azimuth: 0, target: 0, theme: opts.theme || "light", pad: opts.pad ?? 0.08,
      center: [0, 0], bounds: null, hover: null, drawn: [], light: [0.35, 1], dpr: 1,
    };

    function rotate(x, y) {
      const a = S.azimuth, c = Math.cos(a), s = Math.sin(a);
      const dx = x - S.center[0], dy = y - S.center[1];
      return [dx * c - dy * s, dx * s + dy * c];
    }

    S.add = (p) => { S.parts.push(p); return p; };
    S.remove = (p) => { const i = S.parts.indexOf(p); if (i >= 0) S.parts.splice(i, 1); };

    S.fit = () => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const p of S.parts) for (const [x, y, z] of p.voxels) {
        const X = x + p.at[0], Y = y + p.at[1], Z = z + p.at[2];
        x0 = Math.min(x0, X); x1 = Math.max(x1, X + 1); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y + 1);
        z0 = Math.min(z0, Z); z1 = Math.max(z1, Z + 1);
      }
      S.center = [(x0 + x1) / 2, (y0 + y1) / 2];
      const keep = S.azimuth;
      let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
      for (let step = 0; step < 8; step++) {
        S.azimuth = (step * Math.PI) / 4;
        for (const X of [x0, x1]) for (const Y of [y0, y1]) for (const Z of [z0, z1]) {
          const [u, v] = rotate(X, Y);
          const px = (u - v) * C30, py = (u + v) * S30 - Z;
          a = Math.min(a, px); b = Math.max(b, px); c = Math.min(c, py); d = Math.max(d, py);
        }
      }
      S.azimuth = keep;
      S.bounds = [a, b, c, d];
    };

    function layout() {
      const dpr = Math.min(1.5, root.devicePixelRatio || 1);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
      S.dpr = dpr;
      const [a, b, c, d] = S.bounds;
      const k = Math.min((w * (1 - 2 * S.pad)) / (b - a), (h * (1 - 2 * S.pad)) / (d - c));
      return { k, ox: w / 2 - ((a + b) / 2) * k, oy: h / 2 - ((c + d) / 2) * k, w, h };
    }

    S.draw = () => {
      if (!S.bounds) S.fit();
      const L = layout();
      const pal = THEMES[S.theme];
      const { k, ox, oy } = L;
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      ctx.clearRect(0, 0, L.w, L.h);
      const ca = Math.cos(S.azimuth), sa = Math.sin(S.azimuth);
      const ln = Math.hypot(S.light[0], S.light[1]);
      const lx = S.light[0] / ln, ly = S.light[1] / ln;
      const items = [];
      for (const p of S.parts) {
        if (p.hidden || p.alpha <= 0.001 || p.scale <= 0.001) continue;
        for (const f of p.faces()) {
          const h = p.scale / 2;
          const cx = f.x + 0.5 + p.at[0], cy = f.y + 0.5 + p.at[1], cz = f.z + 0.5 + p.at[2];
          const [u, v] = rotate(cx, cy);
          items.push({ p, f, cx, cy, cz, h, depth: u + v + cz });
        }
      }
      items.sort((A, B) => A.depth - B.depth);
      S.drawn = [];
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(0.4, k * 0.035);
      for (const it of items) {
        const { p, f, cx, cy, cz, h } = it;
        const corners = new Array(8);
        for (let i = 0; i < 8; i++) {
          const [u, v] = rotate(cx + (i & 1 ? h : -h), cy + (i & 2 ? h : -h));
          const z = cz + (i & 4 ? h : -h);
          corners[i] = [ox + (u - v) * C30 * k, oy + ((u + v) * S30 - z) * k];
        }
        const rgb = rgbOf(pal.tones[f.t] || f.t);
        const lift = p === S.hover ? 0.22 : p.glow * 0.6;
        ctx.globalAlpha = p.alpha;
        const quads = [];
        for (const [dx, dy] of f.sides) {
          const nu = dx * ca - dy * sa, nv = dx * sa + dy * ca;
          if (nu + nv <= 1e-6) continue;
          const lit = pal.side[0] + pal.side[1] * (nu * lx + nv * ly);
          quads.push([SIDE_CORNERS[dx + "," + dy], lit]);
        }
        if (f.top) quads.push([TOP, 1]);
        for (const [idx, lit] of quads) {
          ctx.beginPath();
          idx.forEach((i, n) => (n ? ctx.lineTo : ctx.moveTo).call(ctx, corners[i][0], corners[i][1]));
          ctx.closePath();
          ctx.fillStyle = tone(rgb, lit, lift);
          ctx.fill();
          ctx.strokeStyle = tone(rgb, lit * pal.edge, lift * 0.5);
          ctx.stroke();
          if (p.pickable) S.drawn.push([idx.map((i) => corners[i]), p]);
        }
      }
      ctx.globalAlpha = 1;
    };

    function inside(pt, poly) {
      let hit = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    }
    S.pick = (x, y) => {
      for (let i = S.drawn.length - 1; i >= 0; i--) if (inside([x, y], S.drawn[i][0])) return S.drawn[i][1];
      return null;
    };

    S.turn = (quarters) => { S.target += (quarters * Math.PI) / 2; };
    S.step = (dt) => {
      const d = S.target - S.azimuth;
      S.azimuth = Math.abs(d) < 1e-4 ? S.target : S.azimuth + d * (1 - Math.exp(-dt * 9));
    };
    return S;
  }

  function follow(current, target, dt, rate = 10) {
    return current + (target - current) * (1 - Math.exp(-dt * rate));
  }

  function loop(el, tick) {
    let last = 0, raf = 0, visible = true;
    const still = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = (t) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      tick(still ? 0 : dt);
      raf = visible && !still ? requestAnimationFrame(frame) : 0;
    };
    if (root.IntersectionObserver) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      }).observe(el);
    }
    raf = requestAnimationFrame(frame);
    return { still, kick: () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } } };
  }

  root.Cubewright ={ THEMES, part, scene, follow, loop };
})(typeof window !== "undefined" ? window : globalThis);
