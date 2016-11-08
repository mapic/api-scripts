// require libs
var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var dir = require('node-dir');
var moment = require('moment');
var supertest = require('supertest');
var endpoints = require('./endpoints');
var utils = require('./utils');
var token = utils.token;
var config = require('../config');
// var api = supertest('https://' + config.domain);
var Cube = require('./cube');
var _ = require('lodash');
var debug = config.debug;
var args = process.argv;
var ops = {};
var tmp = {};
moment.utc(); // set utc

// domain resolution compatible with localhost setup (must run from within Docker container)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0" 
var current_domain = config.domain || process.env.MAPIC_DOMAIN;
var domain = (current_domain == 'localhost') ? 'https://172.17.0.1' : 'https://' + current_domain;
var api = supertest(domain);

// get dataset.json
if (!args[2]) return utils.missing();

// get json options
var dataset = require('../' + args[2]);

// ensure settings
if (!dataset || !dataset.folder || !dataset.date_format || !dataset.cube_id) return utils.missing();


function parse_date(f) {
        
    // get correct date parser
    if (dataset.date_format == 'x_x_YYYY_DDD') return parse_date_YYYY_DDD(f);
    if (dataset.date_format == 'x_x_YYYYMMDD') return parse_date_YYYYMMDD(f);

    // unsupported date format
    console.log('Unsupported date format:', dataset.date_format);
    process.exit(1);
}

function parse_date_YYYY_DDD(f) {
    // f is eg. "SCF_MOD_2014_002.tif"
    var a = f.split('.');
    var b = a[0].split('_');
    var year = b[2];
    var day = b[3];
    var yd = year + '-' + day;
    var date = moment(yd, "YYYY-DDDD");
    return date;
}

function parse_date_YYYYMMDD(f) {
    // f is eg. "SCF_MOD_20150101.tif"
    var a = f.split('.');
    var b = a[0].split('_');
    var dato = b[2];
    var date = moment(dato, "YYYYMMDD");
    return date;
}


// get user
ops.get_user = function (callback) {
    utils.get_user(function(err, user) {
        tmp.user = user;
        callback(err, user);
    }, true);
}

// read folder
ops.read_folder = function (callback) {
    dir.files(dataset.folder, function (err, files) {
        tmp.files = files;
        callback(err, files);
    });
};

// run tests before processing
ops.test = function (callback) {

    var invalid = [];

    // check for valid date formats
    tmp.files.forEach(function (f) {

        // get filename
        var filename = path.basename(f);

        // test date parsing
        var date = parse_date(filename);

        // check if valid moment
        var isValid = date.isValid(); 

        // gather invalid moments
        if (!isValid) invalid.push(filename);
    });

    // catch errors
    if (_.size(invalid)) {

        // log
        console.log('Some filenames could not be parsed to dates. Aborting!');
        console.log('Invalid filenames:', invalid);

        // quit
        return process.exit(1);
    }

    // all good, continue
    callback();
};

// upload
ops.upload = function (callback) {
    var files = tmp.files;
    tmp.uploaded = [];

    // upload each dataset
    async.eachSeries(files, function (file, done) {

        // upload data
        Cube.upload_data({
            path : file
        }, function (err, result) {

            // catch errors
            if (err) return done(err);

            // remember
            tmp.uploaded.push(result);

            // log
            console.log('Uploaded', result.filename);

            // return
            done(err);

        });
    }, callback);
};

// replace datasets in cube
ops.replace_datasets = function (callback) {
    var sets = [];

    // create dataset array
    tmp.uploaded.forEach(function (up) {
        sets.push({
            id : up.file_id,
            description : up.filename,
            timestamp : parse_date(up.filename).format(),
            granularity : dataset.granularity || 'day'
        });
    });

    // add dataset to cube
    Cube.replace_datasets({
        cube_id : dataset.cube_id,
        datasets : sets
    }, callback);

};



async.series(ops, function (err, results) {
    
    // catch error
    if (err) {
        console.log('\nSomething went wrong!', err);
        return process.exit(1);
    }
    
    // all good
    console.log('\nAll done. Replaced datasets in cube. Remember to refresh your page and force a refresh of tiles and queries.');

});