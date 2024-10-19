import { describe, expect, test } from 'vitest'
import { autoCluster } from '@/app/lib/kmeans'
import { readFile, readdir } from 'fs/promises'
import { Midi } from '@tonejs/midi'

describe('K-means', async () => {
  const testFiles = (await readdir('test-data/')).filter(
    // Exclude files that are trivial to cluster
    (file) => !['bach.mid', 'sea.mid'].includes(file),
  )

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
        song.tracks
          .filter((track) => track.notes.length && !track.instrument.percussion)
          .map(({ name, notes }) => [
            name.trim(),
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
