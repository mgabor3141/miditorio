import { Midi } from '@tonejs/midi'
import { Note } from '@tonejs/midi/dist/Note'
import { Settings, TrackSettings } from '@/app/components/select-stage'
import { Midi as ToneMidi } from 'tone'
import { capitalize } from '@/app/lib/utils'
import {
  FactorioNoteResultWithInstrument,
  getFactorioInstrument,
  HigherOrLower,
  toFactorioInstrument,
} from '@/app/lib/factorio-instrument'
import { getVelocityValues } from '@/app/components/instrument-stage'
import { MidiNote } from 'tone/build/esm/core/type/NoteUnits'

export type NoteExtremes = {
  min: number
  max: number
}

export type NoteDistribution = Record<number, number>

export type Song = {
  midi: Midi
  additionalInfo: {
    noteExtremes: NoteExtremes
    trackExtremes: NoteExtremes[]
    totalNotes: number
    trackNoteDistribution: NoteDistribution[]
  }
  settings: Settings
}

export const getNoteExtremes = (
  input: Midi | Note[],
  padding: number = 0,
): { min: number; max: number } => {
  const notes =
    'tracks' in input
      ? input.tracks
          .filter((track) => !track.instrument.percussion)
          .flatMap((track) => track.notes)
      : input

  const result: {
    min?: number
    max?: number
  } = {
    min: undefined,
    max: undefined,
  }

  notes.forEach((note) => {
    if (!result.max || note.midi > result.max) result.max = note.midi
    if (!result.min || note.midi < result.min) result.min = note.midi
  })

  return {
    min: (result.min || 40) - padding,
    max: (result.max || 40 + 3 * 12) + padding,
  }
}

export const noteToFactorioNote = (
  note: MidiNote | Note,
  trackSettings: TrackSettings,
  settings: Omit<Settings, 'tracks'>,
): FactorioNoteResultWithInstrument => {
  let higherOrLower: HigherOrLower | undefined

  for (const instrument of trackSettings.factorioInstruments.map(
    getFactorioInstrument,
  )) {
    if (!instrument) continue // to next instrument

    const factorioNoteResult = instrument.noteToFactorioNote(
      note,
      trackSettings,
      settings,
    )

    if (factorioNoteResult.valid)
      // This note can be played by this instrument
      return { ...factorioNoteResult, instrumentName: instrument.name }

    higherOrLower = factorioNoteResult.outOfRangeDirection
  }

  return {
    valid: false,
    outOfRangeDirection: higherOrLower,
    factorioNote: undefined,
    instrumentName: undefined,
  }
}

export const getOutOfRangeNotes = (
  noteDistribution: NoteDistribution,
  trackSettings: TrackSettings,
  settings: Omit<Settings, 'tracks'>,
): { higher: number; lower: number } => {
  const result = {
    higher: 0,
    lower: 0,
  }

  if (!trackSettings.factorioInstruments.length)
    // No instruments are assigned, so we consider nothing out of range
    return result

  Object.entries(noteDistribution).forEach(([note, numberOfOccurrences]) => {
    const factorioNoteResult = noteToFactorioNote(
      Number(note) as MidiNote,
      trackSettings,
      settings,
    )

    if (!factorioNoteResult.valid && factorioNoteResult.outOfRangeDirection)
      result[factorioNoteResult.outOfRangeDirection] += numberOfOccurrences
  })

  return result
}

export const noteExtremesToString = (
  noteExtremes?: NoteExtremes,
): string | undefined => {
  if (!noteExtremes) return undefined
  const { min, max } = noteExtremes
  return `${ToneMidi(min).toNote()} - ${ToneMidi(max).toNote()}`
}

export const midiToSong = (originalMidi: Midi, filename: string): Song => {
  const midi = new Midi(originalMidi.toArray())
  midi.name = midi.name.trim()

  // Arbitrary rules for when not to accept the midi embedded title and
  //  fall back on the filename instead
  if (
    !midi.name ||
    midi.name.toLowerCase().match(/^(\w*\s*track|\w*\s*template)\s*\d*$/) ||
    midi.name.toLowerCase() === midi.tracks[0].name.trim().toLowerCase()
  )
    midi.name = capitalize(filename.replace(/\.midi?$/, '').replace(/_/g, ' '))

  midi.tracks = midi.tracks.filter(
    (track) => track.notes.length && !track.instrument.percussion,
  )

  midi.tracks.forEach((track) => (track.name = track.name.trim()))

  // Unify drum tracks
  const drumInstrument = originalMidi.tracks.find(
    (track) => track.instrument.percussion,
  )?.instrument
  if (drumInstrument) {
    const unifiedDrumTrack = midi.addTrack()
    unifiedDrumTrack.instrument = drumInstrument
    unifiedDrumTrack.name = 'Percussion'
    originalMidi.tracks
      .filter((track) => track.instrument.percussion)
      .flatMap((track) => track.notes)
      .forEach((note) => unifiedDrumTrack.addNote(note))
  }

  for (const trackNumber in midi.tracks) {
    if (!midi.tracks[trackNumber].name)
      midi.tracks[trackNumber].name = capitalize(
        midi.tracks[trackNumber].instrument.name,
      )
  }

  const trackNoteDistribution = midi.tracks.map((track) =>
    track.notes.reduce(
      (acc, currentValue) => ({
        ...acc,
        [currentValue.midi]: (acc[currentValue.midi] || 0) + 1,
      }),
      {} as NoteDistribution,
    ),
  )

  return {
    midi,
    additionalInfo: {
      noteExtremes: getNoteExtremes(midi),
      trackExtremes: midi.tracks.map((track) => getNoteExtremes(track.notes)),
      trackNoteDistribution,
      totalNotes: midi.tracks.reduce(
        (acc, track) => acc + track.notes.reduce((trAcc) => trAcc + 1, 0),
        0,
      ),
    },
    settings: {
      tracks: midi.tracks.map((track) => ({
        factorioInstruments: [toFactorioInstrument(track.instrument)],
        velocityValues: getVelocityValues(track.notes),
        octaveShift: 0,
      })),
      globalNoteShift: 0,
      speedMultiplier: 1,
    },
  }
}
