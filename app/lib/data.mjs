// Factorio instruments

export function FactorioInstrument(
  name,
  id,
  base,
  range_octaves,
  default_volume,
) {
  this.name = name
  this.id = id
  this.base = base
  this.range = range_octaves * 12

  if (default_volume !== undefined) this.default_volume = default_volume
  else this.default_volume = 1
}

FactorioInstrument.prototype.convert = function (note) {
  return note - this.base
}

FactorioInstrument.prototype.checkRange = function (note, getDirection) {
  const pitch = note.convert()

  if (getDirection === false || getDirection === undefined)
    return pitch > 0 && pitch <= this.range

  if (pitch <= 0) return { direction: 'below', delta: -pitch + 1 }
  if (pitch > this.range)
    return { direction: 'above', delta: pitch - this.range }
  return true
}

export const factorio_instrument = {
  Piano: new FactorioInstrument('Piano', 3, 40, 4),
  Bass: new FactorioInstrument('Bass', 4, 28, 3),
  Lead: new FactorioInstrument('Lead', 5, 28, 3),
  Saw: new FactorioInstrument('Saw', 6, 28, 3, 0.8),
  Square: new FactorioInstrument('Square', 7, 28, 3, 0.5),
  Celesta: new FactorioInstrument('Celesta', 8, 64, 3),
  Vibraphone: new FactorioInstrument('Vibraphone', 9, 52, 3),
  Plucked: new FactorioInstrument('Plucked', 10, 52, 3),
  SteelDrum: new FactorioInstrument('SteelDrum', 11, 40, 3),
  ReverseCymbal: new FactorioInstrument('ReverseCymbal', 2),
  DrumKit: new FactorioInstrument('DrumKit', 2),
  Exclude: new FactorioInstrument('Exclude', -1),
}

factorio_instrument['ReverseCymbal'].convert = function (_note) {
  return 13
}
factorio_instrument['ReverseCymbal'].checkRange = function (
  _note,
  _getDirection,
) {
  return true
}

factorio_instrument['DrumKit'].convert = function (note) {
  if (drumkit_map[note] === undefined) {
    // console.log('GM DrumKit ' + note + ' not found.')
    return 0
  } else {
    return drumkit_map[note]
  }
}
factorio_instrument['DrumKit'].checkRange = function (_note, _getDirection) {
  return true
}

factorio_instrument['Exclude'].convert = function (_note) {
  return 0
}
factorio_instrument['Exclude'].checkRange = function (_note, _getDirection) {
  return true
}

export function getFactorioInstrument(programCode) {
  programCode++
  let factorioInstrumentName = 'Exclude'

  if (programCode === 0) {
    // Drumkit
    factorioInstrumentName = 'DrumKit'
  } else if (programCode <= 8) {
    // Piano
    factorioInstrumentName = 'Piano'
  } else if (programCode <= 16) {
    // Chromatic Percussion
    if (programCode === 9) factorioInstrumentName = 'Celesta'
    else factorioInstrumentName = 'Vibraphone'
  } else if (programCode <= 24) {
    // Organ
    factorioInstrumentName = 'Square'
  } else if (programCode <= 32) {
    // Guitar
    factorioInstrumentName = 'Saw'
  } else if (programCode <= 40) {
    // Bass
    factorioInstrumentName = 'Bass'
  } else if (programCode <= 48) {
    // Strings
    factorioInstrumentName = 'Lead'
  } else if (programCode <= 56) {
    // Ensemble
    factorioInstrumentName = 'Lead'
  } else if (programCode <= 64) {
    // Brass
    factorioInstrumentName = 'Piano'
  } else if (programCode <= 72) {
    // Reed
    factorioInstrumentName = 'Piano'
  } else if (programCode <= 80) {
    // Pipe
    factorioInstrumentName = 'Piano'
  } else if (programCode <= 88) {
    // Synth Lead
    if (programCode === 81) factorioInstrumentName = 'Square'
    else if (programCode === 82) factorioInstrumentName = 'Saw'
    else factorioInstrumentName = 'Lead'
  } else if (programCode <= 96) {
    // Synth Pad
    factorioInstrumentName = 'Vibraphone'
  } else if (programCode <= 104) {
    // Synth Effects
    factorioInstrumentName = 'Saw'
  } else if (programCode <= 112) {
    // Ethnic
    factorioInstrumentName = 'Piano'
  } else if (programCode <= 120) {
    // Percussive
    if (programCode === 120) factorioInstrumentName = 'ReverseCymbal'
    else factorioInstrumentName = 'SteelDrum'
  } else if (programCode <= 128) {
    // Sound Effects
    factorioInstrumentName = 'Exclude'
  }

  return factorio_instrument[factorioInstrumentName]
}

