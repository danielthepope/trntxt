var csv = require('csv-string');
var fs = require('fs');
var path = require('path');
var util = require('util');
var soap = require('soap');
var sprintf = require('sprintf-js').sprintf;
var config = require('./trntxtconfig.js');

exports.stations = loadStations('../resources/station_codes.csv');

var soapUrl = 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?ver=2015-05-14';
var soapHeader = util.format('<AccessToken><TokenValue>%s</TokenValue></AccessToken>', config.apiKey
	|| console.error("No API key provided. Received: "+config.apiKey));

function loadStations(filePath) {
	var stationFile = fs.readFileSync(path.join(__dirname, filePath), {encoding:'utf-8'});
	var csvArray = csv.parse(stationFile);
	var output = csvArray.map(function(arr) {
		return {
			stationName: arr[0],
			stationCode: arr[1]
		}
	});
	output.shift();
	return output;
}

exports.findStation = function(input) {
	var results = [];
	// console.log(input);
	input = exports.sanitise(input);
	// console.log(input);
	if (!input || input.length < 3) return results;
	
	// Find stations whose code matches the input.
	if (input.length === 3) {
		// console.log('LENGTH IS 3');
		results = exports.stations.filter(function(station) {
			return station.stationCode === input;
		});
		if (results.length > 0) {
			// console.log('FOUND A RESULT');
			return results;
		}
	}
	
	// Results array is still empty. Try and compare names.
	// Filter station list to find station names containing all characters in the right order.
	results = exports.stations.filter(function(station) {
		var stationName = exports.sanitise(station.stationName);
		// console.log('testing against ' + stationName);
		station.firstIndex = stationName.indexOf(input[0]);
		station.biggestChunk = biggestChunk(stationName, input);
		// console.log('index of ' + input[0] + ' is ' + firstIndex)
		for (var i = 0; i < input.length; i++) {
			var index = stationName.indexOf(input[i]);
			if (index === -1) return false;
			stationName = stationName.substring(index+1);
		}
		// if (stationName === '') return true;
		// else return false;
		return true;
	});
	
	results = results.sort(function(stationA, stationB) {
		if (stationA.firstIndex === stationB.firstIndex) {
			if (stationA.biggestChunk === stationB.biggestChunk) {
				return stationA.stationName.replace(/\(.*\)/,'').length - stationB.stationName.replace(/\(.*\)/,'').length;
			} else {
				return stationB.biggestChunk - stationA.biggestChunk;
			}
			return stationB.biggestChunk - stationA.biggestChunk;
		} else {
			return stationA.firstIndex - stationB.firstIndex;
		}
	});
	
	return results;
}

function biggestChunk(stationName, input) {
	for (var i = input.length; i > 0; i--) {
		if (stationName.indexOf(input.substring(0,i-1)) > -1) return i;
	}
	return 0;
}

exports.sanitise = function(input) {
	if (input || input === '') {
		return input
			.toUpperCase()
			.replace('&','AND')
			.replace(/[^A-Z0-9]/g,'');
	}
	else return null;
}

exports.getDepartures = function(stations, callback) {
	if (config.apiKey === undefined) {
		console.error('No API key set!');
		var cb = {pageTitle:'trntxt: ERROR', errorMessage:'Error: No API key set.'};
		callback(cb);
		return;
	}

	getDepartureObject(stations, function(err, departureObject) {
		if (err) {
			console.error(err);
			var errorObject = {pageTitle:'trntxt: ERROR', errorMessage:'Error: Getting departures failed.'};
			return callback(errorObject);
		}
		var jadeResponse = {
			departureObject: departureObject,
			pageTitle: 'trntxt: ' + departureObject.fromStation.stationCode,
			fromStation: departureObject.fromStation.stationCode
		};
		if (departureObject.toStation !== undefined) {
			jadeResponse.pageTitle += ' > ' + departureObject.toStation.stationCode;
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
	output.busServices = [];

	var options = {
		numRows: 10,
		crs: stations.fromStation.stationCode
	};
	if (stations.toStation !== undefined) {
		options.filterCrs = stations.toStation.stationCode;
	}

	soap.createClient(soapUrl, function(err, client) {
		if (err) return callback(err);
		client.addSoapHeader(soapHeader);
		return client.GetDepBoardWithDetails(options, function(err, result) {
			if (err) return callback(err);
			fs.writeFile('public/lastrequest.txt', JSON.stringify(result), function(err) {
				if (err) return console.error(err);
			});

			if (result.GetStationBoardResult.nrccMessages) {
				output.nrccMessages = result.GetStationBoardResult.nrccMessages.message;
				for (var i = 0; i < output.nrccMessages.length; i++) {
					output.nrccMessages[i] = exports.removeHtmlTagsExceptA(output.nrccMessages[i]);
				}
			}
			output.trainServices = processDarwinServices(result.GetStationBoardResult.trainServices, stations);
			output.busServices = processDarwinServices(result.GetStationBoardResult.busServices, stations);
			
			return callback(null, output);
		});
	});
}

exports.removeHtmlTagsExceptA = function(input) {
	if (!input) return '';
	return input.replace(/<\/?((([^\/a>]|a[^> ])[^>]*)|)>/ig,'');
}

function processDarwinServices(oServices, stations) {
	var aServices = oServices ? oServices.service : [];
	var output = [];
	for (var i = 0; i < aServices.length; i++) {
		output[i] = {};
		output[i].originStation = {
			stationName: aServices[i].origin.location.locationName,
			stationCode: aServices[i].origin.location.crs
		};
		output[i].destinationStation = {
			stationName: aServices[i].destination.location.locationName,
			stationCode: aServices[i].destination.location.crs
		};
		output[i].std = aServices[i].std;
		output[i].etd = aServices[i].etd;
		if (aServices[i].platform) {
			output[i].platform = aServices[i].platform;
		} else {
			output[i].platform = null;
		}
		output[i].serviceID = aServices[i].serviceID;
		if (stations.toStation) {
			var arrival = getArrivalTimeForService(aServices[i].subsequentCallingPoints.callingPointList.callingPoint, stations.toStation);
			output[i].sta = arrival.sta;
			output[i].eta = arrival.eta;
		}
	}
	return output;
}

function getArrivalTimeForService(callingPointArray, toStation) {
	var output = {};
	// Turn it into an Array if it isn't already
	if (callingPointArray.constructor === Object) {
		callingPointArray = [callingPointArray];
	}
	for (var i = 0; i < callingPointArray.length; i++) {
		if (callingPointArray[i].crs === toStation.stationCode) {
			output.sta = callingPointArray[i].st;
			output.eta = callingPointArray[i].et;
			break;
		} else if (i === callingPointArray.length - 1) {
			output.sta = '> ' + callingPointArray[i].st;
			output.eta = 'Overtaken';
		}
	}
	return output;
}

exports.getServiceDetails = function(serviceId, callback) {
	return soap.createClient(soapUrl, function(err, client) {
		client.addSoapHeader(soapHeader);
		if (err) throw err;
		var options = {serviceID: serviceId};
		return client.GetServiceDetails(options, function(result) {
			return callback(result);
		});
	});
}
