var csv = require('csv-string');
var fs = require('fs');
var path = require('path');
var util = require('util');
var soap = require('soap');
var config = require('./trntxtconfig.js');

exports.stations = loadStations('../resources/station_codes.csv');

var soapUrl = 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?ver=2014-02-20';
var soapHeader = util.format('<AccessToken><TokenValue>%s</TokenValue></AccessToken>', config.apiKey
  || console.error("No API key provided. Received: " + config.apiKey));

function loadStations(filePath) {
  var stationFile = fs.readFileSync(path.join(__dirname, filePath), { encoding: 'utf-8' });
  var csvArray = csv.parse(stationFile);
  var output = csvArray.map(function (arr) {
    return {
      stationName: arr[0],
      stationCode: arr[1]
    }
  });
  output.shift();
  return output;
}

exports.findStation = function (input) {
  var results = [];
  input = exports.sanitise(input);
  if (!input || input.length < 3) return results;

  // Find stations whose code matches the input.
  if (input.length === 3) {
    results = exports.stations.filter(function (station) {
      return station.stationCode === input;
    });
    if (results.length > 0) {
      return results;
    }
  }

  // Results array is still empty. Try and compare names.
  // Filter station list to find station names containing all characters in the right order.
  results = exports.stations.filter(function (station) {
    var stationName = exports.sanitise(station.stationName);
    station.firstIndex = stationName.indexOf(input[0]);
    station.biggestChunk = biggestChunk(stationName, input);
    for (var i = 0; i < input.length; i++) {
      var index = stationName.indexOf(input[i]);
      if (index === -1) return false;
      stationName = stationName.substring(index + 1);
    }
    return true;
  });

  results = results.sort(function (stationA, stationB) {
    if (stationA.firstIndex === stationB.firstIndex) {
      if (stationA.biggestChunk === stationB.biggestChunk) {
        return stationA.stationName.replace(/\(.*\)/, '').length - stationB.stationName.replace(/\(.*\)/, '').length;
      } else {
        return stationB.biggestChunk - stationA.biggestChunk;
      }
    } else {
      return stationA.firstIndex - stationB.firstIndex;
    }
  });

  return results;
}

function getStationNameFromCrs(crs) {
  crs = crs.toUpperCase();
  var results = exports.stations.filter(function (station) {
    return station.stationCode === crs;
  });
  if (results.length === 0) return null;
  else return results[0].stationName;
}

function biggestChunk(stationName, input) {
  for (var i = input.length; i > 0; i--) {
    if (stationName.indexOf(input.substring(0, i - 1)) > -1) return i;
  }
  return 0;
}

exports.sanitise = function (input) {
  if (input || input === '') {
    return input
      .toUpperCase()
      .replace('&', 'AND')
      .replace(/[^A-Z0-9]/g, '');
  }
  else return null;
}

