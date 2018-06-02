import {join} from 'path';
import * as yaml from 'yamljs';

const valuesFromConfigFile:{[key:string]:string} = yaml.load(join(__dirname, '../config/config.yaml'));

const API_KEY = process.env.API_KEY || valuesFromConfigFile.API_KEY;
const PORT = process.env.PORT || valuesFromConfigFile.PORT || '3000';
const SUMO_URL = process.env.SUMO_URL || valuesFromConfigFile.SUMO_URL;
const MASHAPE_PROXY_SECRET = process.env.MASHAPE_PROXY_SECRET || valuesFromConfigFile.MASHAPE_PROXY_SECRET;

export {
  API_KEY,
  PORT,
  SUMO_URL,
  MASHAPE_PROXY_SECRET,
};
