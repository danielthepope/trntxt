const config = require('./trntxtconfig.js');
const request = require('request');

function post(url, response_code, ip, user_agent, stations) {
  if (config.sumoUrl) {
    if (!stations) stations = {};
    const line = createLogLine(url, response_code, ip, user_agent, stations.fromStation, stations.toStation);
    console.log(line);
    request.post({
      url: config.sumoUrl,
      body: line,
      headers: {'Content-Type': 'text/plain'}
    }, (error, response, body) => {
      if (error) {
        console.error("Error posting to Sumo", error);
      }
    });
  }
}

function createLogLine(url, response_code, ip, user_agent, fromStation, toStation) {
  let output = `${new Date().toISOString()} url="${url}" response_code="${response_code}" ip="${ip}" user_agent="${user_agent}"`;
  if (fromStation) output += ` from_station_name="${fromStation.stationName}" from_station_code="${fromStation.stationCode}"`;
  if (toStation) output += ` to_station_name="${toStation.stationName}" to_station_code="${toStation.stationCode}"`;
  return output;
}

module.exports = { post };
