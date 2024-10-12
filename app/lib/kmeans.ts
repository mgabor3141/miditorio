export type ClusterResult = {
  clusters: number[][]
  centers: number[]
}

// Main function to automatically determine the number of clusters
export function autoCluster({
  data,
  meanThreshold = 0.05,
  clusterWidthThreshold = 0.1,
  maxK = 10,
}: {
  data: number[]
  meanThreshold?: number
  clusterWidthThreshold?: number
  maxK?: number
}): ClusterResult {
  // Input validation
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Data array must be a non-empty array of numbers.')
  }

  const uniqueData = Array.from(new Set(data))
  const maxClusters = Math.min(maxK, uniqueData.length)
  let prevMeanDeviation = Infinity
  let prevMaxClusterWidth = Infinity
  let bestClusters: ClusterResult | null = null

  for (let k = 1; k <= maxClusters; k++) {
    const clustersResult = kMeansClustering(data, k)
    const meanDeviation = computeMeanDeviation(clustersResult)
    const maxClusterWidth = clustersResult.clusters
      .map((cluster) =>
        cluster.reduce(
          ({ min, max }, v) => ({
            min: Math.min(min, v),
            max: Math.max(max, v),
          }),
          { min: 1, max: 0 } as { min: number; max: number },
        ),
      )
      .reduce((acc, { min, max }) => Math.max(acc, max - min), 0)

    console.log(maxClusterWidth)

    if (
      prevMeanDeviation !== Infinity &&
      prevMaxClusterWidth !== Infinity &&
      ((prevMeanDeviation - meanDeviation) / prevMeanDeviation <
        meanThreshold ||
        maxClusterWidth > prevMaxClusterWidth + clusterWidthThreshold)
    ) {
      // Stop iterating if the deviation has reached zero or
      // if the decrease in mean deviation is less than the threshold

      console.log(
        `Instrument with ${data.length} notes, clustering stopping before ${k} custers: ` +
          `mean dev ratio ${(prevMeanDeviation - meanDeviation) / prevMeanDeviation}, max w ${maxClusterWidth}, prev max w ${prevMaxClusterWidth}`,
      )

      break
    }

    if (maxClusterWidth < clusterWidthThreshold || meanDeviation === 0) {
      console.log(
        `Instrument with ${data.length} notes, clustering stopping at ${k} custers: mean dev ${meanDeviation}, max w ${maxClusterWidth}`,
      )

      bestClusters = clustersResult
      break
    }

    prevMeanDeviation = meanDeviation
    prevMaxClusterWidth = maxClusterWidth
    bestClusters = clustersResult
  }

  if (bestClusters === null) {
    // Fallback in case clustering fails
    return kMeansClustering(data, 1)
  }

  return bestClusters
}

// K-means clustering function with k-means++ initialization
export function kMeansClustering(data: number[], k: number): ClusterResult {
  // Handle the case where k is greater than the number of unique data points
  const uniqueData = Array.from(new Set(data))
  if (k > uniqueData.length) {
    k = uniqueData.length
  }

  // Initialize centers using k-means++ initialization
  let centers = initializeCenters(data, k)

  let clusters: number[][] = []
  const maxIterations = 100
  let iteration = 0
  let centersChanged = true

  while (centersChanged && iteration < maxIterations) {
    // Assign points to the nearest centers
    clusters = assignPointsToClusters(data, centers)

    // Update centers based on current clusters
    const newCenters = updateCenters(clusters, data)

    // Check if centers have changed significantly
    centersChanged = centersHaveChanged(centers, newCenters)

    centers = newCenters
    iteration++
  }

  return { clusters, centers }
}

// Initialize cluster centers using k-means++ algorithm
function initializeCenters(data: number[], k: number): number[] {
  const centers: number[] = []

  // Step 1: Choose the first center randomly from the data points
  const firstCenter = data[Math.floor(Math.random() * data.length)]
  centers.push(firstCenter)

  // Steps 2-4: Choose the remaining centers
  while (centers.length < k) {
    // Compute squared distances to the nearest center
    const distances = data.map((point) => {
      const minDistance = Math.min(
        ...centers.map((center) => Math.abs(point - center)),
      )
      return minDistance ** 2
    })

    const sumDistances = distances.reduce((sum, d) => sum + d, 0)

    if (sumDistances === 0) {
      // All points are identical; randomly select remaining centers
      while (centers.length < k) {
        const randomCenter = data[Math.floor(Math.random() * data.length)]
        centers.push(randomCenter)
      }
      break
    }

    // Compute probabilities for selecting the next center
    const probabilities = distances.map((d) => d / sumDistances)

    // Compute cumulative probabilities
    const cumulativeProbabilities =
      computeCumulativeProbabilities(probabilities)

    // Select a new center based on the cumulative probabilities
    const rand = Math.random()
    let newCenterIndex = cumulativeProbabilities.findIndex((p) => rand < p)
    if (newCenterIndex === -1) {
      newCenterIndex = cumulativeProbabilities.length - 1
    }
    centers.push(data[newCenterIndex])
  }

  return centers
}

// Assign data points to the nearest cluster centers
function assignPointsToClusters(data: number[], centers: number[]): number[][] {
  const clusters = centers.map(() => [] as number[])
  for (const point of data) {
    let minDistance = Infinity
    let closestCenterIndex = -1
    for (let i = 0; i < centers.length; i++) {
      const distance = Math.abs(point - centers[i])
      if (distance < minDistance) {
        minDistance = distance
        closestCenterIndex = i
      }
    }
    clusters[closestCenterIndex].push(point)
  }
  return clusters
}

// Update cluster centers based on the mean of assigned points
function updateCenters(clusters: number[][], data: number[]): number[] {
  return clusters.map((cluster) => {
    if (cluster.length > 0) {
      // Calculate the new center as the mean of the cluster points
      return cluster.reduce((a, b) => a + b, 0) / cluster.length
    } else {
      // If a cluster is empty, reinitialize its center randomly
      return data[Math.floor(Math.random() * data.length)]
    }
  })
}

// Check if cluster centers have changed significantly
function centersHaveChanged(
  oldCenters: number[],
  newCenters: number[],
  tolerance = 1e-6,
): boolean {
  for (let i = 0; i < oldCenters.length; i++) {
    if (Math.abs(oldCenters[i] - newCenters[i]) > tolerance) {
      return true
    }
  }
  return false
}

// Compute cumulative probabilities for selecting centers
function computeCumulativeProbabilities(probabilities: number[]): number[] {
  const cumulativeProbabilities = []
  let sum = 0
  for (const p of probabilities) {
    sum += p
    cumulativeProbabilities.push(sum)
  }
  return cumulativeProbabilities
}

// Compute the mean deviation of all points from their cluster centers
function computeMeanDeviation(clusterResult: ClusterResult): number {
  let totalDeviation = 0
  let totalPoints = 0

  for (let i = 0; i < clusterResult.clusters.length; i++) {
    const cluster = clusterResult.clusters[i]
    const center = clusterResult.centers[i]
    for (const point of cluster) {
      totalDeviation += Math.abs(point - center)
      totalPoints += 1
    }
  }

  return totalPoints > 0 ? totalDeviation / totalPoints : 0
}

export function roundToNearestClusterCenter(
  value: number,
  clusterCenters: number[],
): { closestCenter: number; closestCenterNumber: number } {
  // Find the cluster center that is closest to the input value
  clusterCenters.sort()
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
