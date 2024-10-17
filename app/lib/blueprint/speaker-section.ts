import { BlueprintSection } from '@/app/lib/blueprint/blueprint'
import { Speakers } from '@/app/lib/song-to-factorio'
import { Entity, Wire } from '@/app/lib/factorio-blueprint-schema'
import { localEntityNumberToAbsolute } from '@/app/lib/utils'
import { getFactorioInstrument } from '@/app/lib/factorio-instrument'
export const getSpeakerSection = (
  entitiesSoFar: number,
  { speakers }: { speakers: Speakers },
): {
  keyEntities: {
    firstSpeakerCombinatorEntity: number
    secondSpeakerCombinatorEntity: number
  }
  blueprintSection: BlueprintSection
} => {
  const entities: Entity[] = [],
    wires: Wire[] = []

  const en = localEntityNumberToAbsolute(entitiesSoFar)

  Object.values(speakers).forEach(
    ({ instrumentName, volume }, speakerIndex) => {
      const instrument = getFactorioInstrument(instrumentName)
      const speakerEntity = en(speakerIndex * 2 + 1)
      const speakerCombinatorEntity = en(speakerIndex * 2 + 2)

      entities.push(
        {
          entity_number: speakerEntity,
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
            playback_mode: 'surface',
            allow_polyphony: true,
          },
        },
        {
          entity_number: speakerCombinatorEntity,
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
                    (speakerIndex + 1) <<
                    (6 + ((speakerIndex + 1) % 2 ? 8 : 0)),
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
      )

      wires.push(
        // Combinator to speaker
        [speakerCombinatorEntity, 4, speakerEntity, 2],
      )

      if (speakerIndex * 2 - 2 >= 1) {
        // Connect current speaker combinator to the one before the last one
        wires.push(
          [speakerCombinatorEntity, 1, speakerCombinatorEntity - 4, 1], // Red
          [speakerCombinatorEntity, 2, speakerCombinatorEntity - 4, 2], // Green
        )
      }
    },
  )

  return {
    blueprintSection: { entities, wires },
    keyEntities: {
      firstSpeakerCombinatorEntity: en(2),
      secondSpeakerCombinatorEntity: en(4),
    },
  }
}
