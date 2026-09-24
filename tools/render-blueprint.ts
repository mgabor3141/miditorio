import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { inflateSync } from 'node:zlib'

/**
 * Schematic blueprint renderer (zero runtime dependencies).
 *
 * Decodes a Miditorio blueprint string (`0` + base64 + zlib) and renders a
 * top-down SVG schematic: a tile grid, one labeled footprint box per entity,
 * and the red / green circuit wires with Factorio's characteristic routing.
 * It also runs two structural checks that we used to do by eye:
 *   - footprint OVERLAP detection (entities sharing grid area), and
 *   - per-color NET reachability (e.g. "does the shared green net reach all
 *     speakers?").
 *
 * This is a *layout* aid, not a pixel renderer: no game sprites required.
 * Rasterize the SVG to PNG with the system `rsvg-convert` (`--png`).
 *
 * Usage:
 *   node --experimental-strip-types tools/render-blueprint.ts <in.bp> [-o out.svg]
 *       [--only <substr>] [--png]
 */

const PX = 44 // pixels per Factorio tile

type Blueprint = {
  entities: Entity[]
  wires: Wire[]
}
type Entity = {
  entity_number: number
  name: string
  position: { x: number; y: number }
  direction?: number
  player_description?: string
  control_behavior?: Record<string, unknown>
}
type Wire = [number, number, number, number]

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

const decodeBlueprint = (raw: string): Blueprint => {
  const s = raw.trim()
  if (s[0] !== '0') {
    throw new Error('Not a blueprint string (expected leading "0")')
  }
  const json = JSON.parse(
    inflateSync(Buffer.from(s.slice(1), 'base64')).toString(),
  )
  const bp = json.blueprint ?? json.blueprint_book?.blueprints?.[0]?.blueprint
  if (!bp?.entities) {
    throw new Error('Blueprint JSON has no entities')
  }
  const wires: Wire[] = bp.wires ?? []
  return { entities: bp.entities, wires }
}

// ---------------------------------------------------------------------------
// Geometry / footprints
// ---------------------------------------------------------------------------

// Selection-box sizes from base/prototypes/entity/circuit-network.lua, in
// tiles (the selection box is centered on position and is 1 wide x 2 tall for
// the 1x2 combinators; 1x1 for constant combinator and speaker). These are the
// occupied footprint dimensions.
const SELECTION: Record<string, { w: number; h: number }> = {
  'arithmetic-combinator': { w: 1, h: 2 },
  'decider-combinator': { w: 1, h: 2 },
  'logistic-combinator': { w: 1, h: 2 },
  'constant-combinator': { w: 1, h: 1 },
  'programmable-speaker': { w: 1, h: 1 },
}

// Factorio renders a blueprint with each entity's POSITION at the CENTER of its
// selection box, so a tall 1x2 combinator at position y occupies y-1 .. y+1.
// (Confirmed against the generator: a speaker centered at y=-2.5 and its
// combinator centered at y=-1 are 1.5 apart and sit flush exactly as in-game
// ONLY under a center anchor; a top-left anchor leaves a 0.5-tile gap.)
// Direction uses Factorio's 8-step enum: 8=East, 12=West are the horizontal
// facings that rotate a 1x2 combinator to 2x1; 4=South (and 0/absent=North) keep
// it tall. NOTE: not 2/6 - those never appear in real combinator blueprints.
const footprint = (e: Entity): { w: number; h: number } => {
  const base = SELECTION[e.name] ?? { w: 1, h: 2 }
  const horizontal = e.direction === 8 || e.direction === 12
  return horizontal ? { w: base.h, h: base.w } : { w: base.w, h: base.h }
}

// Box = occupied rectangle in Factorio world coords (y grows downward), centered
// on the entity position. Edges land on integer/half-integer tile boundaries.
type Box = {
  e: Entity
  x0: number
  y0: number
  x1: number
  y1: number
}
const boxOf = (e: Entity): Box => {
  const { w, h } = footprint(e)
  return {
    e,
    x0: e.position.x - w / 2,
    y0: e.position.y - h / 2,
    x1: e.position.x + w / 2,
    y1: e.position.y + h / 2,
  }
}

// A placement MISTAKE is two entities claiming the SAME integer anchor cell
// (e.g. a double-placed combinator). We deliberately do NOT test footprint-area
// overlap: Factorio combinators are 1x2 SELECTION boxes but only 0.7x1.3
// COLLISION boxes, and half-tile-offset stacks of them tile legally while their
// selection rectangles interpenetrate - so an area test false-flags the legal
// static columns we emit (verified against real, in-game-correct output). Keying
// each entity to its anchor cell flags genuine double-placements with zero false
// positives on those stacks. Only two entities sharing an integer (floor) tile is
// reported.
const cellOf = (b: Box): string => `${Math.floor(b.e.position.x)},${Math.floor(b.e.position.y)}`

