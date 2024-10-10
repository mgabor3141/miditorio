import { invert } from '@/app/lib/utils'

export const factorioInstrumentsById = {
  '0': 'Alarms',
  '1': 'Miscellaneous',
  '2': 'Drumkit',
  '3': 'Piano',
  '4': 'Bass',
  '5': 'Lead',
  '6': 'Sawtooth',
  '7': 'Square',
  '8': 'Celesta',
  '9': 'Vibraphone',
  '10': 'Plucked strings',
  '11': 'Steel drum',
  '12': 'Steel drum',
} as const
export type FactorioInstrumentId = keyof typeof factorioInstrumentsById

export const factorioInstrumentNameToId = invert(factorioInstrumentsById)
export type FactorioInstrumentName = keyof typeof factorioInstrumentNameToId
