import { expect, test } from 'vitest'
import { FACTORIO_INSTRUMENT } from '@/app/lib/factorio-instrument'
import { Frequency } from 'tone'

test('Piano lowest note correct conversion', () => {
  const piano = FACTORIO_INSTRUMENT['Piano']
  const F2 = Frequency('F2').toMidi()

  expect(piano.noteToFactorioNote(F2)).toBe(1)
})

test('Piano highest note correct conversion', () => {
  const piano = FACTORIO_INSTRUMENT['Piano']
  const E6 = Frequency('E6').toMidi()

  expect(piano.noteToFactorioNote(E6)).toBe(48)
})
