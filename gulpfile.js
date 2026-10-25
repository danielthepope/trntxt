var gulp = require('gulp');
var pug = require('gulp-pug');
var cleanCSS = require('gulp-clean-css');
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var pump = require('pump');

var tsProject = ts.createProject('tsconfig.json');

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

gulp.task('build', gulp.series('compile', 'minifycss', 'minifyjs', 'staticpug'));
