from __future__ import print_function
import midi
import sys
import math
import os

### This is the original MIDItorio python script, included here for future reference

### Factorio Instruments

def instrumentRange(diff, note):
	return note > 0 and note < diff * 12 + 1

class DrumKit:
	# Custom
	def convert(self, note):
		# See https://www.midi.org/specifications/item/gm-level-1-sound-set
		try:
			return {
				27: 9,	# High Q -> high q
				35: 2,	# Acoustic Bass Drum -> kick 2
				36: 1,	# Bass Drum 1 -> kick 1
				37: 10,	# Side Stick -> perc 1
				38: 5,	# Accoustic Snare -> snare 2
				39: 14, # Hand Clap -> clap
				40: 4,	# Electric Snare -> snare 1
				41: 4,	# Low Floor Tom -> snare 1
				42: 6,	# Closed Hi Hat -> hat 1
				43: 4,	# High Floor Tom -> snare 1
				44: 7,	# Pedal Hi Hat -> hat 2
				45: 4,	# Low Tom -> snare 1
				46: 7,	# Open Hi Hat -> hat 2
				47: 4,	# Low-Mid Tom -> snare 1
				48: 4,	# Hi-Mid Tom -> snare 1
				49: 12,	# Crash Cymbal 1 -> crash
				50: 4,	# High Tom -> snare 1
				51: 6,	# Ride Cymbal -> hat 1
				52: 12,	# Chinese Cymbal -> crash
				53: 16,	# Ride Bell -> cowbell
				54: 15,	# Tambourine -> shaker
				55: 12,	# Splash Cymbal -> crash
				56: 16, # Cowbell -> cowbell
				57: 12,	# Crash Cymbal 2 -> crash
				59: 6,	# Ride Cymbal 2 -> hat 1
				69: 15,	# Cabasa -> shaker
				75: 10,	# Claves -> perc 2
				76: 10,	# Hi Wood Block -> perc 2
				77: 10,	# Low Wood Block -> perc 2
				81: 17	# Open Triangle -> triangle
			}[note];
		except KeyError as e:
			print("General MIDI drum kit instrument {} not found and was excluded".format(e))
			return 0
	def checkdiff(self, converted_note):
		return 1
	def __str__(self):
		return "DrumKit"
class Piano:
	# Base: F3
	# Top: E7
	diff = 4
	def convert(self, note):
		return note-40;
	def checkdiff(self, converted_note):
		return instrumentRange(self.diff, converted_note)
	def __str__(self):
		return "Piano"
class Bass:
	# Base: F2
	# Top: E5
	diff = 3
	def convert(self, note):
		return note-28;
	def checkdiff(self, converted_note):
		return instrumentRange(self.diff, converted_note)
	def __str__(self):
		return "Bass"
class Lead:
	# Base: F2
	# Top: E5
	diff = 3
	def convert(self, note):
		return note-28;
	def checkdiff(self, converted_note):
		return instrumentRange(self.diff, converted_note)
	def __str__(self):
		return "Lead"
class Saw:
	# Base: F2
	# Top: E5
	diff = 3
	def convert(self, note):
		return note-28;
	def checkdiff(self, converted_note):
		return instrumentRange(self.diff, converted_note)
	def __str__(self):
		return "Saw"
class Square:
	# Base: F2
	# Top: E5
	diff = 3
	def convert(self, note):
		return note-28;
	def checkdiff(self, converted_note):
		return instrumentRange(self.diff, converted_note)
	def __str__(self):
		return "Square"
class Celesta:
	# Base: F5
	# Top: E8
	diff = 3
	def convert(self, note):
		return note-64;
	def checkdiff(self, converted_note):
		return instrumentRange(self.diff, converted_note)
	def __str__(self):
		return "Celesta"
class Vibraphone:
	# Base: F5
	# Top: E8
	diff = 3
	def convert(self, note):
		return note-64;
	def checkdiff(self, converted_note):
		return instrumentRange(self.diff, converted_note)
	def __str__(self):
		return "Vibraphone"
class Plucked:
	# Base: F4
	# Top: E7
	diff = 3
	def convert(self, note):
		return note-52;
	def checkdiff(self, converted_note):
		return instrumentRange(self.diff, converted_note)
	def __str__(self):
		return "Plucked"
class SteelDrum:
	# Base: F3
	# Top: E6
	diff = 3
	def convert(self, note):
		return note-40;
	def checkdiff(self, converted_note):
		return instrumentRange(self.diff, converted_note)
	def __str__(self):
		return "SteelDrum"
class ReverseCymbal:
	# Single note within drum kit
	def convert(self, note):
		return 13
	def checkdiff(self, converted_note):
		return 1
	def __str__(self):
		return "DrumKit/Reverse Cymbal"
class Exclude:
	# Silent instrument
	def convert(self, note):
		return 0;
	def checkdiff(self, converted_note):
		return 1
	def __str__(self):
		return "Exclude"

### Functions

