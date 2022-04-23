///<reference path="../types/index.d.ts" />
import * as cors from 'cors';
import * as express from 'express';
import * as extend from 'extend';
import * as pug from 'pug';
import * as config from './trntxtconfig';
import * as iconGenerator from './icons/iconGenerator';
import * as taskGenerator from './icons/taskGenerator';
import * as nr from './nationalrail';
import { FromAndToStation } from './types';

const app = express();

const pugOptions = { doctype: 'html' };
const pugGlobals = { pageTitle: 'trntxt' };

function compile(locals: { [key: string]: any }) {
  const fn = pug.compileFile('resources/template.pug', pugOptions);
  return fn(extend({}, pugGlobals, locals));
}

function getStationsFromRequest(request: express.Request) {
  const output = new FromAndToStation();
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
    console.log(`Request failed: ${errorMessage}`);
    throw errorMessage;
  }
}

app.get('/', (request, response) => {
  response.sendFile('index.html', { root: './dist/public', maxAge: 3600000 });
});

app.get('/d', (request, response) => {
  let from = request.query.from;
  let to = request.query.to;
  if (from) from = from.toString().replace(/\W/g, '');
  if (to) to = to.toString().replace(/\W/g, '');
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

app.get('/api/departures/:from(\\w+)/:to(\\w+)?', cors(), (request, response) => {
  console.log(request.path);
  // var secret = request.headers['x-mashape-proxy-secret'];
  // if (!secret) return response.status(401).send('Header X-Mashape-Proxy-Secret is not present');
  // if (secret !== config.mashapeProxySecret) return response.status(401).send('Invalid X-Mashape-Proxy-Secret');
  // User would be authenticated if I uncomment the bit above.
  let stations = new FromAndToStation();
  try {
    stations = getStationsFromRequest(request);
  } catch (e) {
    return response.status(400).send(e);
  }
  const output: { [key: string]: any } = {};
  output['stations'] = stations;

  nr.getDepartures(stations, (err, nrResponse) => {
    if (stations['toStation']) {
      console.log(`API request for departures from ${stations['fromStation'].stationName} (${stations['fromStation'].stationCode}) to ${stations['toStation'].stationName} (${stations['toStation'].stationCode}) returned ${nrResponse.departureObject.trainServices?.length} train services and ${nrResponse.departureObject.busServices?.length} bus services`);
    } else {
      console.log(`API request for departures from ${stations['fromStation'].stationName} (${stations['fromStation'].stationCode}) returned ${nrResponse.departureObject.trainServices?.length} train services and ${nrResponse.departureObject.busServices?.length} bus services`);
    }
    output['departures'] = nrResponse.departureObject.trainServices;
    output['warnings'] = nrResponse.departureObject.nrccMessages;
    return response.set('Cache-Control', 'public, max-age=20').send(output);
  });
});

// Regex matches letters (no dots), ? means 'to' is optional
app.get('/:from(\\w+)/:to(\\w+)?', (request, response) => {
  console.log(request.path);
  let stations = new FromAndToStation();
  const locals: { [key: string]: any } = {};
  locals['url'] = request.originalUrl;
  try {
    stations = getStationsFromRequest(request);
  } catch (e) {
    locals['errorMessage'] = e;
    return response.send(compile(locals));
  }

  locals['stationCodePath'] = '/' + stations['fromStation'].stationCode + '/';
  if (stations['toStation']) locals['stationCodePath'] += stations['toStation'].stationCode + '/';
  locals['didYouMean'] = stations['didYouMean'];

  nr.getDepartures(stations, (error, departureResponse) => {
    if (stations['toStation']) {
      console.log(`HTML request for departures from ${stations['fromStation'].stationName} (${stations['fromStation'].stationCode}) to ${stations['toStation'].stationName} (${stations['toStation'].stationCode}) returned ${departureResponse.departureObject.trainServices?.length} train services and ${departureResponse.departureObject.busServices?.length} bus services`);
    } else {
      console.log(`HTML request for departures from ${stations['fromStation'].stationName} (${stations['fromStation'].stationCode}) returned ${departureResponse.departureObject.trainServices?.length} train services and ${departureResponse.departureObject.busServices?.length} bus services`);
    }
    response.set('Cache-Control', 'public, max-age=20');
    response.send(compile(extend({}, locals, error, departureResponse)));
  });
});

app.get('(/:from([A-Z]{3})/:to([A-Z]{3})?)?/manifest.json', (request, response) => {
  console.log(request.path);
  const stations = getStationsFromRequest(request);
  const path = request.originalUrl.split('manifest.json')[0];
  const manifest = generateManifest(path, stations);

  response.format({
    json: () => {
      response.send(manifest);
    }
  });
});

app.get('/favicon-32x32.png', (request, response) => {
  response.sendFile('favicon-32x32.png', { root: './public', maxAge: 86400000 });
});

app.get('(/:from([A-Z]{3})/:to([A-Z]{3})?)?/:filename(*.png)', (request, response) => {
  console.log(request.path);
  respondWithIcon(request, response);
});

app.get('*/browserconfig.xml', (request, response) => {
  console.log(request.path);
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

app.use(express.static('dist/public', { maxAge: 86400000 }));
app.use(express.static('public'));

let server: any = null;

/**
 * Start the server.
 * @param {number} desiredPort Optional. If not supplied it will use the port 
 * number defined in the config / PORT env variable
 */
function start(desiredPort?: number) {
  const portToUse = desiredPort === undefined ? config.PORT : desiredPort;
  server = app.listen(portToUse);
  console.log(`listening on port ${port()}`);
}

function stop() {
  if (server) {
    server.close();
  }
}

function port(): number {
  if (server) {
    return server.address().port;
  } else {
    return null;
  }
}

function respondWithIcon(request: express.Request, response: express.Response) {
  const task = taskGenerator.deriveTaskFromRequest(request);
  if (!task) return response.sendStatus(400);
  const callback = function (err: Error, buffer: Buffer) {
    if (err) {
      response.status(500).send(err);
    } else {
      response.type('png');
      response.set('Cache-Control', 'public, max-age=86400');
      response.send(buffer);
    }
  }
  const image = request.params.from ? iconGenerator.generateIcon(task, callback) : iconGenerator.generateFavicon(task, callback);
}

function generateManifest(prefix: string, stations: FromAndToStation) {
  const manifest: { [key: string]: any } = {};

  manifest['lang'] = 'en';
  manifest['short_name'] = 'trntxt';
  manifest['name'] = 'trntxt' +
    (stations.fromStation ? `: ${stations.fromStation.stationName}` : '') +
    (stations.toStation ? ` to ${stations.toStation.stationName}` : '');
  manifest['description'] = 'Train Text: a data-friendly train times site for Great Britain';
  manifest['start_url'] = prefix;
  manifest['background_color'] = '#fff';
  manifest['theme_color'] = '#59bcd8';
  manifest['display'] = 'browser';
  manifest['icons'] = [];
  const resolutions = ['36', '48', '72', '96', '144', '192'];
  resolutions.forEach(resolution => {
    const icon: { [key: string]: string } = {};
    icon['src'] = `${prefix}android-chrome-${resolution}x${resolution}.png`;
    icon['sizes'] = `${resolution}x${resolution}`;
    icon['type'] = 'image/png';
    manifest['icons'].push(icon);
  });

  return manifest;
}

export { port, start, stop };
