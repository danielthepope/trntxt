const expect = require('chai').expect;
const Browser = require('zombie');

const crypto = require('crypto');
const fs = require('fs');

const server = require('../../dist/server');

function urlFor(path) {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return `http://localhost:${server.port()}${path}`;
}

describe('Integration tests:', function() {
  before(function() {
    server.start(0);
  });

  after(function() {
    server.stop();
  });
  
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
    ['public', 'dist/public'].forEach(function(folder) {
      describe(`in ${folder}/`, function() {
        files = fs.readdirSync(folder);
        files.forEach(function(path) {
          it(`responds to ${path}`, function(done) {
            checkFile(folder, path, done);
          });
        });
      });
    });
  });
  
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
  
  describe('Pin app to homescreen', function() {
    const browser = new Browser();
    describe('Web app manifest', function() {
      it('is linked from the home page', function(done) {
        browser.visit(urlFor('/'), function() {
          browser.assert.attribute('link[rel=manifest]', 'href', '/manifest.json');
          done();
        });
      });
      it('exists', function(done) {
        browser.visit(urlFor('/manifest.json'), function() {
          browser.assert.success();
          const manifest = JSON.parse(browser.response.body);
          expect(manifest).to.be.an('object');
          done();
        });
      });
      describe('properties', function() {
        let manifest = {};
        before(function(done) {
          browser.visit(urlFor('/manifest.json'), function() {
            manifest = JSON.parse(browser.response.body);
            done();
          });
        });
        
        const expectations = {
          'background_color': '#fff',
          'display': 'browser',
          'name': 'trntxt',
          'short_name': 'trntxt',
          'start_url': '/',
          'description': 'Train Text: a data-friendly train times site for Great Britain'
        };
        Object.keys(expectations).forEach(key => {
          it(`has '${key}' equal to '${expectations[key]}'`, function() {
            expect(manifest[key]).to.equal(expectations[key]);
          });
        });

        const requiredProperties = [
          'theme_color',
          'icons'
        ];
        requiredProperties.forEach(property => {
          it(`has '${property}'`, function() {
            expect(manifest[property], `property '${property}' does not exist`).to.exist;
          });
        });

        describe('icons', function() {
          it('has icons listed', function() {
            expect(manifest.icons).to.be.an('array');
            expect(manifest.icons.length).to.be.greaterThan(0);
          });
          it(`has valid icons`, function(done) {
            const length = manifest.icons.length;
            let count = 0;
            manifest.icons.forEach(icon => {
              expect(icon.src).to.not.be.empty;
              expect(icon.sizes).to.not.be.empty;
              expect(icon.type).to.not.be.empty;
              expect(icon.src).to.contain(icon.sizes);
              browser.visit(urlFor(icon.src), function() {
                browser.assert.success(`Browser failed for ${icon.src}`);
                if (++count === length) {
                  done();
                }
              });
            });
          });
        });
      });
    });
  });
});
