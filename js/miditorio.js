if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
	throw new Error("The File APIs are not fully supported in this browser. Please try a different browser.");
}

function showError(e) {
	console.log(e);
}

var midiFile;
function handleFileSelect(evt) {
	try {
		if (evt.target.files.length > 1)
			throw new Error("Multiple files selected.");

		if (evt.target.files.length == 0)
			throw new Error("No files selected.");

		f = evt.target.files[0];

		if (!f.type.match('mid'))
			throw new Error("This isn't a MIDI file.");

		var reader = new FileReader();
		reader.onload = function(e) {
			processMidi(reader.result);
		}

		reader.readAsArrayBuffer(f);
	} catch (e) {
		showError(e);
	}
}

function processMidi(midi) {
	midiFile = new MIDIFile(midi);

	console.log(midiFile.header.getFormat());
	console.log(midiFile.header.getTracksCount());
}

document.getElementById("file").addEventListener("change", handleFileSelect, false);