const drumkit_map = {
  27: 9, // High Q -> high q
  35: 2, // Acoustic Bass Drum -> kick 2
  36: 1, // Bass Drum 1 -> kick 1
  37: 10, // Side Stick -> perc 1
  38: 5, // Accoustic Snare -> snare 2
  39: 14, // Hand Clap -> clap
  40: 4, // Electric Snare -> snare 1
  41: 4, // Low Floor Tom -> snare 1
  42: 6, // Closed Hi Hat -> hat 1
  43: 4, // High Floor Tom -> snare 1
  44: 7, // Pedal Hi Hat -> hat 2
  45: 4, // Low Tom -> snare 1
  46: 7, // Open Hi Hat -> hat 2
  47: 4, // Low-Mid Tom -> snare 1
  48: 4, // Hi-Mid Tom -> snare 1
  49: 12, // Crash Cymbal 1 -> crash
  50: 4, // High Tom -> snare 1
  51: 6, // Ride Cymbal -> hat 1
  52: 12, // Chinese Cymbal -> crash
  53: 16, // Ride Bell -> cowbell
  54: 15, // Tambourine -> shaker
  55: 12, // Splash Cymbal -> crash
  56: 16, // Cowbell -> cowbell
  57: 12, // Crash Cymbal 2 -> crash
  59: 6, // Ride Cymbal 2 -> hat 1
  69: 15, // Cabasa -> shaker
  75: 10, // Claves -> perc 2
  76: 10, // Hi Wood Block -> perc 2
  77: 10, // Low Wood Block -> perc 2
  81: 17, // Open Triangle -> triangle
}