// ---------------------------------------------------------------------------
// Wiring (net colors + Factorio L-routing)
// ---------------------------------------------------------------------------

/** Combinator ports: 1 red-in, 2 green-in, 3 red-out, 4 green-out. Speaker
 *  (and constant) connectors: 1 red, 2 green. Odd => red, even => green. */
const netColor = (connector: number): 'red' | 'green' =>
  connector % 2 === 1 ? 'red' : 'green'

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const ABBR: Record<string, string> = {
  'arithmetic-combinator': 'ARC',
  'decider-combinator': 'DEC',
  'logistic-combinator': 'LGC',
  'constant-combinator': 'CON',
  'programmable-speaker': 'SPK',
}
const FILL: Record<string, string> = {
  ARC: '#6b5a1e',
  DEC: '#1f5c78',
  LGC: '#3f7a3f',
  CON: '#7a2f2f',
  SPK: '#9a6a1a',
}
const abbr = (name: string): string =>
  ABBR[name] ?? name.replace(/-/g, '').slice(0, 3).toUpperCase()

// First line of player_description, shortened — a hint label under the box.
const hint = (e: Entity): string => {
  const d = (e.player_description ?? '').split('\n')[0].trim()
  return d.length > 15 ? d.slice(0, 14) + '…' : d
}

// ---------------------------------------------------------------------------
// SVG assembly
// ---------------------------------------------------------------------------

type Warnings = { overlaps: string[]; nets: string }

