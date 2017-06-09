// ### Settings

// https://stackoverflow.com/a/9763769/846349
function msToTime(s) {
  // Pad to 2 or 3 digits, default is 2
  function pad(n, z) {
    z = z || 2;
    return ('00' + n).slice(-z);
  }

  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s;

  return pad(mins, 1) + ':' + pad(secs);
}

function generateSettingsPanel() {
	$("#settings").text("");

	$("#settings").append("<h2>" + song.name + " <span class='time'>" + msToTime(song.time) + "</span></h2>");

	$("#settings").append("<p><button type='button' class='btn btn-primary' "+
		"id='getbp'>Get Blueprint</button></p>");

	$("#settings").append("<div class='clearfix' style='clear: both;'>");

	$("#settings").append("<p class='guidelink'>The following tracks and instruments have been extracted from your MIDI file. Notes can be aligned to the Factorio note ranges below. For more information check the <a href='guide.html' target='_blank'>Guide!</a></p>")

	// Tracks (there aren't necessarily any)
	if (song.tracks.length > 0) {
		$("#settings").append("<h3>Tracks</h3>");

		var tracksTmp = "<div class='row' id='tracks'>";

		tracksTmp += "<div class='list-group col-sm-4'>";

		for(tracknum in song.tracks) {
			if (song.tracks[tracknum].notes.length == 0 && song.tracks[tracknum].text.length == 0)
				continue;

			tracksTmp += "<a class='list-group-item track' data-track='" + tracknum + "'>" + song.tracks[tracknum].name +
				" <span class='rangeinfo'></span></a>";
		}

		tracksTmp += "</div>";

		tracksTmp += "<div class='settingsPanel col-sm-8' id='trackinfo'>Track Info</div></div>";

		$("#settings").append(tracksTmp);
		$(".list-group-item.track").click(selectTrack);

		$("#settings").append("<div class='clearfix' style='clear: both;'>");
	}

	// Instruments (you have to have them)
	$("#settings").append("<h3>Instruments</h3>");

	var textTmp = "<div class='row' id='instruments'>";

	textTmp += "<div class='list-group col-sm-4'>";

	for (channel in song.instruments) {
		for (instrument in song.instruments[channel]) {
			if (song.instruments[channel][instrument].notes.length == 0)
				continue;

			textTmp += "<a class='list-group-item instrument' data-instrument='" + instrument + "' data-channel='" + channel + "'>" +
				midi_instrument[song.instruments[channel][instrument].instrument] +
				" <span class='rangeinfo'></span></a>";
		}
	}

	textTmp += "</div>";

	textTmp += "<div class='settingsPanel col-sm-8' id='instrumentinfo'>Instrument Info</div></div>";

	$("#settings").append(textTmp);

	$(".list-group-item.instrument").click(selectInstrument);

	$("#settings").append("<div class='clearfix' style='clear: both;'>");

	$("#getbp").click(function(event) {
		$('#assembler').spSet("fps", 0);
		$('#insertertake').spSet("fps", 30);

		$("#bpbox").animate({opacity: 0}, 200, function(){
			$("#bpbox").hide();

			getBlueprint();
		});
	});

	updateTrackInfos();
}

// ### Tracks

function getTrackDetails(id) {
	var track = song.tracks[id];

	$(".settingsPanel#trackinfo").text("");

	if (track.name != ("Track " + id))
		$(".settingsPanel#trackinfo").append("<div class='info'>Track " + id + "</div>");
	else
		$(".settingsPanel#trackinfo").append("<div class='info'></div>");

	$(".settingsPanel#trackinfo").append("<h3>" + track.name + "</h3>");

	if (track.text.length > 0) {
		for (i in track.text) {
			$(".settingsPanel#trackinfo").append("<div class='detailsText'>" + track.text[i].text + "</div>");
		}
	}

	$(".settingsPanel#trackinfo").append("<div id='notenum'>Notes: " + track.notes.length + "</div>");

	if (track.notes.length > 0) {
		$(".settingsPanel#trackinfo").append("<div id='shifttrack" + id + "'>Shift track (octaves): </div>");
		shiftUi($(".settingsPanel#trackinfo #shifttrack" + id), track);

		$(".settingsPanel#trackinfo").append("<div id='selectedRangeInfo'></div>");
	}

	updateRangeInfo(track, $(".settingsPanel#trackinfo #selectedRangeInfo"));
}

var shiftUiId = 0;
function shiftUi(parent, object) {
	var elements= $("<button type='button' class='btn btn-xs btn-default' id='shift" + shiftUiId + "down'>&lt;</button>"+
					"<span class='shiftText'>" + object.shift + "</span>" +
					"<button type='button' class='btn btn-xs btn-default' id='shift" + shiftUiId + "up'>&gt;</button>");

	parent.append(elements);

	$("#shift" + shiftUiId + "down").click({"object": object, "by": -1}, shiftCb);
	$("#shift" + shiftUiId + "up").click({"object": object, "by": 1}, shiftCb);

	shiftUiId++;
}

function shiftCb(event) {
	var object = event.data.object;
	var by = event.data.by;

	object.setShift(object.shift + by);

	$("#" + this.parentElement.id + " span").text(object.shift);

	updateTrackInfos();
	updateRangeInfo(song.tracks[selectedTrack], $(".settingsPanel#trackinfo #selectedRangeInfo"));
	updateRangeInfo(song.instruments[selectedInstrumentChannel][selectedInstrument], $(".settingsPanel#instrumentinfo #selectedRangeInfo"));
}

