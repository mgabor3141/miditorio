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
  noteToSignal: (midiNote: MidiNote | Note) => number | undefined

  /**
   * Some instruments are louder than others at max volume.
   * This correction factor equalizes them.
   */
  volumeCorrection?: number

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
  lowestNoteAsShownInGame: MidiNote | NoteString,
  highestNoteAsShownInGame: MidiNote | NoteString,
  actualMeasuredLowestNote?: MidiNote | NoteString,
): Pick<FactorioInstrument, 'isNoteValid' | 'noteToSignal'> &
  Partial<FactorioInstrument> => {
  const lie = actualMeasuredLowestNote
    ? Frequency(actualMeasuredLowestNote).toMidi() -
      Frequency(lowestNoteAsShownInGame).toMidi()
    : 0

  const lowestNote = (Frequency(lowestNoteAsShownInGame).toMidi() +
    lie) as MidiNote
  const highestNote = (Frequency(highestNoteAsShownInGame).toMidi() +
    lie) as MidiNote

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
    noteToSignal: (note: MidiNote | Note) =>
      Number(note) - lowestNote - lie + 1,
    lowestNote: lowestNote,
    highestNote: highestNote,
  }
}

const dbToGainRatio = (db: number) => 10 ** (db / 20)
const CORRECT_LOUDNESS_TO = -20.0 // dB RMS

/**
 * Correct loudness
 * @param loudnessDbRms the RMS loudness measured of this instrument.
 * This is the "from" value for the correction.
 */
const sampleLoudness = (loudnessDbRms: number) => ({
  volumeCorrection: dbToGainRatio(CORRECT_LOUDNESS_TO - loudnessDbRms),
})

type FactorioInstrumentData = Omit<
  Record<FactorioInstrumentName, FactorioInstrument>,
  'Alarms' | 'Miscellaneous'
>
export const FACTORIO_INSTRUMENT_DATA = (() => {
  // prettier-ignore
  const rawInstrumentData: [FactorioInstrumentName, Partial<FactorioInstrument>, Pick<FactorioInstrument, 'volumeCorrection'>][] = [
    ["Piano",           noteRange('F3', 'E7', 'F2'), sampleLoudness(-20.00) ],
    ["Bass",            noteRange('F2', 'E5', 'F1'), sampleLoudness(-10.12) ],
    ["Lead",            noteRange('F2', 'E5'      ), sampleLoudness(-20.91) ],
    ["Sawtooth",        noteRange('F2', 'E5', 'F1'), sampleLoudness(-20.00) ],
    ["Square",          noteRange('F2', 'E5'      ), sampleLoudness( -0.21) ],
    ["Celesta",         noteRange('F5', 'E8', 'F4'), sampleLoudness(-10.61) ],
    ["Vibraphone",      noteRange('F5', 'E8', 'F3'), sampleLoudness(-11.69) ],
    ["Plucked strings", noteRange('F4', 'E7', 'F3'), sampleLoudness(- 8.02) ],
    ["Steel drum",      noteRange('F3', 'E6', 'F2'), sampleLoudness(- 6.18) ],
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
      noteToSignal: (note) => {
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
})()

export const toFactorioInstrument = (
  instrument: Instrument,
): FactorioInstrument | undefined => {
  if (instrument.percussion) return FACTORIO_INSTRUMENT_DATA['Drumkit']

  switch (instrument.family as (typeof gmInstrumentFamilies)[number]) {
    case 'piano':
      return FACTORIO_INSTRUMENT_DATA['Piano']
    case 'chromatic percussion':
      console.log(
        instrument.number,
        instrument.name,
        '-->',
        instrument.number % 2 ? 'Celesta' : 'Vibraphone',
      )
      return FACTORIO_INSTRUMENT_DATA[
        instrument.number % 2 ? 'Celesta' : 'Vibraphone'
      ]
    case 'organ':
      return FACTORIO_INSTRUMENT_DATA['Square']
    case 'guitar':
      return FACTORIO_INSTRUMENT_DATA['Sawtooth']
    case 'bass':
      return FACTORIO_INSTRUMENT_DATA['Bass']
    case 'strings':
      return FACTORIO_INSTRUMENT_DATA['Lead']
    case 'brass':
      return FACTORIO_INSTRUMENT_DATA['Piano']
    case 'reed':
      return FACTORIO_INSTRUMENT_DATA['Piano']
    case 'pipe':
      return FACTORIO_INSTRUMENT_DATA['Piano']
    case 'synth lead':
      // TODO
      return FACTORIO_INSTRUMENT_DATA['Piano']
    case 'synth pad':
      return FACTORIO_INSTRUMENT_DATA['Vibraphone']
    case 'synth effects':
      return FACTORIO_INSTRUMENT_DATA['Sawtooth']
    case 'world':
      return FACTORIO_INSTRUMENT_DATA['Piano']
    case 'percussive':
      // TODO
      return FACTORIO_INSTRUMENT_DATA['Steel drum']
    case 'sound effects':
      return undefined
  }
}
