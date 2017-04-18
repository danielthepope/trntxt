var crypto = require('crypto');
var fs = require('fs');
var images = require('images');

var iconPath = 'resources/iconGenerator/';

var characterWidths = {};

// Icons should be stored in resources/iconGenerator
// format FROM-TO-mstile-70x70.png
//        FROM-TO-android-chrome-144x144.png
// If an icon doesn't exist, generate it.
function getIcon(from, to, imageName) {
  var fileName = iconPath + from + '-' + to + '-' + imageName.split('.png')[0] + '.generated.png';
  if (fs.existsSync(fileName)) return fileName;
  else {
    console.log('Generating', fileName);
    var format = 'default';
    var characters = from;
    if (to) characters += to;
    var size = getSizeFromFileName(imageName);
    if (imageName.indexOf('mstile') === 0) format = 'mstile';
    return generateIcon(characters, format, size, fileName);
  }
}

function getSizeFromFileName(name) {
  var noExtension = name.split('.png')[0];
  var nameSplit = noExtension.split('-');
  var size;
  for (var i = 0; i < nameSplit.length; i++) {
    if (nameSplit[i].indexOf('x') !== -1) {
      if (size = parseInt(nameSplit[i])) break;
    }
  }
  if (!size) size = 57;
  if (size > 512) size = 512;
  // Scale for Microsoft
  if (name.indexOf('mstile') !== -1) size *= 1.8;
  return size;
}

function generateIcon(text, format, size, fileName) {
  var baseImage = iconPath + 'trntxt_logo_t.png';
  var image = images(1024, 1024);
  var background = backgroundColour(text);
  image.fill(background[0], background[1], background[2]);
  image.draw(images(baseImage), 0, 0);
  var x = 64;
  var y = 64;
  var charHeight = 224;
  for (var i = 0; i < 3 && text[i]; i++) {
    var letterImagePath = iconPath + text[i] + '.png';
    image.draw(images(letterImagePath), x, y);
    x += 32 + characterWidths[text[i]];
  }
  x = 1024 - 64;
  y = 64 + charHeight + 32;
  for (i = 3; i < 6 && text[i]; i++) {
    if (characterWidths[text[i]]) {
      x -= characterWidths[text[i]];
      x -= 32;
    }
  }
  x += 32;
  for (i = 3; i < 6 && text[i]; i++) {
    var letterImagePath = iconPath + text[i] + '.png';
    image.draw(images(letterImagePath), x, y);
    x += 32 + characterWidths[text[i]];
  }
  image.resize(size).save(fileName);
  return fileName;
}

function getCharacterWidth(letter) {
  var fileName = iconPath + letter + '.png';
  return images(fileName).size().width;
}

function backgroundColour(text) {
  var hue1 = parseInt(crypto.createHash('md5').update(text.substring(0,3)).digest('hex').substring(0, 2), 16);
  var hue2 = parseInt(crypto.createHash('md5').update(text.substring(3,6)).digest('hex').substring(0, 2), 16);
  var hue = ((hue1 + hue2) % 256) / 256;
  return hslToRgb(hue, 0.6, 0.5);
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
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue2rgb(p, q, t){
    if(t < 0) t += 1;
    if(t > 1) t -= 1;
    if(t < 1/6) return p + (q - p) * 6 * t;
    if(t < 1/2) return q;
    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}

function setup() {
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(char => {
    characterWidths[char] = images(iconPath + char + '.png').size().width;
    console.log(`${char}: ${characterWidths[char]}px`);
  });
}

setup();

exports.getIcon = getIcon;
