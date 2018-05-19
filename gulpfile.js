var gulp = require('gulp');
var server = require('gulp-develop-server');
var pug = require('gulp-pug');
var cssmin = require('gulp-cssmin');
var mocha = require('gulp-mocha');
var uglify = require('gulp-uglify');
var pump = require('pump');
var util = require('util');
var fs = require('fs');

gulp.task('server:start', function() {
  server.listen( {
    path: './src/app.js',
    successMessage: /listening on port \d+/
  });
});

// Watch files for changes
gulp.task('watch', function() {
  gulp.watch('./resources/*.css', ['build']);
  gulp.watch('./resources/**/*.pug', ['build']);
  gulp.watch('./resources/**/*.js', ['build']);
  gulp.watch('./src/**/*.js', ['test', server.restart]);
  gulp.watch('./config/**/*.js', server.restart);
  gulp.watch('./test/**/*.js', ['test']);
  gulp.watch('./*.js', ['test', server.restart]);
});

gulp.task('copy', function(){
  fs.exists('./config/config.js', function (exists) {
    if (exists) return;
    else {
      fs.createReadStream('./config/config.example.js')
        .pipe(fs.createWriteStream('./config/config.js'));
    }
  });
});

gulp.task('build', ['minifycss', 'minifyjs', 'staticpug', 'copy']);

gulp.task('minifycss', function() {
  return gulp.src('./resources/*.css')
    .pipe(cssmin())
    .pipe(gulp.dest('./dist/public'));
});

gulp.task('minifyjs', function(cb) {
  pump([
    gulp.src('./resources/static/*.js'),
    uglify(),
    gulp.dest('./dist/public')
  ], cb);
});

gulp.task('staticpug', ['minifycss'], function() {
  return gulp.src('./resources/static/*.pug')
    .pipe(pug({
      doctype: 'html',
      locals: {
        pageTitle: 'Train Text: a data-friendly UK train times site'
      }
    }))
    .pipe(gulp.dest('./dist/public'));
});

gulp.task('test', ['build'], function() {
  return gulp.src(['test/**/*.js']).pipe(mocha());
});

// Default task
gulp.task('default', ['build', 'watch', 'test', 'server:start']);
