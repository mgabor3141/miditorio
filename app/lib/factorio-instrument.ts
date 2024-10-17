import {
  MidiNote,
  Note as NoteString,
} from 'tone/build/esm/core/type/NoteUnits'
import { Frequency } from 'tone'
import { Instrument } from '@tonejs/midi/dist/Instrument'
import { gmInstrumentFamilies } from '@/app/lib/data/gm-instrument-families'
import { Note } from '@tonejs/midi/dist/Note'
import {
  FactorioInstrumentId,
  FactorioInstrumentName,
  factorioInstrumentNameToId,
} from '@/app/lib/data/factorio-instruments-by-id'
import { gmPercussionToFactorioDrumkit } from '@/app/lib/data/gm-percussion-to-factorio-drumkit'
import { noteToGmPercussion } from '@/app/lib/data/gm-percussion-note-names'
import { factorioDrumSoundToSignal } from '@/app/lib/data/factorio-drumkit-sounds-by-id'

export type FactorioInstrument = {
  /**
   * The in-game name of the instrument
   */
  name: FactorioInstrumentName

  /**
   * The in-game ID of the instrument
   */
  id: FactorioInstrumentId

  /**
   * Check if MIDI note is valid and in range of the Factorio instrument
   */
  isNoteValid: (midiNote: MidiNote | Note) => {
    valid: boolean
    outOfRangeDirection?: 'above' | 'below'
  }

  /**
   * Convert MIDI note to the Factorio instrument note value
   * that can be sent on the circuit signal
   */
  noteToFactorioNote: (midiNote: MidiNote | Note) => number | undefined

  /**
   * Some instruments are louder than others at max volume.
   * This correction factor equalizes them.
   */
  volumeCorrection: number

  /**
   * The lowest note that the instrument can play
   */
  lowestNote?: MidiNote

  /**
   * The highest note that the instrument can play
   */
  highestNote?: MidiNote
}

const noteRange = (
  lowestPlayableNote: MidiNote | NoteString,
  highestPlayableNote: MidiNote | NoteString,
): Pick<FactorioInstrument, 'isNoteValid' | 'noteToFactorioNote'> &
  Partial<FactorioInstrument> => {
  const lowestNote = Frequency(lowestPlayableNote).toMidi() as MidiNote
  const highestNote = Frequency(highestPlayableNote).toMidi() as MidiNote

  return {
    isNoteValid: (midiNote: MidiNote | Note) => {
      const note = Number(midiNote)
      return {
        valid: note <= lowestNote && note >= highestNote,
        outOfRangeDirection:
          (note > highestNote && 'above') ||
          (note < lowestNote && 'below') ||
          undefined,
      }
    },
    // Factorio note signals are "indexed" from 1
    noteToFactorioNote: (note: MidiNote | Note) =>
      Number(note) - lowestNote + 1,
    lowestNote: lowestNote,
    highestNote: highestNote,
  }
}

/**
 * This is set to the lowest sample loudness out of the instrument.
 * That instrument will be set as full volume, the rest will be normalized.
 * Unit: dB RMS
 */
const CORRECT_LOUDNESS_TO = -20.0
const dbToGainRatio = (db: number) => 10 ** (db / 20)

/**
 * Correct loudness
 * @param loudnessDbRms the RMS loudness measured of this instrument.
 * This is the "from" value for the correction.
 */
const sampleLoudness = (loudnessDbRms: number) => ({
  volumeCorrection: dbToGainRatio(CORRECT_LOUDNESS_TO - loudnessDbRms),
})

type FactorioInstrumentData = Record<FactorioInstrumentName, FactorioInstrument>

/**
 * Note ranges are the actual note pitches which may differ from the in-game labels
 */
