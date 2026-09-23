import { Speakers } from '@/src/lib/song-to-factorio'
import { Entity, PlaybackMode } from '@/src/lib/factorio-blueprint-schema'
import { getFactorioInstrument } from '@/src/lib/factorio-instrument'
import {
  PORT,
  type BlueprintBuilder,
  type EntityRef,
} from '@/src/lib/blueprint/build'

export const getSpeakerSection = (
  builder: BlueprintBuilder,
  {
    speakers,
    playbackMode,
  }: {
    speakers: Speakers
    playbackMode: PlaybackMode
  },
): {
  keyEntities: {
    firstSpeakerCombinator: EntityRef
    secondSpeakerCombinator: EntityRef
  }
} => {
  // Keep a handle to every speaker combinator so each one can be wired to the
  // combinator two rows up, without recomputing `entity_number - 4`.
  const speakerCombinators: Entity[] = []

  Object.values(speakers).forEach(
    ({ instrumentName, volume }, speakerIndex) => {
      const instrument = getFactorioInstrument(instrumentName)
      const speaker = builder.entity({
        name: 'programmable-speaker',
        position: {
          x: Math.floor(speakerIndex / 2),
          y: -2.5 + Math.floor(speakerIndex % 2) * 3,
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
          playback_mode: playbackMode,
          allow_polyphony: true,
        },
      })

      const speakerCombinator = builder.entity({
        name: 'decider-combinator',
        position: {
          x: Math.floor(speakerIndex / 2),
          y: -1 + Math.floor(speakerIndex % 2) * 3,
        },
        control_behavior: {
          decider_conditions: {
            conditions: [
              {
                first_signal: {
                  type: 'virtual',
                  name: 'signal-each',
                },
                constant:
                  // Instrument address is shifted by 6 if the speaker is
                  //  on the odd row or 6+8 if it's on the even row
                  (speakerIndex + 1) << (6 + ((speakerIndex + 1) % 2 ? 8 : 0)),
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
      })
      speakerCombinators.push(speakerCombinator)

      // Combinator output (green) -> speaker input (green)
      builder.wire(
        speakerCombinator,
        PORT.combOutputGreen,
        speaker,
        PORT.speakerGreen,
      )

      // Connect this speaker combinator to the one two rows up.
      if (speakerCombinators.length >= 3) {
        const previous = speakerCombinators[speakerCombinators.length - 3]
        builder.wire(
          speakerCombinator,
          PORT.combInputRed,
          previous,
          PORT.combInputRed,
        )
        builder.wire(
          speakerCombinator,
          PORT.combInputGreen,
          previous,
          PORT.combInputGreen,
        )
      }
    },
  )

  // The generator keys the static section off the first two speaker-combinator
  // slots (absolute entity_number 2 and 4, since the speaker section starts at
  // 0). With a single speaker, slot 4 aliases into the static section's second
  // arithmetic combinator; refAt preserves that original quirk verbatim.
  return {
    keyEntities: {
      firstSpeakerCombinator: speakerCombinators[0] ?? builder.refAt(2),
      secondSpeakerCombinator: speakerCombinators[1] ?? builder.refAt(4),
    },
  }
}