// GM instrument names
const midi_instrument = [
  'Acoustic Grand Piano',
  'Bright Acoustic Piano',
  'Electric Grand Piano',
  'Honky-tonk Piano',
  'Electric Piano 1',
  'Electric Piano 2',
  'Harpsichord',
  'Clavi',
  'Celesta',
  'Glockenspiel',
  'Music Box',
  'Vibraphone',
  'Marimba',
  'Xylophone',
  'Tubular Bells',
  'Dulcimer',
  'Drawbar Organ',
  'Percussive Organ',
  'Rock Organ',
  'Church Organ',
  'Reed Organ',
  'Accordion',
  'Harmonica',
  'Tango Accordion',
  'Acoustic Guitar (nylon)',
  'Acoustic Guitar (steel)',
  'Electric Guitar (jazz)',
  'Electric Guitar (clean)',
  'Electric Guitar (muted)',
  'Overdriven Guitar',
  'Distortion Guitar',
  'Guitar harmonics',
  'Acoustic Bass',
  'Electric Bass (finger)',
  'Electric Bass (pick)',
  'Fretless Bass',
  'Slap Bass 1',
  'Slap Bass 2',
  'Synth Bass 1',
  'Synth Bass 2',
  'Violin',
  'Viola',
  'Cello',
  'Contrabass',
  'Tremolo Strings',
  'Pizzicato Strings',
  'Orchestral Harp',
  'Timpani',
  'String Ensemble 1',
  'String Ensemble 2',
  'SynthStrings 1',
  'SynthStrings 2',
  'Choir Aahs',
  'Voice Oohs',
  'Synth Voice',
  'Orchestra Hit',
  'Trumpet',
  'Trombone',
  'Tuba',
  'Muted Trumpet',
  'French Horn',
  'Brass Section',
  'SynthBrass 1',
  'SynthBrass 2',
  'Soprano Sax',
  'Alto Sax',
  'Tenor Sax',
  'Baritone Sax',
  'Oboe',
  'English Horn',
  'Bassoon',
  'Clarinet',
  'Piccolo',
  'Flute',
  'Recorder',
  'Pan Flute',
  'Blown Bottle',
  'Shakuhachi',
  'Whistle',
  'Ocarina',
  'Lead 1 (square)',
  'Lead 2 (sawtooth)',
  'Lead 3 (calliope)',
  'Lead 4 (chiff)',
  'Lead 5 (charang)',
  'Lead 6 (voice)',
  'Lead 7 (fifths)',
  'Lead 8 (bass + lead)',
  'Pad 1 (new age)',
  'Pad 2 (warm)',
  'Pad 3 (polysynth)',
  'Pad 4 (choir)',
  'Pad 5 (bowed)',
  'Pad 6 (metallic)',
  'Pad 7 (halo)',
  'Pad 8 (sweep)',
  'FX 1 (rain)',
  'FX 2 (soundtrack)',
  'FX 3 (crystal)',
  'FX 4 (atmosphere)',
  'FX 5 (brightness)',
  'FX 6 (goblins)',
  'FX 7 (echoes)',
  'FX 8 (sci-fi)',
  'Sitar',
  'Banjo',
  'Shamisen',
  'Koto',
  'Kalimba',
  'Bag pipe',
  'Fiddle',
  'Shanai',
  'Tinkle Bell',
  'Agogo',
  'Steel Drums',
  'Woodblock',
  'Taiko Drum',
  'Melodic Tom',
  'Synth Drum',
  'Reverse Cymbal',
  'Guitar Fret Noise',
  'Breath Noise',
  'Seashore',
  'Bird Tweet',
  'Telephone Ring',
  'Helicopter',
  'Applause',
  'Gunshot',
]
midi_instrument[-1] = 'Drum Kit'

// GM percussion names
const _midi_percussion = {
  35: 'Acoustic Bass Drum',
  36: 'Bass Drum 1',
  37: 'Side Stick',
  38: 'Acoustic Snare',
  39: 'Hand Clap',
  40: 'Electric Snare',
  41: 'Low Floor Tom',
  42: 'Closed Hi Hat',
  43: 'High Floor Tom',
  44: 'Pedal Hi-Hat',
  45: 'Low Tom',
  46: 'Open Hi-Hat',
  47: 'Low-Mid Tom',
  48: 'Hi-Mid Tom',
  49: 'Crash Cymbal 1',
  50: 'High Tom',
  51: 'Ride Cymbal 1',
  52: 'Chinese Cymbal',
  53: 'Ride Bell',
  54: 'Tambourine',
  55: 'Splash Cymbal',
  56: 'Cowbell',
  57: 'Crash Cymbal 2',
  58: 'Vibraslap',
  59: 'Ride Cymbal 2',
  60: 'Hi Bongo',
  61: 'Low Bongo',
  62: 'Mute Hi Conga',
  63: 'Open Hi Conga',
  64: 'Low Conga',
  65: 'High Timbale',
  66: 'Low Timbale',
  67: 'High Agogo',
  68: 'Low Agogo',
  69: 'Cabasa',
  70: 'Maracas',
  71: 'Short Whistle',
  72: 'Long Whistle',
  73: 'Short Guiro',
  74: 'Long Guiro',
  75: 'Claves',
  76: 'Hi Wood Block',
  77: 'Low Wood Block',
  78: 'Mute Cuica',
  79: 'Open Cuica',
  80: 'Mute Triangle',
  81: 'Open Triangle',
}
