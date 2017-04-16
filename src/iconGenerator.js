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
  var baseImage = iconPath + 'trntxt_logo.png';
  var image = images(baseImage);
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

function setup() {
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(char => {
    characterWidths[char] = images(iconPath + char + '.png').size().width;
    console.log(`${char}: ${characterWidths[char]}px`);
  });
}

setup();

exports.getIcon = getIcon;
