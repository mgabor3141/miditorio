import { invert } from '@/app/lib/utils'

export const signalToFactorioDrumSound = {
  '1': 'Kick 1',
  '2': 'Kick 2',
  '3': 'Snare 1', // Basically a high tom
  '4': 'Snare 2',
  '5': 'Snare 3',
  '6': 'Hi-hat 1',
  '7': 'Hi-hat 2', // Slightly shorter
  '8': 'Fx',
  '9': 'High Q',
  '10': 'Percussion 1',
  '11': 'Percussion 2',
  '12': 'Crash',
  '13': 'Reverse cymbal',
  '14': 'Clap',
  '15': 'Shaker',
  '16': 'Cowbell',
  '17': 'Triangle',
} as const

export const factorioDrumSoundToNoteNumber = invert(signalToFactorioDrumSound)

export type FactorioDrumSound = keyof typeof factorioDrumSoundToNoteNumber
