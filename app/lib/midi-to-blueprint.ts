import { IMidiFile } from 'midi-json-parser-worker'
import { midiToInternalSong } from '@/app/lib/parse-midi'
import { signals } from '@/app/lib/signals'
import { arrayChunks, encodeBlueprint } from '@/app/lib/utils'
import { toBlueprint } from '@/app/lib/blueprint'

export const midiToBlueprint = (midi: IMidiFile) => {
  console.log(midi)

  const song = midiToInternalSong(midi)
  const { delays, factorioSignals, signalInstruments } = song.toFactorio()

  type Event = {
    time: number
    track: number
    noteValue: number
  }
  const events: Event[] = []

  for (const delay of delays) {
    for (const factorioTrackName in factorioSignals) {
      // if track has signal at this delay
      if (factorioSignals[factorioTrackName][delay]) {
        events.push({
          time: delay,
          track: song.getTrack(factorioTrackName).trackNum + 1,
          noteValue: factorioSignals[factorioTrackName][delay],
        })
      }
    }
  }

  console.log(events)
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
        packedDataValue += event.track + (event.noteValue << 8)
      }

      if (oddTrackEvents.length > 0) {
        const event = oddTrackEvents.pop() as Event
        packedDataValue +=
          (event.track << (6 + 8)) + (event.noteValue << (8 + 6 + 8))
      }

      dataCombinatorValues.push(packedDataValue)
    }
  }

  return toBlueprint({
    tickCombinatorValues,
    dataCombinatorValues,
    signalInstruments,
  })
}
