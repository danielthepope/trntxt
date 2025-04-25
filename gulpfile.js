var gulp = require('gulp');
var pug = require('gulp-pug');
var cleanCSS = require('gulp-clean-css');
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var pump = require('pump');
var fs = require('fs');
var spawn = require('child_process').spawn;
var path = require('path');

// Server management replacement for gulp-develop-server
var serverProcess = null;

var tsProject = ts.createProject('tsconfig.json');

gulp.task('server:start', function(done) {
  if (serverProcess) {
    serverProcess.kill();
  }
  
  serverProcess = spawn('node', [path.join(__dirname, 'dist/app.js')], {
    stdio: 'inherit'
  });
  
  serverProcess.on('close', function(code) {
    if (code === 8) {
      console.log('Error detected, waiting for changes...');
    }
  });
  
  done();
});

// Function to restart the server
function serverRestart(done) {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  
  gulp.series('server:start')(done);
}

// Watch files for changes
gulp.task('watch', function() {
  gulp.watch('./resources/*.css', gulp.series('build'));
  gulp.watch('./resources/**/*.pug', gulp.series('build'));
  gulp.watch('./resources/**/*.js', gulp.series('build'));
  gulp.watch('./types/**/*.ts', gulp.series('build', 'test', serverRestart));
  gulp.watch('./src/**/*.ts', gulp.series('build', 'test', serverRestart));
  gulp.watch('./test/**/*.js', gulp.series('test'));
  gulp.watch('./*.js', gulp.series('test', serverRestart));
});

gulp.task('copy', function(cb) {
  fs.exists('./config/config.yaml', function (exists) {
    if (!exists) {
      fs.createReadStream('./config/config.example.yaml')
        .pipe(fs.createWriteStream('./config/config.yaml'));
    }
    cb();
  });
});

gulp.task('compile', function() {
  return tsProject.src()
    .pipe(sourcemaps.init())
    .pipe(tsProject())
    .pipe(sourcemaps.write('.', { includeContent: false, sourceRoot: './' }))
    .pipe(gulp.dest('./dist'));
});

gulp.task('minifycss', function() {
  return gulp.src('./resources/*.css')
  .pipe(cleanCSS({compatibility: 'ie8'}))
  .pipe(gulp.dest('./dist/public'));
});

gulp.task('minifyjs', function(cb) {
  pump([
    gulp.src('./resources/static/*.js'),
    uglify(),
    gulp.dest('./dist/public')
  ], cb);
});

gulp.task('staticpug', gulp.series('minifycss', function() {
  return gulp.src('./resources/static/*.pug')
    .pipe(pug({
      doctype: 'html',
      locals: {
        pageTitle: 'Train Text: a data-friendly train times service for Great Britain'
      }
    }))
    .pipe(gulp.dest('./dist/public'));
}));

gulp.task('build', gulp.series('compile', 'minifycss', 'minifyjs', 'staticpug', 'copy'));

gulp.task('test', gulp.series('build', async function() {
  const { default: mocha } = await import('gulp-mocha');
  return gulp.src(['test/**/*.js']).pipe(mocha());
}));

// Clean up server process on exit
process.on('exit', function() {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Default task
gulp.task('default', gulp.parallel('watch', gulp.series('build', 'test', 'server:start')));
