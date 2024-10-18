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
import { factorioDrumSoundToSignal } from '@/app/lib/data/factorio-drumkit-sounds-by-id'
import { defaultDrumMap, drumMapWithOverrides } from '@/app/lib/drum-map'
import { NoteExtremes } from '@/app/lib/song'
import { Settings, TrackSettings } from '@/app/components/select-stage'

export type HigherOrLower = 'higher' | 'lower'

export type FactorioNoteResult =
  | {
      valid: true
      factorioNote: number
    }
  | {
      valid: false
      outOfRangeDirection?: HigherOrLower
      factorioNote: undefined
    }

/**
 * I can't seem to make this type from {@link FactorioNoteResult} or vice versa,
 *  so it's a separate declaration
 */
export type FactorioNoteResultWithInstrument =
  | {
      valid: true
      factorioNote: number
      instrumentName: FactorioInstrumentName
    }
  | {
      valid: false
      outOfRangeDirection?: HigherOrLower
      factorioNote: undefined
      instrumentName: undefined
    }

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
   * Check if MIDI note is valid and in range of the Factorio instrument.
   * If so, return the note. If not, return which direction it is from the range.
   */
  noteToFactorioNote: (
    midiNote: MidiNote | Note,
    settings: TrackSettings,
    globalSettings: Omit<Settings, 'tracks'>,
  ) => FactorioNoteResult

  /**
   * Some instruments are louder than others at max volume.
   * This correction factor equalizes them.
   */
  volumeCorrection: number

  /**
   * The lowest and highest notes that the instrument can play
   */
  noteExtremes?: NoteExtremes
}

const noteRange = (
  lowest: MidiNote | NoteString,
  highest: MidiNote | NoteString,
): Pick<FactorioInstrument, 'noteToFactorioNote'> &
  Partial<FactorioInstrument> => {
  const lowestPlayableNote = Frequency(lowest).toMidi() as MidiNote
  const highestPlayableNote = Frequency(highest).toMidi() as MidiNote

  return {
    noteToFactorioNote: (
      note: MidiNote | Note,
      { octaveShift },
      { globalNoteShift },
    ) => {
      note =
        typeof note === 'object' && 'midi' in note
          ? (note.midi as MidiNote)
          : note

      const lowestFactorioNote = 1
      const highestFactorioNote =
        highestPlayableNote - lowestPlayableNote + lowestFactorioNote

      note =
        Number(note) -
        lowestPlayableNote +
        octaveShift * 12 +
        globalNoteShift +
        lowestFactorioNote

      if (lowestFactorioNote <= note && note <= highestFactorioNote)
        return {
          valid: true,
          factorioNote: note,
        }

      return {
        valid: false,
        outOfRangeDirection:
          (note < lowestFactorioNote && 'lower') ||
          (highestFactorioNote < note && 'higher') ||
          undefined,
      }
    },
    noteExtremes: {
      min: lowestPlayableNote,
      max: highestPlayableNote,
    },
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
    ["Bass",            noteRange('F1', 'E4'), sampleLoudness(-19.00) ], // In-game: F2-E5
    ["Sawtooth",        noteRange('F1', 'E4'), sampleLoudness(-19.00) ], // In-game: F2-E5
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
      volumeCorrection: 0.9,
      noteToFactorioNote: (note, { drumMapOverrides }) => {
        const drumMap = drumMapWithOverrides(defaultDrumMap, drumMapOverrides)
        const factorioSound = drumMap(note as MidiNote)

        if (!factorioSound)
          return {
            valid: false,
          }
        return {
          valid: true,
          factorioNote: Number(factorioDrumSoundToSignal[factorioSound]),
        }
      },
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
