// Factorio instruments

function FactorioInstrument(name, id, base, range_octaves, default_volume) {
	this.name = name;
	this.id = id;
	this.base = base;
	this.range = range_octaves*12;
	
	if (default_volume !== undefined)
		this.default_volume = default_volume;
	else
		this.default_volume = 1;
}

FactorioInstrument.prototype.convert = function(note) {
	return note - this.base;
}

FactorioInstrument.prototype.checkRange = function(note, getDirection) {
	pitch = note.convert();

	if (getDirection == false || getDirection == undefined)
		return (pitch > 0 && pitch <= this.range);
	
	if (pitch <= 0) return {"direction": "below", "delta": -pitch + 1};
	if (pitch > this.range) return {"direction": "above", "delta": pitch - this.range};
	return true;
}

var factorio_instrument = {
	"Piano":			new FactorioInstrument("Piano",			2,  40, 4),
	"Bass":				new FactorioInstrument("Bass",			3,  28, 3),
	"Lead":				new FactorioInstrument("Lead",			4,  28, 3),
	"Saw":				new FactorioInstrument("Saw",			5,  28, 3, 0.8),
	"Square":			new FactorioInstrument("Square",		6,  28, 3, 0.5),
	"Celesta":			new FactorioInstrument("Celesta",		7,  64, 3),
	"Vibraphone":		new FactorioInstrument("Vibraphone",	8,  52, 3),
	"Plucked":			new FactorioInstrument("Plucked",		9,  52, 3),
	"SteelDrum":		new FactorioInstrument("SteelDrum",		10, 40, 3),
	"ReverseCymbal":	new FactorioInstrument("ReverseCymbal",	1),
	"DrumKit":			new FactorioInstrument("DrumKit",		1),
	"Exclude":			new FactorioInstrument("Exclude", -1)
};

factorio_instrument["ReverseCymbal"].convert = function (note) { return 13; };
factorio_instrument["ReverseCymbal"].checkRange = function (note, getDirection) { return true; };

factorio_instrument["DrumKit"].convert = function(note) {
	if (drumkit_map[note] === undefined) {
		console.log("GM DrumKit " + note + " not found.");
		return 0;
	} else {
		return drumkit_map[note];
	}
}
factorio_instrument["DrumKit"].checkRange = function (note, getDirection) { return true; };

factorio_instrument["Exclude"].convert = function (note) { return 0; };
factorio_instrument["Exclude"].checkRange = function (note, getDirection) { return true; };

function getFactorioInstrument(programcode) {
	programcode++;
	factorioInstrumentName = "Exclude";

	if (programcode == 0) {					// Drumkit
		factorioInstrumentName = "DrumKit";
	} else if (programcode <= 8) {			// Piano
		factorioInstrumentName = "Piano";
	} else if (programcode <= 16) {			// Chromatic Percussion
		if (programcode == 9)
			factorioInstrumentName = "Celesta";
		else
			factorioInstrumentName = "Vibraphone";
	} else if (programcode <= 24) {			// Organ
		factorioInstrumentName = "Square";
	} else if (programcode <= 32) {			// Guitar
		factorioInstrumentName = "Saw";
	} else if (programcode <= 40) {			// Bass
		factorioInstrumentName = "Bass";
	} else if (programcode <= 48) {			// Strings
		factorioInstrumentName = "Lead";
	} else if (programcode <= 56) {			// Ensemble
		factorioInstrumentName = "Lead";
	} else if (programcode <= 64) {			// Brass
		factorioInstrumentName = "Piano";
	} else if (programcode <= 72) {			// Reed
		factorioInstrumentName = "Piano";
	} else if (programcode <= 80) {			// Pipe
		factorioInstrumentName = "Piano";
	} else if (programcode <= 88) {			// Synth Lead
		if (programcode == 81)
			factorioInstrumentName = "Square";
		else if (programcode == 82)
			factorioInstrumentName = "Saw";
		else
			factorioInstrumentName = "Lead";
	} else if (programcode <= 96) {			// Synth Pad
		factorioInstrumentName = "Vibraphone";
	} else if (programcode <= 104) {		// Synth Effects
		factorioInstrumentName = "Saw";
	} else if (programcode <= 112) {		// Ethnic
		factorioInstrumentName = "Piano";
	} else if (programcode <= 120) {		// Percussive
		if (programcode == 120)
			factorioInstrumentName = "ReverseCymbal";
		else
			factorioInstrumentName = "SteelDrum";
	} else if (programcode <= 128) {		// Sound Effects
		factorioInstrumentName = "Exclude";
	}

	return factorio_instrument[factorioInstrumentName];
}

