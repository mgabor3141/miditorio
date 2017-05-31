// ### Error box

var fadeoutdelay;
function showError(e) {
	if (e.message !== undefined)
		e = e.message;

	$("#errormsg").text(e);
	$("#errorbox").show().animate({
		opacity: 1,
		top: 60
	});
	clearTimeout(fadeoutdelay);
	fadeoutdelay = setTimeout(function(){
		$("#errorbox").animate({
			opacity: 0,
			top: -5
		});
	}, 5000);
}

// ### File selection

$("#file").change(handleFileSelect);

$("#droparea").on("drop", function(event) {
	event.preventDefault();
	event.stopPropagation();

	$("#blueprint").hide();

	$("#droparea").stop(true).animate({
		opacity: 0,
		left: "-=10",
		top: "-=10",
		width: "+=20",
		height: "+=20",
	}, 400, function() {
		$("#droparea").css("top", "+=10");
		$("#droparea").css("left", "+=10");
		$("#droparea").css("width", "-=20");
		$("#droparea").css("height", "-=20");

		$("#droparea").delay(200).fadeTo(300, 0.2);
	});

	handleFileSelect(event);
});

$("#droparea").on("dragenter", function(event){
	$("#tooltip").fadeTo(300, 0);
	$("#droparea").stop(true).fadeTo(200, 0.8);
});

$("#droparea").on("dragleave", function(event){
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

function generateSettingsPanel() {
	$("#settings").text("");

	$("#settings").append("<h2>" + song.name + "</h2>");

	$("#settings").append("<p><button type='button' class='btn btn-primary' "+
		"id='getbp'>Get Blueprint</button></p>");

	$("#settings").append("<div id='clearfix' style='clear: both;'>");

	var tracksTmp = "<div class='list-group'>";

	for(tracknum in song.tracks) {
		if (song.tracks[tracknum].notes.length == 0 && song.tracks[tracknum].text.length == 0)
			continue;

		tracksTmp += "<a href='#' class='list-group-item'>" + song.tracks[tracknum].name +
			" <span id='track" + tracknum + "'></span></a>";
	}

	tracksTmp += "</div>";

	$("#settings").append(tracksTmp);

	$("#settings").append("<div id='clearfix' style='clear: both;'>");

	updateTrackInfos();

	$("#settings").fadeIn().css("display", "");
}

function updateTrackInfos() {
	for(tracknum in song.tracks) {
		rangeData = song.tracks[tracknum].getRangeData();

		if (rangeData.below  == 0 && rangeData.above == 0) {
			$("#track" + tracknum).attr("class", "trackinfo good");
			$("#track" + tracknum).text("✔");
		} else {
			$("#track" + tracknum).attr("class", "trackinfo bad");

			var tmpText = "";
			if (rangeData.below > 0) {
				tmpText += "▼ " + rangeData.below + " notes ";
			}

			if (rangeData.above > 0) {
				tmpText += "▲ " + rangeData.above + " notes ";
			}

			$("#track" + tracknum).text(tmpText.slice(0, -1));
		}
	}
}