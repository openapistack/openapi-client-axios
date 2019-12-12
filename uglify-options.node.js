module.exports = {
    parse: {
        // parse options
    },
    compress: {
        // compress options
        drop_console: false,
        passes: 2,
        toplevel: false,
        warnings: true,
    },
    mangle: {
        // mangle options
    },
    output: {
        // output options
        beautify: true
    },
    sourceMap: {
        // source map options
    },
    ecma: 8, // specify one of: 5, 6, 7 or 8
    keep_classnames: true,
    keep_fnames: false,
    ie8: false,
    nameCache: null, // or specify a name cache object
    safari10: false,
    toplevel: false,
    warnings: false,
};
