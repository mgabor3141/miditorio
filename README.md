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


Commands:
```lua
/c
game.remove_path("all_signals_sorted.csv");
for name, _
    in pairs(prototypes.get_item_filtered{{filter="hidden", hidden=true, invert=true}})
    do game.write_file("all_signals_sorted.csv", "item, " .. name .. "\n", true);
end;
for name, _
    in pairs(prototypes.get_fluid_filtered{{filter="hidden", hidden=true, invert=true}})
    do game.write_file("all_signals_sorted.csv", "fluid, " .. name .. "\n", true);
end;
for name, signal
    in pairs(prototypes.virtual_signal)
    do 
        if signal.special == false then
            game.write_file("all_signals_sorted.csv", "virtual, " .. name .. "\n", true);
        end
end;
for name, _
    in pairs(prototypes.get_recipe_filtered{{filter="hidden", hidden=true, invert=true}})
    do game.write_file("all_signals_sorted.csv", "recipe, " .. name .. "\n", true);
end;
for name, _
    in pairs(prototypes.get_entity_filtered{{filter="hidden", hidden=true, invert=true}})
    do game.write_file("all_signals_sorted.csv", "entity, " .. name .. "\n", true);
end;
for name, _
    in pairs(prototypes.space_location)
    do game.write_file("all_signals_sorted.csv", "space-location, " .. name .. "\n", true);
end;
for name, _
    in pairs(prototypes.quality)
    do game.write_file("all_signals_sorted.csv", "quality, " .. name .. "\n", true);
end;
for name, _
    in pairs(prototypes.asteroid_chunk)
    do game.write_file("all_signals_sorted.csv", "asteroid-chunk, " .. name .. "\n", true);
end;
```

Very relevant message:
https://discord.com/channels/1214952937613295676/1285467033357516850/1289178384890593400
Sort order: {item, fluid, virtual, recipe, entity, space-location, quality, asteroid-chunk}