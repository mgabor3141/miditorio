import { describe, expect, test } from 'vitest'
import { Frequency, isArray } from 'tone'
import { getFactorioInstrument } from '@/app/lib/factorio-instrument'
import type { FactorioInstrumentName } from '@/app/lib/data/factorio-instruments-by-id'
import type { Note } from 'tone/build/esm/core/type/Units'
import { MidiNote } from 'tone/build/esm/core/type/NoteUnits'

const note = (noteString: Note) => [Frequency(noteString).toMidi(), noteString]

// T is a single test case parameter, or an array that needs to be unwrapped
const cartesianProduct = <T>(...arrays: T[][]): T[][] =>
  arrays.reduce(
    (acc, curr) =>
      acc.flatMap((a) => curr.map((b) => [...a, ...(isArray(b) ? b : [b])])),
    [[]] as T[][],
  )

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testCases = cartesianProduct<any>(
  // octave shifts
  [0, 1, 2, -1],
  // global shifts
  [0, 1, 2, -1],
  // Notes
  [
    note('E2'),
    note('F2'),
    note('E4'),
    note('F4'),
    note('E6'),
    note('E#6'),
    note('E7'),
    note('E#7'),
  ],
  // Instruments
  ['Piano', 'Celesta'],
) as [number, number, MidiNote, Note, FactorioInstrumentName][]

describe('Note conversion', () => {
  test.for(testCases)(
    '%d octaveShift, %d noteShift, note %d (%s) %s',
    ([octaveShift, globalNoteShift, note, _noteName, instrumentName]) => {
      const instrument = getFactorioInstrument(
        instrumentName as FactorioInstrumentName,
      )

      const result = instrument.noteToFactorioNote(
        note,
        {
          octaveShift,
          velocityValues: [],
          factorioInstruments: [instrumentName],
        },
        { globalNoteShift, speedMultiplier: 1 },
      )

      expect(result).toSatisfy(
        (result: Record<string, unknown>) =>
          !!(
            (result.valid && (result.factorioNote as number) > 0) ||
            (!result.valid && result.outOfRangeDirection)
          ),
      )

      expect(result).toMatchSnapshot()
    },
  )
})
