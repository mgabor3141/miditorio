// Factorio instruments

function FactorioInstrument(base, range_octaves) {
	this.base = base;
	this.range = range_octaves*12;

	this.convert = function(note) {
		return note - this.base;
	}

	this.checkRange = function(note) {
		note = this.convert(note);
		return (note > 0 && note <= this.range);
	}
}

var factorio_instrument = {
	"Piano":			new FactorioInstrument(40, 4),
	"Bass":				new FactorioInstrument(28, 3),
	"Lead":				new FactorioInstrument(28, 3),
	"Saw":				new FactorioInstrument(28, 3),
	"Square":			new FactorioInstrument(28, 3),
	"Celesta":			new FactorioInstrument(64, 3),
	"Vibraphone":		new FactorioInstrument(52, 3),
	"Plucked":			new FactorioInstrument(52, 3),
	"SteelDrum":		new FactorioInstrument(40, 3),
	"ReverseCymbal":	new FactorioInstrument(),
	"DrumKit":			new FactorioInstrument(),
	"Exclude":			new FactorioInstrument()
};

factorio_instrument["ReverseCymbal"].convert = 13;
factorio_instrument["ReverseCymbal"].checkRange = true;

factorio_instrument["DrumKit"].convert = function(note) {
	return drumkit_map[note] === undefined ? 0 : drumkit_map[note];
}
factorio_instrument["DrumKit"].checkRange = true;

factorio_instrument["Exclude"].convert = 0;
factorio_instrument["Exclude"].checkRange = true;

function getFactorioInstrument(programcode) {
	programcode++;
	factorioInstrumentName = "Exclude";

	if (programcode <= 8) {					// Piano
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