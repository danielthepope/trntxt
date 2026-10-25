const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const CleanCSS = require('clean-css');
const UglifyJS = require('uglify-js');
const pug = require('pug');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'dist', 'public');

function filesIn(directory, extension) {
  return fs.readdirSync(directory)
    .filter(file => path.extname(file) === extension)
    .sort()
    .map(file => path.join(directory, file));
}

const tsc = spawnSync(process.execPath, [
  require.resolve('typescript/bin/tsc'),
  '--project',
  path.join(root, 'tsconfig.json')
], { cwd: root, stdio: 'inherit' });

if (tsc.error) {
  throw tsc.error;
}
if (tsc.status !== 0) {
  process.exit(tsc.status || 1);
}

fs.mkdirSync(publicDir, { recursive: true });

for (const file of filesIn(path.join(root, 'resources'), '.css')) {
  const css = fs.readFileSync(file, 'utf8');
  const result = new CleanCSS({ compatibility: 'ie8' }).minify(css);
  if (result.errors.length > 0) {
    throw new Error(`Failed to minify ${file}:\n${result.errors.join('\n')}`);
  }
  fs.writeFileSync(path.join(publicDir, path.basename(file)), result.styles);
}

for (const file of filesIn(path.join(root, 'resources', 'static'), '.js')) {
  const result = UglifyJS.minify(fs.readFileSync(file, 'utf8'));
  if (result.error) {
    throw new Error(`Failed to minify ${file}: ${result.error.message}`);
  }
  fs.writeFileSync(path.join(publicDir, path.basename(file)), result.code);
}

for (const file of filesIn(path.join(root, 'resources', 'static'), '.pug')) {
  const html = pug.renderFile(file, {
    doctype: 'html',
    pageTitle: 'Train Text: a data-friendly train times service for Great Britain'
  });
  fs.writeFileSync(
    path.join(publicDir, `${path.basename(file, '.pug')}.html`),
    html
  );
}
