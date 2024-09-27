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
`/c`
```lua
game.remove_path("base_filtered_item.txt");
game.remove_path("base_filtered_entity.txt");
game.remove_path("base_filtered_fluid.txt");
game.remove_path("base_filtered_recipe.txt");
game.remove_path("base_virtual_signal.txt");
for name, _
    in pairs(prototypes.get_item_filtered{{filter="hidden", hidden=true, invert=true}})
    do game.write_file("base_filtered_item.txt", name .. "\n", true);
end;
for name, _
    in pairs(prototypes.get_entity_filtered{{filter="hidden", hidden=true, invert=true}})
    do game.write_file("base_filtered_entity.txt", name .. "\n", true);
end;
for name, _
    in pairs(prototypes.get_fluid_filtered{{filter="hidden", hidden=true, invert=true}})
    do game.write_file("base_filtered_fluid.txt", name .. "\n", true);
end;
for name, _
    in pairs(prototypes.get_recipe_filtered{{filter="hidden", hidden=true, invert=true}})
    do game.write_file("base_filtered_recipe.txt", name .. "\n", true);
end;
for name, signal
    in pairs(prototypes.virtual_signal)
    do 
        if signal.special == false then
            game.write_file("base_virtual_signal.txt", name .. "\n", true);
        end
end;
```
/c 