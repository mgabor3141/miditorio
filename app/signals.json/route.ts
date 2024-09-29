import fs from 'node:fs/promises'

const SIGNAL_EXCLUDE = ['parameter', 'unknown']
const RESERVED = ['signal-N']

type Signal = {
  type?: string
  name: string
  quality: string
  comparator: string
  count: number
}

/**
 * @param items 2 column csv without header.
 * Column 1 is signal type, column 2 is signal name
 */
const to_signal_list = (items: string) => {
  const signals: Omit<Signal, 'count'>[] = []
  items.split('\n').forEach((line) => {
    if (!line) return

    const [type, item] = line.split(/\s*,\s*/)
    if (
      [...SIGNAL_EXCLUDE, ...RESERVED].some((exclusion) =>
        item.includes(exclusion),
      )
    )
      return

    signals.push({
      name: item,
      quality: 'normal',
      comparator: '=',
      ...(type === 'item' ? {} : { type }),
    })
  })

  return signals
}

export async function GET() {
  const signals = to_signal_list(
    await fs.readFile('all_signals_sorted.csv', 'utf8'),
  )
  return Response.json(signals)
}
