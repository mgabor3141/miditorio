import React from 'react'
import { Group } from '@visx/group'
import { Bar, Line } from '@visx/shape'
import { scaleBand, scaleLinear } from '@visx/scale'
import { roundToNearestClusterCenter } from '@/app/lib/kmeans'

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
  console.log(data)

  // Define the graph dimensions and margins
  const margin = { top: 20, bottom: 20, left: 20, right: 20 }

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
    range: [yMax, 0],
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
      {data.map((d, i) => {
        const barHeight = yMax - yPoint(d)
        return (
          <Group key={`bar-${i}`}>
            <Bar
              x={xPoint(d)}
              y={yMax - barHeight}
              height={barHeight}
              width={3}
              fill={
                clusterCenters.find((n) => String(n) === x(d))
                  ? 'red'
                  : `hsl(${roundToNearestClusterCenter(Number(x(d)), clusterCenters) * 300}deg 60% 50%)`
              }
            />
          </Group>
        )
      })}

      {clusterCenters.map((cc, i) => (
        <Group key={`cc-${i}`}>
          <Line
            from={{ x: xScale(cc), y: 0 }}
            to={{ x: xScale(cc), y: yMax }}
            // style="stroke:red;stroke-width:2"
            style={{ stroke: 'red', strokeWidth: 2 }}
            fill="red"
            width={1}
          />
        </Group>
      ))}
    </svg>
  )
}
