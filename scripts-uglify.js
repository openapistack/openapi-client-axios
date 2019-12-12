var uglify = require('uglify-es');
var fs = require('fs');
var path = require('path');

var options = require(process.argv[2]);  // load ./uglify.json config
var filter = new RegExp(process.argv[3], 'i');

var walkSync = function(dir, filelist) {
  files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      if (path.extname(file) ==='.js' && !file.endsWith('.min.js') && filter.test(file)) {
        filelist.push({
          path : dir,
          name : file
        });
      }
    }
  });
  return filelist;
};


var files = walkSync(path.resolve('./dist'));

//console.info(options);
//console.info(files);

files.forEach(function (file, index) {
        var code = fs.readFileSync(path.join(file.path, file.name), 'utf8');

        console.info('Uglifying ' + file.name);

        var result = uglify.minify(code, options);

        if (result.error) {
                console.log(result.error);
                return process.exit(-1);
        } else {
                fs.writeFileSync(path.join(file.path, file.name.replace(/\.js$/, '.min.js')),
                        result.code, 'utf8');
                // fs.writeFileSync(cacheFileName, JSON.stringify(options.nameCache), 'utf8');
        }
});


