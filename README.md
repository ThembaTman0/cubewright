# cubewright

**Ideas, built as little cube machines you can play with.**

Cubewright is an agent skill (Claude Code and other agents that read `SKILL.md`). You ask it to explain a concept, and it builds a small, working voxel machine that shows the idea and lets you push it until it breaks. The output is one self-contained HTML page.

> *"How does a rate limiter work?"* A tap drips tokens into a tower. Requests ride a belt and must grab a token to pass the gate. Click to flood it and watch the rejects pile up.

## Why

- **Playable.** Every figure has an action that stresses the system, so the reader *causes* the interesting failure.
- **True.** A small real model drives the motion and the numbers. Nothing is decorative.
- **Fast and light.** A ~230-line canvas kit with no dependencies, no build step and no framework.
- **Quiet.** Clean, minimal styling: warm neutrals, one accent, light and dark themes.

## Install

```bash
git clone https://github.com/ThembaTman0/cubewright ~/.claude/skills/cubewright
```

Then ask Claude for an explainer, or run `/cubewright` followed by your idea.

## Try the example

```bash
node scripts/serve.mjs
```

Open `http://localhost:4317/examples/token-bucket/`.

Controls: **click** burst · **↑ ↓** refill rate · **← →** turn · **T** theme · **hover** name a part.

## Layout

| Path | What |
|---|---|
| `SKILL.md` | The skill: principles, workflow, kit API, style rules |
| `kit/cubewright.js` | The renderer: voxel parts, isometric camera, culling, shading, picking, turning, motion loop |
| `examples/` | Finished machines to copy from |
| `scripts/serve.mjs` | A tiny local preview server |

## Roadmap

- More machines: hash map, queue and backpressure, LRU cache, load balancer
- Export to `.vox` (MagicaVoxel) and glTF
- Shareable links and an embeddable web component

## Credits

The "the object is the explanation" idea was inspired by [Anatomy](https://github.com/wheresryan22/anatomy) by wheresryan22. Cubewright's kit, examples and style are independent work.

## License

MIT
