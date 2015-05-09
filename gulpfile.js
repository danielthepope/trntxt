// Include gulp
var gulp = require('gulp');
var server = require('gulp-develop-server');
var jade = require('gulp-jade');
var cssmin = require('gulp-cssmin');
var rename = require('gulp-rename');
var mkdirp = require('mkdirp');

gulp.task('server:start', function() {
	server.listen( { path: './server.js' } );
});

gulp.task('server:restart', function() {
	gulp.watch('./*.js', server.restart);
});

// Watch files for changes
gulp.task('watch', function() {
	gulp.watch('./resources/*.css', ['build']);
	gulp.watch('./resources/*.jade', ['build']);
	gulp.watch('./resources/static/*.jade', ['build']);
});

gulp.task('build', ['mkdir', 'minifycss', 'staticjade']);

gulp.task('mkdir', function() {
	return mkdirp.sync('./public');
});

gulp.task('minifycss', ['mkdir'], function() {
	return gulp.src('./resources/*.css')
		.pipe(cssmin())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('./public'));
});

gulp.task('staticjade', ['mkdir', 'minifycss'], function() {
	return gulp.src('./resources/static/*.jade')
		.pipe(jade({
			doctype: 'html',
			locals: {
				pageTitle: 'trntxt'
			}
		}))
		.pipe(gulp.dest('./public'));
});

// Default task
gulp.task('default', ['build', 'watch', 'server:start', 'server:restart']);
