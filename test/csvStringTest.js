var chai = require('chai');
var expect = chai.expect;

var csv = require('csv-string');

describe('Checking inputs with quotes', function() {
  it('Should ignore quotes', function() {
    var output = csv.parse('"hello world",data');
    expect(output).to.be.an('array').and.have.length(1);
    expect(output[0]).to.be.an('array').and.have.length(2);
    expect(output[0][0]).to.equal('hello world');
  });
  
  it('Should ignore commas within quotes', function() {
    var output = csv.parse('"hello, world",data');
    expect(output).to.be.an('array').and.have.length(1);
    expect(output[0]).to.be.an('array').and.have.length(2);
    expect(output[0][0]).to.equal('hello, world');
  });
});