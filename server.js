var express = require('express');
var fs = require('fs');
var util = require('util');

var port = process.env.PORT || 1337;
var apiKey = process.env.APIKEY;
var apiUser = process.env.APIUSER;
var stationCsv = process.env.STATIONCSV || 'resources/station_codes.csv';

function getStations() {
    var result = fs.readFileSync(stationCsv, 'utf8').split('\n');
    result = result.slice(1, result.length);
    return result;
}

var app = express();
var stations = getStations();

var i;
 
app.get('/', function (req, res) {
    res.set('Content-Type', 'text/plain');
    var content = util.format('Station CSV: %s\n', stationCsv);
    for (i = 0; i < stations.length; i += 1) {
        content += util.format('%s\n', stations[i]);
    }
    content += 'One day (towards the end of April) this will be a really swish train times website that will work over GPRS.\n';
    res.send(content);
});
 
var server = app.listen(port, function () {
    console.log('listening on port %s', port);
});
