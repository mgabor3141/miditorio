import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mkAlea } from '@spissvinkel/alea'
import { autoCluster } from '@/app/lib/kmeans'
import testNoteVelocities from '../../test-data/kmeans.test.json'

describe('K-means', () => {
  beforeEach(() => {
    const { random } = mkAlea('seed')
    vi.spyOn(Math, 'random').mockImplementation(() => random())
  })

  test('random mock', () => {
    expect(Math.random()).toMatchInlineSnapshot(`0.03475257847458124`)
  })

  /**
   * const songToVelocityTestData = (song) => song.midi.tracks.map((track) =>
   *  ({ songName: song.midi.header.name, trackName: track.name, data: track.notes.map(({velocity}) => velocity)})
   * )
   */
  test.concurrent.for(testNoteVelocities)(
    'auto clustering $songName / $trackName',
    ({ data }, { expect }) => {
      const numberOfTestsToAverage = 1000
      expect(
        new Array(numberOfTestsToAverage)
          .fill(undefined)
          .map(() => autoCluster({ data }).clusters.length)
          .reduce((acc, v) => acc + v, 0) / numberOfTestsToAverage,
      ).toMatchSnapshot()
    },
  )
})
