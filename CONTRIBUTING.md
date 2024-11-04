# How to Contribute

## Setup

Install node and yarn, then run `yarn` to install dependencies. Run `yarn dev` to run the app. See `package.json` for more scripts.

## Libraries

Tone JS for midi parsing and internal data
Factorio code will be separated to work with the ToneJS data as input
Custom note visualizer with transport controls and layered midis

## Re-generate signal lists

The following command generates a CSV of all the signals available in the game.
Note that the enabled mods will affect the result, so this will need to be done both with and without Space Age DLC mods.
The csv file will be in the game folder `/script-output`.
Copy the resulting csv files into the `tools/data` folder in the project, then run `yarn parse-signals`

```lua
/c
helpers.remove_path("all_signals.csv");
helpers.write_file("all_signals.csv", "type, name\n", true);
for name, _
    in pairs(prototypes.get_item_filtered{{filter="hidden", hidden=true, invert=true}})
    do helpers.write_file("all_signals.csv", "item, " .. name .. "\n", true);
end;
for name, _
    in pairs(prototypes.get_fluid_filtered{{filter="hidden", hidden=true, invert=true}})
    do helpers.write_file("all_signals.csv", "fluid, " .. name .. "\n", true);
end;
for name, signal
    in pairs(prototypes.virtual_signal)
    do
        if signal.special == false then
            helpers.write_file("all_signals.csv", "virtual, " .. name .. "\n", true);
        end
end;
for name, _
    in pairs(prototypes.get_recipe_filtered{{filter="hidden", hidden=true, invert=true}})
    do helpers.write_file("all_signals.csv", "recipe, " .. name .. "\n", true);
end;
for name, _
    in pairs(prototypes.get_entity_filtered{{filter="hidden", hidden=true, invert=true}})
    do helpers.write_file("all_signals.csv", "entity, " .. name .. "\n", true);
end;
for name, _
    in pairs(prototypes.space_location)
    do helpers.write_file("all_signals.csv", "space-location, " .. name .. "\n", true);
end;
for name, _
    in pairs(prototypes.quality)
    do helpers.write_file("all_signals.csv", "quality, " .. name .. "\n", true);
end;
for name, _
    in pairs(prototypes.asteroid_chunk)
    do helpers.write_file("all_signals.csv", "asteroid-chunk, " .. name .. "\n", true);
end;
```
