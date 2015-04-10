var express = require('express');
var fs = require('fs');
var util = require('util');

var port = process.env.PORT || 1337;
var apiKey = process.env.APIKEY;
var apiUser = process.env.APIUSER;
var stationCsv = process.env.STATIONCSV || 'resources/station_codes.csv';

/**
 * Returns an array of station objects, each with stationName and stationCode
 */
function getStations() {
    var result = fs.readFileSync(stationCsv, 'utf8').split('\n');
    result = result.slice(1, result.length);
    var output = [];
    for (var i = 0; i < result.length; i += 1) {
        if (result[i].split(',').length === 2) output.push({stationName: result[i].split(',')[0].trim(), stationCode: result[i].split(',')[1].trim()});
    }
    return output;
}

var app = express();
var stations = getStations();
var errorStation = {stationName: "error", stationCode: "ERR"};
 
app.get('/', function (req, res) {
    // res.set('Content-Type', 'text/html');
    var content = util.format('Station CSV: %s<br>', stationCsv);
    // for (var i = 0; i < stations.length; i += 1) {
    //     content += util.format('%s : %s<br>', stations[i].stationName, stations[i].stationCode);
    // }
    content += 'Go to /dep/:from/:to<br>';
    res.send(content);
});

app.get('/teststation/', function (req, res) {
    var testData = ['didcot', 'Didcot', 'did', 'bath'];
    var content = '';
    for(var i = 0; i < testData.length; i += 1) {
        var station = findStation(testData[i]);
        content += util.format('%s = %s (%s)<br>', testData[i], station.stationName, station.stationCode);
    }
    res.send(content);
});

app.get('/dep/:from/:to', function (req, res) {
    var fromStation = findStation(req.params.from).stationName;
    var toStation = findStation(req.params.to).stationName;
    res.send(util.format('Finding departure times from %s to %s', fromStation, toStation));
})
 
var server = app.listen(port, function () {
    console.log('listening on port %s', port);
});

function findStation(input) {
    console.log("Finding station for input " + input);
    if (input.length == 3) {
        console.log("Checking station codes");
        for(var i = 0; i < stations.length; i++) {
            if (stations[i].stationCode.toUpperCase() === input.toUpperCase()) {
                console.log("Found station " + i + ": " + stations[i].stationName + " (" + stations[i].stationCode + ")");
                return stations[i];
            }
        }
    }
    console.log("Checking station name equality");
    for(var i = 0; i < stations.length; i++) {
        if (stations[i].stationName.replace(' ','').toUpperCase() === input.toUpperCase()) {
            console.log("Found station " + i + ": " + stations[i].stationName + " (" + stations[i].stationCode + ")");
            return stations[i];
        }
    }
    console.log("Checking station name matches");
    for(var i = 0; i < stations.length; i++) {
        if (stations[i].stationName.replace(' ','').toUpperCase().indexOf(input.toUpperCase()) != -1) {
            console.log("Found station " + i + ": " + stations[i].stationName + " (" + stations[i].stationCode + ")");
            return stations[i]; // Do something cleverer
        }
    }
    console.log("No match found");
    return errorStation;
}
