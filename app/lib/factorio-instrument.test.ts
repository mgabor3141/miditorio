import { expect, test } from 'vitest'
import { Frequency } from 'tone'
import { getFactorioInstrument } from '@/app/lib/factorio-instrument'

test('Piano lowest note correct conversion', () => {
  const piano = getFactorioInstrument('Piano')
  const F2 = Frequency('F2').toMidi()

  expect(piano.noteToFactorioNote(F2)).toBe(1)
})

test('Piano highest note correct conversion', () => {
  const piano = getFactorioInstrument('Piano')
  const E6 = Frequency('E6').toMidi()

  expect(piano.noteToFactorioNote(E6)).toBe(48)
})
