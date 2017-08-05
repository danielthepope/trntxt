const express = require('express');
const extend = require('extend');
const pug = require('pug');
const uaParser = require('ua-parser-js');
const config = require('./src/trntxtconfig.js');
const iconGenerator = require('./src/iconGenerator.js');
const nr = require('./src/nationalrail.js');
const sumo = require('./src/sumo.js');

const app = express();

const pugOptions = { doctype: 'html' };
const pugGlobals = { pageTitle: 'trntxt' };

function compile(locals) {
  const fn = pug.compileFile('resources/template.pug', pugOptions);
  return fn(extend({}, pugGlobals, locals));
}

function getStationsFromRequest(request) {
  const output = {};
  const errors = [];
  output.didYouMean = {
    from: [],
    to: []
  };
  if (request.params.from !== undefined) {
    const results = nr.findStation(request.params.from);
    if (results.length > 0) {
      output.fromStation = results[0];
      output.didYouMean.from = results.slice(1).filter(otherMatch => {
        return results[0].biggestChunk === otherMatch.biggestChunk;
      });
    } else {
      errors.push(request.params.from);
    }
  }
  if (request.params.to !== undefined) {
    const results = nr.findStation(request.params.to);
    if (results.length > 0) {
      output.toStation = results[0];
      output.didYouMean.to = results.slice(1).filter(otherMatch => {
        return results[0].biggestChunk === otherMatch.biggestChunk;
      });
    } else {
      errors.push(request.params.to);
    }
  }
  if (errors.length === 0) return output;
  else {
    let errorMessage = "Invalid station name";
    if (errors.length > 1) errorMessage += "s: ";
    else errorMessage += ": ";
    errors.forEach(name => {
      errorMessage += name + ", ";
    });
    errorMessage = errorMessage.replace(/, $/, "");
    throw errorMessage;
  }
}

app.get('/', (request, response) => {
  response.sendFile('index.html', { root: './public' });
  sumo.post(request.url, response.statusCode, request.ip, request.headers['user-agent']);
});

app.get('/defaultsite', (request, response) => {
  response.sendFile('index.html', { root: './public' });
  sumo.post(request.url, response.statusCode, request.ip, request.headers['user-agent']);
});

app.get('/d', (request, response) => {
  let from = request.query.from;
  let to = request.query.to;
  if (from) from = from.replace(/\W/g, '');
  if (to) to = to.replace(/\W/g, '');
  if (from) {
    if (to) {
      response.redirect('/' + from + '/' + to);
    } else {
      response.redirect('/' + from);
    }
  } else {
    response.redirect('/');
  }
});

// Regex matches letters (no dots), ? means 'to' is optional
app.get('/:from(\\w+)/:to(\\w+)?', (request, response) => {
  let stations = {};
  const locals = {};
  const uaString = request.headers['user-agent'];
  locals.agent = uaParser(uaString);
  locals.url = request.originalUrl;
  try {
    stations = getStationsFromRequest(request);
  } catch (e) {
    locals.errorMessage = e;
    return response.send(compile(locals));
  }

  locals.stationCodePath = '/' + stations.fromStation.stationCode + '/';
  if (stations.toStation) locals.stationCodePath += stations.toStation.stationCode + '/';
  locals.didYouMean = stations.didYouMean;

  nr.getDepartures(stations, output => {
    response.send(compile(extend({}, locals, output)));
    sumo.post(request.url, response.statusCode, request.ip, request.headers['user-agent'], stations);
  });
});

app.get('/details/:serviceId', (request, response) => {
  nr.getServiceDetails(request.params.serviceId, data => {
    console.log(data);
    response.send(data);
  });
});

app.get('/:from(\\w+)/:to(\\w+)?/:image(*.png)', (request, response) => {
  const from = request.params.from;
  const to = request.params.to;
  if ((from && from.length > 3) || (to && to.length > 3)) {
    return response.sendStatus(403);
  }
  const image = iconGenerator.getIcon(request.params.from, request.params.to, request.params.image);

  response.type('png');
  image.pipe(response);
});

app.get('/favicon-32x32.png', (request, response) => {
  response.sendFile('favicon-32x32.png', { root: './public' });
});

app.get('*/manifest.json', (request, response) => {
  const manifest = {};
  const path = request.originalUrl.split('manifest.json')[0];

  manifest.lang = 'en';
  manifest.name = 'trntxt';
  manifest.short_name = 'trntxt';
  manifest.start_url = path;
  manifest.display = 'browser';
  manifest.icons = [];
  const resolutions = ['36', '48', '72', '96', '144', '192'];
  const densities = ['0.75', '1.0', '1.5', '2.0', '3.0', '4.0'];
  for (let i = 0; i < 6; i++) {
    const icon = {};
    icon.src = path + 'android-chrome-' + resolutions[i] + 'x' + resolutions[i] + '.png';
    icon.sizes = resolutions[i] + 'x' + resolutions[i];
    icon.type = 'image/png';
    icon.density = densities[i];
    manifest.icons.push(icon);
  }

  response.format({
    json: () => {
      response.send(manifest);
    }
  });
});

app.get('/:image(*.png)', (request, response) => {
  const image = iconGenerator.getIcon('TRN', 'TXT', request.params.image);

  response.type('png');
  image.pipe(response);
});

app.get('*/browserconfig.xml', (request, response) => {
  const pugOptions = { pretty: true };
  const fn = pug.compileFile('resources/browserconfig.pug', pugOptions);
  const locals = { path: '/' };
  const urlElements = request.originalUrl.split('/');
  urlElements.forEach(element => {
    if (element !== 'browserconfig.xml' && element !== '') {
      const results = nr.findStation(element);
      if (results.length > 0) {
        locals.path += results[0].stationCode + '/';
      }
    }
  });
  response.format({
    'application/xml': () => {
      response.send(fn(locals));
    }
  });
});

app.use(express.static('public'));

const server = app.listen(config.port, () => {
  console.log('listening on port %s', config.port);
});
