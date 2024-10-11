export function kMeans1D(
  data: number[],
  k: number,
  maxIterations = 100,
): { clusters: number[][]; centroids: number[] } {
  // Initialize centroids randomly from the data points
  let centroids = initializeCentroidsKMeansPP(data, k)
  let clusters: number[][] = new Array(k).fill(0).map(() => [])
  let previousCentroids: number[] = []
  let iterations = 0

  while (
    !hasConverged(centroids, previousCentroids) &&
    iterations < maxIterations
  ) {
    // Assignment Step: Assign points to the nearest centroid
    clusters = assignPointsToClusters(data, centroids)

    // Update Step: Recalculate centroids
    previousCentroids = centroids.slice()
    centroids = recomputeCentroids(data, clusters)

    iterations++
  }

  return { clusters, centroids }
}

function initializeCentroidsKMeansPP(data: number[], k: number): number[] {
  const centroids: number[] = []
  const n = data.length
  const dataCopy = data.slice()

  // Choose the first centroid randomly from the data points
  const firstCentroidIndex = Math.floor(Math.random() * n)
  centroids.push(dataCopy[firstCentroidIndex])

  // Choose the rest of the centroids
  for (let i = 1; i < k; i++) {
    const distances = dataCopy.map((point) => {
      return Math.min(...centroids.map((c) => Math.pow(point - c, 2)))
    })

    const totalDistance = distances.reduce((a, b) => a + b, 0)
    const probabilities = distances.map((d) => d / totalDistance)

    // Compute cumulative probabilities
    const cumulativeProbabilities: number[] = []
    probabilities.reduce((a, b, i) => {
      return (cumulativeProbabilities[i] = a + b)
    }, 0)

    const randomValue = Math.random()
    for (let j = 0; j < cumulativeProbabilities.length; j++) {
      if (randomValue < cumulativeProbabilities[j]) {
        centroids.push(dataCopy[j])
        break
      }
    }
  }

  return centroids
}

function assignPointsToClusters(
  data: number[],
  centroids: number[],
): number[][] {
  const clusters: number[][] = new Array(centroids.length).fill(0).map(() => [])
  for (const point of data) {
    const distances = centroids.map((c) => Math.abs(point - c))
    const closestCentroidIndex = distances.indexOf(Math.min(...distances))
    clusters[closestCentroidIndex].push(point)
  }
  return clusters
}

function recomputeCentroids(data: number[], clusters: number[][]): number[] {
  const newCentroids = clusters.map((cluster) => {
    if (cluster.length === 0) {
      // Handle empty clusters by reinitializing the centroid
      return NaN
    }
    const sum = cluster.reduce((a, b) => a + b, 0)
    return sum / cluster.length
  })
  // Reinitialize any centroids that correspond to empty clusters
  for (let i = 0; i < newCentroids.length; i++) {
    if (isNaN(newCentroids[i])) {
      // Reinitialize centroid to a random data point
      newCentroids[i] = data[Math.floor(Math.random() * data.length)]
    }
  }
  return newCentroids
}

function hasConverged(
  centroids: number[],
  previousCentroids: number[],
): boolean {
  if (centroids.length !== previousCentroids.length) return false
  for (let i = 0; i < centroids.length; i++) {
    if (centroids[i] !== previousCentroids[i]) {
      return false
    }
  }
  return true
}

export function roundToNearestClusterCenter(
  value: number,
  clusterCenters: number[],
): { closestCenter: number; closestCenterNumber: number } {
  // Find the cluster center that is closest to the input value
  let closestCenterNumber = 0
  let minDistance = Math.abs(value - clusterCenters[0])

  for (let i = 1; i < clusterCenters.length; i++) {
    const center = clusterCenters[i]
    const distance = Math.abs(value - center)
    if (distance < minDistance) {
      minDistance = distance
      closestCenterNumber = i
    }
  }

  return {
    closestCenter: clusterCenters[closestCenterNumber],
    closestCenterNumber,
  }
}
