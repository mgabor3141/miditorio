import {
  BlueprintResult,
  CombinatorValuePair,
  RawSignal,
  toBlueprint,
} from '@/app/lib/blueprint/blueprint'
import { FactorioInstrumentName } from '@/app/lib/data/factorio-instruments-by-id'
import { noteToFactorioNote, Song } from '@/app/lib/song'

type FactorioNote = {
  pitch: number
  volume: number
}
type Chord = FactorioNote[]

/**
 * This maps from a string ID with the following format:
 * `Name_velocityGroupNumber`, example `Piano_0`
 *
 * TODO: This is outdated, velocityGroupNumber is no longer a thing,
 *  so the type could be refactored and simplified.
 */
export type Speakers = Record<
  string,
  {
    chords: Chord[]
    instrumentName: FactorioInstrumentName
  }
>

export const songToFactorioData = ({ midi, settings }: Song): Speakers => {
  const instrumentsAfterChords: Speakers = {}

  for (const trackNumber in midi.tracks) {
    const track = midi.tracks[trackNumber]
    const trackSettings = settings.tracks[trackNumber]

    track.notes.forEach((midiNote) => {
      const { valid, factorioNote, instrument } = noteToFactorioNote(
        midiNote,
        trackSettings,
        settings,
      )

      if (valid) {
        if (!instrumentsAfterChords[instrument.name]) {
          instrumentsAfterChords[instrument.name] = {
            chords: [],
            instrumentName: instrument.name,
          }
        }

        const START_OF_SONG_TICKS_MARGIN = 4
        const factorioTick =
          Math.round((midiNote.time * 60) / settings.speedMultiplier) + // Seconds to 1/60 sec tick
          START_OF_SONG_TICKS_MARGIN
        if (!instrumentsAfterChords[instrument.name].chords[factorioTick])
          instrumentsAfterChords[instrument.name].chords[factorioTick] = []

        instrumentsAfterChords[instrument.name].chords[factorioTick].push({
          pitch: factorioNote,
          volume: Math.round(
            midiNote.velocity * instrument.volumeCorrection * 100,
          ),
        })
      }
    })
  }

  return instrumentsAfterChords
}

export const songToFactorio = (
  song: Song,
  signals: RawSignal[],
): BlueprintResult => {
  const instruments = songToFactorioData(song)

  type Event = {
    time: number
    track: number
    pitch: number
    volume: number
  }
  let instrumentNumber = 0
  const instrumentsAfterChords: Speakers = {}
  const events: Event[] = Object.values(instruments).flatMap((instrument) => {
    let maxNotesInChord = 0

    const instrumentEvents = instrument.chords.flatMap((chord, time) => {
      maxNotesInChord = Math.max(maxNotesInChord, chord.length)

      return chord.map(
        ({ pitch, volume }, noteNumberInChord): Event => ({
          // We need to add 1 as we can't address instrument 0 in Factorio
          track: instrumentNumber + noteNumberInChord + 1,
          time,
          pitch,
          volume,
        }),
      )
    })

    new Array(maxNotesInChord)
      .fill(undefined)
      .forEach(
        (_, i) => (instrumentsAfterChords[instrumentNumber + i] = instrument),
      )

    instrumentNumber += maxNotesInChord

    return instrumentEvents
  })

  const combinatorValues: CombinatorValuePair[] = events.map(
    ({ time, track, pitch, volume }) => ({
      ticks: time,
      // Bit packing the three values into one 32 bit integer as follows:
      // 0000 0000 0000 0000 0000 0000 0000 0000
      // -vvv vvv~ ~~~~ ~~~~ ~~~~ ~~~~ ~vvv vvvv
      //  pitch  track                  volume
      speakerData: volume | (track << 7) | (pitch << (7 + 18)),
    }),
  )

  return toBlueprint({
    song,
    combinatorValues,
    speakers: instrumentsAfterChords,
    rawSignals: signals,
  })
}
