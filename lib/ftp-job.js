var fs = require('fs');
var JSFtp = require('jsftp');
var moment = require('moment');
var _ = require('lodash');

// get config
var config = JSON.parse(fs.readFileSync('ftp-config.ignore.json'));

// connect to ftp
var ftp = new JSFtp({
  host: config.host,
  port: 21, // defaults to 21
  user: config.user, // defaults to "anonymous"
  pass: config.pass // defaults to "@anonymous"
});

// list folder
ftp.ls('systemapic/', function(err, files) {
    console.log(files);

    var today = moment();

    console.log('today->', today.fromNow());

    // look at each file
    _.forEach(files, function (f) {
        var date = moment(f.time);

        console.log('date.fromNow()', date.fromNow());
    
        var isToday = date.isBetween(today, yday);
        console.log('isToday:', isToday);

    });

    // quit
    process.exit(0);
});