export const getFactorioInstrumentList = () => {
  // prettier-ignore
  const rawInstrumentData: [FactorioInstrumentName, Partial<FactorioInstrument>, Pick<FactorioInstrument, 'volumeCorrection'>][] = [
    ["Celesta",         noteRange('F4', 'E7'), sampleLoudness(-10.61) ], // In-game: F5-E8
    ["Vibraphone",      noteRange('F3', 'E6'), sampleLoudness(-13.00) ], // In-game: F5-E8
    ["Plucked strings", noteRange('F3', 'E6'), sampleLoudness(- 8.02) ], // In-game: F4-E7
    ["Piano",           noteRange('F2', 'E6'), sampleLoudness(-20.00) ], // In-game: F3-E7
    ["Lead",            noteRange('F2', 'E5'), sampleLoudness(-20.00) ],
    ["Square",          noteRange('F2', 'E5'), sampleLoudness( -0.21) ],
    ["Steel drum",      noteRange('F2', 'E5'), sampleLoudness(-17.00) ], // In-game: F3-E6
    ["Bass",            noteRange('F1', 'E4'), sampleLoudness(-18.00) ], // In-game: F2-E5
    ["Sawtooth",        noteRange('F1', 'E4'), sampleLoudness(-20.00) ], // In-game: F2-E5
  ]

  const instrumentData: FactorioInstrumentData = {
    ...rawInstrumentData.reduce(
      (previousValue, [name, noteRangeData, volumeData]) => ({
        ...previousValue,
        [name]: {
          name,
          id: factorioInstrumentNameToId[name],
          ...noteRangeData,
          ...volumeData,
        },
      }),
      {} as FactorioInstrumentData,
    ),
    Drumkit: {
      name: 'Drumkit',
      id: '2',
      isNoteValid: () => ({ valid: true }),
      noteToFactorioNote: (note) => {
        const factorioSound =
          gmPercussionToFactorioDrumkit[
            noteToGmPercussion[
              note.toString() as keyof typeof noteToGmPercussion
            ]
          ]

        if (!factorioSound) return undefined
        return parseInt(factorioDrumSoundToSignal[factorioSound])
      },
      volumeCorrection: 0.9,
    },
  }

  return instrumentData
}

export const getFactorioInstrument = ((
  name?: FactorioInstrumentName,
): FactorioInstrument | undefined => {
  if (name !== undefined) return getFactorioInstrumentList()[name]
  return undefined
}) as {
  (name: undefined): undefined
  (name: FactorioInstrumentName): FactorioInstrument
  (name?: FactorioInstrumentName): FactorioInstrument | undefined
}

export const toFactorioInstrument = (
  instrument: Instrument,
): FactorioInstrumentName | undefined => {
  if (instrument.percussion) return 'Drumkit'

  switch (instrument.family as (typeof gmInstrumentFamilies)[number]) {
    case 'piano':
      return 'Piano'
    case 'chromatic percussion':
      if (instrument.name === 'vibraphone') return 'Vibraphone'
      if (instrument.name === 'celesta') return 'Celesta'
      return instrument.number % 2 ? 'Vibraphone' : 'Celesta'
    case 'organ':
      return 'Square'
    case 'guitar':
      return 'Sawtooth'
    case 'bass':
      return 'Bass'
    case 'strings':
      if (instrument.name === 'pizzicato strings') return 'Plucked strings'
      return 'Lead'
    case 'ensemble':
      return 'Sawtooth'
    case 'brass':
      return 'Lead'
    case 'reed':
      return 'Piano'
    case 'pipe':
      return 'Piano'
    case 'synth lead':
      if (instrument.name === 'lead 1 (square)') return 'Square'
      if (instrument.name === 'lead 2 (sawtooth)') return 'Sawtooth'
      if (instrument.name === 'lead 8 (bass + lead)') return 'Bass'
      return 'Sawtooth'
    case 'synth pad':
      return 'Vibraphone'
    case 'synth effects':
      return 'Sawtooth'
    case 'world':
      return 'Piano'
    case 'percussive':
      // TODO
      return 'Steel drum'
    case 'sound effects':
      return undefined
  }
}
