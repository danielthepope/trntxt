var http = require('http');
var fs = require('fs');
var util = require('util');

var port = process.env.PORT || 1337;
var apiKey = process.env.APIKEY;
var apiUser = process.env.APIUSER;
var stationCsv = process.env.STATIONCSV || 'resources/station_codes.csv';

var stations = getStations();
var i;

http.createServer(function (req, res) {
	res.writeHead(200, { 'Content-Type': 'text/plain' });
	res.write(util.format('Station CSV: %s\n', stationCsv));
    for (i = 0; i < stations.length; i += 1) {
        res.write(util.format('%s\n', stations[i]));
    }
	res.end('One day (towards the end of April) this will be a really swish train times website that will work over GPRS.\n');
}).listen(port);

function getStations() {
    var result = fs.readFileSync(stationCsv, 'utf8').split('\n');
    result = result.slice(1, result.length);
    return result;
}
