var chai = require('chai');
var expect = chai.expect;

var nr = require('../src/nationalrail.js');

describe('Valid inputs for findStation()', function() {
	var tests = {
		'did':'DID',
		'didcot':'DID',
		'didcot parkway':'DID',
		'didcotparkway':'DID'
	};
	Object.keys(tests).forEach(function(key) {
		console.log(key + ':' + tests[key]);
		it('should return "' + tests[key] + '" with input "' + key + '"', function() {
			expect(nr.findStation(key)).to.have.property('stationCode').that.equals(tests[key]);
		});
	});
});