import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mkAlea } from '@spissvinkel/alea'
import { autoCluster } from '@/app/lib/kmeans'
import { readFile, readdir } from 'fs/promises'
import { Midi } from '@tonejs/midi'

describe('K-means', async () => {
  const testFiles = await readdir('test-data/')

  beforeEach(() => {
    const { random } = mkAlea('seed')
    vi.spyOn(Math, 'random').mockImplementation(() => random())
  })

  test('random mock', () => {
    expect(Math.random()).toMatchInlineSnapshot(`0.03475257847458124`)
  })

  test.concurrent.for(testFiles)(
    'auto clustering %s',
    { timeout: 60_000 },
    async (testFile, { expect }) => {
      const numberOfTestsToAverage = 1000

      const file = await readFile(`test-data/${testFile}`)
      const song = new Midi(file)

      expect(
        song.tracks.map(({ name, notes }) => [
          name,
          new Array(numberOfTestsToAverage)
            .fill(undefined)
            .map(
              () =>
                autoCluster({
                  data: notes.map(({ velocity }) => velocity),
                }).clusters.length,
            )
            .reduce((acc, v) => acc + v, 0) / numberOfTestsToAverage,
        ]),
      ).toMatchSnapshot()
    },
  )
})
