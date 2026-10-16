---
name: cubewright
description: Explain how something works by building it as a small, playable voxel machine, a clean, minimal isometric scene of cubes with moving parts, hover names, live stats and a short lede, delivered as one self-contained HTML page. Use whenever someone wants a voxel explainer, an interactive "how it works" figure, a playful diagram for docs, a blog, a talk or a lesson, or asks to show, visualise or draw how a system, algorithm or component behaves, even if they never say voxel.
license: MIT
compatibility: Any agent that can write files. Needs a browser to view; Node.js 18+ only for the local preview server.
---

# Cubewright

Cubewright builds ideas as little cube machines you can play with. A reader learns the concept by watching it run, then pushing it until it breaks.

The kit has three files and no dependencies. `kit/cubewright.js` is the renderer and exposes `window.Cubewright`. `kit/parts.js` holds ready-made machine parts with built-in motion, plus `machine()`, which wires up the page. `kit/page.css` is the shared page style. The reference is `examples/token-bucket/index.html`: a rate limiter in about 60 lines of machine code. Copy it as the starting point for every new figure. There are three more examples. `examples/load-balancer/` routes to several stations and has a strategy toggle and a failure switch. `examples/queue/` shows a bounded belt, a timed worker (the press ram) and backpressure into a source pile. `examples/lru-cache/` shows ordered slots that re-sort with `W.slide`, coloured keys (raw hex tones) and a slow fetch. Open the one closest to your concept before you start.

**Assemble, don't hand-code.** Build every figure from the parts below. Write a raw `part()` only for a one-off static shape, such as a tap's housing. If a mechanism is missing and would recur in other machines, add it to `kit/parts.js` rather than to the page.

## Principles

1. **A machine, not a diagram.** Invent a physical contraption whose working *is* the concept. Don't use boxes with arrows.
2. **Truth drives everything.** A small, honest model (state plus `update(dt)`) moves the parts and feeds the stats. Nothing on screen is decorative fiction.
3. **Playable.** Every figure has one action that stresses the system (click, Space or Enter) and one dial (↑↓). The reader should be able to *cause* the interesting failure: overflow, collision, starvation, a cache miss.
4. **Quiet.** Keep it calm and minimal: few tones, one accent, generous space, and no words inside the scene.

| Concept | Machine | The stress action |
|---|---|---|
| Token-bucket rate limiter | Tap drips tokens into a tower; requests take one at a gate | Burst of requests drains the tower → rejects |
| Queue / backpressure | Belt feeding a slow press; boxes pile up | Speed up arrivals → belt stalls, pile grows |
| Hash map | Wall of pigeonholes; an arm drops each letter in `hash % n` | Add many keys → collisions stack, then resize |
| Load balancer | Turntable chute sending marbles to N bins | Kill a bin → traffic reroutes |
| LRU cache | Short shelf beside a far warehouse; a cart fetches on a miss | Scan a long list → shelf thrashes |
| Garbage collection | Blocks tied by strings to a root post; a sweeper lifts loose ones | Cut a string → a whole subtree is swept |
| Consensus / quorum | Five towers flashing votes to a central bell | Partition two towers → no quorum |

## Workflow

1. **Model.** Write the state and `update(dt)` with real numbers (capacity, rates, sizes).
2. **Machine.** Say in one sentence what moves and what that motion means, then name the stress action.
3. **Parts (15–40).** Name a bench, the structure, the mechanism, one or two signals (`ok`/`bad`) and the subject, which is the only `accent` part. Each part sits on another part. Prefer fewer, cleaner parts over ornament.
4. **Grid plan.** 1 unit = 1 voxel, x and y on the floor, z up, about 30–50 units wide. Put the coordinates in constants (`GATE_X`, `BELT_Y`) before placing anything.
5. **Build.** In `machine({ build })`, place parts from the workshop `W` and return the model `m`. Wire events between parts (`belt.onArrive`, `stack.pop`, `lamp.flash`, `bin.receive`). Every part takes an `info` string, which is its hover name.
6. **Page.** Copy the example page. Keep its layout (wordmark and theme link, numbered title, stage, stats row with the first stat in the accent colour, lede, footer of controls), and change only the title, the stats, the lede and the script.
7. **Live.** `update(dt, m, W)` advances the model and runs an idle tour so the machine moves untouched. `actions.stress` (click, Space, Enter), `actions.up` and `actions.down` (↑↓) are the reader's controls. `machine()` already handles turning (←→), the theme (`T`), hover tooltips, reduced motion and pausing offscreen.
8. **Verify.** Run `node scripts/serve.mjs`, then check the default view, a turned view, both themes, a stressed moment and phone width (390px). Check the stats against the model by hand, and make sure the console has no errors.

