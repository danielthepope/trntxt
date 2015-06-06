/// <reference path="typings/node/node.d.ts"/>

var express = require('express');
var extend = require('extend');
var jade = require('jade');
var util = require('util');
var config = require('./trntxtconfig.js');
var iconGenerator = require('./iconGenerator.js');
var nr = require('./nationalrail.js');

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
});

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

app.get('*/manifest.json', function (request, response) {
	var manifest = {};
	var path = request.originalUrl.split('manifest.json')[0];

	manifest.lang = 'en';
	manifest.name = 'trntxt';
	manifest.short_name = 'trntxt';
	manifest.start_url = path;
	manifest.display = 'browser';
	manifest.icons = [];
	var resolutions = ['36','48','72','96','144','192'];
	var densities = ['0.75','1.0','1.5','2.0','3.0','4.0'];
	for (var i = 0; i < 6; i++) {
		var icon = {};
		icon.src = path + 'android-chrome-' + resolutions[i] + 'x' + resolutions[i] + '.png';
		icon.sizes = resolutions[i] + 'x' + resolutions[i];
		icon.type = 'image/png';
		icon.density = densities[i];
		manifest.icons.push(icon);
	}

	response.format({
		json: function() {
			response.send(manifest);
		}
	});
});

app.get('/:image(*.png)', function (request, response) {
	var image = iconGenerator.getIcon('TRN', 'TXT', request.params.image);
	response.sendFile(image, {root:'./'});
});

app.get('*/browserconfig.xml', function (request, response) {
	var jadeOptions = {pretty: true};
	var fn = jade.compileFile('resources/browserconfig.jade', jadeOptions);
	var locals = { path: '/' };
	var urlElements = request.originalUrl.split('/');
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

var server = app.listen(config.port, function () {
	console.log('listening on port %s', config.port);
});
