var csv = require('csv-parser');
var fs = require('fs');
var path = require('path');
var util = require('util');
var soap = require('soap');
var sprintf = require('sprintf-js').sprintf;
var config = require('./trntxtconfig.js');

var stations = [];
fs.createReadStream(path.join(__dirname, '../resources/station_codes.csv'))
	.pipe(csv())
	.on('data', function (data) {
		stations.push(data)
	});

var soapUrl = 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?ver=2014-02-20';
var altSoapUrl = 'http://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?ver=2014-02-20';
var soapHeader = util.format('<AccessToken><TokenValue>%s</TokenValue></AccessToken>', config.apiKey
	|| console.error("No API key provided. Received: "+config.apiKey));

// Check HTTPS is available. If it throws an error, use HTTP instead.
soap.createClient(soapUrl, function(err, client) {
	if (err && err.code === 'CERT_HAS_EXPIRED') {
		console.error('Darwin HTTPS certificate expired. Using HTTP instead');
		soapUrl = altSoapUrl;
	}
});

function fnFindStation(input) {
	var results = [];
	// console.log(input);
	input = fnSanitise(input);
	// console.log(input);
	if (!input || input.length < 3) return results;
	
	// Find stations whose code matches the input.
	if (input.length === 3) {
		// console.log('LENGTH IS 3');
		results = stations.filter(function(station) {
			return station.stationCode === input;
		});
		if (results.length > 0) {
			// console.log('FOUND A RESULT');
			return results;
		}
	}
	
	// Results array is still empty. Try and compare names.
	// Filter station list to find station names containing all characters in the right order.
	results = stations.filter(function(station) {
		var stationName = fnSanitise(station.stationName);
		// console.log('testing against ' + stationName);
		var firstIndex = stationName.indexOf(input[0]);
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
	
	return results;
}

function fnSanitise(input) {
	if (input || input === '') {
		return input
			.toUpperCase()
			.replace('&','AND')
			.replace(/[^A-Z0-9]/g,'');
	}
	else return null;
}

function fnGetDepartures(stations, callback) {
	if (config.apiKey === undefined) {
		console.error('No API key set!');
		var cb = {pageTitle:'trntxt: ERROR', content:'<p>Error: No API key set.</p>'};
		callback(cb);
		return;
	}

	getDepartureObject(stations, function(departureObject) {
		// console.log(stations);
		var jadeResponse = {
			content: generateDepartureHtml(departureObject),
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
	// TODO output.busServices = [];

	var options = {
		numRows: 10,
		crs: stations.fromStation.stationCode
	};
	if (stations.toStation !== undefined) {
		options.filterCrs = stations.toStation.stationCode;
	}

	soap.createClient(soapUrl, function(err, client) {
		if (err) return console.error(err);
		client.addSoapHeader(soapHeader);
		return client.GetDepartureBoard(options, function(err, result) {
			fs.writeFile('public/lastrequest.txt', JSON.stringify(result), function(err) {
				if (err) return console.error(err);
			});

			var oTrainServices = result.GetStationBoardResult.trainServices;
			var aServices = oTrainServices === undefined ? [] : oTrainServices.service;
			var i;
			var aPromises = [];
			for (i = 0; i < aServices.length; i += 1) {
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
			Promise.all(aPromises).then(function(detailedServices) {
				// console.log("All details received");
				for (var i = 0; i < detailedServices.length; i++) {
					var arrival = getArrivalTimeForService(detailedServices[i], output.toStation);
					output.trainServices[i].sta = arrival.sta;
					output.trainServices[i].eta = arrival.eta;
				}
				return callback(output);
			}, function(error) {
				console.error("WAAAAAAH", error);
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
		output += 'No services found. Trntxt currently does not display information for replacement bus services or routes requiring changes.';
	} else {
		oDepartures.trainServices.forEach(function(service) {
			output += '----<br><br>';
			output += service.originStation.stationName + ' &gt; <strong>';
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
		} else if (i === callingPointArray.length - 1) {
			output.sta = '&gt; ' + callingPointArray[i].st;
			output.eta = 'Overtaken';
		}
	}
	return output;
}

function makePromiseForService(serviceId) {
	var options = { serviceID: serviceId };
	return new Promise(function(resolve, reject) {
		soap.createClient(soapUrl, function(err, client) {
			client.addSoapHeader(soapHeader);
			client.GetServiceDetails(options, function(err, result) {
				if (err) return reject(err);
				return resolve(result);
			});
		});
	});
}

function fnGetServiceDetails(serviceId, callback) {
	return soap.createClient(soapUrl, function(err, client) {
		client.addSoapHeader(soapHeader);
		if (err) throw err;
		var options = {serviceID: serviceId};
		return client.GetServiceDetails(options, function(result) {
			return callback(result);
		});
	});
}

exports.findStation       = fnFindStation;       // function findStation()
exports.getDepartures     = fnGetDepartures;     // function getDepartures(response, fromStation, toStation)
exports.getServiceDetails = fnGetServiceDetails; // function getServiceDetails(serviceId, callback)
exports.sanitise          = fnSanitise;
