import { IMidiFile } from 'midi-json-parser-worker'
// import { signals } from '@/app/lib/signals'
import * as zlib from 'zlib'
import { midiToInternalSong } from '@/app/lib/parse-midi'
import { signals } from '@/app/lib/signals'

export const midiToBlueprint = (midi: IMidiFile) => {
  console.log(midi)

  const song = midiToInternalSong(midi)
  const { delays, factorioSignals, signalInstruments } = song.toFactorio()

  const events: {
    time: number
    track: number
    noteValue: number
  }[] = []

  console.log(signalInstruments)

  for (const delay of delays) {
    for (const factorioTrackName in factorioSignals) {
      // if track has signal at this delay
      if (factorioSignals[factorioTrackName][delay]) {
        events.push({
          time: delay, // sum?
          track: song.getTrack(factorioTrackName).trackNum + 1,
          noteValue: factorioSignals[factorioTrackName][delay],
        })
      }
    }
  }

  console.log(events)

  let tickCombinatorValues = []
  let dataCombinatorValues = []
  for (const event of events) {
    tickCombinatorValues.push(event.time)
    dataCombinatorValues.push(event.track + (event.noteValue << 8))
  }

  tickCombinatorValues = tickCombinatorValues.slice(0, 1000)
  dataCombinatorValues = dataCombinatorValues.slice(0, 1000)

  const blueprint = {
    blueprint: {
      icons: [
        {
          signal: {
            name: 'constant-combinator',
          },
          index: 1,
        },
      ],
      entities: [tickCombinatorValues, dataCombinatorValues].map(
        (values, combinatorNumber) => ({
          name: 'constant-combinator',
          entity_number: 0,
          position: { x: combinatorNumber, y: 0 },
          direction: 4,
          control_behavior: {
            sections: {
              sections: [
                {
                  index: 1,
                  filters: values.map((value, valueIndex) => ({
                    index: valueIndex + 1,
                    ...signals[valueIndex],
                    count: value,
                  })),
                },
              ],
            },
          },
        }),
      ),
      item: 'blueprint',
      version: 281483568218115,
    },
  }

  return '0' + zlib.deflateSync(JSON.stringify(blueprint)).toString('base64')
}
