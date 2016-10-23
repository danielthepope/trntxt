var fs = require('fs');
var requester = require('request');
var uuid = require('uuid');
var config = require('./trntxtconfig.js');

module.exports.generateAccessToken = function(callback) {
  requester.post({
    url: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': 0,
      'Ocp-Apim-Subscription-Key': config.bingSpeechApiKey
    }
  }, function(err, resp, body) {
    if(err) return callback(err);
    callback(null, body);
  });
}

module.exports.speechToText = function(filename, callback) {
  var uid = uuid.v4();
  module.exports.generateAccessToken(function(err, accessToken) {
    if (err) return callback(err);
    fs.readFile(filename, function(err, waveData) {
      if(err) return callback(err);
      requester.post({
        url: 'https://speech.platform.bing.com/recognize',
        qs: {
          'scenarios': 'ulm',
          'appid': 'D4D52672-91D7-4C74-8AD8-42B1D98141A5',
          'locale': 'en-GB',
          'device.os': 'Windows OS',
          'version': '3.0',
          'format': 'json',
          'requestid': uid,
          'instanceid': uid
        },
        body: waveData,
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'audio/wav; samplerate=16000',
          'Content-Length' : waveData.length
        }
      }, function(err, resp, body) {
        if(err) return callback(err);
        console.log(body);
        try {
          callback(null, JSON.parse(body).header.lexical);
        } catch(e) {
          callback(e);
        }
      });
    });
  });
}

module.exports.findStations = function(text) {
  var words = text.toLowerCase().split(' ');
  var indexTo = words.lastIndexOf('to');
  var indexFrom = words.lastIndexOf('from');
  var fromText;
  var toText;
  if (indexTo > -1 && indexFrom > -1) {
    if (indexTo > indexFrom) {
      toText = words.slice(indexTo+1);
      fromText = words.slice(indexFrom+1, indexTo);
    } else {
      fromText = words.slice(indexFrom+1);
      toText = words.slice(indexTo+1, indexFrom);
    }
  } else if (indexTo > -1) {
    fromText = words.slice(0, indexTo);
    toText = words.slice(indexTo+1);
  } else if (indexFrom > -1) {
    // Station departure board or
    toText = words.slice(0, indexFrom);
    fromText = words.slice(indexFrom+1);
  } else {
    // I have no idea what you said to me.
  }
  fromText = fromText.join(' ');
  toText = toText.join(' ');
  console.log(`FROM ${fromText}, TO ${toText}`);
  return {from: fromText, to: toText};
}
