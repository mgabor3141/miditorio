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
// Factorio's 4-way direction enum has stride 4: North=0, East=4, South=8,
// West=12. So the HORIZONTAL (wide, 2x1) facings are East/West = 4/12; North/
// South (0/8, and 0 when the field is absent) stay tall. (Verified against the
// user's reference scene: up/right/down/left == dir 0/4/8/12 -> tall/wide/
// tall/wide.) NOT 2/6, and NOT 8/12 - 4 is East here.
const footprint = (e: Entity): { w: number; h: number } => {
  const base = SELECTION[e.name] ?? { w: 1, h: 2 }
  const horizontal = e.direction === 4 || e.direction === 12
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
const cellOf = (b: Box): string =>
  `${Math.floor(b.e.position.x)},${Math.floor(b.e.position.y)}`

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
  ARC: '#1f5c78', // arithmetic = blue
  DEC: '#c9a227', // decider = yellow
  LGC: '#3f7a3f',
  CON: '#7a2f2f',
  SPK: '#9a6a1a',
}
const abbr = (name: string): string =>
  ABBR[name] ?? name.replace(/-/g, '').slice(0, 3).toUpperCase()

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
  const PAD = 40 // top band: title line + x-coordinate ruler (world below)
  const LGUT = 30 // left gutter for the y-coordinate ruler
  const W = gw * PX + LGUT
  const H = gh * PX + PAD
  const ox = (x: number) => (x - minX) * PX + LGUT
  const oy = (y: number) => (y - minY) * PX + PAD
  const entBox = new Map(boxes.map((b) => [b.e.entity_number, b]))

  // Which world edges carry connectors for a given facing. In blueprint coords
  // y grows downward, so "north" = the low-y edge. A combinator's inputs and
  // outputs sit on opposite ends; the facing (output) end is the one the yellow
  // arrow points to in Factorio. Factorio's 4-way direction enum has stride 4:
  // North=0, East=4, South=8, West=12 (0 when the field is absent). So facing
  // east(4)/west(12) puts the connectors on the east/west edges - matching
  // footprint()'s rotate-on-4/12. NOTE: NOT 2/6, and NOT 8=south-as-east.
  const dirSides = (dir: number) => {
    switch (dir) {
      case 4:
        return { out: 'east', in: 'west', arrow: [1, 0] }
      case 8:
        return { out: 'south', in: 'north', arrow: [0, 1] }
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
    `<text x="8" y="16" fill="#eee" font-family="sans-serif" font-size="13" font-weight="bold">miditorio · ${entities.length} ent · ${wires.length} wires</text>`,
  )
  // (legend dropped: box fill + abbreviation already identify each type.)

  // tile grid (offset right by the y-axis gutter)
  for (let x = 0; x <= gw; x++)
    parts.push(
      `<line x1="${x * PX + LGUT}" y1="${PAD}" x2="${x * PX + LGUT}" y2="${H}" stroke="#2c2c2c"/>`,
    )
  for (let y = 0; y <= gh; y++)
    parts.push(
      `<line x1="${LGUT}" y1="${y * PX + PAD}" x2="${W}" y2="${y * PX + PAD}" stroke="#2c2c2c"/>`,
    )

  // coordinate rulers along the grid edges: integer world coords, so you can
  // read an entity's Factorio position straight off the schematic. Vertical
  // grid line at world x gets its x label on top; horizontal line at world y
  // gets its y label in the left gutter.
  const AX = '#8a8a8a'
  for (let x = 0; x <= gw; x++)
    parts.push(
      `<text x="${x * PX + LGUT}" y="${PAD - 4}" fill="${AX}" font-family="monospace" font-size="9" text-anchor="middle">${minX + x}</text>`,
    )
  for (let y = 0; y <= gh; y++)
    parts.push(
      `<text x="${LGUT - 5}" y="${y * PX + PAD + 10}" fill="${AX}" font-family="monospace" font-size="9" text-anchor="end">${minY + y}</text>`,
    )

  // wires (drawn beneath entities): connect each endpoint's real connector
  // (correct edge for its facing) with Factorio's L routing — red routes
  // horizontal-then-vertical, green vertical-then-horizontal. Each wire is
  // drawn as a dark "casing" under a brighter core so it stays legible on the
  // dark background and two same-color wires that share a path read as two
  // distinct wires instead of merging into one blob.
  const wireColor = { red: '#ff5a5a', green: '#48d24a' }
  const casing = '#0a0a0a'
  for (const [a, ap, b, bp2] of wires) {
    const color = netColor(ap)
    const [x1, y1] = connectorPx(a, ap)
    const [x2, y2] = connectorPx(b, bp2)
    // A self-loop (same entity + same net, e.g. the volume memory's green
    // in->out bridge) has both connectors on one edge -> it would collapse to
    // a zero-length segment. Draw a small square bump out the side so the
    // feedback link is actually visible.
    if (a === b) {
      const ex = Math.max(x1, x2) + 8
      const d = `M${x1} ${y1} H${ex} V${y2} H${x2}`
      parts.push(
        `<path d="${d}" fill="none" stroke="${casing}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>`,
      )
      parts.push(
        `<path d="${d}" fill="none" stroke="${wireColor[color]}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`,
      )
      continue
    }
    const mid =
      color === 'red'
        ? `M${x1} ${y1} H${x2} V${y2}`
        : `M${x1} ${y1} V${y2} H${x2}`
    parts.push(
      `<path d="${mid}" fill="none" stroke="${casing}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>`,
    )
    parts.push(
      `<path d="${mid}" fill="none" stroke="${wireColor[color]}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`,
    )
  }

  // connector dots on top of the wires: a small bead at each plug-in point so
  // you can read exactly which port a wire attaches to (and spot a node where
  // several wires share one connector).
  for (const [a, ap, b, bp2] of wires) {
    const color = netColor(ap)
    for (const [n, conn] of [
      [a, ap],
      [b, bp2],
    ] as const) {
      const [cx, cy] = connectorPx(n, conn)
      parts.push(
        `<circle cx="${cx}" cy="${cy}" r="3" fill="${wireColor[color]}" stroke="${casing}" stroke-width="1.2"/>`,
      )
    }
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
    // Labels: type abbreviation + entity number only. player_description hints
    // were pure noise (and truncated); the number is enough to identify a box
    // alongside its colour/abbreviation. Centred as a block.
    const cxl = x + w / 2
    parts.push(
      `<text x="${cxl}" y="${y + h / 2 - 3}" fill="#fff" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">${a}</text>`,
    )
    parts.push(
      `<text x="${cxl}" y="${y + h / 2 + 11}" fill="#ddd" font-family="monospace" font-size="10" text-anchor="middle">${b.e.entity_number}</text>`,
    )
    // Facing arrow, drawn INSIDE the box near the output edge, pointing at that
    // edge. Skipped for programmable speakers, which have no meaningful facing.
    // Cyan (not yellow): DEC boxes are now yellow, so a yellow arrow vanished on
    // them; cyan has contrast on yellow/blue/red alike.
    if (b.e.name !== 'programmable-speaker') {
      const [ax, ay] = dirSides(b.e.direction ?? 0).arrow
      const cx = x + w / 2
      const cy = y + h / 2
      const inset = 5 // tip distance inside the output edge
      const depth = 12 // base distance inside the box from the edge
      const hw = 4 // half base width
      const tipx = cx + ax * (w / 2 - inset)
      const tipy = cy + ay * (h / 2 - inset)
      const basex = cx + ax * (w / 2 - depth)
      const basey = cy + ay * (h / 2 - depth)
      const px = -ay
      const py = ax
      parts.push(
        `<polygon points="${tipx},${tipy} ${basex + px * hw},${basey + py * hw} ${basex - px * hw},${basey - py * hw}" fill="#43d6e0" stroke="#062a2e" stroke-width="1"/>`,
      )
    }
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
