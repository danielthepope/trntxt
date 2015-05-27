# trntxt

[![Join the chat at https://gitter.im/danielthepope/trntxt](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/danielthepope/trntxt?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Pronounced "train text" and currently live at [trntxt.uk](http://trntxt.uk), this is a GPRS-friendly UK train times web service.

Uses the [National Rail 'Darwin' API](https://lite.realtime.nationalrail.co.uk/OpenLDBWS/) to get departure times.

## Usage
trntxt currently gives departure times for a given station, optionally filtered by a calling station.

Stations can be input using either their 3-letter codes or by their names (without spaces). For example, 'bristolparkway', 'bristolp' and 'bpw' will all give times for Bristol Parkway.

### Examples
* [/pad](http://trntxt.uk/pad): Departure board for London Paddington
* [/swindon](http://trntxt.uk/swindon): Departure board for Swindon
* [/bth/cardiffcentral](http://trntxt.uk/bth/cardiffcentral): List of trains from Bath Spa that call at Cardiff Central

## Developing trntxt
Thanks for helping out! Please feel free to fork this repo, make your changes then make a pull request.

If you want to run this program locally, you will need to register for a National Rail API key [here](http://www.nationalrail.co.uk/46391.aspx).

Once you have a key, paste it into `./config/config.js`; this file is generated based on the template `./config/config.example.js` at build-time.

Install the required packages using `npm install` in the command line. You also need to install the gulp command line interface globally, if you haven't already done so: `npm install -g gulp-cli`

To run the server, just type `gulp`. The server runs, then restarts if any of the JavaScript files are changed.

## To do
There are still a few things I'd like to do with trntxt, such as adding arrival times and interpreting the data for rail replacement bus servies. They'll happen soon :)
