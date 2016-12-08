var gulp = require('gulp');
var watch = require('gulp-watch');

var source = './App_Plugins',  
    destination1 = './../test/OP10.MultipleMediaPicker.Web.UI/App_Plugins',
	destination2 = './../test/OP10.MultipleMediaPicker.Web.UI.7-2-2/App_Plugins';

gulp.task('watch-folder', function() {  
  gulp.src(source + '/**/*', {base: source})
    .pipe(watch(source, {base: source}))
    .pipe(gulp.dest(destination1))
	.pipe(gulp.dest(destination2));
});
