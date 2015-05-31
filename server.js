/// <reference path="typings/node/node.d.ts"/>

var express = require('express');
var util = require('util');
var jade = require('jade');
var extend = require('extend');
var nr = require('./nationalrail.js');
var iconGenerator = require('./iconGenerator.js');

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

app.all('*', function(request, response, next) {
	console.log('Got request for', request.originalUrl);
	next();
})

app.get('/defaultsite', function(request, response) {
	response.sendFile('index.html', {root:'./public'});
});

// Regex matches letters (no dots), ? means 'to' is optional
app.get('/:from(\\w+)/:to(\\w+)?', function (request, response) {
	var stations = {};
	try {
		stations = getStationsFromRequest(request);
	} catch (e) {
		return response.send(e);
	}
	
	var locals = { path: '/' + stations.fromStation.stationCode + '/' };
	if (stations.toStation) locals.path += stations.toStation.stationCode + '/';
	
	nr.getDepartures(stations, function(output) {
		response.send(compile(extend({}, locals, output)));
	});
});

app.get('/details/:serviceId', function (request, response) {
	nr.getServiceDetails(request.params.serviceId, function(data) {
		console.log(data);
		response.send(data);
	});
});

app.get('/:from(\\w+)/:to(\\w+)?/:image(*.png)', function (request, response) {
	var image = iconGenerator.getIcon(request.params.from, request.params.to, request.params.image);
	response.sendFile(image, {root:'./'});
});

app.get('/favicon-16x16.png', function (request, response) {
	response.sendFile('favicon-16x16.png', {root:'./public'});
});

app.get('/:image(*.png)', function (request, response) {
	var image = iconGenerator.getIcon('TRN', 'TXT', request.params.image);
	response.sendFile(image, {root:'./'});
});

app.get('*/browserconfig.xml', function (request, response) {
	console.log('CONFIG');
	var jadeOptions = {pretty: true};
	var fn = jade.compileFile('resources/browserconfig.jade', jadeOptions);
	var locals = { path: '/' };
	var urlElements = request.originalUrl.split('/');
	console.log(urlElements);
	urlElements.forEach(function(element) {
		if (element !== 'browserconfig.xml' && element !== '') {
			var station = nr.findStation(element);
			if (station.stationCode !== errorStation.stationCode) {
				locals.path += station.stationCode + '/';
			}
		}
	});
	response.format({
		'application/xml': function() {
			response.send(fn(locals));
		}
	});
});

app.use(express.static('public'));

var server = app.listen(port, function () {
	console.log('listening on port %s', port);
});
