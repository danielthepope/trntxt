/// <reference path="typings/node/node.d.ts"/>

var express = require('express');
var util = require('util');
var jade = require('jade');
var extend = require('extend');
var nr = require('./nationalrail.js');

var port = process.env.PORT || 3000;

var app = express();
var errorStation = nr.errorStation;

var jadeOptions = {doctype:'html'};
var jadeGlobals = {pageTitle:'trntxt'};

function compile(locals) {
	var fn = jade.compileFile('resources/template.jade', jadeOptions);
	return fn(extend({}, jadeGlobals, locals));
}

function getStationsFromRequest(request) {
	var output = {};
	var errors = [];
	if (request.params.from !== undefined) {
		output.fromStation = nr.findStation(request.params.from);
		if (output.fromStation.stationCode === errorStation.stationCode) {
			errors.push(request.params.from);
		}
	}
	if (request.params.to !== undefined) {
		output.toStation = nr.findStation(request.params.to);
		if (output.toStation.stationCode === errorStation.stationCode) {
			errors.push(request.params.to);
		}
	}
	if (errors.length === 0) return output;
	else {
		output = "Invalid station name";
		if (errors.length > 1) output += "s: ";
		else output += ": ";
		errors.forEach(function(name) {
			output += name + ", ";
		});
		output = output.replace(/, $/,"");
		throw output;
	}
}

app.get('/defaultsite', function(request, response) {
	response.sendFile('index.html', {root:'./public'});
});

app.get('/:from(\\w+)/:to(\\w+)?', function (request, response) {
	var stations = {};
	try {
		stations = getStationsFromRequest(request);
	} catch (e) {
		return response.send(e);
	}
	nr.getDepartures(stations, function(output) {
		response.send(compile(output));
	});
});

app.get('/details/:serviceId', function (request, response) {
	nr.getServiceDetails(request.params.serviceId, function(data) {
		console.log(data);
		response.send(data);
	});
});

app.use(express.static('public'));
 
var server = app.listen(port, function () {
	console.log('listening on port %s', port);
});
