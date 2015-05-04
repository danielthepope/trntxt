// Include gulp
var gulp = require('gulp');
var server = require('gulp-develop-server');

gulp.task('server:start', function() {
	server.listen( { path: './server.js' } );
});

gulp.task('server:restart', function() {
	gulp.watch('./*.js', server.restart);
})

// Watch files for changes
gulp.task('watch', function() {
});

// Default task
gulp.task('default', ['watch', 'server:start', 'server:restart']);
