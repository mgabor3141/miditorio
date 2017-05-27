MIDIEvents = MIDIFile.Events;
UTF8 = MIDIFile.UTF8;

function showError(e) {
	console.log(e);
}

if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
	showError("The File APIs are not fully supported in this browser. Please try a different browser.");
}

function handleFileSelect(evt) {
	try {
		if (evt.target.files.length > 1)
			throw new Error("Multiple files selected.");

		if (evt.target.files.length == 0)
			throw new Error("No files selected.");

		f = evt.target.files[0];

		if (f.type != "audio/mid")
			throw new Error("This isn't recognized as a MIDI file but instead as a(n) " + f.type);

		var reader = new FileReader();
		reader.onload = function(e) {
			processMidi(reader.result);
		}

		reader.readAsArrayBuffer(f);

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

function Instrument(time, channel, instrument) {
	this.time = time;
	this.channel = channel;
	this.instrument = instrument;
	this.factorioInstrument;
}

function Track() {
	this.name = "";
	this.notes = [];
	this.text = [];

	this.addNote = function (time, channel, pitch) {
		this.notes.push({"time": time, "channel": channel, "pitch": pitch});
	}

	this.addText = function (time, text) {
		this.text.push({"time": time, "text": text});
	}
}

function Song() {
	this.tracks = [];
	this.instruments = [new Instrument(0, 9, -1)]; // Drum Track

	this.getTrack = function(n) {
		if (this.tracks[n] === undefined)
			this.tracks[n] = new Track();

		return this.tracks[n];
	}

	this.setTrackAttribute = function(n, attribute, value) {
		if (tracks[n] === undefined)
			this.tracks[n] = new Track();

		this.tracks[n][attribute] = value;
	}

	this.setInstrument = function(time, channel, instrument) {
		this.instruments.push(new Instrument(time, channel, instrument));
	}
}

function sortMidi(events) {
	tracks = new Song();

	for (i in events) {
		var event = events[i]
		switch (event.subtype) {
			case MIDIEvents.EVENT_META_TRACK_NAME:
				event.text = UTF8.getStringFromBytes(event.data, 0, event.length, true);
				tracks.setTrackAttribute(event.track, "name", event.text);
				break;
			case MIDIEvents.EVENT_META_TEXT:
				event.text = UTF8.getStringFromBytes(event.data, 0, event.length, true);
				tracks.getTrack(event.track).addText(event.playTime, event.text);
				break;
			case MIDIEvents.EVENT_MIDI_PROGRAM_CHANGE:
				tracks.setInstrument(event.playTime, event.channel, event.param1);
				break;
			case MIDIEvents.EVENT_MIDI_NOTE_ON:
				tracks.getTrack(event.track).addNote(event.playTime, event.channel, event.param1);
				break;
		}
	}

	return tracks;
}

$("#file").change(handleFileSelect);
