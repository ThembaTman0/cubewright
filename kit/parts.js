(function (root) {
  const { part, scene, follow, loop } = root.Cubewright;

  if (root.document) {
    const q = new URLSearchParams(root.location.search);
    if (q.has("embed")) root.document.documentElement.classList.add("embed");
    if (q.get("theme")) root.document.documentElement.dataset.theme = q.get("theme");
  }

  function workshop(S) {
    const actors = [];
    const run = (a) => { actors.push(a); return a; };
    const stop = (a) => { const i = actors.indexOf(a); if (i >= 0) actors.splice(i, 1); };
    const tick = (dt) => { for (const a of actors.slice()) a.update(dt); };

    function item({ size = 3, tone = "hi", info = "Item" } = {}) {
      const p = S.add(part("item", info));
      p.box(0, 0, 0, size, size, size, tone);
      p.size = size;
      return p;
    }

    function vanish(p, { rate = 2.5, sink = 0, shrink = false, then } = {}) {
      p.pickable = false;
      return run({
        update(dt) {
          p.at[2] -= sink * dt;
          if (shrink) p.scale = Math.max(0, p.scale - dt * rate * 0.7);
          else p.alpha -= dt * rate;
          if (p.alpha <= 0 || p.scale <= 0) { S.remove(p); stop(this); then && then(); }
        },
      });
    }

    function slide(p, to, { rate = 7, then } = {}) {
      const a = run({
        update(dt) {
          for (let i = 0; i < 3; i++) p.at[i] = follow(p.at[i], to[i], dt, rate);
          if (Math.hypot(p.at[0] - to[0], p.at[1] - to[1], p.at[2] - to[2]) < 0.05) {
            p.at = to.slice(); stop(a); then && then(p);
          }
        },
      });
      return a;
    }

    function bench({ x = 0, y = 0, w, d, tone = "floor", info = "Bench" }) {
      const p = S.add(part("bench", info));
      p.box(x, y, 0, w, d, 1, tone);
      for (const [fx, fy] of [[x + 1, y + 1], [x + w - 3, y + 1], [x + 1, y + d - 3], [x + w - 3, y + d - 3]]) p.box(fx, fy, -1, 2, 2, 1, "frame");
      return p;
    }

    function belt({ x = 0, y, z = 1, length, width = 4, speed = 9, gap = 1, stopAt = null, info = "Belt", stripe = 6 }) {
      const p = S.add(part("belt", info));
      let phase = 0;
      const B = {
        part: p, items: [], speed, stopAt, onArrive: null, x, y, z, length, width,
        send(it) {
          it.at = [x, y + (width - it.size) / 2, z + 1];
          it.onBelt = true; it.arrived = false;
          B.items.push(it);
          return it;
        },
        ready(size = 3) {
          const last = B.items[B.items.length - 1];
          return !last || last.at[0] > x + size + gap;
        },
        take(it) { const i = B.items.indexOf(it); if (i >= 0) B.items.splice(i, 1); it.onBelt = false; return it; },
        get queued() { return B.items.length; },
      };
      function build() {
        p.clear();
        const o = Math.floor(phase) % stripe;
        for (let i = 0; i < length; i++) p.box(x + i, y, z, 1, width, 1, (i + stripe - o) % stripe === 0 ? "frame" : "base");
      }
      build();
      run({
        update(dt) {
          const moving = B.items.some((it) => !it.arrived);
          if (moving) { phase += B.speed * dt; build(); }
          const end = B.stopAt ?? x + length;
          let limit = end;
          for (const it of B.items) {
            const head = Math.min(it.at[0] + it.size + B.speed * dt, limit);
            it.at[0] = Math.max(it.at[0], head - it.size);
            if (!it.arrived && head >= end - 1e-6) {
              it.arrived = true;
              B.onArrive && B.onArrive(it);
            }
            limit = it.at[0] - gap;
          }
        },
      });
      return B;
    }

    function stack({ x, y, z = 1, w = 4, d = 4, unit = 1, spacing = 2, cap = 8, tone = "accent", info = "Unit", dropFrom = null }) {
      const units = [];
      const slotZ = (i) => z + i * spacing;
      const St = {
        units, cap,
        get count() { return units.length; },
        push(fromTop = true) {
          if (units.length >= cap) return null;
          const u = S.add(part("unit", info));
          u.box(0, 0, 0, w, d, unit, tone);
          u.at = [x, y, fromTop ? (dropFrom ?? slotZ(cap)) : slotZ(units.length)];
          u.vz = 0;
          units.push(u);
          return u;
        },
        pop(to = null) {
          const u = units.shift();
          if (!u) return null;
          u.pickable = false;
          if (to) slide(u, to, { rate: 6 });
          vanish(u, { rate: 1.6, shrink: true });
          return u;
        },
        fill(n) { while (units.length < Math.min(n, cap)) St.push(false); },
      };
      run({
        update(dt) {
          units.forEach((u, i) => {
            const target = slotZ(i);
            if (u.at[2] > target) { u.vz -= 60 * dt; u.at[2] = Math.max(target, u.at[2] + u.vz * dt); }
            if (u.at[2] <= target) { u.at[2] = target; u.vz = 0; }
          });
        },
      });
      return St;
    }

    function cage({ x, y, z = 1, w, d, h, tone = "mid", floor = "base", info = "Frame" }) {
      const p = S.add(part("cage", info));
      p.box(x, y, z, w, d, 1, floor);
      for (const [px, py] of [[x, y], [x + w - 1, y], [x, y + d - 1], [x + w - 1, y + d - 1]]) p.box(px, py, z + 1, 1, 1, h - 1, tone);
      p.box(x, y, z + h, w, 1, 1, tone); p.box(x, y + d - 1, z + h, w, 1, 1, tone);
      p.box(x, y + 1, z + h, 1, d - 2, 1, tone); p.box(x + w - 1, y + 1, z + h, 1, d - 2, 1, tone);
      return p;
    }

    function arch({ x, y, z = 2, span, h, tone = "mid", info = "Gate" }) {
      const p = S.add(part("arch", info));
      p.box(x, y, z, 1, 1, h, tone); p.box(x, y + span - 1, z, 1, 1, h, tone);
      p.box(x, y, z + h, 1, span, 1, tone);
      return p;
    }

    function bin({ x, y, z = 1, w, d, h = 3, tone = "base", info = "Bin" }) {
      const p = S.add(part("bin", info));
      p.shell(x, y, z, w, d, h, tone);
      const Bn = {
        part: p, count: 0,
        receive(it, { sinkFirst = true } = {}) {
          it.pickable = false;
          const to = [x + (w - it.size) / 2, y + (d - it.size) / 2, it.at[2]];
          slide(it, to, { rate: 8, then: () => { Bn.count++; vanish(it, { rate: 2.2, sink: sinkFirst ? 6 : 0 }); } });
        },
      };
      return Bn;
    }

    function lamp({ x, y, z, tone = "ok", info = "Signal", decay = 2.5 }) {
      const p = S.add(part("lamp", info));
      p.box(x, y, z, 1, 1, 1, tone);
      run({ update(dt) { p.glow = Math.max(0, p.glow - dt * decay); } });
      return { part: p, flash() { p.glow = 1; } };
    }

    function dial({ x, y, z, size = 4, tone = "hi", mark = "accent", info = "Dial" }) {
      const p = S.add(part("dial", info));
      p.box(x, y, z, size, size, 1, tone);
      const m = S.add(part("mark", ""));
      m.set(0, 0, 0, mark);
      const ring = [];
      for (let i = 0; i < size; i++) ring.push([i, 0]);
      for (let i = 1; i < size; i++) ring.push([size - 1, i]);
      for (let i = size - 2; i >= 0; i--) ring.push([i, size - 1]);
      for (let i = size - 2; i > 0; i--) ring.push([0, i]);
      const D = {
        set(t) {
          const [rx, ry] = ring[Math.floor((((t % 1) + 1) % 1) * ring.length) % ring.length];
          m.at = [x + rx, y + ry, z + 1];
        },
      };
      D.set(0);
      return D;
    }

    function marks({ x, y, z, count, spacing = 2, tone = "frame", info = "Marks" }) {
      const p = S.add(part("marks", info));
      for (let i = 0; i < count; i++) p.set(x, y, z + spacing * i, tone);
      return p;
    }

    return { S, tick, run, stop, item, vanish, slide, bench, belt, stack, cage, arch, bin, lamp, dial, marks };
  }

  function machine({ canvas = "c", tip = "tip", stats = {}, themeButton = "theme", build, update, actions = {}, pad = 0.06 }) {
    const el = typeof canvas === "string" ? document.getElementById(canvas) : canvas;
    const tipEl = document.getElementById(tip);
    const statEls = Object.fromEntries(Object.keys(stats).map((k) => [k, document.getElementById(k)]));
    const isDark = () => {
      const t = document.documentElement.dataset.theme;
      return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    };
    const S = scene(el, { theme: isDark() ? "dark" : "light", pad });
    const W = workshop(S);
    const model = build(W) || {};
    S.fit();

    const render = () => {
      for (const [k, f] of Object.entries(stats)) if (statEls[k]) statEls[k].textContent = f(model);
      S.draw();
    };
    const L = loop(el, (dt) => {
      update && update(dt, model, W);
      W.tick(dt);
      S.step(dt);
      render();
    });
    if (L.still) render();

    const act = (name) => { if (actions[name]) { actions[name](model, W); L.kick(); if (L.still) render(); return true; } return false; };
    const setTheme = (next) => { document.documentElement.dataset.theme = next; S.theme = next; L.kick(); if (L.still) render(); };
    const flip = () => setTheme(S.theme === "dark" ? "light" : "dark");

    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const p = S.pick(x, y);
      S.hover = p;
      if (tipEl) {
        if (p) { tipEl.textContent = p.info; tipEl.style.left = x + "px"; tipEl.style.top = y + "px"; }
        tipEl.classList.toggle("on", !!p);
      }
      if (L.still) render();
    });
    el.addEventListener("pointerleave", () => { S.hover = null; tipEl && tipEl.classList.remove("on"); });
    el.addEventListener("click", () => act("stress"));
    const tb = document.getElementById(themeButton);
    if (tb) tb.addEventListener("click", flip);
    el.addEventListener("keydown", (e) => {
      let done = true;
      if (e.key === " " || e.key === "Enter") done = act("stress");
      else if (e.key === "ArrowUp") done = act("up");
      else if (e.key === "ArrowDown") done = act("down");
      else if (e.key === "ArrowLeft") S.turn(-1);
      else if (e.key === "ArrowRight") S.turn(1);
      else if (e.key.toLowerCase() === "t") flip();
      else done = false;
      if (done) { e.preventDefault(); L.kick(); }
    });
    document.addEventListener("keydown", (e) => { if (e.target === document.body && e.key.startsWith("Arrow")) el.focus(); });
    return { S, W, model, render };
  }

  root.Cubewright.workshop = workshop;
  root.Cubewright.machine = machine;
})(typeof window !== "undefined" ? window : globalThis);
