import { BlueprintSection } from '@/app/lib/blueprint/blueprint'
import { Entity } from '@/app/lib/factorio-blueprint-schema'
import { localEntityNumberToAbsolute } from '@/app/lib/utils'
import { Song } from '@/app/components/select-stage'
import packageJson from '@/package.json'

export const getStaticBlueprintSection = (
  entitiesSoFar: number,
  {
    song,
    firstSpeakerCombinatorEntity,
    secondSpeakerCombinatorEntity,
  }: {
    song: Song
    firstSpeakerCombinatorEntity: number
    secondSpeakerCombinatorEntity: number
  },
): {
  keyEntities: {
    playCombinatorEntity: number
    dataToArithmeticConnectionEntity: number
  }
  blueprintSection: BlueprintSection
} => {
  const en = localEntityNumberToAbsolute(entitiesSoFar)

  const playCombinatorEntity = en(1)
  const dataToArithmeticConnectionEntity = en(4)

  const entities: Entity[] = [
    {
      entity_number: playCombinatorEntity,
      name: 'constant-combinator',
      position: {
        x: -3,
        y: 2.5,
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
        `\n[font=heading-1]${song.midi.name}[/font]\n\n` +
        '[virtual-signal=signal-green]\n[virtual-signal=signal-green][virtual-signal=signal-green]\n[virtual-signal=signal-green][virtual-signal=signal-green][virtual-signal=signal-green]\n[virtual-signal=signal-green][virtual-signal=signal-green]\n[virtual-signal=signal-green]' +
        '\n\nConverted using miditorio.com\n' +
        `version ${packageJson.version}`,
    },
    {
      entity_number: en(2),
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
      entity_number: en(3),
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
      entity_number: dataToArithmeticConnectionEntity,
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
      entity_number: en(5),
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
  ]

  return {
    keyEntities: {
      playCombinatorEntity,
      dataToArithmeticConnectionEntity,
    },
    blueprintSection: {
      entities,
      wires: [
        // Arithmetic combinator left sides
        [en(2), 2, en(3), 2],
        [en(3), 2, en(4), 2],
        [en(4), 2, en(5), 2],

        [en(2), 4, firstSpeakerCombinatorEntity, 2], // To first speaker green
        [en(3), 3, firstSpeakerCombinatorEntity, 1], // To first speaker red
        [en(4), 3, secondSpeakerCombinatorEntity, 1], // To second speaker red
        [en(5), 4, secondSpeakerCombinatorEntity, 2], // To second speaker green
      ],
    },
  }
}
