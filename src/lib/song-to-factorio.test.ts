import { afterAll, beforeAll, describe, MockInstance, test, vi } from 'vitest'
import { songToFactorio, songToFactorioData } from '@/app/lib/song-to-factorio'
import { Midi } from '@tonejs/midi'
import { readFile } from 'node:fs/promises'
import signals from '@/app/lib/data/signals.json'
import * as utils from '@/app/lib/utils'
import stringify from 'json-stable-stringify'
import { midiToSong } from '@/app/lib/song'
import { readdir } from 'fs/promises'

describe('Song to Blueprint', async () => {
  const testFiles = await readdir('test-data/')

  test.sequential.for(testFiles)(
    'Song data consistency - %s',
    async (testFile, { expect }) => {
      const file = await readFile(`test-data/${testFile}`)

      const song = new Midi(file)
      const processedSong = midiToSong(song, testFile)

      const factorioData = songToFactorioData(processedSong)
      expect(Object.keys(factorioData)).toMatchSnapshot()
      expect(factorioData).toMatchSnapshot()
    },
  )

  describe('Blueprint raw JSON', async () => {
    let spy: MockInstance<(blueprint: Record<string, unknown>) => string>

    beforeAll(() => {
      // Mock the encodeBlueprint function only for these tests
      spy = vi
        .spyOn(utils, 'encodeBlueprint')
        .mockImplementation((json) => stringify(json, { space: 2 }))
    })

    afterAll(() => {
      spy.mockRestore()
    })

    test.sequential.for(testFiles)(
      'consistency - %s',
      async (testFile, { expect }) => {
        const file = await readFile(`test-data/${testFile}`)

        const song = new Midi(file)
        const processedSong = midiToSong(song, testFile)

        expect(
          songToFactorio(processedSong, signals, 'global').blueprint,
        ).toMatchSnapshot()
      },
    )
  })
})
