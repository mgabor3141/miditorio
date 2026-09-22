import { MidiNote } from 'tone/build/esm/core/type/NoteUnits'
import { FactorioInstrumentName } from './data/factorio-instruments-by-id'
import {
  getFactorioInstrumentList,
  toFactorioInstrument,
} from './factorio-instrument'
import { Track } from '@tonejs/midi'
import { Settings, TrackSettings } from '@/app/components/select-stage'

export const assignInstruments = (
  track: Track,
  _trackSettings?: TrackSettings,
  _globalSettings?: Omit<Settings, 'tracks'>,
): (FactorioInstrumentName | undefined)[] => {
  const instrumentAccordingToMidi = toFactorioInstrument(track.instrument)
  const factorioInstrumentList = getFactorioInstrumentList()

  const trackSettings = _trackSettings || {
    octaveShift: 0,
    velocityValues: [],
    factorioInstruments: [],
  }
  const globalSettings = _globalSettings || {
    globalNoteShift: 0,
    speedMultiplier: 1,
  }
  const settingsParams: [TrackSettings, Omit<Settings, 'tracks'>] = [
    trackSettings,
    globalSettings,
  ]

  // If no instrument makes sense, this track will be muted by default
  if (instrumentAccordingToMidi === undefined) {
    return [undefined]
  }

  // Start with suggested instrument, even if it can't play any notes
  const assignedInstruments: (FactorioInstrumentName | undefined)[] = [
    instrumentAccordingToMidi,
  ]

  let uncoveredNotes = track.notes.filter(
    (note) =>
      !factorioInstrumentList[instrumentAccordingToMidi].noteToFactorioNote(
        note.midi as MidiNote,
        ...settingsParams,
      ).valid,
  )

  // Get list of available instruments (excluding already assigned ones and Drumkit)
  const availableInstruments = (
    Object.keys(factorioInstrumentList) as FactorioInstrumentName[]
  ).filter((name) => name !== 'Drumkit' && !assignedInstruments.includes(name))

  // Keep adding instruments until all notes are covered or no more instruments available
  while (uncoveredNotes.length > 0 && availableInstruments.length > 0) {
    // Find best instrument to cover remaining notes
    let bestInstrument: FactorioInstrumentName | undefined
    let bestCoverage = 0

    for (const instrumentName of availableInstruments) {
      const instrument = factorioInstrumentList[instrumentName]
      const coverageCount = uncoveredNotes.filter(
        (note) =>
          instrument.noteToFactorioNote(
            note.midi as MidiNote,
            ...settingsParams,
          ).valid,
      ).length

      if (coverageCount > bestCoverage) {
        bestCoverage = coverageCount
        bestInstrument = instrumentName
      }
    }

    // If no instrument can play any remaining notes, break
    if (!bestInstrument || bestCoverage === 0) break

    // Add best instrument and remove notes it covers
    assignedInstruments.push(bestInstrument)
    uncoveredNotes = uncoveredNotes.filter(
      (note) =>
        !factorioInstrumentList[bestInstrument!].noteToFactorioNote(
          note.midi as MidiNote,
          ...settingsParams,
        ).valid,
    )

    // Remove used instrument from available list
    const index = availableInstruments.indexOf(bestInstrument)
    availableInstruments.splice(index, 1)
  }

  return assignedInstruments
}
