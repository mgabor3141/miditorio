import { toBlueprint } from '@/app/lib/blueprint'
import { Song } from '@/app/components/select-stage'
import { MidiNote } from 'tone/build/esm/core/type/NoteUnits'
import {
  FACTORIO_INSTRUMENT,
  FactorioInstrument,
} from '@/app/lib/factorio-instrument'
import { roundToNearestClusterCenter } from '@/app/lib/kmeans'
import groupBy from 'lodash.groupby'

type FactorioNote = number
type Chord = FactorioNote[]

/**
 * This maps from a string ID with the following format:
 * `Name_velocityGroupNumber`, example `Piano_0`
 */
export type FinalInstruments = Record<
  string,
  {
    chords: Chord[]
    instrument: FactorioInstrument
    volume: number
  }
>

export const songToFactorioData = ({
  midi,
  settings,
}: Song): FinalInstruments => {
  const finalInstruments: FinalInstruments = {}

  for (const trackNumber in midi.tracks) {
    const track = midi.tracks[trackNumber]
    const { factorioInstrument, octaveShift, velocityValues } =
      settings.tracks[trackNumber]

    if (!factorioInstrument) continue

    track.notes.forEach((note) => {
      const shiftedNote = (note.midi + octaveShift) as MidiNote
      const factorioNote = factorioInstrument.noteToFactorioNote(shiftedNote)

      if (factorioInstrument.isNoteValid(shiftedNote) && factorioNote) {
        const { closestCenter, closestCenterNumber } =
          roundToNearestClusterCenter(note.velocity, velocityValues)
        const factorioDataInstrumentId = `${factorioInstrument.name}_${closestCenterNumber}`

        if (!finalInstruments[factorioDataInstrumentId]) {
          finalInstruments[factorioDataInstrumentId] = {
            chords: [],
            instrument: FACTORIO_INSTRUMENT[factorioInstrument.name],
            volume: closestCenter,
          }
        }

        const factorioTick = Math.round(note.time * 60) + 10 // Seconds to 1/60 sec tick
        if (!finalInstruments[factorioDataInstrumentId].chords[factorioTick])
          finalInstruments[factorioDataInstrumentId].chords[factorioTick] = []

        finalInstruments[factorioDataInstrumentId].chords[factorioTick].push(
          factorioNote,
        )
      }
    })
  }

  // -1 because we can't have an instrument 0
  const MAX_FACTORIO_SPEAKER_SIGNALS = 2 ** 8 - 1
  if (Object.keys(finalInstruments).length >= MAX_FACTORIO_SPEAKER_SIGNALS) {
    console.warn(
      `Warning! Too many instruments: ${Object.keys(finalInstruments).length}`,
    )
  }

  return finalInstruments
}

export const songToFactorio = (song: Song) => {
  const instruments = songToFactorioData(song)

  type Event = {
    time: number
    track: number
    noteValue: number
  }
  let instrumentNumber = 0
  const finalFinalInstruments: FinalInstruments = {}
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
        (_, i) => (finalFinalInstruments[instrumentNumber + i] = instrument),
      )

    instrumentNumber += maxNotesInChord

    return instrumentEvents
  })

  console.log(`${events.length} events`)

  const eventsGroupedByTime = groupBy(events, ({ time }) => time)

  const tickCombinatorValues = []
  const dataCombinatorValues = []
  for (const eventGroupTime in eventsGroupedByTime) {
    const eventGroup = eventsGroupedByTime[eventGroupTime]

    const evenTrackEvents: Event[] = []
    const oddTrackEvents: Event[] = []

    eventGroup.forEach((event) => {
      if (event.track % 2 === 0) evenTrackEvents.push(event)
      else oddTrackEvents.push(event)
    })

    while (evenTrackEvents.length > 0 || oddTrackEvents.length > 0) {
      tickCombinatorValues.push(parseInt(eventGroupTime))

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

      dataCombinatorValues.push(packedDataValue)
    }
  }

  return toBlueprint({
    tickCombinatorValues,
    dataCombinatorValues,
    instruments: finalFinalInstruments,
  })
}
