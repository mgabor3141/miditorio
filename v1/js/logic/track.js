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

