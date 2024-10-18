import {
  BlueprintResult,
  CombinatorValuePair,
  RawSignal,
  toBlueprint,
} from '@/app/lib/blueprint/blueprint'
import { roundToNearestClusterCenter } from '@/app/lib/kmeans'
import groupBy from 'lodash.groupby'
import { FactorioInstrumentName } from '@/app/lib/data/factorio-instruments-by-id'
import { noteToFactorioNote, Song } from '@/app/lib/song'

type FactorioNote = number
type Chord = FactorioNote[]

/**
 * This maps from a string ID with the following format:
 * `Name_velocityGroupNumber`, example `Piano_0`
 */
export type Speakers = Record<
  string,
  {
    chords: Chord[]
    instrumentName: FactorioInstrumentName
    volume: number
  }
>

export const songToFactorioData = ({ midi, settings }: Song): Speakers => {
  const instrumentsAfterVelocity: Speakers = {}

  for (const trackNumber in midi.tracks) {
    const track = midi.tracks[trackNumber]
    const trackSettings = settings.tracks[trackNumber]

    track.notes.forEach((midiNote) => {
      const { valid, factorioNote, instrumentName } = noteToFactorioNote(
        midiNote,
        trackSettings,
        settings,
      )

      if (valid) {
        const {
          closestCenter: volume,
          closestCenterNumber: volumeGroupNumber,
        } = roundToNearestClusterCenter(
          midiNote.velocity,
          trackSettings.velocityValues,
        )
        const factorioDataInstrumentId = `${instrumentName}_${volumeGroupNumber}`

        if (!instrumentsAfterVelocity[factorioDataInstrumentId]) {
          instrumentsAfterVelocity[factorioDataInstrumentId] = {
            chords: [],
            instrumentName,
            volume,
          }
        }

        const START_OF_SONG_TICKS_MARGIN = 10
        const factorioTick =
          Math.round(midiNote.time * 60 * settings.speedMultiplier) + // Seconds to 1/60 sec tick
          START_OF_SONG_TICKS_MARGIN
        if (
          !instrumentsAfterVelocity[factorioDataInstrumentId].chords[
            factorioTick
          ]
        )
          instrumentsAfterVelocity[factorioDataInstrumentId].chords[
            factorioTick
          ] = []

        instrumentsAfterVelocity[factorioDataInstrumentId].chords[
          factorioTick
        ].push(factorioNote)
      }
    })
  }

  return instrumentsAfterVelocity
}

export const songToFactorio = (
  song: Song,
  signals: RawSignal[],
): BlueprintResult => {
  const instruments = songToFactorioData(song)

  type Event = {
    time: number
    track: number
    noteValue: number
  }
  let instrumentNumber = 0
  const instrumentsAfterChords: Speakers = {}
  const events: Event[] = Object.values(instruments).flatMap((instrument) => {
    let maxNotesInChord = 0

    const instrumentEvents = instrument.chords.flatMap((chord, time) => {
      maxNotesInChord = Math.max(maxNotesInChord, chord.length)

      return chord.map(
        (noteValue, noteNumberInChord): Event => ({
          // We need to add 1 as we can't address instrument 0 in Factorio
          track: instrumentNumber + noteNumberInChord + 1,
          noteValue,
          time,
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

  const eventsGroupedByTime = groupBy(events, ({ time }) => time)

  const combinatorValues: CombinatorValuePair[] = []
  for (const eventGroupTime in eventsGroupedByTime) {
    const eventGroup = eventsGroupedByTime[eventGroupTime]

    const evenTrackEvents: Event[] = []
    const oddTrackEvents: Event[] = []

    eventGroup.forEach((event) => {
      if (event.track % 2 === 0) evenTrackEvents.push(event)
      else oddTrackEvents.push(event)
    })

    while (evenTrackEvents.length > 0 || oddTrackEvents.length > 0) {
      let packedDataValue = 0

      if (evenTrackEvents.length > 0) {
        const event = evenTrackEvents.pop() as Event
        packedDataValue += event.noteValue + (event.track << 6)
      }

      if (oddTrackEvents.length > 0) {
        const event = oddTrackEvents.pop() as Event
        packedDataValue +=
          (event.track << (6 + 8)) + (event.noteValue << (6 + 8 + 8))
      }

      combinatorValues.push({
        ticks: parseInt(eventGroupTime),
        speakerData: packedDataValue,
      })
    }
  }

  return toBlueprint({
    song,
    combinatorValues,
    speakers: instrumentsAfterChords,
    rawSignals: signals,
  })
}
