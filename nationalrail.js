var fs = require('fs');
var util = require('util');
var soap = require('soap');

var stations = getStations('resources/station_codes.csv');
var apiKey = process.env.APIKEY;
var soapUrl = 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?ver=2014-02-20';
var soapHeader = util.format('<AccessToken><TokenValue>%s</TokenValue></AccessToken>', apiKey);

exports.findStation = findStation; // function findStation()
exports.getDepartures = getDepartures; // function getDepartures(response, fromStation, toStation)

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
        if (stations[i].stationName.replace(' ','').toUpperCase() === input.toUpperCase()) {
            console.log(util.format("Found station %d: %s (%s)", i, stations[i].stationName, stations[i].stationCode));
            return stations[i];
        }
    }

    console.log("Checking station name matches");
    for(i = 0; i < stations.length; i++) {
        position = stations[i].stationName.replace(' ','').toUpperCase().indexOf(input.toUpperCase());
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

function getDepartures(response, fromStation, toStation) {
    var options = {
        numRows: 10,
        crs: fromStation.stationCode
    }
    var output = util.format('Departure board for %s (%s)', fromStation.stationName, fromStation.stationCode);
    if (toStation !== undefined) {
        options.filterCrs = toStation.stationCode;
        output += util.format(' calling at %s (%s)', toStation.stationName, toStation.stationCode);
    }

    soap.createClient(soapUrl, function(err, client) {
        client.addSoapHeader(soapHeader);
        return client.GetDepartureBoard(options, function(err, result) {
            console.log(JSON.stringify(result));
            fs.writeFile('public/lastrequest.txt', JSON.stringify(result), function(err) {
                if (err) {
                    return console.log(err);
                }
            })
            var formattedData = '';
            try {
                formattedData = formatStationData(result);
            } catch (err) {
                formattedData = 'There was an error processing your request: ' + err.message;
                console.log(err.stack);
            }
            response.send(util.format('%s<br><br>%s<br>%s', output, formattedData, footer()));
        });
    });
}

function formatStationData(oStationBoard) {
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
        if (aServices[i].etd !== 'On time') output += '<del>';
        output += aServices[i].std;
        if (aServices[i].etd !== 'On time') output += '</del>';
        output += ' (' + aServices[i].etd + ')<br>';
        if (aServices[i].platform !== undefined) {
            output += 'Platform ' + aServices[i].platform + '<br>';
        } else {
            output += 'No platform information available<br>';
        }
        output += '<br>';
    }
    return output;
}

function footer() {
    var d = new Date();
    return '<br>----<br><small>Page loaded at ' + d.getHours() + ':' + d.getMinutes() + '<br><br>'
        + '<a href="/">About trntxt</a><br><br>Powered by <a href="http://www.nationalrail.co.uk/">National Rail Enquiries</a>.</small><br>';
}
