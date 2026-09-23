import { encodeBlueprint } from '@/src/lib/utils'
import { Speakers } from '@/src/lib/song-to-factorio'
import { PlaybackMode } from '@/src/lib/factorio-blueprint-schema'
import { getSpeakerSection } from '@/src/lib/blueprint/speaker-section'
import { getStaticBlueprintSection } from '@/src/lib/blueprint/static-blueprint-section'
import { getDataSection } from '@/src/lib/blueprint/data-section'
import { createBuilder } from '@/src/lib/blueprint/build'

import { Song } from '@/src/lib/song'

// This is a reserved signal because of the playback circuit
const RESERVED_SIGNALS = ['signal-green']

const prepareSignals = (signals: RawSignal[]) => {
  const qualities = signals
    .filter(({ type }) => type === 'quality')
    .map(({ name }) => name)

  return signals
    .flatMap((signal) =>
      qualities.map((quality) => ({
        ...signal,
        comparator: '=' as const,
        quality,
      })),
    )
    .filter(
      ({ name, quality }) =>
        !(quality === 'normal' && RESERVED_SIGNALS.includes(name)),
    )
}

export type CombinatorValuePair = {
  ticks: number
  speakerData: number
}

export type RawSignal = {
  name: string
  type?: string
}

export type BlueprintSection = {
  entities: import('@/src/lib/factorio-blueprint-schema').Entity[]
  wires: import('@/src/lib/factorio-blueprint-schema').Wire[]
}

export type BlueprintResult = {
  blueprint: string
  warnings: string[]
}

// Our blueprints target the Factorio version the generator was written for.
// (The library-backed approach's newer VERSION/pako encoder are deliberately
// not adopted; we keep our version and the fflate encode.)
const BLUEPRINT_VERSION = 281483568218115

export const toBlueprint = ({
  song,
  combinatorValues,
  speakers,
  rawSignals,
  playbackMode,
}: {
  song: Song
  combinatorValues: CombinatorValuePair[]
  speakers: Speakers
  rawSignals: RawSignal[]
  playbackMode: PlaybackMode
}): BlueprintResult => {
  const warnings = []
  const signals = prepareSignals(rawSignals)

  // With bit packing we have 8 bits for the instrument address
  // This means 2 ** 8 - 2 because we can't have an instrument 0 and 2^8 is 0b100000000 (9 bits).
  const MAX_FACTORIO_SPEAKER_SIGNALS = 2 ** 8 - 2
  if (Object.keys(speakers).length > MAX_FACTORIO_SPEAKER_SIGNALS) {
    warnings.push(
      `This song with these settings would have required ${Object.keys(speakers).length} speakers, ` +
        `so miditorio had to limit them to ${MAX_FACTORIO_SPEAKER_SIGNALS}. ` +
        'Try reducing the number of note velocity groups in your instrument settings.',
    )
  }

  // A single builder owns the global entity_number counter: each section adds
  // into it in order, so callers pass entity handles instead of doing
  // `entitiesSoFar + local` arithmetic or `- 4` cross-section references.
  const builder = createBuilder()

  const {
    keyEntities: { firstSpeakerCombinator, secondSpeakerCombinator },
  } = getSpeakerSection(builder, { speakers, playbackMode })
  const {
    keyEntities: { playCombinator, dataToArithmeticConnection },
  } = getStaticBlueprintSection(builder, {
    song,
    firstSpeakerCombinator,
    secondSpeakerCombinator,
  })
  const blueprint = getDataSection(builder, {
    combinatorValues,
    signals,
    playCombinator,
    dataToArithmeticConnection,
  })

  const finalBlueprint = {
    blueprint: {
      label: song.midi.name,
      icons: [
        {
          signal: {
            name: 'programmable-speaker',
          },
          index: 1,
        },
      ],
      ...blueprint,
      item: 'blueprint',
      version: BLUEPRINT_VERSION,
    },
  }

  return {
    blueprint: encodeBlueprint(finalBlueprint),
    warnings,
  }
}
