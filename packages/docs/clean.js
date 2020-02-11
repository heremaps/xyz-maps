let rimraf = require('rimraf');
let argv = require('yargs').argv;

let config = require(argv.configure);

rimraf(config.opts.destination, function(e) {
    console.log('\x1b[32m%s\x1b[0m', 'Doc cleaned');
});
