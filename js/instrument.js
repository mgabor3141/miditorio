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
