import { arrayChunks, encodeBlueprint } from '@/app/lib/utils'
import signals from '@/app/lib/data/signals-dlc.json'
import { FinalInstruments } from '@/app/lib/song-to-blueprint'

const qualities = signals
  .filter(({ type }) => type === 'quality')
  .map(({ name }) => name)

// This is a reserved signal because of the playback circuit
const RESERVED = ['signal-green']

const signalsWithQuality = signals
  .flatMap((signal) =>
    qualities.map((quality) => ({
      ...signal,
      quality,
    })),
  )
  .filter(
    ({ name, quality }) => !(quality === 'normal' && RESERVED.includes(name)),
  )

export const toBlueprint = ({
  tickCombinatorValues,
  dataCombinatorValues,
  instruments,
}: {
  tickCombinatorValues: number[]
  dataCombinatorValues: number[]
  instruments: FinalInstruments
}) => {
  console.log(
    `Got ${tickCombinatorValues.length} signals. ` +
      `(${signalsWithQuality.length} total signals available.)`,
  )

  // TODO
  tickCombinatorValues = tickCombinatorValues.slice(
    0,
    signalsWithQuality.length,
  )
  dataCombinatorValues = dataCombinatorValues.slice(
    0,
    signalsWithQuality.length,
  )

  const entities: {
    name: string
    entity_number: number
    position: { x: number; y: number }
  }[] = []

  /**
   * source_entity_number
   * source_wire_connector_id
   * target_entity_number
   * target_wire_connector_id
   */
  const wires: number[][] = []

  // Add speakers and their combinators
  // WARNING! There is code that relies on speakers and their combinators being
  //  added first to the entity array!
  Object.values(instruments)
    .map(({ instrument, volume }, instrumentNumber) => [
      {
        name: 'programmable-speaker',
        position: {
          x: 0,
          y: -2.5,
        },
        control_behavior: {
          circuit_condition: {
            first_signal: {
              type: 'item',
              name: 'programmable-speaker',
            },
            constant: 0,
            comparator: '>',
          },
          circuit_parameters: {
            signal_value_is_pitch: true,
            instrument_id: Number(instrument.id),
            note_id: 0,
          },
        },
        parameters: {
          playback_volume: instrument.volumeCorrection * volume,
          playback_mode: 'surface',
          allow_polyphony: true,
        },
      },
      {
        name: 'decider-combinator',
        position: {
          x: 0,
          y: -1,
        },
        control_behavior: {
          decider_conditions: {
            conditions: [
              {
                first_signal: {
                  type: 'virtual',
                  name: 'signal-each',
                },
                // Instrument address
                constant:
                  (instrumentNumber + 1) <<
                  (6 + 8 * ((instrumentNumber + 1) % 2)),
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
                  name: 'programmable-speaker',
                },
                networks: {
                  red: false,
                  green: true,
                },
              },
            ],
          },
        },
      },
    ])
    .forEach(([speakerEntity, combinatorEntity], instrumentNumber) => {
      ;[speakerEntity, combinatorEntity].forEach((entity) =>
        entities.push({
          ...entity,
          entity_number: entities.length,
          position: {
            x: entity.position.x + Math.floor(entities.length / 4),
            y: entity.position.y + Math.floor((entities.length % 4) / 2) * 3,
          },
        }),
      )

      wires.push([
        entities.length - 1, // combinator entity number
        4, // wire_connector_id
        entities.length - 2, // speaker entity number
        2, // wire_connector_id
      ])

      if (instrumentNumber >= 2) {
        wires.push([
          entities.length - 1, // combinator entity number
          1, // wire_connector_id
          entities.length - 5, // combinator before previous entity number
          1, // wire_connector_id
        ])
        wires.push([
          entities.length - 1, // combinator entity number
          2, // wire_connector_id
          entities.length - 5, // previous combinator entity number
          2, // wire_connector_id
        ])
      }
    })

  // Add static logic
  ;[
    {
      // entity_number: 1,
      name: 'decider-combinator',
      position: {
        x: -3,
        y: 0.5,
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
    {
      // entity_number: 2,
      name: 'decider-combinator',
      position: {
        x: -3,
        y: -0.5,
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
      // entity_number: 3,
      name: 'constant-combinator',
      position: {
        x: -3,
        y: 1.5,
      },
      direction: 8,
      control_behavior: {
        sections: {
          sections: [
            {
              index: 1,
              filters: [
                {
                  index: 1,
                  type: 'virtual',
                  name: 'signal-green',
                  quality: 'normal',
                  comparator: '=',
                  count: 1,
                },
              ],
            },
          ],
        },
        is_on: false,
      },
      player_description:
        '[virtual-signal=signal-green]\n[virtual-signal=signal-green][virtual-signal=signal-green]\n[virtual-signal=signal-green][virtual-signal=signal-green][virtual-signal=signal-green]\n[virtual-signal=signal-green][virtual-signal=signal-green]\n[virtual-signal=signal-green]\n\nCreated using miditorio.com v2',
    },
    {
      // entity_number: 5, -> 4
      name: 'arithmetic-combinator',
      position: {
        x: -1,
        y: -1.5,
      },
      direction: 4,
      control_behavior: {
        arithmetic_conditions: {
          first_signal: {
            type: 'virtual',
            name: 'signal-each',
          },
          second_constant: 4194304,
          operation: '/',
          output_signal: {
            type: 'virtual',
            name: 'signal-each',
          },
        },
      },
      player_description:
        'Get note value for event 2 from each signal\n\nResult: 6 bits\n0000 1111 1100 0000 0000 0000 0000 0000\n\nOperation: Integer divide by\n0000 0000 0100 0000 0000 0000 0000 0000',
    },

    {
      // entity_number: 6, -> 5
      name: 'arithmetic-combinator',
      position: {
        x: -1,
        y: -0.5,
      },
      direction: 4,
      control_behavior: {
        arithmetic_conditions: {
          first_signal: {
            type: 'virtual',
            name: 'signal-each',
          },
          second_constant: 4177920,
          operation: 'AND',
          output_signal: {
            type: 'virtual',
            name: 'signal-each',
          },
        },
      },
      player_description:
        'Get instrument address for event 2 from each signal\n\nResult: 8 bits\n0000 0000 0011 1111 1100 0000 0000 0000\n\nResult is not shifted to zero, instruments check against the unshifted number',
    },
    {
      // entity_number: 7, -> 6
      name: 'arithmetic-combinator',
      position: {
        x: -1,
        y: 0.5,
      },
      direction: 4,
      control_behavior: {
        arithmetic_conditions: {
          first_signal: {
            type: 'virtual',
            name: 'signal-each',
          },
          second_constant: 16320,
          operation: 'AND',
          output_signal: {
            type: 'virtual',
            name: 'signal-each',
          },
        },
      },
      player_description:
        'Get instrument address for event 1 from each signal\n\nResult: 8 bits\n0000 0000 0000 0000 0011 1111 1100 0000\n\nResult is not shifted to zero, instruments check against the unshifted number',
    },
    {
      // entity_number: 8, -> 7
      name: 'arithmetic-combinator',
      position: {
        x: -1,
        y: 1.5,
      },
      direction: 4,
      control_behavior: {
        arithmetic_conditions: {
          first_signal: {
            type: 'virtual',
            name: 'signal-each',
          },
          second_constant: 64,
          operation: '%',
          output_signal: {
            type: 'virtual',
            name: 'signal-each',
          },
        },
      },
      player_description:
        'Get note value for event 1 from each signal\n\nResult: 6 bits\n0000 0000 0000 0000 0000 0000 0011 1111\n\nOperation: Modulo\n0000 0000 0000 0000 0000 0000 0100 0000',
    },
  ].forEach((entity) => {
    entities.push({ ...entity, entity_number: entities.length })
  })

  {
    // Helper function to convert from the original entity numbers to
    //  the new ones in the `entities` array
    const e = (originalNumber: number): number =>
      entities.length - 8 + originalNumber
    wires.push(
      [e(4), 2, e(5), 2],
      [e(1), 1, e(1), 3],
      [e(1), 2, e(3), 2],
      [e(1), 4, e(2), 2],
      [e(2), 4, e(5), 2],
      [e(5), 2, e(6), 2],
      [e(6), 2, e(7), 2],
      [e(4), 4, 1, 2], // To first speaker green
      [e(5), 3, 1, 1], // To first speaker red
      [e(6), 3, 3, 1], // To second speaker red
      [e(7), 4, 3, 2], // To second speaker green
    )
  }
  const clockCombinatorEntityNumber = entities.length - 6

  // Add data combinators
  ;[tickCombinatorValues, dataCombinatorValues]
    .map((values, isDataCombinator) => ({
      name: 'constant-combinator',
      direction: 4,
      control_behavior: {
        sections: {
          sections: arrayChunks(values, 1000).map((section, sectionIndex) => ({
            index: sectionIndex + 1,
            filters: section.map((value, valueIndex) => ({
              index: valueIndex + 1,
              ...signalsWithQuality[sectionIndex * 1000 + valueIndex],
              count: value,
            })),
          })),
        },
      },
      player_description: isDataCombinator
        ? 'Instrument and note data\n\n' +
          'Each signal value represents one or two song events. Each signal has a corresponding signal in the other combinator whose value contains the timing information for those events.'
        : 'Timing data\n\n' +
          'Each signal value is a point in time where one or more events happen. Each signal has a corresponding signal in the other combinator whose value contains the information for those events.',
    }))
    .forEach((entity, combinatorNumber) => {
      entities.push({
        ...entity,
        entity_number: entities.length,
        position: { x: -5, y: combinatorNumber - 1 },
      })
    })

  wires.push(
    [entities.length - 2, 1, clockCombinatorEntityNumber, 1],
    [entities.length - 1, 2, clockCombinatorEntityNumber, 2],
  )

  const blueprint = {
    blueprint: {
      icons: [
        {
          signal: {
            name: 'programmable-speaker',
          },
          index: 1,
        },
      ],
      entities,
      wires,
      item: 'blueprint',
      version: 281483568218115,
    },
  }

  return encodeBlueprint(blueprint)
}
