import { beforeEach, describe, test, vi } from 'vitest'
import { songToFactorio, songToFactorioData } from '@/app/lib/song-to-factorio'
import { Midi } from '@tonejs/midi'
import { readFile } from 'node:fs/promises'
import { mkAlea } from '@spissvinkel/alea'
import signals from '@/app/lib/data/signals.json'
import * as utils from '@/app/lib/utils'
import stringify from 'json-stable-stringify'
import { midiToSong } from '@/app/lib/song'
import { readdir } from 'fs/promises'

describe('Song to Factorio', async () => {
  const testFiles = await readdir('test-data/')

  beforeEach(() => {
    vi.restoreAllMocks()
    const { random } = mkAlea('seed')
    vi.spyOn(Math, 'random').mockImplementation(() => random())
  })

  test.sequential.for(testFiles)(
    'factorio data consistency - %s',
    async (testFile, { expect }) => {
      const file = await readFile(`test-data/${testFile}`)

      const song = new Midi(file)
      const processedSong = midiToSong(song, testFile)

      expect(songToFactorioData(processedSong)).toMatchSnapshot()
    },
  )

  test.sequential.for(testFiles)(
    'blueprint json consistency - %s',
    async (testFile, { expect }) => {
      vi.spyOn(utils, 'encodeBlueprint').mockImplementation((json) =>
        stringify(json, { space: 2 }),
      )

      const file = await readFile(`test-data/${testFile}`)

      const song = new Midi(file)
      const processedSong = midiToSong(song, testFile)

      expect(songToFactorio(processedSong, signals).blueprint).toMatchSnapshot()
    },
  )

  test.sequential.for(testFiles)(
    'final blueprint consistency - %s',
    async (testFile, { expect }) => {
      const file = await readFile(`test-data/${testFile}`)

      const song = new Midi(file)
      const processedSong = midiToSong(song, testFile)

      expect(songToFactorio(processedSong, signals)).toMatchSnapshot()
    },
  )
})
