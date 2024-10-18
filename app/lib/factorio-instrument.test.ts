import { expect, test } from 'vitest'
import { Frequency } from 'tone'
import { getFactorioInstrument } from '@/app/lib/factorio-instrument'

test('Piano too low note', () => {
  const piano = getFactorioInstrument('Piano')
  const E2 = Frequency('E2').toMidi()

  expect(
    piano.noteToFactorioNote(
      E2,
      { octaveShift: 0, velocityValues: [], factorioInstruments: ['Piano'] },
      { globalNoteShift: 0, speedMultiplier: 1 },
    ),
  ).toBe({ valid: false, outOfRangeDirection: 'lower' })
})

test('Piano lowest note', () => {
  const piano = getFactorioInstrument('Piano')
  const F2 = Frequency('F2').toMidi()

  expect(
    piano.noteToFactorioNote(
      F2,
      { octaveShift: 0, velocityValues: [], factorioInstruments: ['Piano'] },
      { globalNoteShift: 0, speedMultiplier: 1 },
    ),
  ).toBe({ valid: true, factorioNote: 1 })
})

test('Piano highest note', () => {
  const piano = getFactorioInstrument('Piano')
  const E6 = Frequency('E6').toMidi()

  expect(
    piano.noteToFactorioNote(
      E6,
      { octaveShift: 0, velocityValues: [], factorioInstruments: ['Piano'] },
      { globalNoteShift: 0, speedMultiplier: 1 },
    ),
  ).toBe({ valid: true, factorioNote: 48 })
})

test('Piano too high note', () => {
  const piano = getFactorioInstrument('Piano')
  const ESharp6 = Frequency('E#6').toMidi()

  expect(
    piano.noteToFactorioNote(
      ESharp6,
      { octaveShift: 0, velocityValues: [], factorioInstruments: ['Piano'] },
      { globalNoteShift: 0, speedMultiplier: 1 },
    ),
  ).toBe({ valid: false, outOfRangeDirection: 'higher' })
})
