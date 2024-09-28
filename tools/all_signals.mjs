import fs from 'node:fs'

const SIGNAL_EXCLUDE = ["parameter", "unknown"]
const RESERVED = ["signal-N"]

const to_signal_list = (items, additional_fields) => {
    const signals = []
    items.split("\n").forEach((line) => {
        if (!line) return

        const [type, item] = line.split(/\s*,\s*/)
        if ([...SIGNAL_EXCLUDE, ...RESERVED].some(
            exclusion => item.includes(exclusion)
        )) return

        signals.push({
            name: item,
            quality: "normal",
            comparator: "=",
            count: 1,
            ...(type === "item" ? {} : {type})
        })
    })

    return signals
}

const array_chunks = (array, chunk_size) =>
    Array(Math.ceil(array.length / chunk_size))
        .fill()
        .map((_, index) => index * chunk_size)
        .map(begin => array.slice(begin, begin + chunk_size))

const to_constant_combinators = (signals) =>
    array_chunks(signals, 1000).map((signal_chunk, index) => (
        {
            "entity_number": index + 1,
            "name": "constant-combinator",
            "position": {
                "x": 169.5 + index,
                "y": -42.5
            },
            "control_behavior": {
                "sections": {
                    "sections": [
                        {
                            "index": 1,
                            "filters": signal_chunk.map(
                                (signal, index) => ({
                                    index: index + 1,
                                    ...signal
                                })
                            )
                        }
                    ]
                }
            }
        }))


const all_signals = to_signal_list(
    fs.readFileSync('../reference/all_signals_sorted.csv', 'utf8')
)

console.log(`Number of signals: ${all_signals.length}`)

const all_signals_with_quality = all_signals.flatMap(
    signal => ([signal /* TODO add qualities here */ ])
)

console.log(`Number of signals with quality added: ${all_signals_with_quality.length}`)

const blueprint = {
    "blueprint": {
        "icons": [
            {
                "signal": {
                    "name": "constant-combinator"
                },
                "index": 1
            }
        ],
        "entities": to_constant_combinators(all_signals_with_quality),
        "item": "blueprint",
        "version": 281483568218115
    }
}

fs.writeFileSync("out/out.json", JSON.stringify(blueprint, null, 2))

console.log("Done")
