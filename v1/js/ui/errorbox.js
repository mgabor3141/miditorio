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
	}, 10000);
}
