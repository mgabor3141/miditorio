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
 *   - footprint OVERLAP detection (entities occupying the same tile), and
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

/** Width x height in tiles, keyed by entity name. Directions that rotate a
 *  1x2 combinator (east/west = 2/6) are swapped to 2x1. */
const footprint = (e: Entity): { w: number; h: number } => {
  const horizontal = e.direction === 2 || e.direction === 6
  let w = 1
  let h = 1
  switch (e.name) {
    case 'constant-combinator':
      w = 1
      h = 1
      break
    case 'programmable-speaker':
      w = 1
      h = 2
      break
    case 'arithmetic-combinator':
    case 'decider-combinator':
    case 'logistic-combinator':
    default:
      w = 1
      h = 2
      if (horizontal) {
        w = 2
        h = 1
      }
  }
  return { w, h }
}

type Box = { e: Entity; cx: number; cy: number; w: number; h: number }
const boxOf = (e: Entity): Box => {
  const { w, h } = footprint(e)
  return { e, cx: e.position.x, cy: e.position.y, w, h }
}

// A placement MISTAKE is two entities claiming the same grid reference cell.
// Adjacent stacks (1 tile apart) are valid in Factorio and must NOT be flagged,
// so we key each entity to its grid cell (floor of its position) and compare
// cells, not center-boxes. Entities are laid out on a half-tile grid, so floor
// maps every entity to a stable cell; a genuine double-placement collides.
const cellOf = (e: Entity): string =>
  `${Math.floor(e.position.x)},${Math.floor(e.position.y)}`

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

  // ---- overlap detection: two entities sharing a grid cell ----
  const byCell = new Map<string, number[]>()
  for (const b of boxes) {
    const c = cellOf(b.e)
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
  const xs = boxes.map((b) => b.cx - b.w / 2)
  const ys = boxes.map((b) => b.cy - b.h / 2)
  const xe = boxes.map((b) => b.cx + b.w / 2)
  const ye = boxes.map((b) => b.cy + b.h / 2)
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

  // wires (drawn beneath entities). Red routes H-then-V, green V-then-H.
  const wireColor = { red: '#e03030', green: '#37b037' }
  for (const [a, ap, b] of wires) {
    const ea = byNum.get(a)!
    const eb = byNum.get(b)!
    const color = netColor(ap)
    const x1 = ox(ea.position.x)
    const y1 = oy(ea.position.y)
    const x2 = ox(eb.position.x)
    const y2 = oy(eb.position.y)
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
    const x = ox(b.cx - b.w / 2)
    const y = oy(b.cy - b.h / 2)
    const w = b.w * PX
    const h = b.h * PX
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
