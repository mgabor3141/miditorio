# miditorio

Convert midi songs to Factorio blueprints

## 2.0 Notes

A signal is 8 bits on an unsigned range

A note value is valid from 1 to 48, that's 6 bits.

drumkit has 17 sounds

Factorio used to have 227 signals

Signals can be:

- item x
- fluid x
- virtual x
- entity x
- recipe x
- space-location
- asteroid-chunk
- quality
  See: SignalIDType

## Commands

The following command generates a CSV of all the signals available in the game.
Note that whatever mods you have enabled will also be included.
The csv file will be in the game folder `/script-output`.
Copy the resulting csv file into the `tools` folder in the project, then run `yarn parse-signals`

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

Very relevant message:
https://discord.com/channels/1214952937613295676/1285467033357516850/1289178384890593400
Sort order: {item, fluid, virtual, recipe, entity, space-location, quality, asteroid-chunk}

# 2.0 Feature goals

- Online preview (create soundfont)
- Visual preview for instruments and note ranges while editing
- Settings:
  - Anti-jitter stretch
  - Use Space Age DLC signals (including elevated rail and quality)
  - Game speed control
- Histogram of note velocities, number of velocity buckets to use
- Mod: programmable-speaker-extended

## User flow

1. Upload MIDI
2. Setup
   1. Show note grid on top
   2. Settings below
      1. Instrument specific settings
         1. Enable Disable
         2. Instrument assignment
         3. Octave shift
      2. Do you have space age?
      3. Anti Jitter
      4. Game speed
3. Export

## Libraries

Tone JS for midi parsing and internal data
Factorio code will be separated to work with the ToneJS data as input
Custom note visualizer with transport controls and layered midis

## More?

programmable-speaker-extended mod
import settings from previous blueprint
