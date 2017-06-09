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
