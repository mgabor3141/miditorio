function decode(blueprintString) {
	return JSON.parse(String.fromCharCode.apply(null, pako.inflate(base64js.toByteArray(blueprintString.slice(1)))));
}

function encode(blueprintObject) {
	return "0" + base64js.fromByteArray(pako.deflate(JSON.stringify(blueprintObject)));
}

function roundToHalf(x) {
	return Math.round(x*2)/2;
}

function placeSubstations(entities, substationHeight, xMax) {
	// Single one at the top
	entities.push({
		"entity_number": entities.length + 1,
		"name":	"substation",
		"position": {"x": 6.5, "y": -6.5}
	});

	for (var y = 0; y < substationHeight; y++) {
		for (var x = 0; x + 6.5 < Math.ceil(xMax/18)*18; x += 18) {
			entities.push({
				"entity_number": entities.length + 1,
				"name": "substation",
				"position": {"x": roundToHalf(6.5 + x), "y": roundToHalf(11.5 + y * 18)}
			});
		}
	}
}

function placeSpeakers(entities, signalInstruments) {
	var position = {"x": 5, "y": -4};
	var rowLeader = entities.length + 1;

	for (i in signalInstruments) {
		if (signalInstruments[i].id < 0) continue;

		var connections;
		if (position.x == 5) {
			if (position.y == -4) {
				connections = {"1": {"green": [{"entity_id": 4, "circuit_id": 2}]}};
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
					"instrument_id": signalInstruments[i].id,
					"note_id": 0
				}
			},
			"connections": connections,
			"parameters": {
				"playback_volume": signalInstruments[i].default_volume,
				"playback_globally": true,
				"allow_polyphony": true
			},
			"alert_parameters": {
				"show_alert": false,
				"show_on_map": true,
				"alert_message": "MIDItorio.com"
			}
		});

		if (position.x < 15) {
			position.x++;
		} else {
			position.x = 5;
			position.y++;
		}

	}
}

var maxsignals = 0;
function getSignals(data) {
	var signals = [];
	var constantNum = 0;
	var index = 6;

	signals[constantNum] = [
		{"signal": {"type": "virtual", "name": "signal-0"}, "count": data.delays[0], "index": 1},
		{"signal": {"type": "virtual", "name": "signal-1"}, "count": data.delays[1], "index": 2},
		{"signal": {"type": "virtual", "name": "signal-2"}, "count": data.delays[2], "index": 3},
		{"signal": {"type": "virtual", "name": "signal-3"}, "count": data.delays[3], "index": 4},
		{"signal": {"type": "virtual", "name": "signal-4"}, "count": data.delays[4], "index": 5}
	];

	var signalPlaced = 0;

	for (i in data.signals) {
		if (data.signals[i] == 0) continue;

		// Wires couldn't connect
		if (constantNum >= 9) break;

		if (signals[constantNum] === undefined)
			signals[constantNum] = [];

		signals[constantNum].push({"signal": factorio_signals[i], "count": data.signals[i], "index": index});

		index++;
		signalPlaced++;

		if (index > 18) {
			constantNum++;
			index = 1;
		}
	}

	if (signalPlaced > maxsignals) maxsignals = signalPlaced;

	return signals;
}

var lastPlacedDeciderEntityId;
var columnHeadEntityId;
function addMemoryCell(entities, position, data) {
	var connections;

	if (data.num == 0) {
		connections = {
			"1": {
				"red": [
					{"entity_id": 19, "circuit_id": 2}
				]
			},
			"2": {
				"green": [
					{"entity_id": 17, "circuit_id": 1}
				]
			}
		};

		columnHeadEntityId = entities.length + 1;
		lastPlacedDeciderEntityId = columnHeadEntityId;
	} else if (position.y == 3) {
		connections = {
			"1": {
				"red": [
					{"entity_id": columnHeadEntityId, "circuit_id": 1}
				]
			},
			"2": {
				"green": [
					{"entity_id": columnHeadEntityId, "circuit_id": 2}
				]
			}
		};

		columnHeadEntityId = entities.length + 1;
		lastPlacedDeciderEntityId = columnHeadEntityId;
	} else {
		connections = {
			"1": {
				"red": [
					{"entity_id": lastPlacedDeciderEntityId, "circuit_id": 1}
				]
			},
			"2": {
				"green": [
					{"entity_id": lastPlacedDeciderEntityId, "circuit_id": 2}
				]
			}
		};
		lastPlacedDeciderEntityId = entities.length + 1;
	}

	entities.push({
		"entity_number": entities.length + 1,
		"name": "decider-combinator",
		"position": {"x": position.x, "y": position.y},
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

	position.x = roundToHalf(position.x-1.5);

	var signals = getSignals(data);

	for (var constantNum in signals) {
		entities.push({
			"entity_number": entities.length + 1,
			"name": "constant-combinator",
			"position": {"x": position.x, "y": position.y},
			"direction": 2,
			"control_behavior": {"filters": signals[constantNum]},
			"connections": {
				"1": {
					"green": [
						{"entity_id": entities.length, "circuit_id": 1}
					]
				}
			}
		});
		position.y++;
	}

	return signals.length;
}

var str, obj;
function getBlueprint() {
	var signals = song.toFactorio();

	var substations = Math.ceil(signals.delays.length / 5 / 106);
	var substationHeight = Math.ceil(Math.sqrt(substations));

	// Load decoder
	var entities = JSON.parse(JSON.stringify(decoder_entities))

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

			for (var k in signals.factorioSignals) {
				if (signals.factorioSignals[k][data.delays[j]] !== undefined) {
					if (data.signals[k] === undefined)
						data.signals[k] = 0;

					data.signals[k] += signals.factorioSignals[k][data.delays[j]] << j*6;
				}
			}
		}

		position.y += addMemoryCell(entities, {"x": position.x, "y": position.y}, data);

		if (position.y > 3 + 18 * substationHeight - 1) {
			position.x += 3;
			position.y = 3;
		} else if (Math.round(position.x + 2.5) % 18 == 9 && (position.y - 3) % 18 == 8) {
			position.y += 2;
		} else if (Math.round(position.x + 2.5) % 18 == 9 && (position.y - 3) % 18 == 9) {
			position.y += 1;
		}
	}

	// Place substations
	placeSubstations(entities, substationHeight, position.x);

	entities[9].control_behavior.filters[4].count = signals.delays[signals.delays.length - 1] + 1;

	bp = {
		"blueprint": {
			"icons": [{"signal": {"type": "item", "name": "programmable-speaker"}, "index": 1}],
			"entities": entities,
			"item": "blueprint",
			"label": song.name,
			"version": 64425754627
		}
	};

	bpstring = encode(bp);

	posthog?.capture('Generated blueprint', {
		'Factorio Version': '1',
		Blueprint: bpstring,
	})

	$("#bpoutput").val(bpstring);
}
