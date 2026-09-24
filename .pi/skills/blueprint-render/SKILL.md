---
name: blueprint-render
description: Render a Miditorio blueprint string to a top-down SVG/PNG schematic and verify layout (entity overlap + per-color net reachability). Use when iterating on entity positions/circuit wiring and you want visual or programmatic feedback instead of an in-game screenshot.
---

# Blueprint schematic render + layout check

`tools/render-blueprint.ts` is a **zero-dependency** helper (uses only `node:*`)
that decodes a Miditorio blueprint string (`0` + base64 + zlib) and draws a
top-down schematic: a tile grid, one labeled box per entity (type +
`entity_number` + a hint from its `player_description`), and the red/green wires
with Factorio's routing. It also runs two structural checks we used to do by eye:

- **Overlap** — two entities claiming the same grid cell (a placement mistake).
- **Net reachability** — e.g. "does the shared green net reach all speakers?"

It needs no game sprites. PNG output uses the system `rsvg-convert` (librsvg).

## When to use

You changed entity `position`s or wiring in `{app,src}/lib/blueprint/**` and want
to (1) see the layout and (2) get a pass/fail on overlaps, **without** a manual
in-game round trip.

## Render an existing blueprint string

If you already have a `.bp` file (or the raw string), render directly — this
needs no `node_modules` install (Node core only):

```bash
node --experimental-strip-types tools/render-blueprint.ts <in.bp> -o /tmp/out.png --png
```

When the project is installed you can use the wrapper: `yarn render-bp <args…>`
(note: `main` uses Yarn PnP and must be `yarn install`ed before `yarn` runs).

Flags:

- `-o <out>` — output path (default `blueprint.svg`; end with `.png` and add
  `--png` to rasterize via `rsvg-convert`).
- `--only <substr>` — filter entities by name substring (e.g. `--only
combinator` for a tidy layout view of just the combinators).
- `--png` — also write a PNG next to the SVG.

## Generate a `.bp` from the generator

The generator (`songToFactorio`) runs under vitest (needs `signals.json` +
`test-data/*.mid`). Write the encoded string to a file with a throwaway test.
**The import alias is tree‑dependent:**

- Astro branches (`feat/signal-volume-rewrite`, future `release/v2…`): `@/src/lib/…`
- `main` / Next.js (`release/v1`): `@/app/lib/…`

```ts
// {app,src}/lib/__render.tmp.test.ts  (match the tree you are on; delete after)
import { describe, test } from 'vitest'
import { songToFactorio } from '@/src/lib/song-to-factorio' // @/app/lib on main
import { Midi } from '@tonejs/midi'
import { readFile, writeFile } from 'node:fs/promises'
import signals from '@/src/lib/data/signals.json' // @/app/lib on main
import { midiToSong } from '@/src/lib/song' // @/app/lib on main

describe('render-hook', () => {
  for (const f of ['bach.mid', 'sea.mid']) {
    test(f, async () => {
      const song = midiToSong(new Midi(await readFile(`test-data/${f}`)), f)
      const { blueprint } = songToFactorio(song, signals, 'global')
      await writeFile(`/tmp/rb-${f}.bp`, blueprint)
    })
  }
})
```

```bash
yarn test src/lib/__render.tmp.test.ts   # or app/lib/... on main
```

Test data lives in `test-data/*.mid`. `bach.mid` = 1 speaker (fast), `sea.mid` =
51 (full polyphony).

## Read the output

The **SVG/PNG** shows layout; **stdout** shows the checks:

```
wrote /tmp/out.png
networks: red net: 5 net(s), largest 2 ent | green net: largest net 11 ent · speakers on green 1/1
overlaps: none
```

Legend: **ARC** arithmetic, **DEC** decider/logistic, **CON** constant
combinator, **SPK** programmable speaker. Red wires route horizontal‑then‑vertical,
green vertical‑then‑horizontal.

## Exit codes (for automation / CI)

- `0` — clean (no overlaps).
- `3` — **overlaps detected**; each printed as `entity N overlaps M`, and the
  offending boxes are outlined red in the image.
- `2` — usage error.

Always `yarn test -u` after a position change to refresh the golden snapshots.
