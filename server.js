var express = require('express');
var fs = require('fs');
var util = require('util');
var soap = require('soap');

var port = process.env.PORT || 3000;
var apiKey = process.env.APIKEY;
var apiUser = process.env.APIUSER;
var stationCsv = process.env.STATIONCSV || 'resources/station_codes.csv';
var soapUrl = 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?ver=2014-02-20';
var footer = '----<br><br><small><a href="/">About mtrain</a><br><br>Powered by <a href="http://www.nationalrail.co.uk/">National Rail Enquiries</a>.</small><br>';

var app = express();
var stations = getStations();
var errorStation = {stationName: "error", stationCode: "XXX"};
 
app.get('/', function (req, res) {
    var content = util.format('Station CSV: %s<br>', stationCsv);
    content += 'Go to /dep/:from/:to<br>';
    content += 'This isn\'t working yet. Follow <a href="https://twitter.com/danielthepope">@danielthepope</a> for news.<br>';
    res.send(content);
});

app.get('/dep/:from/:to', function (req, res) {
    var fromStation = findStation(req.params.from);
    var toStation = findStation(req.params.to);
    if (fromStation.stationCode === "XXX" || toStation.stationCode === "XXX") {
        res.send('One or more invalid parameters');
        return;
    }
    // TODO
    res.send(util.format('Finding departure times from %s to %s<br>TODO', fromStation.stationName, toStation.stationName));
});

app.get('/dep/:from', function (req, res) {
    var fromStation = findStation(req.params.from);
    if (fromStation.stationCode === "XXX") {
        res.send('Invalid station name entered');
        return;
    }
    
    soap.createClient(soapUrl, function(err, client) {
        client.addSoapHeader(util.format('<AccessToken><TokenValue>%s</TokenValue></AccessToken>', apiKey));
        return client.GetDepartureBoard({numRows: 10, crs: fromStation.stationCode}, function(err, result) {
            res.send(util.format('Departure board for %s (%s)<br><br>%s', fromStation.stationName, fromStation.stationCode, formatStationData(result, fromStation.stationName)));
            return console.log(JSON.stringify(result));
        });
    });

});

app.get('/arr/:to/:from', function (req, res) {
    var toStation = findStation(req.params.to);
    var fromStation = findStation(req.params.from);
    if (toStation.stationCode === "XXX" || fromStation.stationCode === "XXX") {
        res.send('One or more invalid parameters');
        return;
    }
    // TODO
    res.send(util.format('Finding arrival times to %s from %s<br>TODO', toStation.stationName, fromStation.stationName));
});

app.get('/arr/:to', function (req, res) {
    var toStation = findStation(req.params.to);
    if (toStation.stationCode === "XXX") {
        res.send('Invalid station name entered');
        return;
    }
    // TODO
    res.send(util.format('Finding arrival board for %s<br>TODO', toStation.stationName));
});

app.use(express.static('public'));
 
var server = app.listen(port, function () {
    console.log('listening on port %s', port);
});

/**
 * Returns an array of station objects, each with stationName and stationCode
 */
function getStations() {
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

function formatStationData(oStationBoard, stationName) {
    var aServices = oStationBoard.GetStationBoardResult.trainServices.service;
    var i;
    var output = '';
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

    // output += JSON.stringify(oStationBoard);
    output += footer
    return output;
}
