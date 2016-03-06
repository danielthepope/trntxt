var chai = require('chai');
var expect = chai.expect;

var nr = require('../src/nationalrail.js');

describe('removeHtmlTagsExceptA()', function() {
  it('shouldn\'t be laugh in the face of undefined', function() {
    expect(nr.removeHtmlTagsExceptA()).to.equal('');
  });
  it('shouldn\'t be daunted by null', function() {
    expect(nr.removeHtmlTagsExceptA(null)).to.equal('');
  });
  it('shouldn\'t change an empty string', function() {
    expect(nr.removeHtmlTagsExceptA('')).to.equal('');
  });
  it('should strip out <p> tags', function() {
    expect(nr.removeHtmlTagsExceptA('<p>')).to.equal('');
  });
  it('should strip out </p> tags', function() {
    expect(nr.removeHtmlTagsExceptA('</p>')).to.equal('');
  });
  it('should strip out <p> tags with attributes', function() {
    expect(nr.removeHtmlTagsExceptA('<p id="p" class="c">')).to.equal('');
  });
  it('should ignore <a> tags', function() {
    expect(nr.removeHtmlTagsExceptA('<a href="#">')).to.equal('<a href="#">');
  });
  it('should ignore </a> tags', function() {
    expect(nr.removeHtmlTagsExceptA('</a>')).to.equal('</a>');
  });
  it('should strip out tags beginning with \'a\'', function() {
    expect(nr.removeHtmlTagsExceptA('<address><abbr>')).to.equal('');
  });
  it('should strip out tags beginning with \'/a\'', function() {
    expect(nr.removeHtmlTagsExceptA('</address></abbr>')).to.equal('');
  });
  it('real-world test', function() {
    var realExample = '<P>Journeys to and from London Waterloo are being disrupted. More information can be found in <A href="http://nationalrail.co.uk/service_disruptions/103677.aspx">latest travel news.</A></P>'
    expect(nr.removeHtmlTagsExceptA(realExample)).to.equal('Journeys to and from London Waterloo are being disrupted. More information can be found in <A href="http://nationalrail.co.uk/service_disruptions/103677.aspx">latest travel news.</A>');
  })
});