// ### Error box

var fadeOutDelay;
function showError(e) {
	if (e.message !== undefined)
		e = e.message;

	$("#errormsg").text(e);
	$("#errorbox").show().animate({
		opacity: 1,
		top: 60
	});
	clearTimeout(fadeOutDelay);
	fadeOutDelay = setTimeout(function(){
		$("#errorbox").animate({
			opacity: 0,
			top: -5
		});
	}, 5000);
}

// ### File selection

var filechosen = false;
function fileChosen(event) {
	filechosen = true;

	$("#droparea").stop(true).animate({
		opacity: 0,
		left: "-=20",
		top: "-=20",
		width: "+=40",
		height: "+=40",
	}, 400, function() {
		$("#droparea").css("top", "+=20");
		$("#droparea").css("left", "+=20");
		$("#droparea").css("width", "-=40");
		$("#droparea").css("height", "-=40");

		$("#droparea").delay(500).fadeTo(300, 0.2, function() {
			filechosen = false;
		});
	});

	if (!handleFileSelect(event)) return;

	$("#inserter").spSet("fps", 30);
	$("#bpbox").animate({opacity: 0}, 200, function(){
		$("#bpbox").hide();
	});

	$("#settings").fadeOut();
}

$("#file").change(fileChosen);

$("#droparea").on("drop", function(event) {
	event.preventDefault();
	event.stopPropagation();

	fileChosen(event);
});

$("#droparea").on("dragenter", function(event){
	$("#tooltip").fadeTo(300, 0);
	$("#droparea").stop(true).fadeTo(200, 0.8);
});

$("#droparea").on("mouseover", function(event){
	if (!filechosen)
		$("#droparea").stop(true).fadeTo(200, 0.8);
});

$("#droparea").on("dragleave mouseout", function(event){
	if (!filechosen)
		$("#droparea").stop(true).fadeTo(200, 0.2);
});

$("#droparea").on("dragover", function(event){
	event.preventDefault();
	event.stopPropagation();
});

$('#droparea').click(function(){
	$('#file').click();
});

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

console.log(msToTime(55018))

function generateSettingsPanel() {
	$("#settings").text("");

	$("#settings").append("<h2>" + song.name + " <span class='time'>" + msToTime(song.time) + "</span></h2>");

	$("#settings").append("<p><button type='button' class='btn btn-primary' "+
		"id='getbp'>Get Blueprint</button></p>");

	$("#settings").append("<div class='clearfix' style='clear: both;'>");

	// Tracks (there aren't necessarily any)
	if (song.tracks.length > 0) {
		$("#settings").append("<h3>Tracks</h3>");

		var tracksTmp = "<div class='row' id='tracks'>";

		tracksTmp += "<div class='list-group col-sm-4'>";

		for(tracknum in song.tracks) {
			if (song.tracks[tracknum].notes.length == 0 && song.tracks[tracknum].text.length == 0)
				continue;

			tracksTmp += "<a href='#' class='list-group-item' id='track" + tracknum + "'>" + song.tracks[tracknum].name +
				" <span class='rangeinfo'></span></a>";
		}

		tracksTmp += "</div>";

		tracksTmp += "<div class='settingsPanel col-sm-8' id='trackinfo'>Track Info</div></div>";

		$("#settings").append(tracksTmp);
		$(".list-group-item").click(selectTrack);

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

			textTmp += "<a href='#' class='list-group-item' id='instrument" + instrument + "'>" +
				midi_instrument[song.instruments[channel][instrument].instrument] +
				" <span class='channel'>[CH" + channel + "]</span>" +
				" <span class='rangeinfo'></span></a>";
		}
	}

	textTmp += "</div>";

	textTmp += "<div class='settingsPanel col-sm-8' id='instrumentinfo'>Instrument Info</div></div>";

	$("#settings").append(textTmp);

	$("#settings").append("<div class='clearfix' style='clear: both;'>");

	$("#getbp").click(function(event) {
		$('#assembler').spSet("fps", 0);
		$('#insertertake').spSet("fps", 30);

		getBlueprint();
	});

	updateTrackInfos();
}

function getTrackDetails(id) {
	var track = song.tracks[id];

	$(".settingsPanel#trackinfo").text("");

	if (track.name != ("Track " + (id+1)))
		$(".settingsPanel#trackinfo").append("<div class='trackid'>Track " + (id+1) + "</div>");
	else
		$(".settingsPanel#trackinfo").append("<div class='trackid'></div>");

	$(".settingsPanel#trackinfo").append("<h3>" + track.name + "</h3>");

	if (track.text.length > 0) {
		for (i in track.text) {
			$(".settingsPanel#trackinfo").append("<div class='detailsText'>" + track.text[i].text + "</div>");
		}
	}
}

function selectTrack(event) {
	var trackId = parseInt($(this).attr("id").substr("track".length));

	$(".list-group-item").removeClass("active");
	$(this).addClass("active");

	getTrackDetails(trackId);
}

function updateTrackInfos() {
	for(tracknum in song.tracks) {
		rangeData = song.tracks[tracknum].getRangeData();

		if (rangeData.below  == 0 && rangeData.above == 0) {
			$("#track" + tracknum + " span.rangeinfo").attr("class", "rangeinfo good");
			$("#track" + tracknum + " span.rangeinfo").text("✔");
		} else {
			$("#track" + tracknum + " span.rangeinfo").attr("class", "rangeinfo bad");

			var tmpText = "";
			if (rangeData.below > 0) {
				tmpText += "▼ " + rangeData.below + " notes ";
			}

			if (rangeData.above > 0) {
				tmpText += "▲ " + rangeData.above + " notes ";
			}

			$("#track" + tracknum + " span.rangeinfo").text(tmpText.slice(0, -1));
		}
	}
}

// ### Blueprint Textbox

var clipboard = new Clipboard('#bpbox span button');

var fadeBackDelay;
clipboard.on('success', function(e) {
	$("img#clippy").hide();
	$("img#tick").show();
	clearTimeout(fadeOutDelay);
	fadeOutDelay = setTimeout(function(){
		$("img#tick").fadeOut(200, function(){
			$("img#clippy").attr("src", "assets/clippy.svg").fadeIn(200);
		});
	}, 1000);
	e.clearSelection();
});

// ### Animations

$('#inserter').sprite({
	fps: 0,
	no_of_frames: 71,
	on_frame: {
		32: function() {
			$('#assembler').spSet("fps", 30);
		},
		45: function() {
			generateSettingsPanel();
			$("#settings").fadeIn();
			$(".settingsPanel#trackinfo").css("min-height", $("#tracks .list-group").height());
			$(".settingsPanel#instrumentinfo").css("min-height", $("#instruments .list-group").height());
			$("#settings .list-group-item:first-child").click();
		},
		70: function() {
			$('#inserter').spStop(true);
		}
	}
});

$('#insertertake').sprite({
	fps: 0,
	no_of_frames: 69,
	on_frame: {
		34: function() {
			$("#bpbox").css("display", "table").animate({opacity: 1});
		},
		68: function() {
			$('#insertertake').spStop(true);
			$('#insertertake').css("background-position-x", -100000);
		}
	}
});

$('#assembler').sprite({fps: 0, no_of_frames: 25});
