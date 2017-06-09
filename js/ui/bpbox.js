// ### Blueprint Textbox

var clipboard = new Clipboard('#bpbox span button', {
	target: function(trigger) {
        return trigger.parentElement.previousElementSibling;
    }
});

clipboard.on('success', function(e) {
	$(e.trigger.getElementsByTagName("img")[0]).hide(); // clippy
	$(e.trigger.getElementsByTagName("img")[1]).show(); // tick
	clearTimeout(e.trigger.fadeBackDelay);
	e.trigger.fadeBackDelay = setTimeout(function(){
		$(e.trigger.getElementsByTagName("img")[1]).fadeOut(200, function(){
			$(e.trigger.getElementsByTagName("img")[0]).fadeIn(200);
		});
	}, 1000);
	e.clearSelection();
});
