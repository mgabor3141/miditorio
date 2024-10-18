import { encodeBlueprint } from '@/app/lib/utils'
import { Speakers } from '@/app/lib/song-to-factorio'
import { Entity, Wire } from '@/app/lib/factorio-blueprint-schema'
import { getSpeakerSection } from '@/app/lib/blueprint/speaker-section'
import { getStaticBlueprintSection } from '@/app/lib/blueprint/static-blueprint-section'
import { getDataSection } from '@/app/lib/blueprint/data-section'

import { Song } from '@/app/lib/song'

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
        comparator: '=',
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
  entities: Entity[]
  wires: Wire[]
}

export const mergeBlueprintSections = (
  ...blueprints: BlueprintSection[]
): BlueprintSection => ({
  entities: blueprints.flatMap((blueprint) => blueprint.entities),
  wires: blueprints.flatMap((blueprint) => blueprint.wires),
})

export type BlueprintResult = {
  blueprint: string
  warnings: string[]
}
export const toBlueprint = ({
  song,
  combinatorValues,
  speakers,
  rawSignals,
}: {
  song: Song
  combinatorValues: CombinatorValuePair[]
  speakers: Speakers
  rawSignals: RawSignal[]
}): BlueprintResult => {
  const warnings = []
  const signals = prepareSignals(rawSignals)

  // With bit packing we have 8 bits for the instrument address
  // This means 2 ** 8 - 2 because we can't have an instrument 0 and 2^8 is 0b100000000 (9 bits).
  const MAX_FACTORIO_SPEAKER_SIGNALS = 2 ** 8 - 2
  if (Object.keys(speakers).length > MAX_FACTORIO_SPEAKER_SIGNALS) {
    warnings.push(
      `This song with these settings would have required ${Object.keys(speakers).length} programmable speakers, ` +
        `so miditorio had to limit them to ${MAX_FACTORIO_SPEAKER_SIGNALS}. ` +
        'Try reducing the number of "note volumes" in your instrument settings.',
    )
  }

  const {
    blueprintSection: speakerBlueprintSection,
    keyEntities: {
      firstSpeakerCombinatorEntity,
      secondSpeakerCombinatorEntity,
    },
  } = getSpeakerSection(0, { speakers })
  const {
    blueprintSection: staticBlueprintSection,
    keyEntities: { playCombinatorEntity, dataToArithmeticConnectionEntity },
  } = getStaticBlueprintSection(speakerBlueprintSection.entities.length, {
    song,
    firstSpeakerCombinatorEntity,
    secondSpeakerCombinatorEntity,
  })

  const speakerAndStaticBlueprint = mergeBlueprintSections(
    speakerBlueprintSection,
    staticBlueprintSection,
  )

  const dataSection = getDataSection(
    speakerAndStaticBlueprint.entities.length,
    {
      combinatorValues,
      signals,
      playCombinatorEntity,
      dataToArithmeticConnectionEntity,
    },
  )

  const blueprint = mergeBlueprintSections(
    speakerAndStaticBlueprint,
    dataSection,
  )

  const finalBlueprint = {
    blueprint: {
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
      version: 281483568218115,
    },
  }

  return {
    blueprint: encodeBlueprint(finalBlueprint),
    warnings,
  }
}