def map_instrument(programcode):
	programcode += 1
	if programcode <= 8:	# Piano
		return Piano()
	if programcode <= 16:	# Chromatic Percussion
		if programcode == 9:
			return Celesta()
		return Vibraphone()
	if programcode <= 24:	# Organ
		return Square()
	if programcode <= 32:	# Guitar
		return Saw()
	if programcode <= 40:	# Bass
		return Bass()
	if programcode <= 48:	# Strings
		return Lead()
	if programcode <= 56:	# Ensemble
		return Lead()
	if programcode <= 64:	# Brass
		return Piano()
	if programcode <= 72:	# Reed
		return Piano()
	if programcode <= 80:	# Pipe
		return Piano()
	if programcode <= 88:	# Synth Lead
		if programcode == 81:
			return Square()
		if programcode == 82:
			return Saw()
		return Lead()
	if programcode <= 96:	# Synth Pad
		return Vibraphone()
	if programcode <= 104:	# Synth Effects
		return Saw()
	if programcode <= 112:	# Ethnic
		return Piano()
	if programcode <= 120:	# Percussive
		if programcode == 120:
			return ReverseCymbal()
		return SteelDrum()
	if programcode <= 128:	# Sound Effects
		return Exclude()


midi_instrument = ["Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano", "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavi", "Celesta", "Glockenspiel", "Music Box", "Vibraphone", "Marimba", "Xylophone", "Tubular Bells", "Dulcimer", "Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ", "Reed Organ", "Accordion", "Harmonica", "Tango Accordion", "Acoustic Guitar (nylon)", "Acoustic Guitar (steel)", "Electric Guitar (jazz)", "Electric Guitar (clean)", "Electric Guitar (muted)", "Overdriven Guitar", "Distortion Guitar", "Guitar harmonics", "Acoustic Bass", "Electric Bass (finger)", "Electric Bass (pick)", "Fretless Bass", "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2", "Violin", "Viola", "Cello", "Contrabass", "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani", "String Ensemble 1", "String Ensemble 2", "SynthStrings 1", "SynthStrings 2", "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit", "Trumpet", "Trombone", "Tuba", "Muted Trumpet", "French Horn", "Brass Section", "SynthBrass 1", "SynthBrass 2", "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax", "Oboe", "English Horn", "Bassoon", "Clarinet", "Piccolo", "Flute", "Recorder", "Pan Flute", "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina", "Lead 1 (square)", "Lead 2 (sawtooth)", "Lead 3 (calliope)", "Lead 4 (chiff)", "Lead 5 (charang)", "Lead 6 (voice)", "Lead 7 (fifths)", "Lead 8 (bass + lead)", "Pad 1 (new age)", "Pad 2 (warm)", "Pad 3 (polysynth)", "Pad 4 (choir)", "Pad 5 (bowed)", "Pad 6 (metallic)", "Pad 7 (halo)", "Pad 8 (sweep)", "FX 1 (rain)", "FX 2 (soundtrack)", "FX 3 (crystal)", "FX 4 (atmosphere)", "FX 5 (brightness)", "FX 6 (goblins)", "FX 7 (echoes)", "FX 8 (sci-fi)", "Sitar", "Banjo", "Shamisen", "Koto", "Kalimba", "Bag pipe", "Fiddle", "Shanai", "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock", "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal", "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet", "Telephone Ring", "Helicopter", "Applause", "Gunshot"]

def parse_track(track, tracknum):
	notes = []
	i = 0

	not_empty = 0
	instrument = None
	instrumentcode = -1
	shift = 0

	###  MANUAL SETTINGS

	if tracknum == 2:
		instrument = Lead()

	if tracknum == 2 or tracknum == 4 or tracknum == 6 or tracknum == 8:
		shift = -2

	if tracknum == 5:
		instrument = Piano()
		shift = 1


	### /MANUAL SETTINGS

	if instrument is not None:
		print("Instrument manually set to {}".format(instrument))

	for event in track:
		if type(event) is midi.TrackNameEvent:
			print(event.text)

		if type(event) is midi.TextMetaEvent:
			print("Embedded text: " + event.text)

		if type(event) is midi.ProgramChangeEvent:
			if instrument is None and event.channel != 9:
				instrument = map_instrument(event.value)
				print("Program at {}: [{}] {} -> {}".format(event.tick, event.value, midi_instrument[event.value], map_instrument(event.value)))
				instrumentcode = event.value
			else:
				if event.value != instrumentcode:
					print("No-op program change at {}: [{}] {} -> {}".format(event.tick, event.value, midi_instrument[event.value], map_instrument(event.value)))

		if type(event) is midi.SetTempoEvent:
			print("Tempo at {}:\t{} BPM ({} PPQN)".format(event.tick, round(event.bpm), event.mpqn))
			tempotrack.append([event.tick, event.mpqn])
			not_empty = 1

		if type(event) is midi.NoteOnEvent:
			if instrument is None and event.channel == 9:
				print("Instrument: DrumKit")
				instrument = DrumKit()
			notes.append([event.tick, event.pitch+shift*12])

	if type(instrument) is Exclude:
		notes = []

	if notes == []:
		if not_empty == 0:
			print("No notes on track")
		return

	notes = convert_to_factorio(notes, instrument)

	print("Converted to {} channels".format(len(notes)))
	print('\tNotes:\t', end='')
	for subtrack in notes:
		print("{}\t".format(len(subtrack)), end='')

	return notes

