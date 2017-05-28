var str, obj;
function getBlueprint() {
	// JSON from blueprint
	str = "0eNrNVk1vm0AQ/S9zLVSAATscIlWq+gd6rCK0wCQZCXbRsFi1LP57Z6GKrRgswskXxH7Mm3nvDeyeoah7bJm0hewMVBrdQfbnDB29aVW7OXtqETIgiw14oFXjRhWWVCH7pWkK0soahsED0hX+hSwcXjxAbckSTmjj4JTrvimQZcMHjmKy7w1aKq+hPGhNJ9FGuwIE0Q++Jx6c5CWVNBUxltNq5IGUbNnUeYHv6kgSLSEX2FyWqxGqcwuvxJ3Nb8gdiW0vMx91TTv8N0bUjpnTxSonktRuWmQ15YdvEmN62/ZfRx0mXD1xGcsL3YOxuhaNqjFpSVz2ZMdhNLxIbLRus7jhUt2YEN0z844Du1UO/Mf8JP9FxsCFNa3iMV0Gz+Am2pME9Nrmr2yanLTICpnlHme0WqK/W+C7u9jQqLr2sRYwlsZrTY23hHcXtitNim5Nmqsj3qZ78CCyL7FPFugmW2QP1ueN13V7uk31h2r26b/xif9+gfB+i+5L3T6bOV3X74evFeLHYyXp+g54WtcBT9s6IH3w7+7gDttZf8Lg/jERLAgVBltaZ7th0SKDWWdl83gXya6uLh7UqkA5e+HH75+/ZHhE7sYK0ziOkiQ5BOF+GP4BkJ8Q+g=="

	obj = JSON.parse(String.fromCharCode.apply(null, pako.inflate(base64js.toByteArray(str.slice(1)))));
	console.log(obj);

	entities = obj.blueprint.entities;
	label = "Test Blueprint";
	bp = {"blueprint": {"icons": [{"signal":{"type":"item","name":"programmable-speaker"},"index":1}], "entities": entities, "item": "blueprint", "label": label, "version": 64425558017}};

	bpstring = "0" + base64js.fromByteArray(pako.deflate(JSON.stringify(bp)));

	$("#bpstring").text(bpstring);
	$("#blueprint").fadeIn().css("display","");
}

$("#getbp").click(getBlueprint);
