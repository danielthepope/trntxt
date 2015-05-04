/* global process */

var fs = require('fs');
var util = require('util');
var soap = require('soap');
var sprintf = require('sprintf-js').sprintf;

var stations = getStations('resources/station_codes.csv');
var apiKey = process.env.APIKEY; // Imported from Azure

var soapUrl = 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?ver=2014-02-20';
var soapHeader = util.format('<AccessToken><TokenValue>%s</TokenValue></AccessToken>', apiKey);
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
	if (apiKey === undefined) {
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
				formattedData = formatDepartureData(result, stations.fromStation);
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

function formatDepartureData(oStationBoard, fromStation) {
	var oTrainServices = oStationBoard.GetStationBoardResult.trainServices;
	var aServices = oTrainServices === undefined ? [] : oTrainServices.service;
	var i;
	var output = '';
	if (aServices.length === 0) {
		output += 'No services found.'
	}
	for (i = 0; i < aServices.length; i += 1) {
		output += '----<br><br>';
		output += aServices[i].origin.location[0].locationName + ' --&gt; <strong>' + aServices[i].destination.location[0].locationName + '</strong><br>';
		output += 'Departs ' + fromStation.stationName + ' at <strong>';
		if (aServices[i].etd !== 'On time') output += '<del>';
		output += aServices[i].std;
		if (aServices[i].etd !== 'On time') output += '</del>';
		output += ' (' + aServices[i].etd + ')</strong><br>';
		if (aServices[i].platform !== undefined) {
			output += 'Platform ' + aServices[i].platform + '<br>';
		} else {
			output += 'No platform information available<br>';
		}
		output += '<br>';
	}
	return output;
}

exports.findStation   = findStation;   // function findStation()
exports.getDepartures = getDepartures; // function getDepartures(response, fromStation, toStation)
exports.errorStation  = errorStation;
