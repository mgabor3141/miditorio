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

	console.log("Substation height: " + substationHeight);

	for (var y = 0; y < substationHeight; y++) {
		for (var x = 0; x < substations / substationHeight; x++) {
			entities.push({
				"entity_number": entities.length + 1,
				"name": "substation",
				"position": {"x": roundToHalf(5.5 + x * 18), "y": roundToHalf(11.5 + y * 18)}
			});
		}
	}
}

function placeSpeakers(entities, signalInstruments) {
	var position = {"x": 5, "y": -4};
	var rowLeader = entities.length + 1;

	for (i in signalInstruments) {
		var connections;
		if (position.x == 5) {
			if (position.y == -4) {
				connections = {"1": {"green": [{"entity_id": 6, "circuit_id": 2}]}};
			} else {
				connections = {"1": {"green": [{"entity_id": rowLeader}]}};
				rowLeader = entities.length + 1;
			}
		} else {
			connections = {"1": {"green": [{"entity_id": entities.length}]}};
		}

		entities.push({
			"entity_number": entities.length + 1,
			"name": "programmable-speaker",
			"position": {"x": position.x, "y": position.y},
			"control_behavior": {
				"circuit_condition": {
					"first_signal": factorio_signals[i],
					"constant": 0,
					"comparator": ">"
				},
				"circuit_parameters": {
					"signal_value_is_pitch": true,
					"instrument_id": signalInstruments[i],
					"note_id": 0
				}
			},
			"connections": connections,
			"parameters": {
				"playback_volume": 1,
				"playback_globally": true,
				"allow_polyphony": true
			},
			"alert_parameters": {
				"show_alert": false,
				"show_on_map": true,
				"alert_message": "MIDItorio.com"
			}
		});

		if (position.x < 14) {
			position.x++;
		} else {
			position.x = 5;
			position.y++;
		}

	}
}

var maxsignals = 0;
function getSignals(data) {
	var signals = [
		{"signal": {"type": "virtual", "name": "signal-0"}, "count": data.delays[0], "index": 1},
		{"signal": {"type": "virtual", "name": "signal-1"}, "count": data.delays[1], "index": 2},
		{"signal": {"type": "virtual", "name": "signal-2"}, "count": data.delays[2], "index": 3},
		{"signal": {"type": "virtual", "name": "signal-3"}, "count": data.delays[3], "index": 4},
		{"signal": {"type": "virtual", "name": "signal-4"}, "count": data.delays[4], "index": 5}
	];

	var index = 6;
	for (i in data.signals) {
		if (data.signals[i] == 0) continue;
		signals.push({"signal": factorio_signals[i], "count": data.signals[i], "index": index});
		index++;
		if (index > 18) {
			console.log("Not enough signals: " + data.signals.length + " needed");
			break;
		}
	}

	return signals;
}

var columnHeadEntityId;
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

		columnHeadEntityId = entities.length + 1;
	} else if (position.y == 3) {
		connections = {
			"1": {
				"red": [
					{"entity_id": columnHeadEntityId, "circuit_id": 1}
				],
				"green": [
					{"entity_id": entities.length + 2}
				]
			},
			"2": {
				"green": [
					{"entity_id": columnHeadEntityId, "circuit_id": 2}
				]
			}
		};

		columnHeadEntityId = entities.length + 1;
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
					{"entity_id": entities.length - 1, "circuit_id": 2}
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
}

var str, obj;
function getBlueprint() {
	var signals = song.toFactorio();

	console.log(signals);

	var substations = Math.ceil(signals.delays.length / 5 / 106);
	var substationHeight = Math.floor(Math.sqrt(substations));

	// Load decoder
	var entities = JSON.parse(JSON.stringify(decoder_entities))

	// Place substations
	placeSubstations(entities, substationHeight, substations);

	// Place speakers
	placeSpeakers(entities, signals.signalInstruments);

	var position = {"x": -2.5, "y": 3};

	// Fill memory
	for (var i = 0; i < signals.delays.length; i += 5) {
		var data = {};
		data.delays = [];
		data.signals = [];
		data.num = Math.round(i / 5);

		for (var j = 0; j < 5; j++) {
			data.delays[j] = signals.delays[i + j];

			if (data.delays[j] === undefined)
				data.delays[j] = 0;

			for (var k = 0; k < signals.factorioSignals.length; k++) {
				if (signals.factorioSignals[k][data.delays[j]] !== undefined) {
					if (data.signals[k] === undefined)
						data.signals[k] = 0;

					data.signals[k] += signals.factorioSignals[k][data.delays[j]] << j*6;
				}
			}
		}

		addMemoryCell(entities, {"x": position.x, "y": position.y}, data);

		if (position.y == 3 + 18 * substationHeight - 1) {
			position.x += 3;
			position.y = 3;
		} else if (Math.round(position.x + 2.5) % 18 == 9 && (position.y - 3) % 18 == 7) {
			position.y += 3;
		} else {
			position.y += 1;
		}
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
