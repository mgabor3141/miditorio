import { Speakers } from '@/src/lib/song-to-factorio'
import {
  Entity,
  PlaybackMode,
  Signal,
} from '@/src/lib/factorio-blueprint-schema'
import { getFactorioInstrument } from '@/src/lib/factorio-instrument'
import {
  PORT,
  type BlueprintBuilder,
  type EntityRef,
} from '@/src/lib/blueprint/build'

// Signals that carry the timing/playback circuit or the shared volume memory,
// and must never be reused as a per-voice "note value" carrier on the shared
// speaker bus (the volume memory emits signal-A/signal-B onto that same bus).
const RESERVED_NOTE_SIGNALS = new Set([
  'signal-green',
  'signal-each',
  'signal-everything',
  'signal-A',
  'signal-B',
])

/**
 * Build one unique note-carrier signal per voice from the available signal pool.
 *
 * Historically every speaker combinator emitted the SAME `programmable-speaker`
 * signal, so each voice needed its own dedicated green wire. Giving each voice a
 * UNIQUE signal lets all speakers + all combinator outputs share a single green
 * net: each speaker only reacts to its own signal, so per-voice pitches stay
 * independent even though the wire is shared. The carrier is decoupled from the
 * note VALUE (which the speaker derives via signal_value_is_pitch), so changing
 * the name does not change what is copied as the count -> pitch is unchanged.
 *
 * Names come from the memory-cell signal pool; they only ever appear on the
 * note-bus net (separate from the data/`each` net), so reusing those names is
 * safe. Reserved signals are excluded.
 */
const buildNoteSignals = (
  pool: Pick<Signal, 'name' | 'type'>[],
  count: number,
): Pick<Signal, 'name' | 'type'>[] => {
  const seen = new Set<string>()
  const unique: Pick<Signal, 'name' | 'type'>[] = []
  for (const s of pool) {
    if (unique.length >= count) break
    if (RESERVED_NOTE_SIGNALS.has(s.name) || seen.has(s.name)) continue
    seen.add(s.name)
    unique.push({ ...(s.type ? { type: s.type } : {}), name: s.name })
  }
  if (unique.length < count) {
    throw new Error(
      `Not enough unique signals for per-voice note carriers ` +
        `(need ${count}, have ${unique.length}).`,
    )
  }
  return unique
}

export const getSpeakerSection = (
  builder: BlueprintBuilder,
  {
    speakers,
    playbackMode,
    noteSignals,
  }: {
    speakers: Speakers
    playbackMode: PlaybackMode
    noteSignals: Pick<Signal, 'name' | 'type'>[]
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
  const speakerHandles: Entity[] = []

  const entries = Object.values(speakers)
  const voiceNoteSignals = buildNoteSignals(noteSignals, entries.length)

  entries.forEach(({ instrumentName, volume }, speakerIndex) => {
    const instrument = getFactorioInstrument(instrumentName)
    // This voice's unique note-carrier signal. Used BOTH as the speaker's
    // listened-for signal and as its combinator's output signal.
    const noteSignal = voiceNoteSignals[speakerIndex]

    const speaker = builder.entity({
      name: 'programmable-speaker',
      position: {
        x: Math.floor(speakerIndex / 2),
        y: -2.5 + Math.floor(speakerIndex % 2) * 3,
      },
      control_behavior: {
        circuit_condition: {
          first_signal: noteSignal,
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
              signal: noteSignal,
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
    speakerHandles.push(speaker)

    // Combinator output (green) -> this speaker (green). This injects the
    // voice's note signal onto the speaker bus net.
    builder.wire(
      speakerCombinator,
      PORT.combOutputGreen,
      speaker,
      PORT.speakerGreen,
    )

    // Daisy-chain every speaker onto the SAME green net so all speakers + all
    // combinator outputs live on one shared wire (polyphony without collisions,
    // since each voice has a unique signal).
    if (speakerHandles.length >= 2) {
      const prevSpeaker = speakerHandles[speakerHandles.length - 2]
      builder.wire(speaker, PORT.speakerGreen, prevSpeaker, PORT.speakerGreen)
    }

    // Connect this speaker combinator to the one two rows up (input decode bus).
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
  })

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
