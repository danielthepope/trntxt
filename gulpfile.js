var gulp = require('gulp');
var server = require('gulp-develop-server');
var jade = require('gulp-jade');
var cssmin = require('gulp-cssmin');
var rename = require('gulp-rename');
var mocha = require('gulp-mocha');
var util = require('util');
var fs = require('fs');

gulp.task('server:start', function() {
	server.listen( { path: './src/server.js' } );
});

gulp.task('server:restart', function() {
	gulp.watch('./src/**/*.js', server.restart);
	gulp.watch('./config/**/*.js', server.restart);
});

// Watch files for changes
gulp.task('watch', function() {
	gulp.watch('./resources/*.css', ['build']);
	gulp.watch('./resources/*.jade', ['build']);
	gulp.watch('./resources/static/*.jade', ['build']);
	gulp.watch('./src/**/*.js', ['test']);
	gulp.watch('./test/**/*.js', ['test']);
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

gulp.task('build', ['minifycss', 'staticjade', 'copy']);

gulp.task('minifycss', function() {
	return gulp.src('./resources/*.css')
		.pipe(cssmin())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('./public'));
});

gulp.task('staticjade', ['minifycss'], function() {
	return gulp.src('./resources/static/*.jade')
		.pipe(jade({
			doctype: 'html',
			locals: {
				pageTitle: 'trntxt'
			}
		}))
		.pipe(gulp.dest('./public'));
});

gulp.task('test', ['build'], function() {
	return gulp.src(['test/**/*.js']).pipe(mocha());
});

// Default task
gulp.task('default', ['build', 'watch', 'test', 'server:start', 'server:restart']);
