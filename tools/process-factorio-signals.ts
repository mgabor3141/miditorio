import fs from 'node:fs/promises'

// These were unreliable in the past and could cause a crash
const SIGNAL_EXCLUDE = ['parameter']

type Signal = {
  type?: string
  name: string
}

/**
 * @param items 2 column csv with optional header
 * Column 1 is signal type, column 2 is signal name
 */
const rawSignalsToObjects = (items: string) => {
  const signals: Signal[] = []
  items.split('\n').forEach((line) => {
    if (!line) return
    if (line === 'type, name') return

    const [type, item] = line.split(/\s*,\s*/)
    if (SIGNAL_EXCLUDE.some((exclusion) => item.includes(exclusion))) {
      return
    }

    signals.push({
      ...(type === 'item' ? {} : { type }),
      name: item,
    })
  })

  return signals
}

const getVersionFolders = async (): Promise<string[]> => {
  const entries = await fs.readdir('tools/data', { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((dir) => dir.name)
    .sort((a, b) => {
      // Sort version numbers in ascending order
      const [aMajor, aMinor, aPatch] = a.split('.').map(Number)
      const [bMajor, bMinor, bPatch] = b.split('.').map(Number)
      if (aMajor !== bMajor) return aMajor - bMajor
      if (aMinor !== bMinor) return aMinor - bMinor
      return aPatch - bPatch
    })
}

const readSignalsFromVersion = async (
  version: string,
  filePostFix: string = '',
): Promise<Signal[]> => {
  console.log(`Reading signals${filePostFix}.csv from version ${version}...`)
  const filePath = `tools/data/${version}/signals${filePostFix}.csv`
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return rawSignalsToObjects(content)
  } catch {
    console.warn(`Warning: Could not read ${filePath}`)
    return []
  }
}

const processSignals = async (
  filePostFix: string = '',
  intersectWith?: Signal[],
): Promise<Signal[]> => {
  // First get all version folders
  const versions = await getVersionFolders()
  if (versions.length === 0) {
    throw new Error('No version folders found in tools/data')
  }

  // Read signals from all versions
  const signalsFromVersions = await Promise.all(
    versions.map((version) => readSignalsFromVersion(version, filePostFix)),
  )

  // Intersect signals across all versions
  let signals = signalsFromVersions[0]
  for (let i = 1; i < signalsFromVersions.length; i++) {
    signals = signals.filter(({ type, name }) =>
      signalsFromVersions[i].some(
        (versionSignal) =>
          type === versionSignal.type && name === versionSignal.name,
      ),
    )
  }

  if (intersectWith) {
    // We only include signals in the vanilla dataset that are also in SA
    // This ensures that after upgrading from vanilla to SA no signals will be broken
    // This is generally only the satellite and its recipe
    console.log(`Signals before intersecting with DLC: ${signals.length}`)

    signals = signals.filter(({ type, name }) =>
      intersectWith.some(
        (intersectWithSignal) =>
          type === intersectWithSignal.type &&
          name === intersectWithSignal.name,
      ),
    )
  }

  await fs.writeFile(
    `app/lib/data/signals${filePostFix}.json`,
    JSON.stringify(signals).replaceAll('},', '},\n'),
  )

  console.log(`Done! Number of signals: ${signals.length}`)

  return signals
}

;(async () => {
  const signals = await processSignals('-dlc')
  await processSignals('', signals)

  console.log('Finished processing signals')
})()