exports.getDepartures = function (stations, callback) {
  if (config.apiKey === undefined) {
    console.error('No API key set!');
    var cb = { pageTitle: 'trntxt: ERROR', errorMessage: 'Error: No API key set.' };
    callback(cb);
    return;
  }

  getDepartureObject(stations, function (err, departureObject) {
    if (err) {
      console.error(JSON.stringify(err));
      var errorObject = { pageTitle: 'trntxt: ERROR', errorMessage: 'Error: Getting departures failed.' };
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

  soap.createClient(soapUrl, function (err, client) {
    if (err) return callback(err);
    client.addSoapHeader(soapHeader);
    return client.GetDepartureBoard(options, function (err, result) {
      if (err) return callback(err);
      fs.writeFile('public/lastrequest.txt', JSON.stringify(result, null, 2), function (err) {
        if (err) return console.error(err);
      });

      if (result.GetStationBoardResult.nrccMessages) {
        output.nrccMessages = result.GetStationBoardResult.nrccMessages.message;
        for (var i = 0; i < output.nrccMessages.length; i++) {
          output.nrccMessages[i] = exports.removeHtmlTagsExceptA(output.nrccMessages[i]);
        }
      }
      var oTrainServices = result.GetStationBoardResult.trainServices;
      processDarwinServices(oTrainServices, stations, function (err, trainServices) {
        if (err) return callback(err);
        output.trainServices = trainServices;
        var oBusServices = result.GetStationBoardResult.busServices;
        processDarwinServices(oBusServices, stations, function (err, busServices) {
          if (err) return callback(err);
          output.busServices = busServices;
          return callback(null, output);
        });
      });
    });
  });
}

exports.removeHtmlTagsExceptA = function (input) {
  if (!input) return '';
  return input.replace(/<\/?((([^\/a>]|a[^> ])[^>]*)|)>/ig, '');
}

function processDarwinServices(oServices, stations, callback) {
  var aServices = oServices ? oServices.service : [];
  var aPromises = [];
  var output = [];
  for (var i = 0; i < aServices.length; i++) {
    output[i] = {};
    output[i].originStation = {
      stationName: aServices[i].origin.location[0].locationName
    };
    output[i].destinationStation = {
      stationName: aServices[i].destination.location[0].locationName
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
      aPromises.push(makePromiseForService(output[i].serviceID));
    }
  }
  Promise.all(aPromises).then(function (detailedServices) {
    for (var i = 0; i < detailedServices.length; i++) {
      var arrival = getArrivalTimeForService(detailedServices[i], stations.toStation);
      output[i].sta = arrival.sta;
      output[i].eta = arrival.eta;
      output[i].arrivalStation = arrival.arrivalStation;
      output[i].correctStation = arrival.correctStation;
      var mins = exports.getServiceTime(output[i]);
      output[i].time = exports.formatTime(mins);
    }
    return callback(null, output);
  }, function (error) {
    console.error(error);
    return callback(null, output);
  });
}

function getArrivalTimeForService(service, toStation) {
  var output = {};
  var callingPointArray = service.GetServiceDetailsResult.subsequentCallingPoints.callingPointList[0].callingPoint;
  for (var i = 0; i < callingPointArray.length; i++) {
    if (callingPointArray[i].crs === toStation.stationCode) {
      output.sta = callingPointArray[i].st;
      output.eta = callingPointArray[i].et;
      output.arrivalStation = getStationNameFromCrs(toStation.stationCode);
      output.correctStation = true;
      break;
    } else if (i === callingPointArray.length - 1) {
      output.sta = callingPointArray[i].st;
      output.eta = callingPointArray[i].et;
      output.arrivalStation = getStationNameFromCrs(callingPointArray[i].crs);
      output.correctStation = false;
    }
  }
  return output;
}

function makePromiseForService(serviceId) {
  var options = { serviceID: serviceId };
  return new Promise(function (resolve, reject) {
    soap.createClient(soapUrl, function (err, client) {
      client.addSoapHeader(soapHeader);
      client.GetServiceDetails(options, function (err, result) {
        if (err) return reject(err);
        return resolve(result);
      });
    });
  });
}

exports.getServiceDetails = function (serviceId, callback) {
  return soap.createClient(soapUrl, function (err, client) {
    client.addSoapHeader(soapHeader);
    if (err) throw err;
    var options = { serviceID: serviceId };
    return client.GetServiceDetails(options, function (result) {
      return callback(result);
    });
  });
}

/**
 * Takes a string in hh:mm format and returns the number of minutes
 */
exports.toMins = function (time) {
  time = time.replace(/([^0-9:])/, '');
  var array = time.split(':');
  if (array.length < 2) return -1;
  var h = parseInt(array[0]);
  var m = parseInt(array[1]);
  if (isNaN(h) || isNaN(m)) {
    return -1;
  } else {
    return (60 * h) + m;
  }
}

/**
 * Takes an object with eta, sta, etd and std properties
 * Returns the number of minutes a service should take,
 *   giving preference to the estimated timings
 */
exports.getServiceTime = function (timings) {
  var arrival = exports.toMins(timings.eta);
  if (arrival < 0) {
    arrival = exports.toMins(timings.sta);
  }
  var departure = exports.toMins(timings.etd);
  if (departure < 0) {
    departure = exports.toMins(timings.std);
  }
  if (arrival < 0 || departure < 0) return -1;
  var mins = arrival - departure;
  if (mins < 0) {
    mins += 1440;
  }
  return mins;
}

/**
 * Turns minutes into something like 1h 5m
 */
exports.formatTime = function (mins) {
  if (mins < 0) return null;
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  if (h > 0) return h + 'h ' + m + 'm';
  else return m + 'm';
}
