import { toBlueprint } from '@/app/lib/blueprint'
import { Song } from '@/app/components/select-stage'
import { FactorioInstrumentName } from '@/app/lib/data/factorio-instruments-by-id'
import { MidiNote } from 'tone/build/esm/core/type/NoteUnits'
import {
  FACTORIO_INSTRUMENT,
  FactorioInstrument,
} from '@/app/lib/factorio-instrument'

type FactorioNote = number
type FactorioInstrumentsInSong = Partial<
  Record<FactorioInstrumentName, InstrumentChords>
>
type InstrumentChords = Record<number, Chord>
type Chord = FactorioNote[]

const songToFactorioData = ({
  midi,
  settings,
}: Song): {
  delays: number[]
  signals: number[][]
  instruments: FactorioInstrument[]
} => {
  const factorioInstruments: FactorioInstrumentsInSong = {}
  const delays = new Set<number>()

  for (const trackNumber in midi.tracks) {
    const track = midi.tracks[trackNumber]
    const { factorioInstrument, octaveShift } = settings.tracks[trackNumber]
    if (!factorioInstrument) continue

    const instrumentChords: InstrumentChords =
      factorioInstruments[factorioInstrument.name] || {}

    for (const note of track.notes) {
      const factorioTick = Math.round(note.time * 60) // Seconds to 1/60 sec tick

      const shiftedNote = (note.midi + octaveShift) as MidiNote
      const signal = factorioInstrument.noteToSignal(shiftedNote)
      if (factorioInstrument.isNoteValid(shiftedNote) && signal) {
        instrumentChords[factorioTick] = [
          ...(instrumentChords[factorioTick] || []),
          signal,
        ]
      }
    }

    factorioInstruments[factorioInstrument.name] = instrumentChords
  }

  const signals: number[][] = []
  const signalInstruments: FactorioInstrument[] = []

  let signalsUsed = 0

  for (const instrument_i in factorioInstruments) {
    const instrument =
      factorioInstruments[instrument_i as FactorioInstrumentName]
    for (const delayString in instrument) {
      const delay = Number(delayString)
      const chord = instrument[delay]

      delays.add(delay)

      for (const is in chord) {
        const i = parseInt(is)
        if (signals[signalsUsed + i] === undefined) {
          signals[signalsUsed + i] = []
          signalInstruments.push(
            // @ts-expect-error I can't be bothered right now TODO
            FACTORIO_INSTRUMENT[instrument_i as FactorioInstrumentName],
          )
        }

        signals[signalsUsed + i][delay] = chord[i]
      }
    }

    signalsUsed = signals.length
  }

  // -1 because we can't have an instrument 0
  const MAX_FACTORIO_SPEAKER_SIGNALS = 2 ** 8 - 1
  if (signalInstruments.length >= MAX_FACTORIO_SPEAKER_SIGNALS) {
    console.warn(`Warning! Too many instruments: ${signalInstruments.length}`)
  }

  return {
    delays: delays.values().toArray().toSorted(),
    signals,
    instruments: signalInstruments.slice(0, MAX_FACTORIO_SPEAKER_SIGNALS),
  }
}

export const songToBlueprint = (song: Song) => {
  const { delays, signals, instruments } = songToFactorioData(song)

  type Event = {
    time: number
    track: number
    noteValue: number
  }
  const events: Event[] = []

  for (const delay of delays) {
    for (const track in signals) {
      // if track has signal at this delay
      if (signals[track][delay]) {
        events.push({
          time: delay,
          track: Number(track) + 1,
          noteValue: signals[track][delay],
        })
      }
    }
  }

  console.log(`${events.length} events`)

  const eventsGroupedByTime: Event[][] = []
  events.forEach((event) => {
    if (!eventsGroupedByTime[event.time]) eventsGroupedByTime[event.time] = []

    eventsGroupedByTime[event.time].push(event)
  })

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
    signalInstruments: instruments,
  })
}
