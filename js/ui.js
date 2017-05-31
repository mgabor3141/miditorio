// ### Error box

var fadeoutdelay;
function showError(e) {
	console.log(e);
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

var filechosen = false;
function fileChosen(event) {
	filechosen = true;

	$("#inserter").spSet("fps", 30);

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

		$("#droparea").delay(5000).fadeTo(300, 0.2, function() {
			filechosen = false;
		});
	});

	$("#blueprint").hide();

	$("#settings").fadeOut(100, function () {
		handleFileSelect(event);
	});
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

	$("#getbp").click(function(event) {
		$('#assembler').spSet("fps", 0);
		$('#insertertake').spSet("fps", 30);

		getBlueprint();
	});

	updateTrackInfos();
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

// ### Animations

$('#inserter').sprite({
	fps: 0,
	no_of_frames: 71,
	on_frame: {
		32: function() {
			$('#assembler').spSet("fps", 30);
		},
		60: function() {
			$("#settings").fadeIn();
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
		68: function() {
			$('#insertertake').spStop(true);
			$('#insertertake').css("background-position-x", -100000);
		}
	}
});

$('#assembler').sprite({fps: 0, no_of_frames: 25});