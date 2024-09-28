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
		this.tracks[track] = new Track(track);

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
		this.tracks[track] = new Track(track);

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
	if (channel == 9) return;
	
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

				var factorioTick = Math.round(note.time * 0.06) + 10;
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

	signalInstruments = signalInstruments.slice(0, 77);

	// This could be done better performance-wise
	var uniqueDelays = [];
	$.each(delays, function(i, el){
		if($.inArray(el, uniqueDelays) === -1) uniqueDelays.push(el);
	});
	uniqueDelays.sort( function(a,b){return a - b} );

	return {"delays": uniqueDelays, "factorioSignals": factorioSignals, "signalInstruments": signalInstruments};
}