def convert_to_factorio(notes, instrument):
	if instrument is None:
		print("Instrument not found, using Piano")
		instrument = Piano()

	magic = [[]]
	last_tick = [-10]

	track = 0

	for note in notes:
		if midi2factorio_tick(note[0]) - 1 == midi2factorio_tick(last_tick[0]) or \
		midi2factorio_tick(note[0]) - 2 == midi2factorio_tick(last_tick[0]) or \
		midi2factorio_tick(note[0]) - 3 == midi2factorio_tick(last_tick[0]):
			continue
		while note[0] == last_tick[track]:
			track += 1
			if track == len(magic):
				magic.append([])
				last_tick.append(0)
				break

		magic[track].append([midi2factorio_tick(note[0]), instrument.convert(note[1])])

		if not instrument.checkdiff(instrument.convert(note[1])):
			print("Note {}: {} out of range of {}".format(midi2factorio_tick(note[0]), instrument.convert(note[1]), instrument))

		last_tick[track] = note[0]
		track = 0

	return magic

def convert_to_bass(notes):
	for note in notes:
		note[1] += 12

	return notes

# Can't output C, D, E, L, M, T signals as they are reserved for timer.
# 'I' can be added back at the cost of some slavelabor
signals = [None, "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", \
"A", "B", "F", "G", "H", "J", "K", "N", "O", "P", \
"Q", "R", "S", "U", "V", "W", "X", "Y", "Z", "red", \
"green", "blue", "pink", "cyan", "white", "grey", "black"]
def print_master(master):
	str = ""

	if len(master[0]) >= len(signals):
		print("\nI don't have that many signals.")
		return ""

	notenum = 0
	str += "M={},".format(master[len(master)-1][0])
	for note in master:
		str += "I={},D={},".format(notenum, note[0])
		notenum += 1

		for track in range(1, len(note)):
			if note[track] != 0:
				str += "{}={},".format(signals[track], note[track])

		str += ';'

	return str


def merge(tracks):
	master = []

	tick = 0
	track_ids = []
	for track in tracks:
		track_ids.append(0)

	maxtick = 0
	for track in tracks:
		if track[len(track)-1][0] > maxtick:
			maxtick = track[len(track)-1][0]

	for tick in range(0, maxtick + 1):
		accord = [] # store notes that are on this tick
		for i in range(0, len(tracks)):	# check every track
			if track_ids[i] < len(tracks[i]) and tracks[i][track_ids[i]][0] == tick:
				accord.append(tracks[i][track_ids[i]][1])
				track_ids[i] += 1
			else:
				accord.append(0)

		if sum(accord) != 0:
			if len(master) == 0 or (tick-1 != master[len(master)-1][0] and tick-2 != master[len(master)-1][0] and tick-3 != master[len(master)-1][0]):
				accord = [tick] + accord
				master.append(accord)
			else:
				accord = [0] + accord
				for i in range(0, len(master[len(master)-1])):
					if master[len(master)-1][i] == 0:
						master[len(master)-1][i] = accord[i]
				print("Would have killed overcrowded note at {}".format(tick))

		tick += 1

	for i in range(0, len(master) - 1):
		master[i][0] = master[i+1][0]

	return master

factorio_ticktime = 1000000.0 / 60.0

def midi2factorio_tick(midi_tick):
	factorio_tick = 0
	index = -1
	for i in range(1, len(tempotrack)):
		if midi_tick < tempotrack[i][0]:
			index = i-1
			break

		factorio_tick += (tempotrack[i][0] - tempotrack[i-1][0]) * float(tempotrack[i-1][1]) / pattern.resolution / factorio_ticktime

	return int(round(factorio_tick + (midi_tick - tempotrack[index][0]) * float(tempotrack[index][1]) / pattern.resolution / factorio_ticktime))

### MAIN

pattern = midi.read_midifile(sys.argv[1])
output_midi = open(os.path.splitext(sys.argv[1])[0]+"-midi.txt", 'w')
output_midi.write(str(pattern))
pattern.make_ticks_abs()

if pattern.format == 0:
	print("\nThis MIDI is in format 0. Please convert it to format 1 because I'm too lazy to deal with both.")
	sys.exit()

print("MIDI Format: {}; Resolution: {}\n".format(pattern.format, pattern.resolution))

tempotrack = []
tracks = []

tracknum = 1
for track in pattern:
	print("Track %r:" % tracknum)
	t = parse_track(track, tracknum)

	if t is not None:
		tracks += t

	tracknum += 1
	print('')

master = merge(tracks)

notecount = 0
for track in tracks:
	notecount += len(track)

output_factorio = open(os.path.splitext(sys.argv[1])[0]+"-factorio.txt", 'w')
output_factorio.write(print_master(master))

print("Master: {} cells, {} notes, {} signals".format(len(master), notecount, len(tracks)))