## Parts (`kit/parts.js`)

```js
machine({
  stats: { "s-id": (m) => value },              // element id → text, updated every frame
  build(W) { ...place parts...; return m; },    // runs once, then the view is fitted
  update(dt, m, W) { ... },                     // model step + idle tour
  actions: { stress(m, W) {}, up(m, W) {}, down(m, W) {} },
});
```

| Part | Call | Behaviour |
|---|---|---|
| Bench | `W.bench({ w, d })` | Floor plate on four feet |
| Belt | `B = W.belt({ y, length, stopAt?, speed?, width? })` | `B.send(item)`, `B.ready()`, `B.take(item)`, `B.onArrive = (item) => …`, `B.queued`. Items queue up behind a stopped one, which is how backpressure shows. |
| Item | `W.item({ size?, tone?, info? })` | A cube to carry (request, packet, key) |
| Stack | `St = W.stack({ x, y, z, cap, dropFrom? })` | `St.push()` (falls from above), `St.pop(to?)` (bottom unit leaves and shrinks, the rest fall), `St.fill(n)`, `St.count` |
| Bin | `Bn = W.bin({ x, y, w, d, h })` | `Bn.receive(item)` slides it in, sinks it and fades it. `Bn.count` |
| Lamp | `L = W.lamp({ x, y, z, tone: "ok" or "bad" })` | `L.flash()` glows, then decays |
| Cage | `W.cage({ x, y, w, d, h })` | An open frame tower with a floor, for containers |
| Arch | `W.arch({ x, y, span, h })` | A gate over a belt |
| Dial | `D = W.dial({ x, y, z })` | `D.set(0..1)` moves an accent mark around the rim, for timers and phases |
| Marks | `W.marks({ x, y, z, count })` | A column of level marks |
| Motion | `W.slide(p, [x,y,z], { rate, then })`, `W.vanish(p, { shrink, sink })` | Eased moves and exits for anything |
| Custom | `W.run({ update(dt) {} })`, `W.S` | Add your own per-frame behaviour, or a raw scene part |

## Kit API (low level)

```js
const { part, scene, follow, loop, THEMES } = Cubewright;
const S = scene(canvas, { theme: "light" | "dark", pad: 0.06 });
const p = S.add(part("tower", "Bucket · holds 8 tokens"));
p.box(x, y, z, w, d, h, tone);   p.shell(x, y, z, w, d, h, tone);   p.set(x, y, z, tone);   p.clear();
p.at = [x, y, z];  p.scale = 0..1;  p.alpha = 0..1;  p.glow = 0..1;  p.hidden = true;  p.pickable = false;
S.fit();  S.draw();  S.step(dt);  S.turn(±1);  S.pick(x, y);  S.hover = p;  S.theme = "dark";  S.remove(p);
const L = loop(el, (dt) => {...});  L.kick();  L.still;   // still = prefers-reduced-motion
```

Tones: `floor`, `base`, `frame`, `mid`, `hi`, `lit`, `accent`, `ok`, `bad`, `glass`. They adapt to the theme.

## Style

- **Palette.** Warm paper neutrals in light (the default) and soft graphite in dark. There is one accent, vermilion `#ff6b3d`, on the subject only. Use `ok`/`bad` only on small signals.
- **Tone order.** `floor` for the bench, `base` for containers and the belt, `mid` for structure, `hi` for moving mechanism, `accent` for the subject.
- **Restraint.** Don't add rulers, screws, label plates or frames around the figure. Use a detail only if it explains something, like a level mark per token or a knob indicator that turns once per token.
- **Countable.** Discrete things are separated by a one-voxel gap.
- **Motion.** Use gravity for falling, `follow` for sliding, and shrink-and-fade for consumed things. A signal's `glow` pulses on an event and decays. Nothing teleports, and the camera never rescales.
- **Words outside the scene.** Names go in the cursor tooltip, numbers in the stats row, and the story in the lede.
- **Accessible.** The canvas has `tabindex="0"` and an `aria-label`, keys mirror the pointer, and reduced motion renders a still frame.

## Credits

The "object is the explanation" idea was inspired by [Anatomy](https://github.com/wheresryan22/anatomy) by wheresryan22. The kit and examples are independent work.
