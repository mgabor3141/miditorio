---
name: blueprint-render
description: Render a Miditorio blueprint string to a top-down SVG/PNG schematic and verify layout (entity overlap + per-color net reachability). Use when iterating on entity positions/circuit wiring and you want visual or programmatic feedback instead of an in-game screenshot.
---

# Blueprint schematic render + layout check

`tools/render-blueprint.ts` is a **zero-dependency** helper (uses only `node:*`)
that decodes a Miditorio blueprint string (`0` + base64 + zlib) and draws a
top-down schematic: a tile grid with **coordinate rulers on the top and left
edges** (integer Factorio world coords, so you can read an entity's position off
the image), and one box per entity showing its **type abbreviation +
`entity_number`** (fill colour also encodes type; see below). `player_description`
hints are not drawn — the number is enough. A cyan arrow inside each box marks
its facing/output edge (omitted on speakers, which have no facing). It also runs
two structural checks we used to do by eye:

- **Overlap** — two entities on the same integer anchor cell (a placement
  mistake). See _Coordinate & orientation model_ for why this is a cell test,
  not an area test.
- **Net reachability** — e.g. "does the shared green net reach all speakers?"

It needs no game sprites. PNG output uses the system `rsvg-convert` (librsvg).

## Coordinate & orientation model

Getting these right is the whole ballgame; a wrong assumption silently mis‑sizes
or mis‑flags entities.

- **`position` = CENTER of the footprint.** Factorio renders each entity with its
  position at the _center_ of its selection box, so a tall 1×2 combinator at
  position `y` occupies `y-1 … y+1`. (Sanity check against the generator: a
  speaker centered at `y=-2.5` and its combinator centered at `y=-1` are 1.5
  apart and sit **flush** exactly as in-game — only true under a center anchor.)
- **Orientation uses Factorio's 4‑way direction enum with stride 4:**
  **North=0, East=4, South=8, West=12** (`direction` omitted ⇒ North). This is
  the _whole_ enum the game stores (0/4/8/12 — **not** the compact 0/1/2/3, and
  the intermediate 2/6/10/14 diagonals never appear on combinators). There is
  **one** 1×2 combinator, just rotated: **East/West (4/12) lie it down to a 2×1
  (wide) box; North/South (0/8/absent) keep it tall (1×2)**. This governs _both_
  the footprint and the connector/facing arrows (wires leave the facing/output
  end the yellow arrow points to). Reference scene (user-verified): facing
  up/right/down/left ⇒ `dir` 0/4/8/12 ⇒ tall/wide/tall/wide. The easy traps:
  assume `4`=South (it's **East**) or rotate on `8/12` (that's South/West).
- **Overlap is a cell test, not an area test.** Combinators are 1×2 _selection_
  boxes but only ~0.7×1.3 _collision_ boxes, and legal half‑tile‑offset stacks
  (e.g. the static arithmetic column at `y` spacing 1.0) tile fine in-game while
  their selection rectangles interpenetrate. An area/overlap test therefore
  false‑flags the generator's legal columns. The tool keys each entity to its
  integer `floor(position)` cell and flags only two entities claiming the same
  cell — genuine double‑placements, zero false positives on real output.

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

Box types (abbreviation + fill): **ARC** arithmetic = blue, **DEC**
decider/logistic = yellow, **CON** constant combinator = red, **SPK**
programmable speaker = orange. A **cyan** arrow inside a box marks its facing /
output edge (never yellow — DEC is yellow now); speakers have no arrow. There is
no on‑image legend; the abbreviation is printed on every box. Red wires route
horizontal‑then‑vertical, green vertical‑then‑horizontal.

## Exit codes (for automation / CI)

- `0` — clean (no overlaps).
- `3` — **overlaps detected**; each printed as `entity N overlaps M`, and the
  offending boxes are outlined red in the image.
- `2` — usage error.

Always `yarn test -u` after a position change to refresh the golden snapshots.
