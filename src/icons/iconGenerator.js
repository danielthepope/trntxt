const crypto = require('crypto');
const images = require('images');
const OptiPng = require('optipng');
const streamifier = require('streamifier');
const Task = require('./taskGenerator').Task;

const resourcePath = 'resources/iconGenerator/';
const characterWidths = {};

/**
 * @param {Task} task
 */
function generateIcon(task) {
  const from = task.from;
  const to = task.to || '';
  const baseImage = `${resourcePath}trntxt_logo.png`;
  const image = images(1024,1024);
  const background = backgroundColour(from, to, 0.5);
  const paddingX = 96;
  const paddingY = 64;
  const charHeight = 224;

  image.fill(background[0], background[1], background[2]);
  if (from < to) {
    image.draw(images(resourcePath + 'gradient-darkleft.png'), 0, 0);
  } else {
    image.draw(images(resourcePath + 'gradient-darkright.png'), 0, 0);
  }
  image.draw(images(baseImage), 0, 0);
  let x = paddingX;
  let y = paddingY;
  for (let i = 0; i < 3 && from[i]; i++) {
    const letterImagePath = `${resourcePath}${from[i]}.png`;
    image.draw(images(letterImagePath), x, y);
    x += 32 + characterWidths[from[i]];
  }
  x = 1024 - paddingX;
  y = 1024 - paddingY - charHeight;
  for (let i = 0; i < 3 && to[i]; i++) {
    x -= characterWidths[to[i]];
    x -= 32;
  }
  for (let i = 0; i < 3 && to[i]; i++) {
    const letterImagePath = `${resourcePath}${to[i]}.png`;
    image.draw(images(letterImagePath), x, y);
    x += 32 + characterWidths[to[i]];
  }

  const buffer = image.resize(task.width, task.height).encode('png');
  const stream = streamifier.createReadStream(buffer);
  return stream.pipe(new OptiPng());
}

/**
 * Create an app icon without text
 * @param {Task} task 
 */
function generateFavicon(task) {
  const image = images(`${resourcePath}icon_touch_256.png`)
  const buffer = image.resize(task.width, task.height).encode('png');
  return streamifier.createReadStream(buffer);
}

/**
 * Generate a colour based on the hash of the From station plus the hash of the To station.
 * That way, the same colour is produced if the From and To stations are swapped.
 * @param {string} from 3 characters
 * @param {string} to 3 characters
 * @param {number} luminosity 0-1, percentage
 * @return {Array} RGB values
 */
function backgroundColour(from, to, luminosity) {
  from = from || '';
  to = to || '';
  var hue1 = parseInt(crypto.createHash('md5').update(from).digest('hex').substring(0, 2), 16);
  var hue2 = parseInt(crypto.createHash('md5').update(to).digest('hex').substring(0, 2), 16);
  var hue = ((hue1 + hue2) % 256) / 256;
  return hslToRgb(hue, 0.6, luminosity);
}

function themeColour(from, to) {
  return rgbToHex(backgroundColour(from, to, 0.8));
}

function rgbToHex(rgbArray) {
  return `#${rgbArray[0].toString(16)}${rgbArray[1].toString(16)}${rgbArray[2].toString(16)}`;
}

// Got from http://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function setup() {
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(char => {
    characterWidths[char] = images(resourcePath + char + '.png').size().width;
  });
}

setup();


module.exports = {
  generateIcon, generateFavicon, themeColour
}
