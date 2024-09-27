import fs from 'node:fs'

const to_signal_list = (items, additional_fields) => {
    const signals = []
    items.split("\n").forEach((item) => {
        if (!item) return
        if (item.includes("parameter")) return

        signals.push({
            index: signals.length + 1,
            name: item,
            quality: "normal",
            comparator: "=",
            count: 1,
            ...additional_fields
        })

        signals.push({
            index: signals.length + 1,
            name: item,
            quality: "quality-unknown",
            comparator: "=",
            count: 1,
            ...additional_fields
        })
    })

    return signals
}

const all_signals = [
    ...to_signal_list(
        fs.readFileSync('../reference/base_filtered_items.txt', 'utf8')
    ),
    ...to_signal_list(
        fs.readFileSync('../reference/base_filtered_items.txt', 'utf8')
    )
]

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
        "entities": [
            {
                "entity_number": 1,
                "name": "constant-combinator",
                "position": {
                    "x": 169.5,
                    "y": -42.5
                },
                "control_behavior": {
                    "sections": {
                        "sections": [
                            {
                                "index": 1,
                                "filters": all_signals
                            }
                        ]
                    }
                }
            }
        ],
        "item": "blueprint",
        "version": 281483568218115
    }
}

fs.writeFileSync("out.json", JSON.stringify(blueprint, null, 2))
