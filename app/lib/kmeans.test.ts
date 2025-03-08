import { describe, expect, test } from 'vitest'
import { autoCluster } from '@/app/lib/kmeans'
import { readFile, readdir } from 'fs/promises'
import { Midi } from '@tonejs/midi'
import groupBy from 'lodash.groupby'

describe.sequential('K-means', async () => {
  const testFiles = (await readdir('test-data/')).filter(
    // Exclude files that are trivial to cluster
    (file) => !['bach.mid', 'sea.mid'].includes(file),
  )

  test('random mock', () => {
    expect(Math.random()).toMatchInlineSnapshot(`0.03475257847458124`)
  })

  test.for(testFiles)(
    'auto clustering %s',
    { timeout: 60_000 },
    async (testFile, { expect }) => {
      const numberOfTestsToAverage = 100

      const file = await readFile(`test-data/${testFile}`)
      const song = new Midi(file)

      const tracks = song.tracks.filter(
        (track) => track.notes.length && !track.instrument.percussion,
      )

      expect(
        tracks.map(({ name, notes }) => {
          const clusters = new Array(numberOfTestsToAverage)
            .fill(undefined)
            .map(
              () =>
                autoCluster({
                  data: notes.map(({ velocity }) => velocity),
                }).clusters.length,
            )

          return {
            _trackName: name.trim(),
            _trackNotes: notes.length,
            min: clusters.reduce((a, b) => Math.min(a, b)),
            max: clusters.reduce((a, b) => Math.max(a, b)),
            average:
              clusters.reduce((acc, v) => acc + v, 0) / numberOfTestsToAverage,
            median: clusters
              .toSorted()
              .at(Math.floor(numberOfTestsToAverage / 2)),
            mode: Object.entries(groupBy(clusters)).toSorted(
              ([_1, v1], [_2, v2]) => v2.length - v1.length,
            )[0][0],
          }
        }),
      ).toMatchSnapshot()
    },
  )
})
