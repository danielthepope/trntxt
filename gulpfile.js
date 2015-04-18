// Include gulp
var gulp = require('gulp');
// var jshint = require('gulp-jshint');
var server = require('gulp-develop-server');

// gulp.task('lint', function() {
// 	return gulp.src('*.js')
// 		.pipe(jshint())
// 		.pipe(jshint.reporter('default', { verbose: true }));
// });

gulp.task('server:start', function() {
	server.listen( { path: './server.js' } );
});

gulp.task('server:restart', function() {
	gulp.watch('./server.js', server.restart);
})

// Watch files for changes
gulp.task('watch', function() {
	// gulp.watch('*.js', ['lint']);
});

// Default task
gulp.task('default', ['watch', 'server:start', 'server:restart']);