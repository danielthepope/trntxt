var fs = require('fs');
var images = require('images');

var iconPath = 'resources/iconGenerator/';
var xs = [120, 307, 494, 120, 307, 494];
var ys = [15, 15, 15, 325, 325, 325];

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
  // Scale for Microsoft
  if (name.indexOf('mstile') !== -1) size *= 1.8;
  return size;
}

function generateIcon(text, format, size, fileName) {
  var baseImage = iconPath + 'trntxt_logo.png';
  if (format === 'mstile') baseImage = iconPath + 'trntxt_logo_t.png';
  var image = images(baseImage);
  for (var i = 0; i < 6 && text[i]; i++) {
    var letterImagePath = iconPath + text[i] + '.png';
    image.draw(images(letterImagePath), xs[i], ys[i]);
  }
  image.size(size).save(fileName);
  return fileName;
}

exports.getIcon = getIcon;