var drumkit_map = {
	27: 9,	// High Q -> high q
	35: 2,	// Acoustic Bass Drum -> kick 2
	36: 1,	// Bass Drum 1 -> kick 1
	37: 10,	// Side Stick -> perc 1
	38: 5,	// Accoustic Snare -> snare 2
	39: 14, // Hand Clap -> clap
	40: 4,	// Electric Snare -> snare 1
	41: 4,	// Low Floor Tom -> snare 1
	42: 6,	// Closed Hi Hat -> hat 1
	43: 4,	// High Floor Tom -> snare 1
	44: 7,	// Pedal Hi Hat -> hat 2
	45: 4,	// Low Tom -> snare 1
	46: 7,	// Open Hi Hat -> hat 2
	47: 4,	// Low-Mid Tom -> snare 1
	48: 4,	// Hi-Mid Tom -> snare 1
	49: 12,	// Crash Cymbal 1 -> crash
	50: 4,	// High Tom -> snare 1
	51: 6,	// Ride Cymbal -> hat 1
	52: 12,	// Chinese Cymbal -> crash
	53: 16,	// Ride Bell -> cowbell
	54: 15,	// Tambourine -> shaker
	55: 12,	// Splash Cymbal -> crash
	56: 16, // Cowbell -> cowbell
	57: 12,	// Crash Cymbal 2 -> crash
	59: 6,	// Ride Cymbal 2 -> hat 1
	69: 15,	// Cabasa -> shaker
	75: 10,	// Claves -> perc 2
	76: 10,	// Hi Wood Block -> perc 2
	77: 10,	// Low Wood Block -> perc 2
	81: 17	// Open Triangle -> triangle
};

// GM instrument names
var midi_instrument = [
	"Acoustic Grand Piano",
	"Bright Acoustic Piano",
	"Electric Grand Piano",
	"Honky-tonk Piano",
	"Electric Piano 1",
	"Electric Piano 2",
	"Harpsichord",
	"Clavi",
	"Celesta",
	"Glockenspiel",
	"Music Box",
	"Vibraphone",
	"Marimba",
	"Xylophone",
	"Tubular Bells",
	"Dulcimer",
	"Drawbar Organ",
	"Percussive Organ",
	"Rock Organ",
	"Church Organ",
	"Reed Organ",
	"Accordion",
	"Harmonica",
	"Tango Accordion",
	"Acoustic Guitar (nylon)",
	"Acoustic Guitar (steel)",
	"Electric Guitar (jazz)",
	"Electric Guitar (clean)",
	"Electric Guitar (muted)",
	"Overdriven Guitar",
	"Distortion Guitar",
	"Guitar harmonics",
	"Acoustic Bass",
	"Electric Bass (finger)",
	"Electric Bass (pick)",
	"Fretless Bass",
	"Slap Bass 1",
	"Slap Bass 2",
	"Synth Bass 1",
	"Synth Bass 2",
	"Violin",
	"Viola",
	"Cello",
	"Contrabass",
	"Tremolo Strings",
	"Pizzicato Strings",
	"Orchestral Harp",
	"Timpani",
	"String Ensemble 1",
	"String Ensemble 2",
	"SynthStrings 1",
	"SynthStrings 2",
	"Choir Aahs",
	"Voice Oohs",
	"Synth Voice",
	"Orchestra Hit",
	"Trumpet",
	"Trombone",
	"Tuba",
	"Muted Trumpet",
	"French Horn",
	"Brass Section",
	"SynthBrass 1",
	"SynthBrass 2",
	"Soprano Sax",
	"Alto Sax",
	"Tenor Sax",
	"Baritone Sax",
	"Oboe",
	"English Horn",
	"Bassoon",
	"Clarinet",
	"Piccolo",
	"Flute",
	"Recorder",
	"Pan Flute",
	"Blown Bottle",
	"Shakuhachi",
	"Whistle",
	"Ocarina",
	"Lead 1 (square)",
	"Lead 2 (sawtooth)",
	"Lead 3 (calliope)",
	"Lead 4 (chiff)",
	"Lead 5 (charang)",
	"Lead 6 (voice)",
	"Lead 7 (fifths)",
	"Lead 8 (bass + lead)",
	"Pad 1 (new age)",
	"Pad 2 (warm)",
	"Pad 3 (polysynth)",
	"Pad 4 (choir)",
	"Pad 5 (bowed)",
	"Pad 6 (metallic)",
	"Pad 7 (halo)",
	"Pad 8 (sweep)",
	"FX 1 (rain)",
	"FX 2 (soundtrack)",
	"FX 3 (crystal)",
	"FX 4 (atmosphere)",
	"FX 5 (brightness)",
	"FX 6 (goblins)",
	"FX 7 (echoes)",
	"FX 8 (sci-fi)",
	"Sitar",
	"Banjo",
	"Shamisen",
	"Koto",
	"Kalimba",
	"Bag pipe",
	"Fiddle",
	"Shanai",
	"Tinkle Bell",
	"Agogo",
	"Steel Drums",
	"Woodblock",
	"Taiko Drum",
	"Melodic Tom",
	"Synth Drum",
	"Reverse Cymbal",
	"Guitar Fret Noise",
	"Breath Noise",
	"Seashore",
	"Bird Tweet",
	"Telephone Ring",
	"Helicopter",
	"Applause",
	"Gunshot"
];
midi_instrument[-1] = "Drum Kit";

