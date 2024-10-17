import { beforeEach, describe, test, vi } from 'vitest'
import { songToFactorio, songToFactorioData } from '@/app/lib/song-to-factorio'
import { Midi } from '@tonejs/midi'
import { preprocessSong } from '@/app/components/select-stage'
import { readFile } from 'node:fs/promises'
import { mkAlea } from '@spissvinkel/alea'
import signals from '@/app/lib/data/signals.json'
import * as utils from '@/app/lib/utils'
import stringify from 'json-stable-stringify'

const TEST_FILES = ['debussy-clair-de-lune.mid', 'bwv1013_04.mid']

describe('Song to Factorio', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    const { random } = mkAlea('seed')
    vi.spyOn(Math, 'random').mockImplementation(() => random())
  })

  test.sequential.for(TEST_FILES)(
    'factorio data consistency - %s',
    async (testFile, { expect }) => {
      const file = await readFile(`test-data/${testFile}`)

      const song = new Midi(file)
      const processedSong = preprocessSong(song, testFile)

      expect(songToFactorioData(processedSong)).toMatchSnapshot()
    },
  )

  test.sequential.for(TEST_FILES)(
    'blueprint json consistency - %s',
    async (testFile, { expect }) => {
      vi.spyOn(utils, 'encodeBlueprint').mockImplementation((json) =>
        stringify(json, { space: 2 }),
      )

      const file = await readFile(`test-data/${testFile}`)

      const song = new Midi(file)
      const processedSong = preprocessSong(song, testFile)

      expect(songToFactorio(processedSong, signals).blueprint).toMatchSnapshot()
    },
  )

  test.sequential.for(TEST_FILES)(
    'final blueprint consistency - %s',
    async (testFile, { expect }) => {
      const file = await readFile(`test-data/${testFile}`)

      const song = new Midi(file)
      const processedSong = preprocessSong(song, testFile)

      expect(songToFactorio(processedSong, signals)).toMatchSnapshot()
    },
  )
})
