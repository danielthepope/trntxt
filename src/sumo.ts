import * as config from './trntxtconfig';
import * as request from 'request';
import { FromAndToStation, Station } from './types';

function post(url: string, response_code: number, ip: string, user_agent: string, stations?: FromAndToStation) {
  if (config.SUMO_URL) {
    if (!stations) stations = { fromStation: undefined, toStation: undefined };
    const line = createLogLine(url, response_code, ip, user_agent, stations.fromStation, stations.toStation);
    console.log(line);
    request.post({
      url: config.SUMO_URL,
      body: line,
      headers: { 'Content-Type': 'text/plain' }
    }, (error, response, body) => {
      if (error) {
        console.error("Error posting to Sumo", error);
      }
    });
  }
}

function createLogLine(url: string, response_code: number, ip: string, user_agent: string, fromStation: Station, toStation: Station) {
  let output = `${new Date().toISOString()} url="${url}" response_code="${response_code}" ip="${ip}" user_agent="${user_agent}"`;
  if (fromStation) output += ` from_station_name="${fromStation.stationName}" from_station_code="${fromStation.stationCode}"`;
  if (toStation) output += ` to_station_name="${toStation.stationName}" to_station_code="${toStation.stationCode}"`;
  return output;
}

export { post };
