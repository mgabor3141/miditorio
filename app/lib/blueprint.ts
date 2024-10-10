import { arrayChunks, encodeBlueprint } from '@/app/lib/utils'
import signals from '@/app/lib/data/signals-dlc.json'
import { FactorioInstrument } from '@/app/lib/factorio-instrument'

const qualities = signals
  .filter(({ type }) => type === 'quality')
  .map(({ name }) => name)

const signalsWithQuality = signals.flatMap((signal) =>
  qualities.map((quality) => ({
    ...signal,
    quality,
  })),
)

export const toBlueprint = ({
  tickCombinatorValues,
  dataCombinatorValues,
  signalInstruments,
}: {
  tickCombinatorValues: number[]
  dataCombinatorValues: number[]
  signalInstruments: FactorioInstrument[]
}) => {
  console.log(
    `Got ${tickCombinatorValues.length} signals. ` +
      `(${signalsWithQuality.length} total signals available.)`,
  )

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
  signalInstruments
    .map((instrument, instrumentNumber) => [
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
          playback_volume: instrument.volumeCorrection,
          playback_mode: 'surface',
          allow_polyphony: true,
        },
        alert_parameters: {
          show_alert: false,
          show_on_map: true,
          alert_message: 'MIDItorio.com',
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
        player_description:
          'Only let signals through that match instrument address\n\nInstrument address is the constant in the condition.\n\nInstrument address is expected on red, note value is expected on green. Note value is mapped to a fixed signal.',
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
                name: 'signal-R',
              },
              comparator: '=',
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
        'Clock\n\n[virtual-signal=signal-T] is time (number of ticks) since the start of the song.\n\nSend any nonzero [virtual-signal=signal-R] to reset.',
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
                name: 'signal-T',
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
        'Let each signal through on the [color=green]green wire[/color] where the value of that same signal on the [color=red]red wire[/color] is equal to the [virtual-signal=signal-T] (time) signal.\n\nThis makes [virtual-signal=signal-T] a reserved signal and must not be present in the memory.\n\nOutput is any number of signals, where each signal contains one or two events, bit packed. Each event is made up of an instrument address and a note value.',
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
                  name: 'signal-T',
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
        'Toggle on to\n[virtual-signal=signal-P][virtual-signal=signal-L][virtual-signal=signal-A][virtual-signal=signal-Y]\n\nCreated using MIDItorio.com',
    },
    {
      // entity_number: 4,
      name: 'constant-combinator',
      position: {
        x: -4,
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
                  name: 'signal-R',
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
        'Toggle on then off to\n[virtual-signal=signal-R][virtual-signal=signal-E][virtual-signal=signal-S][virtual-signal=signal-E][virtual-signal=signal-T]',
    },
    {
      // entity_number: 5,
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
      // entity_number: 6,
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
      // entity_number: 7,
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
      // entity_number: 8,
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
      entities.length - 9 + originalNumber
    wires.push(
      [e(5), 2, e(6), 2], // [1, 2, 4, 2],
      [e(1), 1, e(1), 3], // [2, 1, 2, 3],
      [e(1), 2, e(4), 2], // [2, 2, 7, 2],
      [e(1), 3, e(3), 1], // [2, 3, 6, 1],
      [e(1), 4, e(2), 2], // [2, 4, 3, 2],
      [e(2), 4, e(6), 2], // [3, 4, 4, 2],
      [e(6), 2, e(7), 2], // [4, 2, 5, 2],
      [e(7), 2, e(8), 2], // [5, 2, 8, 2],
      [e(5), 4, 1, 2], // To first speaker green
      [e(6), 3, 1, 1], // To first speaker red
      [e(7), 3, 3, 1], // To second speaker red
      [e(8), 4, 3, 2], // To second speaker green
    )
  }
  const dataInputCombinatorEntityNumber = entities.length - 7

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
    [entities.length - 2, 1, dataInputCombinatorEntityNumber, 1],
    [entities.length - 1, 2, dataInputCombinatorEntityNumber, 2],
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
