import { arrayChunks, encodeBlueprint } from '@/app/lib/utils'
import { signals } from '@/app/lib/signals'
import { FactorioInstrument } from '@/app/lib/data.mjs'

const qualities = [
  'normal',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'quality-unknown',
]
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

  const entities: unknown[] = []

  ;[tickCombinatorValues, dataCombinatorValues]
    .map((values) => ({
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
    }))
    .forEach((entity) => {
      entities.push({
        ...entity,
        entity_number: entities.length,
        position: { x: 0, y: entities.length },
      })
    })

  signalInstruments
    .map((instrument, instrumentNumber) => ({
      name: 'programmable-speaker',
      control_behavior: {
        circuit_condition: {
          first_signal: {
            type: 'virtual',
            name: instrumentNumber % 2 ? 'signal-green' : 'signal-red',
          },
          constant: 0,
          comparator: '>',
        },
        circuit_parameters: {
          signal_value_is_pitch: true,
          instrument_id: instrument.id,
          note_id: 0,
        },
      },
      parameters: {
        playback_volume: instrument.default_volume,
        playback_mode: 'surface',
        allow_polyphony: true,
      },
      alert_parameters: {
        show_alert: false,
        show_on_map: true,
        alert_message: 'MIDItorio.com',
      },
    }))
    .forEach((entity) => {
      entities.push({
        ...entity,
        entity_number: entities.length,
        position: { x: 0, y: entities.length },
      })
    })

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
      entities,
      item: 'blueprint',
      version: 281483568218115,
    },
  }

  return encodeBlueprint(blueprint)
}
