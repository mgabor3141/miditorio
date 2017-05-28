MIDIEvents = MIDIFile.Events;
UTF8 = MIDIFile.UTF8;

var fadeoutdelay;
function showError(e) {
	$("#errormsg").text(e.message);
	$("#errorbox").css('visibility','visible').hide().fadeIn();
	clearTimeout(fadeoutdelay);
	fadeoutdelay = setTimeout(function(){
		$("#errorbox").fadeOut(500, function() {
			$(this).css({"display": "block","visibility": "hidden"});
		});
		//$("#errorbox").fadeOut().css("visibility","hidden")
	}, 5000);
}

function clearError() {
	clearTimeout(fadeoutdelay);
	$("#errorbox").fadeOut(500, function() {
		$(this).css({"display": "block","visibility": "hidden"});
	});
}

if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
	showError("The File APIs are not fully supported in this browser. Please try a different browser.");
}

function handleFileSelect(evt) {
	try {
		$("#step2").hide();
		$("#step3").hide();

		if (evt.target.files.length > 1)
			throw new Error("Multiple files selected.");

		if (evt.target.files.length == 0)
			throw new Error("No files selected.");

		f = evt.target.files[0];

		if (f.type != "audio/mid")
			throw new Error("This file isn't recognized as a MIDI file (it seems to be a(n) " + f.type + ")");

		var reader = new FileReader();
		reader.onload = function(e) {
			processMidi(reader.result);
		}

		reader.readAsArrayBuffer(f);

		clearError();
		$("#step2").fadeIn().css("display","");
	} catch (e) {
		showError(e);
	}
}

var song;
function processMidi(midi) {
	var midiFile = new MIDIFile(midi);

	console.log("Reading MIDI file");
	console.log("Format: " + midiFile.header.getFormat() + ", Resolution: " + midiFile.header.getTicksPerBeat());

	song = sortMidi(midiFile.getEvents());

	console.log(song)
}

function Instrument(time, instrument) {
	this.time = time;
	this.instrument = instrument;

	this.notes = [];

	this.addNote = function(id) {
		this.notes.push(id);
	}

	this.factorioInstrument = getFactorioInstrument(instrument);
}

function Track(trackNum) {
	this.name = "Track "+trackNum;
	this.notes = [];
	this.text = [];

	this.addNote = function(id) {
		this.notes.push(id);
	}

	this.addText = function(time, text) {
		this.text.push({"time": time, "text": text});
	}

	this.setName = function(name) {
		this.name = name;
	}
}

/*
	Ok this is kinda tricky.
	Note data is stored in Song.notes
	Tracks and Instruments store the index of their respective notes within Song.notes
	Instruments are grouped into arrays by the channel they're on 
*/
function Song() {
	this.notes = [];
	this.tracks = [];
	this.instruments = [];
	this.instruments[9] = [new Instrument(0, -1)]; // Drum Track

	this.addNote = function(time, channel, track, pitch, velocity) {
		this.notes.push({"time": time, "channel": channel, "track": track, "pitch": pitch, "velocity": velocity});

		if (this.tracks[track] === undefined)
			this.tracks[track] = new Track();

		this.tracks[track].addNote(this.notes.length - 1);

		this.getInstrument(time, channel).addNote(this.notes.length - 1);
	}

	this.getTrack = function(track) {
		if (this.tracks[track] === undefined)
			this.tracks[track] = new Track();

		return this.tracks[track];
	}

	this.getInstrument = function(time, channel) {
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

	this.addInstrumentChange = function (time, channel, instrument) {
		if (this.instruments[channel] === undefined)
			this.instruments[channel] = [];

		this.instruments[channel].push(new Instrument(time, instrument));
	}
}

function sortMidi(events) {
	song = new Song();
	var channelInstruments = [];

	for (i in events) {
		var event = events[i]
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

$("#file").change(handleFileSelect);
