import type { Entity, Wire } from '@/src/lib/factorio-blueprint-schema'

/**
 * Zero-dependency blueprint builder.
 *
 * Replaces the two hand-rolled fragilities in the old assembly layer:
 *  1. Manual `entity_number` arithmetic (`en(entitiesSoFar)(localNumber)` and
 *     cross-section `- 4` references). Callers now add entities through a
 *     shared builder and pass the returned HANDLE around; the builder owns the
 *     global counter so a handle's `entity_number` is always correct, whatever
 *     section it lives in.
 *  2. Magic wire-port tuples `[a, 4, b, 2]`. Ports are named via PORT and wires
 *     are built with `builder.wire(from, port, to, port)`.
 *
 * Insertion order determines `entity_number` (1-based, sequential), exactly as
 * before: sections add into the same builder in global order.
 */

/** Named wire-connector ports. Combinator ports are 1..4; a programmable
 *  speaker has a single red/green circuit connector. */
export const PORT = {
  combInputRed: 1,
  combInputGreen: 2,
  combOutputRed: 3,
  combOutputGreen: 4,
  // programmable-speaker circuit connector (same numeric ids as combinator
  // input red/green, but named separately for clarity at the call site).
  speakerRed: 1,
  speakerGreen: 2,
  // constant-combinator output connectors (a constant combinator has only one
  // red and one green connector; numeric id matches the input-side id).
  constantRed: 1,
  constantGreen: 2,
} as const

/** Anything that carries an entity_number: a real handle or a forward ref. */
export type EntityRef = { entity_number: number }

/** `Omit` that distributes over the Entity discriminated union so each variant
 *  keeps its own control_behavior shape once entity_number is stripped. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

export type BlueprintBuilder = {
  /** Add an entity, assigning the next entity_number. Returns a handle. */
  entity(entity: DistributiveOmit<Entity, 'entity_number'>): Entity
  /** Connect two entity handles via their connector ports. */
  wire(from: EntityRef, fromPort: number, to: EntityRef, toPort: number): void
  /**
   * Reference an entity purely by number. Escape hatch for the reserved
   * cross-section speaker slots that, with fewer than two speakers, alias to
   * entities created by a later section (a quirk of the original design we
   * preserve verbatim).
   */
  refAt(entity_number: number): EntityRef
  /** Assembled entities + wires, in insertion order. */
  build(): { entities: Entity[]; wires: Wire[] }
}

export const createBuilder = (): BlueprintBuilder => {
  const entities: Entity[] = []
  const wires: Wire[] = []

  return {
    entity(entity) {
      // entity_number first so the serialized key order matches the pre-port
      // encoder byte-for-byte.
      const withNumber = {
        entity_number: entities.length + 1,
        ...entity,
      } as Entity
      entities.push(withNumber)
      return withNumber
    },
    wire(from, fromPort, to, toPort) {
      wires.push([from.entity_number, fromPort, to.entity_number, toPort])
    },
    refAt: (entity_number) => ({ entity_number }),
    build: () => ({ entities, wires }),
  }
}
