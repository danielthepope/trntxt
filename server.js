var express = require('express');
var util = require('util');
var nr = require('./nationalrail.js');

var port = process.env.PORT || 3000;

var app = express();
var errorStation = nr.errorStation;

app.get('/dep/:from/:to', function (request, response) {
    var fromStation = nr.findStation(request.params.from);
    var toStation = nr.findStation(request.params.to);
    if (fromStation.stationCode === errorStation.stationCode || toStation.stationCode === errorStation.stationCode) {
        response.send('One or more invalid parameters');
        return;
    }
    nr.getDepartures(response, fromStation, toStation);
});

app.get('/dep/:from', function (request, response) {
    var fromStation = nr.findStation(request.params.from);
    if (fromStation.stationCode === errorStation.stationCode) {
        response.send('Invalid station name entered');
        return;
    }
    nr.getDepartures(response, fromStation);
});

app.get('/arr/:from/:at', function (request, response) {
    var atStation = nr.findStation(request.params.at);
    var fromStation = nr.findStation(request.params.from);
    if (atStation.stationCode === errorStation.stationCode || fromStation.stationCode === errorStation.stationCode) {
        response.send('One or more invalid parameters');
        return;
    }
    nr.getArrivals(response, atStation, fromStation);
});

app.get('/arr/:at', function (request, response) {
    var atStation = nr.findStation(request.params.at);
    if (atStation.stationCode === errorStation.stationCode) {
        response.send('Invalid station name entered');
        return;
    }
    nr.getArrivals(response, atStation);
});

app.use(express.static('public'));
 
var server = app.listen(port, function () {
    console.log('listening on port %s', port);
});