const render = (
  bp: Blueprint,
  only: string | undefined,
): { svg: string; warnings: Warnings } => {
  const entities = bp.entities.filter((e) => !only || e.name.includes(only))
  const keep = new Set(entities.map((e) => e.entity_number))
  const byNum = new Map(entities.map((e) => [e.entity_number, e]))
  const wires = bp.wires.filter(([a, , b]) => keep.has(a) && keep.has(b))

  const boxes = entities.map(boxOf)

  // ---- overlap detection: two entities on the same integer anchor cell ----
  const byCell = new Map<string, number[]>()
  for (const b of boxes) {
    const c = cellOf(b)
    ;(byCell.get(c) ?? byCell.set(c, []).get(c)!).push(b.e.entity_number)
  }
  const overlapWith = new Map<number, number[]>()
  for (const ids of byCell.values()) {
    if (ids.length > 1) {
      for (const id of ids)
        overlapWith.set(
          id,
          ids.filter((x) => x !== id),
        )
    }
  }

  // ---- per-color net reachability (speaker bus sanity) ----
  const speakers = entities.filter((e) => e.name === 'programmable-speaker')
  const netReport: string[] = []
  for (const color of ['red', 'green'] as const) {
    const parent = new Map<number, number>()
    const find = (x: number): number => {
      while (parent.get(x) !== x) {
        parent.set(x, parent.get(x)!)
        x = parent.get(x)!
      }
      return x
    }
    const uni = (a: number, b: number) => {
      if (!parent.has(a)) parent.set(a, a)
      if (!parent.has(b)) parent.set(b, b)
      parent.set(find(a), find(b))
    }
    for (const [a, ap, b, bp2] of wires) {
      if (netColor(ap) === color && netColor(bp2) === color) uni(a, b)
    }
    const groups = new Map<number, number>()
    for (const k of parent.keys())
      groups.set(find(k), (groups.get(find(k)) ?? 0) + 1)
    const largest = Math.max(0, ...groups.values())
    const spkOnNet = speakers.filter((s) => parent.has(s.entity_number)).length
    if (color === 'green' && speakers.length > 0) {
      netReport.push(
        `green net: largest net ${largest} ent · speakers on green ${spkOnNet}/${speakers.length}`,
      )
    } else {
      netReport.push(
        `${color} net: ${groups.size} net(s), largest ${largest} ent`,
      )
    }
  }

  // ---- geometry bounds -> viewBox ----
  const xs = boxes.map((b) => b.x0)
  const ys = boxes.map((b) => b.y0)
  const xe = boxes.map((b) => b.x1)
  const ye = boxes.map((b) => b.y1)
  const minX = Math.floor(Math.min(...xs)) - 1
  const minY = Math.floor(Math.min(...ys)) - 1
  const maxX = Math.ceil(Math.max(...xe)) + 1
  const maxY = Math.ceil(Math.max(...ye)) + 1
  const gw = maxX - minX
  const gh = maxY - minY
  const PAD = 44 // title + legend band height; the world is drawn below it
  const W = gw * PX
  const H = gh * PX + PAD
  const ox = (x: number) => (x - minX) * PX
  const oy = (y: number) => (y - minY) * PX + PAD
  const entBox = new Map(boxes.map((b) => [b.e.entity_number, b]))

  // Which world edges carry connectors for a given facing. In blueprint coords
  // y grows downward, so "north" = the low-y edge. A combinator's inputs and
  // outputs sit on opposite edges; facing east/west moves them to the east/west
  // edges (this is what makes rotation *legible*: the wires leave the correct
  // side). Factorio stores these 4-way entities on its 8-step direction enum as
  // 0=North, 4=South, 8=East, 12=West (the combinator sprite sheet is exactly 8
  // frames; and footprint() rotates on 8/12). NOTE: NOT the compact 2/4/6 - 8
  // means East here, so a 2/6 switch leaves every wide entity mis-attached.
  const dirSides = (dir: number) => {
    switch (dir) {
      case 4:
        return { out: 'south', in: 'north', arrow: [0, 1] }
      case 8:
        return { out: 'east', in: 'west', arrow: [1, 0] }
      case 12:
        return { out: 'west', in: 'east', arrow: [-1, 0] }
      default:
        return { out: 'north', in: 'south', arrow: [0, -1] }
    }
  }
  const portKind = (connector: number): 'in' | 'out' =>
    connector === 1 || connector === 2 ? 'in' : 'out'

  // Anchor point (px) for a given entity's connector: on the correct edge for
  // its facing, offset along that edge so red/green connectors don't overlap.
  const connectorPx = (n: number, connector: number): [number, number] => {
    const b = entBox.get(n)!
    const sides = dirSides(b.e.direction ?? 0)
    const side = sides[portKind(connector)]
    // 0 = red connector, 1 = green connector -> two slots along the edge.
    const slot = connector === 1 || connector === 3 ? 0.35 : 0.65
    const x0 = ox(b.x0)
    const y0 = oy(b.y0)
    const x1 = ox(b.x1)
    const y1 = oy(b.y1)
    switch (side) {
      case 'north':
        return [x0 + (x1 - x0) * slot, y0]
      case 'south':
        return [x0 + (x1 - x0) * slot, y1]
      case 'west':
        return [x0, y0 + (y1 - y0) * slot]
      default:
        return [x1, y0 + (y1 - y0) * slot] // east
    }
  }

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  )
  parts.push(`<rect width="${W}" height="${H}" fill="#202020"/>`)
  parts.push(
    `<text x="8" y="18" fill="#eee" font-family="sans-serif" font-size="14" font-weight="bold">miditorio schematic · ${entities.length} ent · ${wires.length} wires</text>`,
  )
  const legend = Object.entries(ABBR)
    .map(([name, a]) => ({ a, c: FILL[a], name }))
    .filter((l) => entities.some((e) => e.name === l.name))
  // legend on its own row below the title, left-aligned (no overlap with title)
  legend.forEach((l, i) => {
    const lx = 8 + i * 52
    parts.push(
      `<rect x="${lx}" y="26" width="12" height="12" fill="${l.c}" stroke="#0d0d0d"/>`,
    )
    parts.push(
      `<text x="${lx + 15}" y="36" fill="#ccc" font-family="sans-serif" font-size="11">${l.a}</text>`,
    )
  })

  // tile grid
  for (let x = 0; x <= gw; x++)
    parts.push(
      `<line x1="${x * PX}" y1="${PAD}" x2="${x * PX}" y2="${H}" stroke="#2c2c2c"/>`,
    )
  for (let y = 0; y <= gh; y++)
    parts.push(
      `<line x1="0" y1="${y * PX + PAD}" x2="${W}" y2="${y * PX + PAD}" stroke="#2c2c2c"/>`,
    )

  // wires (drawn beneath entities): connect each endpoint's real connector
  // (correct edge for its facing) with Factorio's L routing — red routes
  // horizontal-then-vertical, green vertical-then-horizontal.
  const wireColor = { red: '#e03030', green: '#37b037' }
  for (const [a, ap, b, bp2] of wires) {
    const color = netColor(ap)
    const [x1, y1] = connectorPx(a, ap)
    const [x2, y2] = connectorPx(b, bp2)
    const mid =
      color === 'red'
        ? `M${x1} ${y1} H${x2} V${y2}`
        : `M${x1} ${y1} V${y2} H${x2}`
    parts.push(
      `<path d="${mid}" fill="none" stroke="${wireColor[color]}" stroke-width="1.6" opacity="0.85"/>`,
    )
  }

  // entities
  for (const b of boxes) {
    const x = ox(b.x0)
    const y = oy(b.y0)
    const w = (b.x1 - b.x0) * PX
    const h = (b.y1 - b.y0) * PX
    const a = abbr(b.e.name)
    const isOverlap = overlapWith.has(b.e.entity_number)
    const stroke = isOverlap ? '#ff3b3b' : '#0d0d0d'
    const sw = isOverlap ? 3 : 1.5
    parts.push(
      `<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="4" fill="${FILL[a] ?? '#444'}" stroke="${stroke}" stroke-width="${sw}"/>`,
    )
    parts.push(
      `<text x="${x + w / 2}" y="${y + h / 2 - 2}" fill="#fff" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">${a}</text>`,
    )
    parts.push(
      `<text x="${x + w / 2}" y="${y + h / 2 + 12}" fill="#ddd" font-family="monospace" font-size="10" text-anchor="middle">${b.e.entity_number}</text>`,
    )
    const hp = hint(b.e)
    if (hp)
      parts.push(
        `<text x="${x + w / 2}" y="${y + h - 4}" width="${w - 4}" fill="#f7f7a0" font-family="monospace" font-size="8" text-anchor="middle" textLength="${Math.min(w - 4, hp.length * 5)}" lengthAdjust="spacingAndGlyphs">${esc(hp)}</text>`,
      )
    // facing arrow drawn just OUTSIDE the output edge (in empty grid space, so
    // it never covers the centered label). Points outward toward where the
    // output wires leave -> facing is legible even when rotation doesn't change
    // the footprint shape (e.g. a speaker).
    const [ax, ay] = dirSides(b.e.direction ?? 0).arrow
    const cx = x + w / 2
    const cy = y + h / 2
    const hx = w / 2
    const hy = h / 2
    const edge = cx + ax * hx + ax * 2 // on the output edge, nudged outward
    const edgey = cy + ay * hy + ay * 2
    const s = 7 // arrow size
    const tipx = edge + ax * s
    const tipy = edgey + ay * s
    const px = -ay
    const py = ax
    const bw = 4.5
    const bx1 = edge + px * bw
    const by1 = edgey + py * bw
    const bx2 = edge - px * bw
    const by2 = edgey - py * bw
    parts.push(
      `<polygon points="${tipx},${tipy} ${bx1},${by1} ${bx2},${by2}" fill="#ffd24a" stroke="#3a2c00" stroke-width="0.8"/>`,
    )
  }

  parts.push('</svg>')

  const warnList = [...overlapWith.entries()].map(
    ([n, others]) => `entity ${n} overlaps ${others.join(', ')}`,
  )
  return {
    svg: parts.join('\n'),
    warnings: { overlaps: warnList, nets: netReport.join('  |  ') },
  }
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const main = () => {
  const argv = process.argv.slice(2)
  const getFlag = (name: string): string | undefined => {
    const i = argv.indexOf(name)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const has = (name: string): boolean => argv.includes(name)
  const input = argv.find(
    (a) =>
      !a.startsWith('--') && a !== getFlag('-o') && a !== getFlag('--only'),
  )
  if (!input) {
    console.error(
      'usage: render-blueprint.ts <in.bp> [-o out.svg] [--only <substr>] [--png]',
    )
    process.exit(2)
  }
  const raw =
    input.endsWith('.bp') || input.startsWith('0e') || input.startsWith('0x')
      ? input.startsWith('0') && !input.includes('\n') && input.length < 5000
        ? input // a literal blueprint string
        : readFileSync(input, 'utf8')
      : readFileSync(input, 'utf8')

  const out = getFlag('-o') ?? 'blueprint.svg'
  const only = getFlag('--only')
  const { svg, warnings } = render(decodeBlueprint(raw), only)
  writeFileSync(out, svg)

  const targets = only ? `(filtered: ${only})` : ''
  console.log(`wrote ${out}${targets}`)
  console.log(`networks: ${warnings.nets}`)
  if (warnings.overlaps.length) {
    console.log(`OVERLAPS (${warnings.overlaps.length}):`)
    for (const w of warnings.overlaps) console.log('  - ' + w)
    process.exitCode = 3
  } else {
    console.log('overlaps: none')
  }

  if (has('--png')) {
    const png = out.replace(/\.svg$/, '.png')
    try {
      execFileSync('rsvg-convert', [out, '-o', png])
      console.log(`wrote ${png}`)
    } catch (err) {
      console.error(
        'rsvg-convert failed (install librsvg?):',
        (err as Error).message,
      )
    }
  }
}

main()
