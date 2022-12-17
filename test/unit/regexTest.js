var chai = require('chai');
var expect = chai.expect;

var nr = require('../../dist/nationalrail.js');

describe('reformatNrccMessage()', function() {
  it('shouldn\'t be laugh in the face of undefined', function() {
    expect(nr.reformatNrccMessage()).to.equal('');
  });
  it('shouldn\'t be daunted by null', function() {
    expect(nr.reformatNrccMessage(null)).to.equal('');
  });
  it('shouldn\'t change an empty string', function() {
    expect(nr.reformatNrccMessage('')).to.equal('');
  });
  it('should strip out <p> tags', function() {
    expect(nr.reformatNrccMessage('<p>')).to.equal('');
  });
  it('should strip out </p> tags', function() {
    expect(nr.reformatNrccMessage('</p>')).to.equal('');
  });
  it('should strip out <p> tags with attributes', function() {
    expect(nr.reformatNrccMessage('<p id="p" class="c">')).to.equal('');
  });
  it('should ignore <a> tags', function() {
    expect(nr.reformatNrccMessage('<a href="#">')).to.equal('<a href="#">');
  });
  it('should ignore </a> tags', function() {
    expect(nr.reformatNrccMessage('</a>')).to.equal('</a>');
  });
  it('should strip out tags beginning with \'a\'', function() {
    expect(nr.reformatNrccMessage('<address><abbr>')).to.equal('');
  });
  it('should strip out tags beginning with \'/a\'', function() {
    expect(nr.reformatNrccMessage('</address></abbr>')).to.equal('');
  });
  it('should replace National Rail links with the correct address', function() {
    expect(nr.reformatNrccMessage('"http://nationalrail.co.uk/service_disruptions/103677.aspx"')).to.equal('"https://www.nationalrail.co.uk/service_disruptions/103677.aspx"');
  });
  it('real-world test', function() {
    var realExample = '<P>Journeys to and from London Waterloo are being disrupted. More information can be found in <A href="http://nationalrail.co.uk/service_disruptions/103677.aspx">latest travel news.</A></P>'
    expect(nr.reformatNrccMessage(realExample)).to.equal('Journeys to and from London Waterloo are being disrupted. More information can be found in <A href="https://www.nationalrail.co.uk/service_disruptions/103677.aspx">latest travel news.</A>');
  })
});