import { beforeEach, describe, expect, test, vi } from 'vitest'
import { songToFactorio, songToFactorioData } from '@/app/lib/song-to-factorio'
import { Midi } from '@tonejs/midi'
import { preprocessSong } from '@/app/components/select-stage'
import { readFile } from 'node:fs/promises'
import { mkAlea } from '@spissvinkel/alea'

describe('Song to Factorio', () => {
  beforeEach(() => {
    const { random } = mkAlea('seed')
    vi.spyOn(Math, 'random').mockImplementation(() => random())
  })

  test('consistency', async () => {
    const file = await readFile('test-data/debussy-clair-de-lune.mid')

    const song = new Midi(file)
    const processedSong = preprocessSong(song, 'file.mid')

    expect(songToFactorioData(processedSong)).toMatchSnapshot()
    expect(songToFactorio(processedSong)).toMatchSnapshot()
  })
})
