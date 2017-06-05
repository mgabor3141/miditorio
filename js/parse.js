MIDIEvents = MIDIFile.Events;
UTF8 = MIDIFile.UTF8;

if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
	showError("The File APIs are not fully supported in this browser. Please try a different browser.");
}

function handleFileSelect(event) {
	var files;
	if (event.target.files !== undefined) {
		files = event.target.files;
	} else {
		files =	event.originalEvent.dataTransfer.files;
	}

	try {
		if (files.length == 0)
			return;

		f = files[0];

		if (f.type != "audio/mid" && f.type != "audio/midi")
			throw new Error("This file isn't recognized as a MIDI file! "+
				"(It's type seems to be " + f.type + ")");

		song = new Song();
		song.name = f.name.charAt(0).toUpperCase() + f.name.substring(1, f.name.lastIndexOf("."));
		song.name = song.name.replace(new RegExp("_", 'g'), " ");
		console.log("Reading MIDI file: " + f.name);

		var reader = new FileReader();
		reader.onload = function(e) {
			try {
				processMidi(reader.result);
			} catch (e) {
				console.log(e);
				e = "There seems to be something wrong with this file. "+
				"Please try a different file. (" + e + ")";
				showError(e);
			}
		}

		reader.readAsArrayBuffer(f);
		return true;
	} catch (e) {
		showError(e);
		return false;
	}
}

var song;
function processMidi(midi) {
	var midiFile = new MIDIFile(midi);

	song = sortMidi(midiFile.getEvents());

	console.log(song);
}

function Instrument(time, instrument) {
	this.time = time;
	this.instrument = instrument;
	this.shift = 0;

	this.notes = [];

	this.factorioInstrument = getFactorioInstrument(instrument);
}

Instrument.prototype.addNote = function(id) {
	this.notes.push(id);
}

Instrument.prototype.setShift = function(shift) {
	this.shift = shift;

	updateTrackInfos();
}

function Track(trackNum) {
	this.name = "Track " + trackNum;
	this.notes = [];
	this.text = [];
	this.shift = 0;
}

Track.prototype.addNote = function(id) {
	this.notes.push(id);
}

Track.prototype.addText = function(time, text) {
	this.text.push({"time": time, "text": text});
}

Track.prototype.setName = function(name) {
	this.name = name;
}

Track.prototype.getRangeData = function() {
	var data = {"above": 0, "below": 0, "max": {"above": 0, "below": 0}};

	for (var note_i in this.notes) {
		var note = song.notes[this.notes[note_i]];

		var range = note.instrument.factorioInstrument.checkRange(note, true);
		if (range != true) {
			data[range.direction]++;
			if (range.delta > data.max[range.direction])
				data.max[range.direction] = range.delta;
		}
	}

	return data;
}

Track.prototype.setShift = function(shift) {
	this.shift = shift;

	updateTrackInfos();
}

function Note(time, channel, track, pitch, velocity, instrument) {
	this.time = time;
	this.channel = channel;
	this.track = track;
	this.pitch = pitch;
	this.velocity = velocity;
	this.instrument = instrument;
}

Note.prototype.convert = function() {
	pitch = this.instrument.factorioInstrument.convert(this.pitch);

	pitch += this.instrument.shift;

	pitch += this.track.shift;

	pitch += song.globalshift;

	return pitch;
};

/*
	Ok this is kinda tricky.
	Note data is stored in Song.notes
	Tracks and Instruments store the index of their respective notes within Song.notes
	Instruments are grouped into arrays by the channel they're on 
*/
function Song() {
	this.name = "";
	this.time = 0;
	this.globalshift = 0;
	this.notes = [];
	this.tracks = [];
	this.instruments = [];
	this.instruments[9] = [new Instrument(0, -1)]; // Drum Track
}

Song.prototype.addNote = function(time, channel, track, pitch, velocity) {
	if (this.tracks[track] === undefined)
		this.tracks[track] = new Track(this.tracks.length + 1);

	this.tracks[track].addNote(this.notes.length);

	if (this.getInstrument(time, channel) === undefined)
		this.addInstrumentChange(time, channel, 0);

	var instrument = this.getInstrument(time, channel);
	instrument.addNote(this.notes.length);

	this.notes.push(new Note(time, channel, this.tracks[track], pitch, velocity, instrument));

	if (time > this.time) this.time = time;
}

