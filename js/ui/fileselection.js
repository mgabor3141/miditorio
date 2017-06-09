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
