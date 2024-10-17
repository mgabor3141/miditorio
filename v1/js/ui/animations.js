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
