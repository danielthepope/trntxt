var fs = require('fs');
var util = require('util');
var soap = require('soap');
var sprintf = require('sprintf-js').sprintf;
var extend = require('extend');

var defaultConfig = require('./config/config.example.js');
var customConfig = {};
try {
	customConfig = require('./config/config.js');
} catch (e) {}
var config = extend(defaultConfig, customConfig);

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

	getDepartureObject(stations, function(departureObject) {
		console.log(stations);
		var jadeResponse = {
			content: generateDepartureHtml(departureObject),
			pageTitle: 'trntxt: ' + departureObject.fromStation.stationCode,
			fromStation: departureObject.fromStation.stationCode
		};
		if (departureObject.toStation !== undefined) {
			jadeResponse.pageTitle += ' -> ' + departureObject.toStation.stationCode;
			jadeResponse.toStation = departureObject.toStation.stationCode;
		}
		callback(jadeResponse);
	});
}

function getDepartureObject(stations, callback) {
	var output = {};
	output.fromStation = stations.fromStation;
	if (stations.toStation !== undefined) output.toStation = stations.toStation;
	output.trainServices = [];
	// TODO output.busServices = [];

	var options = {
		numRows: 10,
		crs: stations.fromStation.stationCode
	};
	if (stations.toStation !== undefined) {
		options.filterCrs = stations.toStation.stationCode;
	}

	soap.createClient(soapUrl, function(err, client) {
		client.addSoapHeader(soapHeader);
		return client.GetDepartureBoard(options, function(err, result) {
			console.log(JSON.stringify(result));
			fs.writeFile('public/lastrequest.txt', JSON.stringify(result), function(err) {
				if (err) return console.log(err);
			});


			var oTrainServices = result.GetStationBoardResult.trainServices;
			var aServices = oTrainServices === undefined ? [] : oTrainServices.service;
			var i;
			var aPromises = [];
			for (i = 0; i < aServices.length; i += 1) {
				console.log("Service ", i);
				output.trainServices[i] = {};
				output.trainServices[i].originStation = {
					stationName: aServices[i].origin.location[0].locationName
				};
				output.trainServices[i].destinationStation = {
					stationName: aServices[i].destination.location[0].locationName
				};
				output.trainServices[i].std = aServices[i].std;
				output.trainServices[i].etd = aServices[i].etd;
				if (aServices[i].platform !== undefined) {
					output.trainServices[i].platform = aServices[i].platform;
				} else {
					output.trainServices[i].platform = null;
				}
				output.trainServices[i].serviceID = aServices[i].serviceID;
				if (output.toStation !== undefined) aPromises.push(makePromiseForService(output.trainServices[i].serviceID));
			}
			console.log("Promises: ", aPromises);
			Promise.all(aPromises).then(function(detailedServices) {
				console.log("All details received");
				for (var i = 0; i < detailedServices.length; i++) {
					var arrival = getArrivalTimeForService(detailedServices[i], output.toStation);
					output.trainServices[i].sta = arrival.sta;
					output.trainServices[i].eta = arrival.eta;
				}
				return callback(output);
			}, function(error) {
				console.log("WAAAAAAH", error);
				throw error;
			});
		});
	});
}

function generateDepartureHtml(oDepartures) {
	var output = util.format('<strong>Departure board for %s (%s)',
		oDepartures.fromStation.stationName, oDepartures.fromStation.stationCode);
	if (oDepartures.toStation !== undefined) {
		output += util.format(' calling at %s (%s)',
			oDepartures.toStation.stationName, oDepartures.toStation.stationCode);
	}
	output += '</strong><br><br>';
	if (oDepartures.trainServices.length === 0) {
		output += 'No services found.';
	} else {
		oDepartures.trainServices.forEach(function(service) {
			output += '----<br><br>';
			output += service.originStation.stationName + ' -&gt; <strong>';
			output += service.destinationStation.stationName + '</strong><br>';
			output += 'Departs ' + oDepartures.fromStation.stationName + ' at <strong>';
			// If the train is delayed, strike out the original departure time
			if (service.etd !== 'On time') {
				output += '<del>';
				output += service.std;
				output += '</del>';
			} else {
				output += service.std;
			}
			// Show the estimated departure time: if train is on time it will say 'On time'
			output += ' (' + service.etd + ')</strong>, ';
			if (service.platform !== null) {
				output += 'platform ' + service.platform + '<br>';
			} else {
				output += '<small>no platform information available</small><br>';
			}
			if (oDepartures.toStation !== undefined) {
				output += 'Arriving at ' + oDepartures.toStation.stationName + ' at <strong>';
				if (service.eta !== 'On time') {
					output += '<del>' + service.sta + '</del>';
				} else {
					output += service.sta;
				}
				output += ' (' + service.eta + ')';
				output += '</strong><br>';
			}
			output += '<br>';
		});
	}
	return output;
}

function getArrivalTimeForService(service, toStation) {
	var output = {};
	var callingPointArray = service.GetServiceDetailsResult.subsequentCallingPoints.callingPointList[0].callingPoint;
	for (var i = 0; i < callingPointArray.length; i++) {
		if (callingPointArray[i].crs === toStation.stationCode) {
			output.sta = callingPointArray[i].st;
			output.eta = callingPointArray[i].et;
			break;
		}
	}
	return output;
}

function makePromiseForService(serviceId) {
	console.log("Making promise for service ", serviceId);
	var options = { serviceID: serviceId };
	return new Promise(function(resolve, reject) {
		soap.createClient(soapUrl, function(err, client) {
			console.log("Making request with options: ", options);
			client.addSoapHeader(soapHeader);
			client.GetServiceDetails(options, function(err, result) {
				if (err) return reject(err);
				console.log("Success!");
				console.log(JSON.stringify(result));
				return resolve(result);
			});
		});
	});
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
