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

const processSignals = async (
  filePostFix: string = '',
  intersectWith?: Signal[],
): Promise<Signal[]> => {
  console.log(`Reading signals${filePostFix}.csv...`)

  let signals = rawSignalsToObjects(
    await fs.readFile(`tools/data/signals${filePostFix}.csv`, 'utf8'),
  )

  if (intersectWith) {
    // We only include signals in the vanilla dataset that are also in SA
    // This ensures that after upgrading from vanilla to SA no signals will be broken
    // This is generally only the satellite and its recipe
    console.log(`Signals before intersecting: ${signals.length}`)

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
