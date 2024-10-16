import { beforeEach, describe, expect, test, vi } from 'vitest'
import { songToFactorio, songToFactorioData } from '@/app/lib/song-to-factorio'
import { Midi } from '@tonejs/midi'
import { preprocessSong } from '@/app/components/select-stage'
import { readFile } from 'node:fs/promises'
import { mkAlea } from '@spissvinkel/alea'
import signals from '@/app/lib/data/signals.json'
import * as utils from '@/app/lib/utils'

describe('Song to Factorio', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    const { random } = mkAlea('seed')
    vi.spyOn(Math, 'random').mockImplementation(() => random())
  })

  test('factorio data consistency', async () => {
    const file = await readFile('test-data/debussy-clair-de-lune.mid')

    const song = new Midi(file)
    const processedSong = preprocessSong(song, 'file.mid')

    expect(songToFactorioData(processedSong)).toMatchSnapshot()
  })

  test('blueprint json consistency', async () => {
    vi.spyOn(utils, 'encodeBlueprint').mockImplementation((json) =>
      JSON.stringify(json, null, 2),
    )

    const file = await readFile('test-data/debussy-clair-de-lune.mid')

    const song = new Midi(file)
    const processedSong = preprocessSong(song, 'file.mid')

    expect(songToFactorio(processedSong, signals).blueprint).toMatchSnapshot()
  })

  test('final blueprint consistency', async () => {
    const file = await readFile('test-data/debussy-clair-de-lune.mid')

    const song = new Midi(file)
    const processedSong = preprocessSong(song, 'file.mid')

    expect(songToFactorio(processedSong, signals)).toMatchSnapshot()
  })
})