function updateRangeInfo(object, DOM) {
	DOM.text("");

	if (object === undefined) return;

	rangeData = object.getRangeData();

	if (rangeData.below  == 0 && rangeData.above == 0) {
		DOM.append(
			"<span class='rangeinfo good'>✔ All notes are within range of their instrument</span>"
		);
	} else {
		if (rangeData.above > 0) {
			DOM.append(
				"<p class='rangeinfo bad'>▲ " + rangeData.above + " notes are higher than the range of their instrument.<br/>"+
				"Highest note is " + rangeData.max.above + " semitones above the range</p>"
			);
		}

		if (rangeData.below > 0) {
			DOM.append(
				"<p class='rangeinfo bad'>▼ " + rangeData.below + " notes are lower than the range of their instrument.<br/>"+
				"Lowest note is " + rangeData.max.below + " semitones below the range</p>"
			);
		}
	}
}

var selectedTrack;
function selectTrack(event) {
	//var trackId = parseInt($(this).attr("id").substr("track".length));
	var trackId = parseInt($(this).data("track"));

	$(".list-group-item.track").removeClass("active");
	$(this).addClass("active");

	selectedTrack = trackId;

	getTrackDetails(trackId);
}

function updateTrackInfos() {
	// tracks and instruments
	for(tracknum in song.tracks) {
		rangeData = song.tracks[tracknum].getRangeData();

		rangeInfoObject = $(".track[data-track='" + tracknum + "'] span.rangeinfo");

		if (rangeData.below  == 0 && rangeData.above == 0) {
			rangeInfoObject.attr("class", "rangeinfo good");
			rangeInfoObject.text("✔");
		} else {
			rangeInfoObject.attr("class", "rangeinfo bad");
			var tmpText = "";

			if (rangeData.above > 0) {
				tmpText += "▲ " + rangeData.above + " notes ";
			}

			if (rangeData.below > 0) {
				tmpText += "▼ " + rangeData.below + " notes ";
			}

			rangeInfoObject.text(tmpText.slice(0, -1));
		}
	}

	for (channel in song.instruments) {
		for (instrumentnum in song.instruments[channel]) {
			rangeData = song.instruments[channel][instrumentnum].getRangeData();

			rangeInfoObject = $(".instrument[data-instrument='" + instrumentnum + "'][data-channel='" + channel + "'] span.rangeinfo");

			if (rangeData.below  == 0 && rangeData.above == 0) {
				rangeInfoObject.attr("class", "rangeinfo good");
				rangeInfoObject.text("✔");
			} else {
				rangeInfoObject.attr("class", "rangeinfo bad");
				var tmpText = "";

				if (rangeData.above > 0) {
					tmpText += "▲ " + rangeData.above + " notes ";
				}

				if (rangeData.below > 0) {
					tmpText += "▼ " + rangeData.below + " notes ";
				}

				rangeInfoObject.text(tmpText.slice(0, -1));
			}
		}
	}
}

// ### Instruments

var selectedInstrumtinfo;
function selectInstrument(event) {
	var channelId = parseInt($(this).data("channel"));
	var instrumentId = parseInt($(this).data("instrument"));

	$(".list-group-item.instrument").removeClass("active");
	$(this).addClass("active");

	selectedInstrumentChannel = channelId;
	selectedInstrument = instrumentId;

	getInstrumentDetails(channelId, instrumentId);
}

function getInstrumentDetails(channelId, instrumentId) {
	var instrument = song.instruments[channelId][instrumentId];

	$(".settingsPanel#instrumentinfo").text("");

	$(".settingsPanel#instrumentinfo").append("<h3>" + midi_instrument[instrument.instrument] + "</h3>");

	$(".settingsPanel#instrumentinfo").append("<div class='info'>At " + msToTime(instrument.time) + " on channel " + channelId + "</div>");

	$(".settingsPanel#instrumentinfo").append("<div id='notenum'>Notes: " + instrument.notes.length + "</div>");

	if (channelId != 9) {
		$(".settingsPanel#instrumentinfo").append("<div id='shiftinstrument" + instrumentId + "c" + channelId + "'>Shift instrument (octaves): </div>");
		shiftUi($(".settingsPanel#instrumentinfo #shiftinstrument" + instrumentId + "c" + channelId), instrument);

		$(".settingsPanel#instrumentinfo").append("<div id='selectedRangeInfo'></div>");

		updateRangeInfo(instrument, $(".settingsPanel#instrumentinfo #selectedRangeInfo"));

		$(".settingsPanel#instrumentinfo").append("<div id='instrumentbind'>Factorio instrument: </div>")
		instrumentUi($(".settingsPanel #instrumentbind"), instrument);
	} else {
		$(".settingsPanel#instrumentinfo").append("<div id='instrumentbind'>Factorio instrument: DrumKit</div>")
	}
}

var instrumentUiId = 0;
function instrumentUi(parent, object) {
	var tmpText = "<select class='form-control' id='instrumentUi" + instrumentUiId + "'>";

	for (fi in factorio_instrument) {
		tmpText += "<option" +
		(object.factorioInstrument.id == factorio_instrument[fi].id ? " selected" : "") +
		" value='" + factorio_instrument[fi].name + "'>" + factorio_instrument[fi].name + "</option>"
	}

	tmpText += "</option>";

	parent.append(tmpText);

	$("#instrumentUi" + instrumentUiId).change({"object": object}, instrumentCb);

	instrumentUiId++;
}

function instrumentCb(event) {
	var object = event.data.object;

	object.factorioInstrument = factorio_instrument[this.value];

	updateTrackInfos();
	updateRangeInfo(song.tracks[selectedTrack], $(".settingsPanel#trackinfo #selectedRangeInfo"));
	updateRangeInfo(song.instruments[selectedInstrumentChannel][selectedInstrument], $(".settingsPanel#instrumentinfo #selectedRangeInfo"));
}