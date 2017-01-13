var config = require('./trntxtconfig.js');
var request = require('request');

exports.post = function(url, response_code, ip, user_agent) {
  if (config.sumoUrl) {
    var line = createLogLine(url, response_code, ip, user_agent);
    console.log(line);
    request.post({
      url: config.sumoUrl,
      body: line,
      headers: {'Content-Type': 'text/plain'}
    }, function(error, response, body) {
      if (error) {
        console.error("Error posting to Sumo", error);
      }
    });
  }
}

function createLogLine(url, response_code, ip, user_agent) {
  return `${new Date().toISOString()} url="${url}" response_code="${response_code}" ip="${ip}" user_agent="${user_agent}"`;
}
