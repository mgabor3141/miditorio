import {
  BlueprintSection,
  CombinatorValuePair,
} from '@/app/lib/blueprint/blueprint'
import { arrayChunks, localEntityNumberToAbsolute } from '@/app/lib/utils'
import { Entity, Filter, Wire } from '@/app/lib/factorio-blueprint-schema'

export const getDataSection = (
  entitiesSoFar: number,
  {
    combinatorValues,
    signals,
    playCombinatorEntity,
    dataToArithmeticConnectionEntity,
  }: {
    combinatorValues: CombinatorValuePair[]
    signals: Omit<Filter, 'count' | 'index'>[]
    playCombinatorEntity: number
    dataToArithmeticConnectionEntity: number
  },
): BlueprintSection => {
  const en = localEntityNumberToAbsolute(entitiesSoFar)

  const entities: Entity[] = [],
    wires: Wire[] = []

  arrayChunks(combinatorValues, signals.length).forEach(
    (combinatorValueChunk, chunkIndex, chunks) => {
      const timeCombinatorNumber = en(chunkIndex * 4 + 1)
      const dataCombinatorNumber = en(chunkIndex * 4 + 2)

      new Array(2).fill(undefined).forEach((_, isDataCombinator) => {
        entities.push({
          entity_number: isDataCombinator
            ? dataCombinatorNumber
            : timeCombinatorNumber,
          name: 'constant-combinator',
          position: { x: -5, y: 0 - chunkIndex * 2 + isDataCombinator },
          direction: 4,
          control_behavior: {
            sections: {
              sections: arrayChunks(combinatorValueChunk, 1000).map(
                (section, sectionIndex) => ({
                  index: sectionIndex + 1,
                  filters: section.map((value, valueIndex) => ({
                    ...signals[sectionIndex * 1000 + valueIndex],
                    index: valueIndex + 1,
                    count: isDataCombinator ? value.speakerData : value.ticks,
                  })),
                }),
              ),
            },
          },
          player_description: isDataCombinator
            ? `Instrument and note data${chunks.length > 1 ? ` (part ${chunkIndex + 1}/${chunks.length})` : ''}\n\n` +
              'Each signal value represents one or two song events. Each signal has a corresponding signal in the other combinator whose value contains the timing information for those events.'
            : `Timing data${chunks.length > 1 ? ` (part ${chunkIndex + 1}/${chunks.length})` : ''}\n\n` +
              'Each signal value is a point in time where one or more events happen. Each signal has a corresponding signal in the other combinator whose value contains the information for those events.',
        })
      })

      const timeDeciderCombinatorNumber = en(chunkIndex * 4 + 3)
      const clockCombinatorNumber = en(chunkIndex * 4 + 4)
      entities.push(
        {
          entity_number: timeDeciderCombinatorNumber,
          name: 'decider-combinator',
          position: {
            x: -3,
            y: 0.5 - chunkIndex * 2,
          },
          direction: 4,
          control_behavior: {
            decider_conditions: {
              conditions: [
                {
                  first_signal: {
                    type: 'virtual',
                    name: 'signal-each',
                  },
                  second_signal: {
                    type: 'virtual',
                    name: 'signal-green',
                  },
                  comparator: '=',
                  first_signal_networks: {
                    red: true,
                    green: false,
                  },
                },
              ],
              outputs: [
                {
                  signal: {
                    type: 'virtual',
                    name: 'signal-each',
                  },
                  networks: {
                    red: false,
                    green: true,
                  },
                },
              ],
            },
          },
          player_description:
            'Let each signal through on the [color=green]green wire[/color] where the value of that same signal on the [color=red]red wire[/color] is equal to the [virtual-signal=signal-green] (time) signal.\n\nThis makes [virtual-signal=signal-green] a reserved signal and must not be present in the memory.\n\nOutput is any number of signals, where each signal contains one or two events, bit packed. Each event is made up of an instrument address and a note value.',
        },
        {
          entity_number: clockCombinatorNumber,
          name: 'decider-combinator',
          position: {
            x: -3,
            y: 1.5 - chunkIndex * 2,
          },
          direction: 4,
          control_behavior: {
            decider_conditions: {
              conditions: [
                {
                  first_signal: {
                    type: 'virtual',
                    name: 'signal-green',
                  },
                  comparator: '>',
                  first_signal_networks: {
                    red: false,
                    green: true,
                  },
                },
              ],
              outputs: [
                {
                  signal: {
                    type: 'virtual',
                    name: 'signal-everything',
                  },
                },
              ],
            },
          },
          player_description:
            'Clock\n\n[virtual-signal=signal-green] is the time (number of ticks) since the start of the song.',
        },
      )

      wires.push(
        // Data combinator to time decider, green wire
        [dataCombinatorNumber, 2, timeDeciderCombinatorNumber, 2],

        // Time combinator to time decider, red wire
        [timeCombinatorNumber, 1, timeDeciderCombinatorNumber, 1],

        // Clock out to time decider in, green
        [clockCombinatorNumber, 4, timeDeciderCombinatorNumber, 2],

        // Clock feedback
        [clockCombinatorNumber, 3, clockCombinatorNumber, 1],
      )

      if (chunkIndex === 0) {
        wires.push(
          [timeDeciderCombinatorNumber, 4, dataToArithmeticConnectionEntity, 2],
          [playCombinatorEntity, 2, clockCombinatorNumber, 2],
        )
      } else {
        // Wires to previous chunk
        wires.push(
          [timeDeciderCombinatorNumber, 4, timeDeciderCombinatorNumber - 4, 4],
          [clockCombinatorNumber, 2, clockCombinatorNumber - 4, 2],
        )
      }
    },
  )

  return { entities, wires }
}