// GM percussion names
var midi_percussion = {
	35: "Acoustic Bass Drum",
	36: "Bass Drum 1",
	37: "Side Stick",
	38: "Acoustic Snare",
	39: "Hand Clap",
	40: "Electric Snare",
	41: "Low Floor Tom",
	42: "Closed Hi Hat",
	43: "High Floor Tom",
	44: "Pedal Hi-Hat",
	45: "Low Tom",
	46: "Open Hi-Hat",
	47: "Low-Mid Tom",
	48: "Hi-Mid Tom",
	49: "Crash Cymbal 1",
	50: "High Tom",
	51: "Ride Cymbal 1",
	52: "Chinese Cymbal",
	53: "Ride Bell",
	54: "Tambourine",
	55: "Splash Cymbal",
	56: "Cowbell",
	57: "Crash Cymbal 2",
	58: "Vibraslap",
	59: "Ride Cymbal 2",
	60: "Hi Bongo",
	61: "Low Bongo",
	62: "Mute Hi Conga",
	63: "Open Hi Conga",
	64: "Low Conga",
	65: "High Timbale",
	66: "Low Timbale",
	67: "High Agogo",
	68: "Low Agogo",
	69: "Cabasa",
	70: "Maracas",
	71: "Short Whistle",
	72: "Long Whistle",
	73: "Short Guiro",
	74: "Long Guiro",
	75: "Claves",
	76: "Hi Wood Block",
	77: "Low Wood Block",
	78: "Mute Cuica",
	79: "Open Cuica",
	80: "Mute Triangle",
	81: "Open Triangle"
};

