var chai = require('chai');
var expect = chai.expect;

var nr = require('../../dist/nationalrail.js');

describe('Station object validation', function() {
  it('should all have a stationName property', function() {
    nr.stations.forEach(function(station) {
      expect(station).to.have.property('stationName');
    });
  });
  it('should all have 3-letter station codes', function() {
    nr.stations.forEach(function(station) {
      expect(station).to.have.property('stationCode');
      expect(station.stationCode).to.have.length(3);
    });
  });
  it('the first station should be Abbey Wood', function() {
    expect(nr.stations[0].stationName).to.equal('Abbey Wood');
  });
});

describe('Valid inputs for findStation()', function() {
  var tests = {
    'clifton':'CLI', // Clifton (Manchester), not Clifton Down
    'did':'DID',
    'didcot':'DID',
    'didcot parkway':'DID',
    'didcotparkway':'DID',
    'exeterstdavids':'EXD',
    'exeterstdavid\'s':'EXD',
    'hayeskent':'HYS', // Hayes (Kent)
    'hayes':'HYS',
    'hayesandharlington':'HAY', // Hayes & Harlington
    'hayesharlington':'HAY',
    'hayes&harlington':'HAY',
    'harrowhill':'HOH', // Harrow-on-the-Hill
    'Heathrow Terminals 2 and 3':'HXX',
    'heathrow2':'HXX',
    'heathrow3':'HXX',
    'heathrow4':'HAF',
    'heathrowterminal4':'HAF',
    'heathrow5':'HWV',
    'heathrowterminal5':'HWV',
    'heathrow23':'HXX', // "Heathrow Terminals 2 & 3"
    'waterloo':'WLO',
    'lonwat':'WAT',
    'waterlooeast':'WAE'
  };
  Object.keys(tests).forEach(function(key) {
    it('should return "' + tests[key] + '" with input "' + key + '"', function() {
      var result = nr.findStation(key);
      expect(result).to.be.an('array').and.have.length.above(0);
      expect(result[0]).to.have.property('stationCode').that.equals(tests[key]);
    });
  });
});

describe('Invalid inputs for findStation()', function() {
  // All the following inputs should return an empty array
  it('should return an empty array for an undefined input', function() {
    expect(nr.findStation()).to.be.an('array').and.to.be.empty;
  });
  it('should return an empty array for a null input', function() {
    expect(nr.findStation('')).to.be.an('array').and.to.be.empty;
  });
  it('should return an empty array for an empty input', function() {
    expect(nr.findStation(null)).to.be.an('array').and.to.be.empty;
  });
  it('should return an empty array for an input of less than 3 characters', function() {
    expect(nr.findStation('d')).to.be.an('array').and.to.be.empty;
    expect(nr.findStation('di')).to.be.an('array').and.to.be.empty;
  });
  it('should return an empty array for an input that clearly isn\'t a name of a station', function() {
    expect(nr.findStation('ClearlyNotARealStationName')).to.be.an('array').and.to.be.empty;
  });
});

describe('Testing sanitiseText()', function() {
  var tests = {
    'did':'DID',
    '':'',
    'didcot parkway':'DIDCOTPARKWAY',
    'Weston-Super-Mare':'WESTONSUPERMARE',
    ' odd9 typ0o  ':'ODD9TYP0O'
  };
  Object.keys(tests).forEach(function(key) {
    it('should return "' + tests[key] + '" with input "' + key + '"', function() {
      expect(nr.sanitise(key)).to.equal(tests[key]);
    });
  });
  it('should return null when entering null', function() {
    expect(nr.sanitise(null)).to.be.null;
  });
  it('should return null when the input is undefined', function() {
    expect(nr.sanitise()).to.be.null;
  });
});

describe('Testing toMins()', function() {
  var tests = {
    '00:00': 0,
    '01:00': 60,
    '00:30': 30,
    '10:05': 605,
    '01:90': 150
  };
  Object.keys(tests).forEach(function(key) {
    it('should return ' + tests[key] + ' with input ' + key, function() {
      expect(nr.toMins(key)).to.equal(tests[key]);
    });
  });
});

describe('Negative testing toMins()', function() {
  var tests = ['test', 'five:fifteen', ''];
  tests.forEach(function(failingTest) {
    it('should fail with input ' + failingTest, function() {
      expect(nr.toMins(failingTest)).to.equal(-1);
    });
  });
});

describe('Testing getServiceTime()', function() {
  it('should do sta-std for on time services', function() {
    var input = {
      etd: 'On time',
      std: '14:25',
      eta: 'On time',
      sta: '15:30'
    };
    expect(nr.getServiceTime(input)).to.equal(65);
  });
  it('should give preference to estimated times', function() {
    var input = {
      etd: '14:30',
      std: '14:25',
      eta: 'On time',
      sta: '15:30'
    };
    expect(nr.getServiceTime(input)).to.equal(60);
    var input2 = {
      etd: 'On time',
      std: '14:25',
      eta: '15:35',
      sta: '15:30'
    };
    expect(nr.getServiceTime(input2)).to.equal(70);
    var input3 = {
      etd: '14:30',
      std: '14:25',
      eta: '15:45',
      sta: '15:30'
    };
    expect(nr.getServiceTime(input3)).to.equal(75);
  })
});

describe('Testing formatTime()', function() {
  var tests = {
    0: '0m',
    45: '45m',
    60: '1h 0m',
    75: '1h 15m',
    100: '1h 40m',
    120: '2h 0m',
    150: '2h 30m'
  };
  Object.keys(tests).forEach(function(key) {
    it('should return ' + tests[key] + ' for input ' + key, function() {
      expect(nr.formatTime(key)).to.equal(tests[key]);
    });
  });
});
