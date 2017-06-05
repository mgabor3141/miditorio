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