var factorio_signals = [
	{"name":"signal-A", "type":"virtual"},
	{"name":"signal-B", "type":"virtual"},
	{"name":"signal-C", "type":"virtual"},
	{"name":"signal-D", "type":"virtual"},
	{"name":"signal-E", "type":"virtual"},
	{"name":"signal-F", "type":"virtual"},
	{"name":"signal-G", "type":"virtual"},
	{"name":"signal-H", "type":"virtual"},
	{"name":"signal-I", "type":"virtual"},
	{"name":"signal-J", "type":"virtual"},
	{"name":"signal-K", "type":"virtual"},
	{"name":"signal-L", "type":"virtual"},
	{"name":"signal-M", "type":"virtual"},
	{"name":"signal-N", "type":"virtual"},
	{"name":"signal-O", "type":"virtual"},
	{"name":"signal-P", "type":"virtual"},
	{"name":"signal-Q", "type":"virtual"},
	{"name":"signal-R", "type":"virtual"},
	{"name":"signal-S", "type":"virtual"},
	{"name":"signal-T", "type":"virtual"},
	{"name":"signal-U", "type":"virtual"},
	{"name":"signal-V", "type":"virtual"},
	{"name":"signal-W", "type":"virtual"},
	{"name":"signal-X", "type":"virtual"},
	{"name":"signal-Y", "type":"virtual"},
	{"name":"signal-Z", "type":"virtual"},
	{"name":"wooden-chest", "type":"item"},
	{"name":"iron-chest", "type":"item"},
	{"name":"steel-chest", "type":"item"},
	{"name":"storage-tank", "type":"item"},
	{"name":"transport-belt", "type":"item"},
	{"name":"fast-transport-belt", "type":"item"},
	{"name":"express-transport-belt", "type":"item"},
	{"name":"underground-belt", "type":"item"},
	{"name":"fast-underground-belt", "type":"item"},
	{"name":"express-underground-belt", "type":"item"},
	{"name":"splitter", "type":"item"},
	{"name":"fast-splitter", "type":"item"},
	{"name":"express-splitter", "type":"item"},
	{"name":"burner-inserter", "type":"item"},
	{"name":"inserter", "type":"item"},
	{"name":"long-handed-inserter", "type":"item"},
	{"name":"fast-inserter", "type":"item"},
	{"name":"filter-inserter", "type":"item"},
	{"name":"stack-inserter", "type":"item"},
	{"name":"stack-filter-inserter", "type":"item"},
	{"name":"small-electric-pole", "type":"item"},
	{"name":"medium-electric-pole", "type":"item"},
	{"name":"big-electric-pole", "type":"item"},
	{"name":"substation", "type":"item"},
	{"name":"pipe", "type":"item"},
	{"name":"pipe-to-ground", "type":"item"},
	{"name":"pump", "type":"item"},
	{"name":"rail", "type":"item"},
	{"name":"train-stop", "type":"item"},
	{"name":"rail-signal", "type":"item"},
	{"name":"rail-chain-signal", "type":"item"},
	{"name":"locomotive", "type":"item"},
	{"name":"cargo-wagon", "type":"item"},
	{"name":"fluid-wagon", "type":"item"},
	{"name":"car", "type":"item"},
	{"name":"tank", "type":"item"},
	{"name":"logistic-robot", "type":"item"},
	{"name":"construction-robot", "type":"item"},
	{"name":"logistic-chest-active-provider", "type":"item"},
	{"name":"logistic-chest-passive-provider", "type":"item"},
	{"name":"logistic-chest-requester", "type":"item"},
	{"name":"logistic-chest-storage", "type":"item"},
	{"name":"roboport", "type":"item"},
	{"name":"small-lamp", "type":"item"},
	{"name":"red-wire", "type":"item"},
	{"name":"green-wire", "type":"item"},
	{"name":"arithmetic-combinator", "type":"item"},
	{"name":"decider-combinator", "type":"item"},
	{"name":"constant-combinator", "type":"item"},
	{"name":"power-switch", "type":"item"},
	{"name":"programmable-speaker", "type":"item"},
	{"name":"stone-brick", "type":"item"},
	{"name":"concrete", "type":"item"},
	{"name":"hazard-concrete", "type":"item"},
	{"name":"landfill", "type":"item"},
	{"name":"iron-axe", "type":"item"},
	{"name":"steel-axe", "type":"item"},
	{"name":"repair-pack", "type":"item"},
	{"name":"blueprint", "type":"item"},
	{"name":"deconstruction-planner", "type":"item"},
	{"name":"blueprint-book", "type":"item"},
	{"name":"boiler", "type":"item"},
	{"name":"steam-engine", "type":"item"},
	{"name":"steam-turbine", "type":"item"},
	{"name":"solar-panel", "type":"item"},
	{"name":"accumulator", "type":"item"},
	{"name":"nuclear-reactor", "type":"item"},
	{"name":"heat-exchanger", "type":"item"},
	{"name":"heat-pipe", "type":"item"},
	{"name":"burner-mining-drill", "type":"item"},
	{"name":"electric-mining-drill", "type":"item"},
	{"name":"offshore-pump", "type":"item"},
	{"name":"pumpjack", "type":"item"},
	{"name":"stone-furnace", "type":"item"},
	{"name":"steel-furnace", "type":"item"},
	{"name":"electric-furnace", "type":"item"},
	{"name":"assembling-machine-1", "type":"item"},
	{"name":"assembling-machine-2", "type":"item"},
	{"name":"assembling-machine-3", "type":"item"},
	{"name":"oil-refinery", "type":"item"},
	{"name":"chemical-plant", "type":"item"},
	{"name":"centrifuge", "type":"item"},
	{"name":"lab", "type":"item"},
	{"name":"beacon", "type":"item"},
	{"name":"speed-module", "type":"item"},
	{"name":"speed-module-2", "type":"item"},
	{"name":"speed-module-3", "type":"item"},
	{"name":"effectivity-module", "type":"item"},
	{"name":"effectivity-module-2", "type":"item"},
	{"name":"effectivity-module-3", "type":"item"},
	{"name":"productivity-module", "type":"item"},
	{"name":"productivity-module-2", "type":"item"},
	{"name":"productivity-module-3", "type":"item"},
	{"name":"solid-fuel", "type":"item"},
	{"name":"stone", "type":"item"},
	{"name":"iron-ore", "type":"item"},
	{"name":"raw-fish", "type":"item"},
	{"name":"copper-ore", "type":"item"},
	{"name":"uranium-ore", "type":"item"},
	{"name":"raw-wood", "type":"item"},
	{"name":"wood", "type":"item"},
	{"name":"coal", "type":"item"},
	{"name":"iron-plate", "type":"item"},
	{"name":"copper-plate", "type":"item"},
	{"name":"steel-plate", "type":"item"},
	{"name":"sulfur", "type":"item"},
	{"name":"plastic-bar", "type":"item"},
	{"name":"crude-oil-barrel", "type":"item"},
	{"name":"heavy-oil-barrel", "type":"item"},
	{"name":"light-oil-barrel", "type":"item"},
	{"name":"lubricant-barrel", "type":"item"},
	{"name":"petroleum-gas-barrel", "type":"item"},
	{"name":"sulfuric-acid-barrel", "type":"item"},
	{"name":"water-barrel", "type":"item"},
	{"name":"copper-cable", "type":"item"},
	{"name":"iron-stick", "type":"item"},
	{"name":"iron-gear-wheel", "type":"item"},
	{"name":"empty-barrel", "type":"item"},
	{"name":"electronic-circuit", "type":"item"},
	{"name":"advanced-circuit", "type":"item"},
	{"name":"processing-unit", "type":"item"},
	{"name":"uranium-235", "type":"item"},
	{"name":"uranium-238", "type":"item"},
	{"name":"engine-unit", "type":"item"},
	{"name":"electric-engine-unit", "type":"item"},
	{"name":"used-up-uranium-fuel-cell", "type":"item"},
	{"name":"battery", "type":"item"},
	{"name":"explosives", "type":"item"},
	{"name":"flying-robot-frame", "type":"item"},
	{"name":"low-density-structure", "type":"item"},
	{"name":"rocket-fuel", "type":"item"},
	{"name":"rocket-control-unit", "type":"item"},
	{"name":"satellite", "type":"item"},
	{"name":"uranium-fuel-cell", "type":"item"},
	{"name":"science-pack-1", "type":"item"},
	{"name":"science-pack-2", "type":"item"},
	{"name":"science-pack-3", "type":"item"},
	{"name":"military-science-pack", "type":"item"},
	{"name":"production-science-pack", "type":"item"},
	{"name":"high-tech-science-pack", "type":"item"},
	{"name":"space-science-pack", "type":"item"},
	{"name":"pistol", "type":"item"},
	{"name":"submachine-gun", "type":"item"},
	{"name":"shotgun", "type":"item"},
	{"name":"combat-shotgun", "type":"item"},
	{"name":"rocket-launcher", "type":"item"},
	{"name":"flamethrower", "type":"item"},
	{"name":"land-mine", "type":"item"},
	{"name":"firearm-magazine", "type":"item"},
	{"name":"piercing-rounds-magazine", "type":"item"},
	{"name":"uranium-rounds-magazine", "type":"item"},
	{"name":"shotgun-shell", "type":"item"},
	{"name":"piercing-shotgun-shell", "type":"item"},
	{"name":"cannon-shell", "type":"item"},
	{"name":"explosive-cannon-shell", "type":"item"},
	{"name":"uranium-cannon-shell", "type":"item"},
	{"name":"explosive-uranium-cannon-shell", "type":"item"},
	{"name":"rocket", "type":"item"},
	{"name":"explosive-rocket", "type":"item"},
	{"name":"atomic-bomb", "type":"item"},
	{"name":"flamethrower-ammo", "type":"item"},
	{"name":"grenade", "type":"item"},
	{"name":"cluster-grenade", "type":"item"},
	{"name":"poison-capsule", "type":"item"},
	{"name":"slowdown-capsule", "type":"item"},
	{"name":"defender-capsule", "type":"item"},
	{"name":"distractor-capsule", "type":"item"},
	{"name":"destroyer-capsule", "type":"item"},
	{"name":"discharge-defense-remote", "type":"item"},
	{"name":"light-armor", "type":"item"},
	{"name":"heavy-armor", "type":"item"},
	{"name":"modular-armor", "type":"item"},
	{"name":"power-armor", "type":"item"},
	{"name":"power-armor-mk2", "type":"item"},
	{"name":"solar-panel-equipment", "type":"item"},
	{"name":"fusion-reactor-equipment", "type":"item"},
	{"name":"energy-shield-equipment", "type":"item"},
	{"name":"energy-shield-mk2-equipment", "type":"item"},
	{"name":"battery-equipment", "type":"item"},
	{"name":"battery-mk2-equipment", "type":"item"},
	{"name":"personal-laser-defense-equipment", "type":"item"},
	{"name":"discharge-defense-equipment", "type":"item"},
	{"name":"exoskeleton-equipment", "type":"item"},
	{"name":"personal-roboport-equipment", "type":"item"},
	{"name":"personal-roboport-mk2-equipment", "type":"item"},
	{"name":"night-vision-equipment", "type":"item"},
	{"name":"stone-wall", "type":"item"},
	{"name":"gate", "type":"item"},
	{"name":"gun-turret", "type":"item"},
	{"name":"laser-turret", "type":"item"},
	{"name":"flamethrower-turret", "type":"item"},
	{"name":"radar", "type":"item"},
	{"name":"rocket-silo", "type":"item"},
	{"name":"water", "type":"fluid"},
	{"name":"crude-oil", "type":"fluid"},
	{"name":"steam", "type":"fluid"},
	{"name":"heavy-oil", "type":"fluid"},
	{"name":"light-oil", "type":"fluid"},
	{"name":"petroleum-gas", "type":"fluid"},
	{"name":"sulfuric-acid", "type":"fluid"},
	{"name":"lubricant", "type":"fluid"},
];

