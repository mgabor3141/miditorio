import fs from 'node:fs/promises'
import process from 'node:process'

process.on('warning', (warning: Error) => {
  console.log(warning)
  // if (warning.name)
})

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

const processSignals = async (filePostFix: string = '') => {
  console.log(`Reading signals${filePostFix}.csv...`)

  const signals = rawSignalsToObjects(
    await fs.readFile(`tools/data/signals${filePostFix}.csv`, 'utf8'),
  )

  await fs.writeFile(
    `app/lib/data/signals${filePostFix}.json`,
    JSON.stringify(signals).replaceAll('},', '},\n'),
  )

  console.log(`Done! Number of signals: ${signals.length}`)
}

;(async () => {
  await processSignals()
  await processSignals('-dlc')

  console.log('Finished processing signals')
})()
