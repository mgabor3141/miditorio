function decode(blueprintString) {
	return JSON.parse(String.fromCharCode.apply(null, pako.inflate(base64js.toByteArray(blueprintString.slice(1)))));
}

function encode(blueprintObject) {
	return "0" + base64js.fromByteArray(pako.deflate(JSON.stringify(blueprintObject)));
}

function roundToHalf(x) {
	return Math.round(x*2)/2;
}

function placeSubstations(entities, substationHeight, substations) {
	// Single one at the top
	entities.push({
		"entity_number": entities.length + 1,
		"name":	"substation",
		"position": {"x": 5.5, "y": -6.5}
	});

	for (var x = 0; x < substationHeight; x++) {
		for (var y = 0; y < substations / substationHeight; y++) {
			entities.push({
				"entity_number": entities.length + 1,
				"name": "substation",
				"position": {"x": roundToHalf(5.5 + x * 18), "y": roundToHalf(11.5 + y * 18)}
			});
		}
	}

	return entities;
}

function getSignals(data) {
	var signals = [
		{"signal": {"type": "virtual", "name": "signal-0"}, "count": data.delays[0], "index": 1},
		{"signal": {"type": "virtual", "name": "signal-1"}, "count": data.delays[1], "index": 2},
		{"signal": {"type": "virtual", "name": "signal-2"}, "count": data.delays[2], "index": 3},
		{"signal": {"type": "virtual", "name": "signal-3"}, "count": data.delays[3], "index": 4},
		{"signal": {"type": "virtual", "name": "signal-4"}, "count": data.delays[4], "index": 5}
	];

	if (data.signals.length > 13)
		throw new Error("Too many signals");

	var index = 13;
	for (i in data.signals) {
		if (data.signals[i] == 0) continue;
		signals.push({"signal": factorio_signals[i], "count": data.signals[i], "index": index});
		index++;
	}

	return signals;
}

function addMemoryCell(entities, position, data) {
	var connections;
	if (data.num == 0) {
		connections = {
			"1": {
				"red": [
					{"entity_id": 18, "circuit_id": 2}
				],
				"green": [
					{"entity_id": 21}
				]
			},
			"2": {
				"green": [
					{"entity_id": 16, "circuit_id": 1}
				]
			}
		};
	} else {
		connections = {
			"1": {
				"red": [
					{"entity_id": entities.length - 1, "circuit_id": 1}
				],
				"green": [
					{"entity_id": entities.length + 2}
				]
			},
			"2": {
				"green": [
					{"entity_id": entities.length - 1 , "circuit_id": 2}
				]
			}
		};
	}

	entities.push({
		"entity_number": entities.length + 1,
		"name": "decider-combinator",
		"position": position,
		"direction": 2,
		"control_behavior": {
			"decider_conditions": {
				"first_signal": {"type": "virtual", "name": "signal-white"},
				"constant": data.num,
				"comparator": "=",
				"output_signal": {"type": "virtual", "name": "signal-everything"},
				"copy_count_from_input": true
			}
		},
		"connections": connections
	});

	position2 = {"x": roundToHalf(position.x-1.5), "y": position.y};

	var signals = getSignals(data);
	entities.push({
		"entity_number": entities.length + 1,
		"name": "constant-combinator",
		"position": position2,
		"direction": 2,
		"control_behavior": {"filters": signals},
		"connections": {
			"1": {
				"green": [
					{"entity_id": entities.length, "circuit_id": 1}
				]
			}
		}
	});

	return entities;
}

var str, obj;
function getBlueprint() {
	var signals = song.toFactorio();

	console.log(signals);

	var substations = Math.ceil(signals.delays.length / 5 / 106);
	var substationHeight = Math.sqrt(substations) - 1;

	// Load decoder
	var entities = decoder_entities;

	var entities = placeSubstations(entities, substations, substationHeight);

	var position = {"x": -2.5, "y": 3};

	// Fill memory
	// signals.delays.length
	for (var i = 0; i < 16; i += 5) {
		var data = {};
		data.delays = [];
		data.signals = [];
		data.num = Math.round(i / 5);

		for (var j = 0; j < 5; j++) {
			data.delays[j] = signals.delays[i + j];

			for (var k = 0; k < signals.factorioSignals.length; k++) {
				if (signals.factorioSignals[k][data.delays[j]] !== undefined) {
					if (data.signals[k] === undefined)
						data.signals[k] = 0;

					data.signals[k] += signals.factorioSignals[k][data.delays[j]] << j*6;
				}
			}
		}

		entities = addMemoryCell(entities, {"x": position.x, "y": position.y}, data);

		position.y += 1;
	}

	console.log(entities);


	bp = {
		"blueprint": {
			"icons": [{"signal": {"type": "item", "name": "programmable-speaker"}, "index": 1}],
			"entities": entities,
			"item": "blueprint",
			"label": filename.slice(0, -4),
			"version": 64425558017
		}
	};

	bpstring = encode(bp);

	$("#bpstring").text(bpstring);
	$("#blueprint").fadeIn().css("display", "");
}

$("#getbp").click(getBlueprint);
