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
        try {
          callback(null, JSON.parse(body).header.name);
        } catch(e) {
          callback(e);
        }
      });
    });
  });
}