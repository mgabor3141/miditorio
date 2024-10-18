import { FactorioDrumSound } from '@/app/lib/data/factorio-drumkit-sounds-by-id'
import { MidiNote } from 'tone/build/esm/core/type/NoteUnits'
import { gmPercussionToFactorioDrumkit } from '@/app/lib/data/gm-percussion-to-factorio-drumkit'
import { noteToGmPercussion } from '@/app/lib/data/gm-percussion-note-names'

export type DrumMap = (note: MidiNote) => FactorioDrumSound | undefined

export type DrumMapOverrides = Record<string, FactorioDrumSound>

export const drumMapWithOverrides =
  (drumMap: DrumMap, overrides?: DrumMapOverrides): DrumMap =>
  (note) => {
    if (overrides && note in overrides) return overrides[note]

    return drumMap(note)
  }

export const defaultDrumMap: DrumMap = (note: MidiNote) =>
  gmPercussionToFactorioDrumkit[
    noteToGmPercussion[note.toString() as keyof typeof noteToGmPercussion]
  ]