var decoder_entities = [
	{"entity_number":1,"name":"arithmetic-combinator","position":{"x":-2.5,"y":-4},"direction":2,"control_behavior":{"arithmetic_conditions":{"first_signal":{"type":"virtual","name":"signal-each"},"constant":0,"operation":"OR","output_signal":{"type":"virtual","name":"signal-each"}}},"connections":{"1":{"red":[{"entity_id":2}],"green":[{"entity_id":8,"circuit_id":1}]},"2":{"red":[{"entity_id":3,"circuit_id":1},{"entity_id":8,"circuit_id":2}]}}},
	{"entity_number":2,"name":"constant-combinator","position":{"x":-4,"y":-4},"direction":2,"control_behavior":{"filters":[{"signal":{"type":"virtual","name":"signal-grey"},"count":-1,"index":1}]},"connections":{"1":{"red":[{"entity_id":1,"circuit_id":1}]}}},
	{"entity_number":3,"name":"arithmetic-combinator","position":{"x":-0.5,"y":-4},"direction":2,"control_behavior":{"arithmetic_conditions":{"first_signal":{"type":"virtual","name":"signal-each"},"second_signal":{"type":"virtual","name":"signal-grey"},"operation":">>","output_signal":{"type":"virtual","name":"signal-each"}}},"connections":{"1":{"red":[{"entity_id":1,"circuit_id":2}]},"2":{"red":[{"entity_id":4,"circuit_id":1}]}}},
	{"entity_number":4,"name":"arithmetic-combinator","position":{"x":1.5,"y":-4},"direction":2,"control_behavior":{"arithmetic_conditions":{"first_signal":{"type":"virtual","name":"signal-each"},"constant":63,"operation":"AND","output_signal":{"type":"virtual","name":"signal-each"}}},"connections":{"1":{"red":[{"entity_id":3,"circuit_id":2}]}}},
	{"entity_number":5,"name":"decider-combinator","position":{"x":-2.5,"y":-2},"direction":2,"control_behavior":{"decider_conditions":{"first_signal":{"type":"virtual","name":"signal-green"},"second_signal":{"type":"virtual","name":"signal-1"},"comparator":"=","output_signal":{"type":"virtual","name":"signal-grey"},"copy_count_from_input":true}},"connections":{"1":{"red":[{"entity_id":6}],"green":[{"entity_id":8,"circuit_id":1},{"entity_id":13,"circuit_id":1}]},"2":{"red":[{"entity_id":8,"circuit_id":2},{"entity_id":13,"circuit_id":2}]}}},
	{"entity_number":6,"name":"constant-combinator","position":{"x":-4,"y":-2},"direction":2,"control_behavior":{"filters":[{"signal":{"type":"virtual","name":"signal-grey"},"count":7,"index":1}]},"connections":{"1":{"red":[{"entity_id":5,"circuit_id":1}]}}},
	{"entity_number":7,"name":"constant-combinator","position":{"x":-4,"y":-3},"direction":2,"control_behavior":{"filters":[{"signal":{"type":"virtual","name":"signal-grey"},"count":1,"index":1}]},"connections":{"1":{"red":[{"entity_id":8,"circuit_id":1}]}}},
	{"entity_number":8,"name":"decider-combinator","position":{"x":-2.5,"y":-3},"direction":2,"control_behavior":{"decider_conditions":{"first_signal":{"type":"virtual","name":"signal-green"},"second_signal":{"type":"virtual","name":"signal-0"},"comparator":"=","output_signal":{"type":"virtual","name":"signal-grey"},"copy_count_from_input":true}},"connections":{"1":{"red":[{"entity_id":7}],"green":[{"entity_id":5,"circuit_id":1},{"entity_id":1,"circuit_id":1}]},"2":{"red":[{"entity_id":5,"circuit_id":2},{"entity_id":1,"circuit_id":2}]}}},
	{"entity_number":9,"name":"constant-combinator","position":{"x":1,"y":-2},"direction":4,"control_behavior":{"filters":[{"signal":{"type":"virtual","name":"signal-R"},"count":0,"index":1},{"signal":{"type":"virtual","name":"signal-E"},"count":0,"index":2},{"signal":{"type":"virtual","name":"signal-S"},"count":0,"index":3},{"signal":{"type":"virtual","name":"signal-E"},"count":0,"index":4},{"signal":{"type":"virtual","name":"signal-T"},"count":0,"index":5},{"signal":{"type":"virtual","name":"signal-red"},"count":1,"index":18}],"is_on":false},"connections":{"1":{"green":[{"entity_id":20,"circuit_id":2}]}}},
	{"entity_number":10,"name":"constant-combinator","position":{"x":2,"y":-2},"control_behavior":{"filters":[{"signal":{"type":"virtual","name":"signal-P"},"count":0,"index":1},{"signal":{"type":"virtual","name":"signal-L"},"count":0,"index":2},{"signal":{"type":"virtual","name":"signal-A"},"count":0,"index":3},{"signal":{"type":"virtual","name":"signal-Y"},"count":0,"index":4},{"signal":{"type":"virtual","name":"signal-cyan"},"count":6000,"index":13},{"signal":{"type":"virtual","name":"signal-green"},"count":1,"index":18}],"is_on":false},"connections":{"1":{"green":[{"entity_id":20,"circuit_id":1}]}}},
	{"entity_number":11,"name":"decider-combinator","position":{"x":-2.5,"y":0},"direction":2,"control_behavior":{"decider_conditions":{"first_signal":{"type":"virtual","name":"signal-green"},"second_signal":{"type":"virtual","name":"signal-3"},"comparator":"=","output_signal":{"type":"virtual","name":"signal-grey"},"copy_count_from_input":true}},"connections":{"1":{"red":[{"entity_id":14}],"green":[{"entity_id":13,"circuit_id":1},{"entity_id":17,"circuit_id":1}]},"2":{"red":[{"entity_id":13,"circuit_id":2},{"entity_id":17,"circuit_id":2}]}}},
	{"entity_number":12,"name":"constant-combinator","position":{"x":-4,"y":-1},"direction":2,"control_behavior":{"filters":[{"signal":{"type":"virtual","name":"signal-grey"},"count":13,"index":1}]},"connections":{"1":{"red":[{"entity_id":13,"circuit_id":1}]}}},
	{"entity_number":13,"name":"decider-combinator","position":{"x":-2.5,"y":-1},"direction":2,"control_behavior":{"decider_conditions":{"first_signal":{"type":"virtual","name":"signal-green"},"second_signal":{"type":"virtual","name":"signal-2"},"comparator":"=","output_signal":{"type":"virtual","name":"signal-grey"},"copy_count_from_input":true}},"connections":{"1":{"red":[{"entity_id":12}],"green":[{"entity_id":5,"circuit_id":1},{"entity_id":11,"circuit_id":1}]},"2":{"red":[{"entity_id":5,"circuit_id":2},{"entity_id":11,"circuit_id":2},{"entity_id":15,"circuit_id":1}]}}},
	{"entity_number":14,"name":"constant-combinator","position":{"x":-4,"y":0},"direction":2,"control_behavior":{"filters":[{"signal":{"type":"virtual","name":"signal-grey"},"count":19,"index":1}]},"connections":{"1":{"red":[{"entity_id":11,"circuit_id":1}]}}},
	{"entity_number":15,"name":"arithmetic-combinator","position":{"x":-0.5,"y":-1},"direction":2,"control_behavior":{"arithmetic_conditions":{"first_signal":{"type":"virtual","name":"signal-4"},"second_signal":{"type":"virtual","name":"signal-green"},"operation":"-","output_signal":{"type":"virtual","name":"signal-yellow"}}},"connections":{"1":{"red":[{"entity_id":13,"circuit_id":2}]},"2":{"green":[{"entity_id":16,"circuit_id":1}]}}},
	{"entity_number":16,"name":"decider-combinator","position":{"x":-0.5,"y":0},"direction":6,"control_behavior":{"decider_conditions":{"first_signal":{"type":"virtual","name":"signal-yellow"},"constant":3,"comparator":"=","output_signal":{"type":"virtual","name":"signal-white"},"copy_count_from_input":false}},"connections":{"1":{"green":[{"entity_id":15,"circuit_id":2}]},"2":{"red":[{"entity_id":19,"circuit_id":2}]}}},
	{"entity_number":17,"name":"decider-combinator","position":{"x":-2.5,"y":1},"direction":2,"control_behavior":{"decider_conditions":{"first_signal":{"type":"virtual","name":"signal-green"},"second_signal":{"type":"virtual","name":"signal-4"},"comparator":"=","output_signal":{"type":"virtual","name":"signal-grey"},"copy_count_from_input":true}},"connections":{"1":{"red":[{"entity_id":18}],"green":[{"entity_id":11,"circuit_id":1}]},"2":{"red":[{"entity_id":11,"circuit_id":2}]}}},
	{"entity_number":18,"name":"constant-combinator","position":{"x":-4,"y":1},"direction":2,"control_behavior":{"filters":[{"signal":{"type":"virtual","name":"signal-grey"},"count":25,"index":1}]},"connections":{"1":{"red":[{"entity_id":17,"circuit_id":1}]}}},
	{"entity_number":19,"name":"decider-combinator","position":{"x":-0.5,"y":1},"direction":6,"control_behavior":{"decider_conditions":{"first_signal":{"type":"virtual","name":"signal-red"},"constant":0,"comparator":"=","output_signal":{"type":"virtual","name":"signal-everything"},"copy_count_from_input":true}},"connections":{"1":{"red":[{"entity_id":19,"circuit_id":2},{"entity_id":20,"circuit_id":1}],"green":[{"entity_id":20,"circuit_id":2}]},"2":{"red":[{"entity_id":19,"circuit_id":1},{"entity_id":16,"circuit_id":2}]}}},
	{"entity_number":20,"name":"decider-combinator","position":{"x":1.5,"y":1},"direction":6,"control_behavior":{"decider_conditions":{"first_signal":{"type":"virtual","name":"signal-green"},"second_signal":{"type":"virtual","name":"signal-cyan"},"comparator":"≤","output_signal":{"type":"virtual","name":"signal-green"},"copy_count_from_input":false}},"connections":{"1":{"red":[{"entity_id":19,"circuit_id":1}],"green":[{"entity_id":10}]},"2":{"green":[{"entity_id":9},{"entity_id":19,"circuit_id":1}]}}}
];
