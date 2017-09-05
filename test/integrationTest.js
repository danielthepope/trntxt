const expect = require('chai').expect;
const Browser = require('zombie');

const crypto = require('crypto');
const fs = require('fs');

const server = require('../server');

function urlFor(path) { 
  if (!path.startsWith('/')) { 
    path = '/' + path; 
  }
  return `http://localhost:${server.port}${path}`; 
}

describe('User visits homepage', function() {
  const browser = new Browser();
  before(function(done) {
    browser.visit(urlFor('/'), done);
  });

  describe('brand recognition', function() {
    it('should say trntxt', function() {
      expect(browser.text()).to.contain('trntxt');
    });
    it('should say Train Text', function() {
      expect(browser.text()).to.contain('Train Text');
    });
  });
});

describe('Public files', function() {
  ['public', 'dist'].forEach(function(folder) {
    describe(`files in ${folder}/`, function() {
      files = fs.readdirSync(folder);
      files.forEach(function(path) {
        it(`responds to ${path}`, function(done) {
          checkFile(folder, path, done);
        });
      })
    })
  })
})

function checkFile(folder, filename, done) {
  const browser = new Browser();
  browser.fetch(urlFor(filename))
    .then(function(response) {
      expect(response.status).to.equal(200);
      response.arrayBuffer()
        .then(Buffer)
        .then(function(buffer) {
          const expectedBody = fs.readFileSync(`${folder}/${filename}`);
          const responseHash = crypto.createHash('md5').update(buffer).digest('hex');
          const expectedHash = crypto.createHash('md5').update(expectedBody).digest('hex');
          expect(responseHash).to.equal(expectedHash);
          done();
        });
    });
}
