var config = require('./trntxtconfig.js');
var request = require('request');

exports.post = function(url, response_code, ip, user_agent, stations) {
  if (config.sumoUrl) {
    var line = createLogLine(url, response_code, ip, user_agent, stations.fromStation, stations.toStation);
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

function createLogLine(url, response_code, ip, user_agent, fromStation, toStation) {
  var output = `${new Date().toISOString()} url="${url}" response_code="${response_code}" ip="${ip}" user_agent="${user_agent}"`;
  if (fromStation) output += ` from_station_name="${fromStation.stationName}" from_station_code="${fromStation.stationCode}"`;
  if (toStation) output += ` to_station_name="${toStation.stationName}" to_station_code="${toStation.stationCode}"`;
  return output;
}
