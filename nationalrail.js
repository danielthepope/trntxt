var deasync = require('deasync');
var fs = require('fs');
var util = require('util');
var soap = require('soap');
var sprintf = require('sprintf-js').sprintf;
var _ = require('lodash');

var configPath = './config/config.js';
var config = _.extend(
	require(configPath.replace(/\.js$/, ".example.js")),
		(function() {
			try {
				return require.resolve.apply(null, arguments);
			} catch(ໆ) {}
		})(configPath)
		&& require(configPath)
	);

var stations = getStations('resources/station_codes.csv');

var soapUrl = 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?ver=2014-02-20';
var soapHeader = util.format('<AccessToken><TokenValue>%s</TokenValue></AccessToken>', config.apiKey
	|| console.error("No API key provided. Received: "+config.apiKey));
var errorStation = {stationName: "error", stationCode: "XXX"};

/**
 * Returns an array of station objects, each with stationName and stationCode
 */
function getStations(stationCsv) {
	var i;
	var result = fs.readFileSync(stationCsv, 'utf8').split('\n');
	result = result.slice(1, result.length);
	var output = [];
	for (i = 0; i < result.length; i += 1) {
		if (result[i].split(',').length === 2) output.push({stationName: result[i].split(',')[0].trim(), stationCode: result[i].split(',')[1].trim()});
	}
	return output;
}

function findStation(input) {
	var i;
	var bestMatch = {
		stationNumber: -1,
		matchIndex: -1
	}
	var position;

	console.log("Finding station for input " + input);
	if (input.length == 3) {
		console.log("Checking station codes");
		for(i = 0; i < stations.length; i++) {
			if (stations[i].stationCode.toUpperCase() === input.toUpperCase()) {
				console.log(util.format("Found station %d: %s (%s)", i, stations[i].stationName, stations[i].stationCode));
				return stations[i];
			}
		}
	}

	console.log("Checking station name equality");
	for(i = 0; i < stations.length; i++) {
		if (stations[i].stationName.toUpperCase().replace(/[^A-Z]/g,'') === input.toUpperCase()) {
			console.log(util.format("Found station %d: %s (%s)", i, stations[i].stationName, stations[i].stationCode));
			return stations[i];
		}
	}

	console.log("Checking station name matches");
	for(i = 0; i < stations.length; i++) {
		position = stations[i].stationName.toUpperCase().replace(/[^A-Z]/g,'').indexOf(input.toUpperCase());
		if (position != -1) {
			console.log(util.format("Found station %d: %s (%s) at position %d", i, stations[i].stationName, stations[i].stationCode, position));
			if (bestMatch.stationNumber === -1 || bestMatch.matchIndex > position) {
				console.log('new best match!');
				bestMatch.stationNumber = i;
				bestMatch.matchIndex = position;
			}
		}
	}
	if (bestMatch.stationNumber !== -1) return stations[bestMatch.stationNumber];

	console.log("No match found");
	return errorStation;
}

function getDepartures(stations, callback) {
	if (config.apiKey === undefined) {
		console.error('No API key set!');
		var cb = {pageTitle:'trntxt: ERROR', content:'<p>Error: No API key set.</p>'};
		callback(cb);
		return;
	}
	var options = {
		numRows: 10,
		crs: stations.fromStation.stationCode
	};
	var output = util.format('<strong>Departure board for %s (%s)',
		stations.fromStation.stationName, stations.fromStation.stationCode);
	if (stations.toStation !== undefined) {
		options.filterCrs = stations.toStation.stationCode;
		output += util.format(' calling at %s (%s)', stations.toStation.stationName, stations.toStation.stationCode);
	}
	output += '</strong>';

	soap.createClient(soapUrl, function(err, client) {
		client.addSoapHeader(soapHeader);
		return client.GetDepartureBoard(options, function(err, result) {
			console.log(JSON.stringify(result));
			fs.writeFile('public/lastrequest.txt', JSON.stringify(result), function(err) {
				if (err) {
					return console.log(err);
				}
			});
			var formattedData = '';
			try {
				formattedData = formatDepartureData(result, stations.fromStation, stations.toStation);
			} catch (err) {
				formattedData = 'There was an error processing your request: ' + err.message;
				console.log(err.stack);
			}
			var cb = {
				content: util.format('%s<br><br>%s', output, formattedData),
				pageTitle: 'trntxt: '
			};
			cb.pageTitle += stations.fromStation.stationCode;
			if (stations.toStation !== undefined) {
				cb.pageTitle += ' > '+stations.toStation.stationCode;
			}
			callback(cb);
		});
	});
}

function formatDepartureData(oStationBoard, fromStation, toStation) {
	var oTrainServices = oStationBoard.GetStationBoardResult.trainServices;
	var aServices = oTrainServices === undefined ? [] : oTrainServices.service;
	var i;
	var output = '';
	if (aServices.length === 0) {
		output += 'No services found.';
	}
	for (i = 0; i < aServices.length; i += 1) {
		output += '----<br><br>';
		output += aServices[i].origin.location[0].locationName + ' --&gt; <strong>' + aServices[i].destination.location[0].locationName + '</strong><br>';
		output += 'Departs ' + fromStation.stationName + ' at <strong>';
		// If the train is delayed, strike out the original departure time
		if (aServices[i].etd !== 'On time') {
			output += '<del>';
			output += aServices[i].std;
			output += '</del>';
		} else {
			output += aServices[i].std;
		}
		// Show the estimated departure time: If train is on time it will say 'On time'
		output += ' (' + aServices[i].etd + ')</strong>, ';
		if (aServices[i].platform !== undefined) {
			output += 'platform ' + aServices[i].platform + '<br>';
		} else {
			output += '<small>(no platform information available)</small><br>';
		}
		if (toStation !== undefined) {
			output += "Arriving at " + toStation.stationName + " at <strong>";
			output += getArrivalTimeForService(aServices[i], fromStation, toStation) + "</strong><br>";
		}
		output += '<br>';
	}
	return output;
}

function getArrivalTimeForService(service, fromStation, toStation) {
	console.log("------ A SERVICE ------");
	var serviceID = service.serviceID;
	console.log(serviceID);
	var options = {serviceID:serviceID};
	var output;
	var done = false;
	soap.createClient(soapUrl, function(err, client) {
		console.log(JSON.stringify(service));
		client.addSoapHeader(soapHeader);
		return client.GetServiceDetails(options, function(err, result) {
			var callingPointArray = result.GetServiceDetailsResult.subsequentCallingPoints.callingPointList[0].callingPoint;
			for (var i = 0; i < callingPointArray.length; i++) {
				if (callingPointArray[i].crs === toStation.stationCode) {
					var st = callingPointArray[i].st;
					var et = callingPointArray[i].et;
					if (et === "On time") {
						output = st + " (" + et + ")";
					} else {
						output = "<del>" + st + "</del> (" + et + ")";
					}
					done = true;
					return;
				}
			}
			output = "actually it doesn't";
			done = true;
		});
	});
	while (!done) {
		deasync.runLoopOnce();
	}
	return output;
}

function getServiceDetails(serviceId, callback) {
	return soap.createClient(soapUrl, function(err, client) {
		client.addSoapHeader(soapHeader);
		if (err) console.log("ERR1" + err);
		var options = {serviceID: serviceId};
		return client.GetServiceDetails(options, function(result) {
			return callback(result);
		});
	});
}

exports.findStation   = findStation;   // function findStation()
exports.getDepartures = getDepartures; // function getDepartures(response, fromStation, toStation)
exports.errorStation  = errorStation;  // A station object which can be used when an error occurrs.
exports.getServiceDetails = getServiceDetails;
