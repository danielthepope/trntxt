const extend = require('extend');

const defaultConfig = require('../config/config.example.js');
let customConfig = {};
try {
  customConfig = require('../config/config.js');
} catch (e) {}

module.exports = extend({}, defaultConfig, customConfig);
