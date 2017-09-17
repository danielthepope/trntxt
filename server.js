const express = require('express');
const extend = require('extend');
const pug = require('pug');
const config = require('./src/trntxtconfig.js');
const aws = require('./src/icons/aws');
const Consumer = require('sqs-consumer');
const iconGenerator = require('./src/icons/iconGenerator');
const messageProcessor = require('./src/icons/messageProcessor');
const taskGenerator = require('./src/icons/taskGenerator');
const Query = taskGenerator.Query;
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
  response.sendFile('index.html', { root: './dist' });
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
  // put message on queue to request app icons
  const query = new Query(stations.fromStation.stationCode, stations.toStation ? stations.toStation.stationCode : null);
  aws.sendMessage(query);
});

app.get('/details/:serviceId', (request, response) => {
  nr.getServiceDetails(request.params.serviceId, data => {
    console.log(data);
    response.send(data);
  });
});

app.get('(/:from([A-Z]{3})/:to([A-Z]{3})?)?/manifest.json', (request, response) => {
  const stations = getStationsFromRequest(request);
  const path = request.originalUrl.split('manifest.json')[0];
  const themeColour = request.params.from ? iconGenerator.themeColour(request.params.from, request.params.to) : '#59bcd8';
  const manifest = generateManifest(path, stations, themeColour);

  response.format({
    json: () => {
      response.send(manifest);
    }
  });
});

app.get('/favicon-32x32.png', (request, response) => {
  response.sendFile('favicon-32x32.png', { root: './public' });
});

app.get('(/:from([A-Z]{3})/:to([A-Z]{3})?)?/:filename(*.png)', (request, response) => {
  respondWithIcon(request, response);
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

app.use(express.static('dist'));
app.use(express.static('public'));

let server = null;
let sqsApp = null;

/**
 * Start the server.
 * @param {number} port Optional. If not supplied it will use the port 
 * number defined in the config / PORT env variable
 */
function start(port) {
  const portToUse = port === undefined ? config.port : port;
  server = app.listen(portToUse);
  console.log(`listening on port ${server.address().port}`);
  
  if (aws.isConfigured()) {
    sqsApp = Consumer.create({
      queueUrl: config.iconQueueUrl,
      handleMessage: (message, done) => {
        messageProcessor.processMessage(message.Body, done);
      }
    });
  
    sqsApp.on('error', (err) => {
      console.log(err.message);
    });
  
    sqsApp.on('processing_error', (err, message) => {
      console.log(`Error processing message ${message.Body}`);
      console.log(err);
    })
  
    sqsApp.start();
  }
}

function stop() {
  if (aws.isConfigured() && sqsApp) {
    sqsApp.stop();
  }
  if (server) {
    server.close();
  }
}

function port() {
  if (server) {
    return server.address().port;
  } else {
    return null;
  }
}

function respondWithIcon(request, response) {
  console.log(request.path);
  const task = taskGenerator.deriveTaskFromRequest(request);
  if (!task) return response.sendStatus(400);
  // check for object in S3
  aws.getObject(request.path.substring(1), (err, data) => {
    if (err) {
      console.log('generating image from http request');
      // generate requested image immediately
      const image = request.params.from ? iconGenerator.generateIcon(task) : iconGenerator.generateFavicon(task);
      // send image to requester
      response.type('png');
      image.pipe(response);
    } else {
      console.log('returning image from S3');
      response.contentType('png');
      response.send(data.Body);
    }
  });
}

function generateManifest(prefix, stations, themeColour) {
  const manifest = {};
  
  manifest.lang = 'en';
  manifest.short_name = 'trntxt';
  manifest.name = 'trntxt' +
    (stations.fromStation ? `: ${stations.fromStation.stationName}` : '') +
    (stations.toStation ? ` to ${stations.toStation.stationName}` : '');
  manifest.description = 'Train Text: a data-friendly UK train times service';
  manifest.start_url = prefix;
  manifest.background_color = '#fff';
  manifest.theme_color = themeColour;
  manifest.display = 'browser';
  manifest.icons = [];
  const resolutions = ['36', '48', '72', '96', '144', '192'];
  const densities = ['0.75', '1.0', '1.5', '2.0', '3.0', '4.0'];
  for (let i = 0; i < 6; i++) {
    const icon = {};
    icon.src = prefix + 'android-chrome-' + resolutions[i] + 'x' + resolutions[i] + '.png';
    icon.sizes = resolutions[i] + 'x' + resolutions[i];
    icon.type = 'image/png';
    icon.density = densities[i];
    manifest.icons.push(icon);
  }

  return manifest;
}

module.exports = { port, start, stop }
