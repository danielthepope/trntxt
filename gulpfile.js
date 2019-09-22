var gulp = require('gulp');
var server = require('gulp-develop-server');
var pug = require('gulp-pug');
var cleanCSS = require('gulp-clean-css');
var mocha = require('gulp-mocha');
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var pump = require('pump');
var fs = require('fs');

var tsProject = ts.createProject('tsconfig.json');

gulp.task('server:start', function() {
  server.listen( {
    path: './dist/app.js',
    successMessage: /listening on port \d+/
  });
});

// Watch files for changes
gulp.task('watch', function() {
  gulp.watch('./resources/*.css', gulp.series('build'));
  gulp.watch('./resources/**/*.pug', gulp.series('build'));
  gulp.watch('./resources/**/*.js', gulp.series('build'));
  gulp.watch('./types/**/*.ts', gulp.series('build', 'test', server.restart));
  gulp.watch('./src/**/*.ts', gulp.series('build', 'test', server.restart));
  gulp.watch('./test/**/*.js', gulp.series('test'));
  gulp.watch('./*.js', gulp.series('test', server.restart));
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
        pageTitle: 'Train Text: a data-friendly train times site for Great Britain'
      }
    }))
    .pipe(gulp.dest('./dist/public'));
}));

gulp.task('build', gulp.series('compile', 'minifycss', 'minifyjs', 'staticpug', 'copy'));

gulp.task('test', gulp.series('build', function() {
  return gulp.src(['test/**/*.js']).pipe(mocha());
}));

// Default task
gulp.task('default', gulp.parallel('watch', gulp.series('build', 'test', 'server:start')));
