var extend = require('extend');

var defaultConfig = require('./config/config.example.js');
var customConfig = {};
try {
	customConfig = require('./config/config.js');
} catch (e) {}

module.exports = extend({}, defaultConfig, customConfig);
