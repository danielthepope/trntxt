var express = require('express');
var util = require('util');
var nr = require('./nationalrail.js');

var port = process.env.PORT || 3000;

var app = express();
var errorStation = {stationName: "error", stationCode: "XXX"};

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

app.get('/arr/:to/:from', function (req, res) {
    var toStation = nr.findStation(req.params.to);
    var fromStation = nr.findStation(req.params.from);
    if (toStation.stationCode === errorStation.stationCode || fromStation.stationCode === errorStation.stationCode) {
        res.send('One or more invalid parameters');
        return;
    }
    // TODO
    res.send(util.format('This will find arrival times to %s from %s<br>It doesn\'t yet.', toStation.stationName, fromStation.stationName));
});

app.get('/arr/:to', function (req, res) {
    var toStation = nr.findStation(req.params.to);
    if (toStation.stationCode === errorStation.stationCode) {
        res.send('Invalid station name entered');
        return;
    }
    // TODO
    res.send(util.format('This will find the arrival board for %s<br>It doesn\'t yet.', toStation.stationName));
});

app.use(express.static('public'));
 
var server = app.listen(port, function () {
    console.log('listening on port %s', port);
});
