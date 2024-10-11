import React from 'react'
import { Group } from '@visx/group'
import { Bar, Line } from '@visx/shape'
import { scaleLinear } from '@visx/scale'
import { roundToNearestClusterCenter } from '@/app/lib/kmeans'

const BAR_WIDTH = 3

export type HistogramProps = {
  data: [value: number | string, frequency: number][]
  clusterCenters: number[]
  width: number
  height: number
}
export function Histogram({
  data,
  clusterCenters,
  width,
  height,
}: HistogramProps) {
  // Define the graph dimensions and margins
  const margin = { top: 0, bottom: 0, left: 0, right: BAR_WIDTH }

  // We'll make some helpers to get at the data we want
  const x = (d: HistogramProps['data'][number]) => d[0]
  const y = (d: HistogramProps['data'][number]) => d[1]

  // Then we'll create some bounds
  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  // And then scale the graph by our data
  const xScale = scaleLinear({
    range: [0, xMax],
    round: true,
    domain: [0, 1],
    // padding: 0.4,
  })
  const yScale = scaleLinear({
    range: [yMax, 25],
    round: true,
    domain: [0, Math.max(...data.map((d) => d[1]))],
  })

  // Compose together the scale and accessor functions to get point functions
  // prettier-ignore
  const compose =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (scale: any, accessor: (d: HistogramProps['data'][number]) => number | string) =>
      (data: HistogramProps['data'][number]) =>
        scale(accessor(data))
  const xPoint = compose(xScale, x)
  const yPoint = compose(yScale, y)

  return (
    <svg width={width} height={height}>
      {clusterCenters.map((cc, i) => (
        <Group key={`cc-${i}`}>
          <Line
            from={{ x: xScale(cc) + BAR_WIDTH / 2, y: 0 }}
            to={{ x: xScale(cc) + BAR_WIDTH / 2, y: yMax }}
            style={{
              stroke: '#5c2525',
              strokeWidth: '1',
              shapeRendering: 'geometricPrecision',
            }}
          />
        </Group>
      ))}

      {data.map((d, i) => {
        const barHeight = yMax - yPoint(d)
        return (
          <Group key={`bar-${i}`}>
            <Bar
              x={xPoint(d)}
              y={yMax - barHeight}
              height={barHeight}
              width={BAR_WIDTH}
              fill={`hsl(${roundToNearestClusterCenter(Number(x(d)), clusterCenters).closestCenter * 300}deg 60% 50%)`}
            />
          </Group>
        )
      })}
    </svg>
  )
}
