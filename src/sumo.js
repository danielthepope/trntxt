var config = require('./trntxtconfig.js');
var request = require('request');

exports.post = function(url, response_code, ip, user_agent) {
  if (config.sumoUrl) {
    var line = createLogLine(url, response_code, ip, user_agent);
    console.log(line);
    request.post(config.sumoUrl, {postData: line});
  }
}

function createLogLine(url, response_code, ip, user_agent) {
  return `${new Date().toISOString()} url="${url}" response_code="${response_code}" ip="${ip}" user_agent="${user_agent}"`;
}
