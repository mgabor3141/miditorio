export type Wire = [
  source_entity_number: number,
  source_wire_connector_id: number,
  target_entity_number: number,
  target_wire_connector_id: number,
]

export type Signal = {
  type?: string
  name: string
}

export type Filter = Signal & {
  index: number
  quality: string
  comparator: string
  count: number
}

export type CircuitCondition = {
  first_signal: Signal
  second_signal?: Signal
  constant?: number
  comparator: string
  first_signal_networks?: Networks
}

export type Networks = {
  red: boolean
  green: boolean
}

export type PlaybackMode = 'surface' | 'global'

export type Entity = {
  entity_number: number
  position: {
    x: number
    y: number
  }
  direction?: number
  player_description?: string
} & (
  | {
      name: 'programmable-speaker'
      control_behavior: {
        circuit_condition: CircuitCondition
        circuit_parameters: {
          signal_value_is_pitch: boolean
          instrument_id: number
          note_id: number
        }
      }
      parameters: {
        playback_volume: number
        playback_mode: PlaybackMode
        allow_polyphony: boolean
        volume_controlled_by_signal: boolean
        volume_signal_id: Signal
      }
    }
  | {
      name: 'decider-combinator'
      control_behavior: {
        decider_conditions: {
          conditions: CircuitCondition[]
          outputs: [
            {
              signal: Signal
              networks?: Networks
            },
          ]
        }
      }
    }
  | {
      name: 'arithmetic-combinator'
      control_behavior: {
        arithmetic_conditions: {
          first_signal: Signal
          second_constant: number
          operation: string
          output_signal: Signal
        }
      }
    }
  | {
      name: 'constant-combinator'
      control_behavior: {
        sections: {
          sections: {
            index: number
            filters: Filter[]
          }[]
        }
        is_on?: boolean
      }
    }
)
