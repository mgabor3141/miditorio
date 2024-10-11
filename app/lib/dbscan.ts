export function dbscan1D(
  data: number[],
  eps: number = 0.05,
  minPts: number = 2,
): number[][] {
  // Sort the data to improve performance
  const points = data.toSorted((a, b) => a - b)
  const n = points.length
  const labels = new Array(n).fill(undefined)
  let clusterId = 0

  function regionQuery(index: number): number[] {
    const neighbors = []
    const point = points[index]

    // Since the data is sorted, we can efficiently find neighbors
    // by checking points within the eps distance in both directions
    for (let i = index; i < n; i++) {
      if (points[i] - point > eps) break
      if (Math.abs(points[i] - point) <= eps) neighbors.push(i)
    }
    for (let i = index - 1; i >= 0; i--) {
      if (point - points[i] > eps) break
      if (Math.abs(points[i] - point) <= eps) neighbors.push(i)
    }
    return neighbors
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== undefined) continue // Already processed
    const neighbors = regionQuery(i)

    if (neighbors.length < minPts) {
      labels[i] = -1 // Mark as noise
    } else {
      clusterId++
      labels[i] = clusterId
      let seeds = neighbors.filter((index) => index !== i)

      while (seeds.length > 0) {
        const currentPoint = seeds.shift()!
        if (labels[currentPoint] === -1) {
          labels[currentPoint] = clusterId
        }
        if (labels[currentPoint] !== undefined) continue
        labels[currentPoint] = clusterId

        const currentNeighbors = regionQuery(currentPoint)
        if (currentNeighbors.length >= minPts) {
          seeds = seeds.concat(
            currentNeighbors.filter((index) => labels[index] === undefined),
          )
        }
      }
    }
  }

  // Group points by their cluster labels
  const clusters: number[][] = []
  for (let i = 1; i <= clusterId; i++) {
    const cluster = points.filter((_, index) => labels[index] === i)
    clusters.push(cluster)
  }

  // Optionally handle noise points
  const noise = points.filter((_, index) => labels[index] === -1)
  if (noise.length > 0) {
    // You can choose to treat noise points as separate clusters or ignore them
    clusters.push(noise)
  }

  return clusters
}

export function computeClusterMeans(clusters: number[][]): number[] {
  const means: number[] = clusters.map((cluster) => {
    const sum = cluster.reduce((a, b) => a + b, 0)
    return sum / cluster.length
  })

  return means
}

export function roundToNearestClusterCenter(
  value: number,
  clusterCenters: number[],
): number {
  // Find the cluster center that is closest to the input value
  let closestCenter = clusterCenters[0]
  let minDistance = Math.abs(value - clusterCenters[0])

  for (let i = 1; i < clusterCenters.length; i++) {
    const center = clusterCenters[i]
    const distance = Math.abs(value - center)
    if (distance < minDistance) {
      minDistance = distance
      closestCenter = center
    }
  }
  return closestCenter
}
