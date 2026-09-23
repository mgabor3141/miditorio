import { arrayChunks } from '@/src/lib/utils'
import { Entity, Filter, Wire } from '@/src/lib/factorio-blueprint-schema'
import { BlueprintBuilder, EntityRef, PORT } from '@/src/lib/blueprint/build'
import { CombinatorValuePair } from '@/src/lib/blueprint/blueprint'

export const getDataSection = (
  builder: BlueprintBuilder,
  {
    combinatorValues,
    signals,
    playCombinator,
    dataToArithmeticConnection,
  }: {
    combinatorValues: CombinatorValuePair[]
    signals: Omit<Filter, 'count' | 'index'>[]
    playCombinator: EntityRef
    dataToArithmeticConnection: EntityRef
  },
): { entities: Entity[]; wires: Wire[] } => {
  // Handles for cross-chunk wiring, replacing `entity_number - 4`.
  const timeDeciders: Entity[] = []
  const clocks: Entity[] = []

  arrayChunks(combinatorValues, signals.length).forEach(
    (combinatorValueChunk, chunkIndex, chunks) => {
      let timeCombinator: Entity | undefined
      let dataCombinator: Entity | undefined

      new Array(2).fill(undefined).forEach((_, isDataCombinator) => {
        const combinator = builder.entity({
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
        if (isDataCombinator) {
          dataCombinator = combinator
        } else {
          timeCombinator = combinator
        }
      })

      const timeDecider = builder.entity({
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
      })

      const clock = builder.entity({
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
      })
      timeDeciders.push(timeDecider)
      clocks.push(clock)

      // Data combinator to time decider, green wire
      builder.wire(
        dataCombinator!,
        PORT.combInputGreen,
        timeDecider,
        PORT.combInputGreen,
      )
      // Time combinator to time decider, red wire
      builder.wire(
        timeCombinator!,
        PORT.combInputRed,
        timeDecider,
        PORT.combInputRed,
      )
      // Clock out to time decider in, green
      builder.wire(
        clock,
        PORT.combOutputGreen,
        timeDecider,
        PORT.combInputGreen,
      )
      // Clock feedback
      builder.wire(clock, PORT.combOutputRed, clock, PORT.combInputRed)

      if (chunkIndex === 0) {
        builder.wire(
          timeDecider,
          PORT.combOutputGreen,
          dataToArithmeticConnection,
          PORT.combInputGreen,
        )
        builder.wire(
          playCombinator,
          PORT.combInputGreen,
          clock,
          PORT.combInputGreen,
        )
      } else {
        // Wires to previous chunk, via handles instead of `- 4`
        builder.wire(
          timeDecider,
          PORT.combOutputGreen,
          timeDeciders[chunkIndex - 1],
          PORT.combOutputGreen,
        )
        builder.wire(
          clock,
          PORT.combInputGreen,
          clocks[chunkIndex - 1],
          PORT.combInputGreen,
        )
      }
    },
  )

  return builder.build()
}
