import { expect, test } from 'vitest'
import { FACTORIO_INSTRUMENT } from '@/app/lib/factorio-instrument'
import { Frequency } from 'tone'

test('Simple song conversion', () => {
  const piano = FACTORIO_INSTRUMENT['Piano']
  const F2 = Frequency('F2').toMidi()

  expect(piano.noteToFactorioNote(F2)).toBe(1)
})
