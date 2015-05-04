# trntxt
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

Once you have a key, paste it into line 10 of nationalrail.js

```javascript
 9 | var apiKey = process.env.APIKEY; // Imported from Azure
10 | apiKey = "********-****-****-****-************"; // DON'T COMMIT THIS
11 | var soapUrl = 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?ver=2014-02-20';
```

Whenever you make a commit, **make sure you don't commit that line!** Also, if you know of a better way to set the key during development, please [let me know](https://twitter.com/danielthepope)!

> _I'm using [Visual Studio Code](http://code.visualstudio.com) to develop this app. You should be able to set `process.env` using the `launch.json` file, but as of version 0.1, [this doesn't work](http://stackoverflow.com/questions/29962529/environment-variables-not-working-in-microsoft-visual-studio-code)._

Install the required packages using `npm install` in the command line. You also need to install the gulp command line interface globally, if you haven't already done so: `npm install -g gulp-cli`

To run the server, just type `gulp`. The server runs, then restarts if any of the JavaScript files are changed.

## To do
There are still a few things I'd like to do with trntxt, such as adding arrival times and interpreting the data for rail replacement bus servies. They'll happen soon :)
