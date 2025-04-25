const expect = require('chai').expect;
const puppeteer = require('puppeteer');

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
  let browser;
  let page;

  // Increase timeout for Puppeteer operations
  this.timeout(10000);

  before(async function() {
    server.start(0);
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  after(async function() {
    await browser.close();
    server.stop();
  });
  
  describe('User visits homepage', function() {
    before(async function() {
      page = await browser.newPage();
      await page.goto(urlFor('/'), { waitUntil: 'networkidle0' });
    });

    after(async function() {
      await page.close();
    });
    
    describe('brand recognition', function() {
      it('should say trntxt', async function() {
        const text = await page.evaluate(() => document.body.textContent);
        expect(text).to.contain('trntxt');
      });
      it('should say Train Text', async function() {
        const text = await page.evaluate(() => document.body.textContent);
        expect(text).to.contain('Train Text');
      });
    });

    describe('social sharing headers', function() {
      it('should have a title', async function() {
        const content = await page.evaluate(() => 
          document.querySelector("head meta[property='og:title']").content
        );
        expect(content).to.equal('Train Text');
      });
      it('should have a description', async function() {
        const content = await page.evaluate(() => 
          document.querySelector("head meta[property='og:description']").content
        );
        expect(content).to.equal('A data-friendly train times service for Great Britain.');
      });
      it('should have a type', async function() {
        const content = await page.evaluate(() => 
          document.querySelector("head meta[property='og:type']").content
        );
        expect(content).to.equal('website');
      });
      it('should have an image', async function() {
        const content = await page.evaluate(() => 
          document.querySelector("head meta[property='og:image']").content
        );
        expect(content).to.equal('/android-chrome-192x192.png');
      });
    });
  });
  
  describe('Public files', function() {
    ['public', 'dist/public'].forEach(function(folder) {
      describe(`in ${folder}/`, function() {
        const files = fs.readdirSync(folder);
        files.forEach(function(path) {
          it(`responds to ${path}`, async function() {
            await checkFile(folder, path);
          });
        });
      });
    });
  });
  
  async function checkFile(folder, filename) {
    const page = await browser.newPage();
    try {
      const response = await page.goto(urlFor(filename), { waitUntil: 'networkidle0' });
      expect(response.status()).to.equal(200);
      
      const buffer = await response.buffer();
      const expectedBody = fs.readFileSync(`${folder}/${filename}`);
      const responseHash = crypto.createHash('md5').update(buffer).digest('hex');
      const expectedHash = crypto.createHash('md5').update(expectedBody).digest('hex');
      expect(responseHash).to.equal(expectedHash);
    } finally {
      await page.close();
    }
  }
  
  describe('Pin app to homescreen', function() {
    describe('Web app manifest', function() {
      let page;
      
      before(async function() {
        page = await browser.newPage();
      });
      
      after(async function() {
        await page.close();
      });
      
      it('is linked from the home page', async function() {
        await page.goto(urlFor('/'), { waitUntil: 'networkidle0' });
        const href = await page.evaluate(() => 
          document.querySelector('link[rel=manifest]').getAttribute('href')
        );
        expect(href).to.equal('/manifest.json');
      });
      
      it('exists', async function() {
        const response = await page.goto(urlFor('/manifest.json'), { waitUntil: 'networkidle0' });
        expect(response.status()).to.equal(200);
        const manifestText = await response.text();
        const manifest = JSON.parse(manifestText);
        expect(manifest).to.be.an('object');
      });
      
      describe('properties', function() {
        let manifest = {};
        
        before(async function() {
          const response = await page.goto(urlFor('/manifest.json'), { waitUntil: 'networkidle0' });
          const manifestText = await response.text();
          manifest = JSON.parse(manifestText);
        });
        
        const expectations = {
          'background_color': '#fff',
          'display': 'browser',
          'name': 'trntxt',
          'short_name': 'trntxt',
          'start_url': '/',
          'description': 'Train Text: a data-friendly train times service for Great Britain'
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
          
          it('has valid icons', async function() {
            const iconPage = await browser.newPage();
            try {
              for (const icon of manifest.icons) {
                expect(icon.src).to.not.be.empty;
                expect(icon.sizes).to.not.be.empty;
                expect(icon.type).to.not.be.empty;
                expect(icon.src).to.contain(icon.sizes);
                
                const response = await iconPage.goto(urlFor(icon.src), { waitUntil: 'networkidle0' });
                expect(response.status(), `Browser failed for ${icon.src}`).to.equal(200);
              }
            } finally {
              await iconPage.close();
            }
          });
        });
      });
    });
  });
});