Song.prototype.getTrack = function(track) {
	if (this.tracks[track] === undefined)
		this.tracks[track] = new Track();

	return this.tracks[track];
}

Song.prototype.getInstrument = function(time, channel) {
	if (channel == 9)
		return this.instruments[9][0];

	var maximumInstrumentTime = -1;
	var maximumInstrument;

	for (i in this.instruments[channel]) {
		var instrument = this.instruments[channel][i];
		if (instrument.time <= time && instrument.time > maximumInstrumentTime) {
			maximumInstrument = instrument;
			maximumInstrumentTime = instrument.time;
		}
	}

	return maximumInstrument;
}

Song.prototype.addInstrumentChange = function (time, channel, instrument) {
	if (this.instruments[channel] === undefined) {
		this.instruments[channel] = [];
		this.instruments[channel].push(new Instrument(time, instrument)); // add new
	} else {
		var existing = this.instruments[channel].find(
			function(value, index) {
				return (value.time == time);
			}
		);

		if (existing !== undefined)
			existing.instrument = instrument;
		else
			this.instruments[channel].push(new Instrument(time, instrument)); // add new
	}
}

Song.prototype.toFactorio = function() {
	var factorioInstruments = [];

	for (var instrument_channel in this.instruments)
		for (var instrument_i in this.instruments[instrument_channel]) {
			var instrument = this.instruments[instrument_channel][instrument_i];
			var factorioInstrument = instrument.factorioInstrument;

			if (factorioInstruments[factorioInstrument.name] === undefined)
				factorioInstruments[factorioInstrument.name] = [];

			for (var note_i in instrument.notes) {
				var note = this.notes[instrument.notes[note_i]];

				var factorioTick = Math.round(note.time * 0.06) + 1;
				if (factorioInstruments[factorioInstrument.name][factorioTick] === undefined)
					factorioInstruments[factorioInstrument.name][factorioTick] = [];

				if (factorioInstrument.checkRange(note)) {
					factorioInstruments[factorioInstrument.name][factorioTick].push(note.convert());
				}
			}
		}

	var delays = [];
	var factorioSignals = [];
	var signalInstruments = [];

	var signalsUsed = 0;

	for (instrument_i in factorioInstruments) {
		var instrument = factorioInstruments[instrument_i];

		for (delay in instrument) {
			var chord = instrument[delay];

			delays.push(parseInt(delay));

			for (i in chord) {
				i = parseInt(i);
				if (factorioSignals[signalsUsed + i] === undefined) {
					factorioSignals[signalsUsed + i] = [];
					signalInstruments.push(factorio_instrument[instrument_i]);
				}

				factorioSignals[signalsUsed + i][delay] = chord[i];
			}
		}

		signalsUsed = factorioSignals.length;
	}

	// This can be done better performance-wise
	var uniqueDelays = [];
	$.each(delays, function(i, el){
		if($.inArray(el, uniqueDelays) === -1) uniqueDelays.push(el);
	});
	uniqueDelays.sort( function(a,b){return a - b} );

	return {"delays": uniqueDelays, "factorioSignals": factorioSignals, "signalInstruments": signalInstruments};
}

function sortMidi(events) {
	var channelInstruments = [];

	for (i in events) {
		var event = events[i];
		switch (event.subtype) {
			case MIDIEvents.EVENT_META_TRACK_NAME:
				event.text = UTF8.getStringFromBytes(event.data, 0, event.length, true);
				song.getTrack(event.track).setName(event.text);
				break;
			case MIDIEvents.EVENT_META_TEXT:
				event.text = UTF8.getStringFromBytes(event.data, 0, event.length, true);
				song.getTrack(event.track).addText(event.playTime, event.text);
				break;
			case MIDIEvents.EVENT_MIDI_PROGRAM_CHANGE:
				song.addInstrumentChange(event.playTime, event.channel, event.param1);
				break;
			case MIDIEvents.EVENT_MIDI_NOTE_ON:
				song.addNote(event.playTime, event.channel, event.track, event.param1, event.param2);
				break;
		}
	}

	return song;
}
