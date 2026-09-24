import { BlueprintBuilder, EntityRef, PORT } from '@/src/lib/blueprint/build'
import { Song } from '@/src/lib/song'
import packageJson from '@/package.json'

export const getStaticBlueprintSection = (
  builder: BlueprintBuilder,
  {
    song,
    firstSpeakerCombinator,
    secondSpeakerCombinator,
  }: {
    song: Song
    firstSpeakerCombinator: EntityRef
    secondSpeakerCombinator: EntityRef
  },
): {
  keyEntities: {
    playCombinator: EntityRef
    dataToArithmeticConnection: EntityRef
  }
} => {
  const playCombinator = builder.entity({
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
      `[item=programmable-speaker] [font=heading-1]${song.midi.name}[/font]` +
      '\n\nToggle this combinator to play or reset' +
      '\n\nConverted using Miditorio' +
      `\nversion ${packageJson.version}`,
  })

  // Get note value for event 2 (integer divide)
  const noteValueEvent2 = builder.entity({
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
      'Get note value for event 2 from each signal (can be negative)\n\nResult: top bits (8 bits, and sign bit used)\n1011 1111 1100 0000 0000 0000 0000 0000\n\nOperation: Integer divide by\n0000 0000 0100 0000 0000 0000 0000 0000',
  })

  // Get instrument address for event 2 (AND)
  const instrumentAddressEvent2 = builder.entity({
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
  })

  // Get instrument address for event 1 (AND): the data -> arithmetic connection
  const dataToArithmeticConnection = builder.entity({
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
  })

  // Get note value for event 1 (AND, not modulo: once event 2's note value can
  // use the sign bit the packed `each` may be negative, and `% 64` would then
  // yield a negative low value; `AND 63` always masks the low 6 bits cleanly.)
  const noteValueEvent1 = builder.entity({
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
        second_constant: 63,
        operation: 'AND',
        output_signal: {
          type: 'virtual',
          name: 'signal-each',
        },
      },
    },
    player_description:
      'Get note value for event 1 from each signal\n\nResult: 6 bits\n0000 0000 0000 0000 0000 0000 0011 1111\n\nOperation: AND\n0000 0000 0000 0000 0000 0000 0011 1111',
  })

  // Arithmetic combinator left sides (green input chain)
  builder.wire(
    noteValueEvent2,
    PORT.combInputGreen,
    instrumentAddressEvent2,
    PORT.combInputGreen,
  )
  builder.wire(
    instrumentAddressEvent2,
    PORT.combInputGreen,
    dataToArithmeticConnection,
    PORT.combInputGreen,
  )
  builder.wire(
    dataToArithmeticConnection,
    PORT.combInputGreen,
    noteValueEvent1,
    PORT.combInputGreen,
  )

  // To first speaker
  builder.wire(
    noteValueEvent2,
    PORT.combOutputGreen,
    firstSpeakerCombinator,
    PORT.combInputGreen,
  )
  builder.wire(
    instrumentAddressEvent2,
    PORT.combOutputRed,
    firstSpeakerCombinator,
    PORT.combInputRed,
  )
  // To second speaker
  builder.wire(
    dataToArithmeticConnection,
    PORT.combOutputRed,
    secondSpeakerCombinator,
    PORT.combInputRed,
  )
  builder.wire(
    noteValueEvent1,
    PORT.combOutputGreen,
    secondSpeakerCombinator,
    PORT.combInputGreen,
  )

  return {
    keyEntities: {
      playCombinator,
      dataToArithmeticConnection,
    },
  }
}
