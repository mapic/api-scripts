//
// Syncing of FTP datasets into a cube/project
//
// 1. create cube (or use existing cube in dataset-config)
// 2. check ftp for available files
// 3. check which files exists, and what their modification date is
// 4. add/replace datasets which are new/modified
// 5. make script run equally well first run & later runs


// require libs
var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var dir = require('node-dir');
var moment = require('moment');
var supertest = require('supertest');
var JSFtp = require('jsftp');

// require scripts, config
var endpoints = require('./endpoints');
var utils = require('./utils');
var Cube = require('./cube');
var config = require('../config');

// set vars
var token = utils.token;
// var debug = config.debug;
var debug = true;
var args = process.argv;
var ops = [];
var tmp = {};

// set utc
moment.utc(); 

// set api; domain resolution compatible with localhost setup (must run from within Docker container)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0" 
var current_domain = config.domain || process.env.MAPIC_DOMAIN;
var domain = (current_domain == 'localhost') ? 'https://172.17.0.1' : 'https://' + current_domain;
var api = supertest(domain);

// get dataset.json
if (!args[2]) return utils.missing();

// get json options
var json = require('../' + args[2]);

// ensure settings
if (!json || !json.options || !json.options.dateformat) return utils.missing();


// helper fn's
function parse_date(f) {
    // get correct date parser
    if (json.options.dateformat == 'x_x_YYYY_DDD') return parse_date_YYYY_DDD(f);
    if (json.options.dateformat == 'x_x_YYYYMMDD') return parse_date_YYYYMMDD(f);
    console.log('Unsupported date format:', json.options.dateformat);
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
function token(done) {
    api
    .get(endpoints.users.token.token)
    .query({
        username : config.username,
        password : config.password
    })
    .send()
    .end(function (err, res) {
        if (err || !res) return done(err || 'No response.');
        var tokens = utils.parse(res.text);
        done(err, tokens);
    });
};

// connect to ftp
var ftp = new JSFtp({
    host: json.ftp.host,
    port: 21, // defaults to 21
    user: json.ftp.user, // defaults to "anonymous"
    pass: json.ftp.pass // defaults to "@anonymous"
});


// get or create cube; returns err, cube 
if (json.options.cube) {

    // check for stored cube
    ops.push(function (done) {
        token(function (err, access_token) {

            // test data
            var data = {
                access_token : access_token,
                cube_id : json.options.cube
            }

            api // api request
            .get(endpoints.cube.get)
            .query(data)
            .end(function (err, res) {
                if (err) return done(err);
                var cube = res.body;
                debug && console.log(cube);
                tmp.cube = cube; // save in global
                done && done(err);
            });
        });
    });

} else {

    // create cube
    ops.push(function (callback) {
        token(function (err, access_token) {

            // cube options
            var cube_options = {
                title : 'cube-title',
                style : Cube.get_default_cartocss(),
                options : {
                    type : json.options.type,
                    dateformat : json.options.dateformat
                },
                access_token : access_token
            }

            api // api request
            .post(endpoints.cube.create)
            .send(cube_options)
            .end(function (err, res) {
                if (err) return done(err);
                var cube = res.body;
                debug && console.log('Created cube: \n', cube);
                tmp.cube = cube;
                callback && callback(err);
            });
        });
    });
}


// // get datasets from cube
// ops.push(function (callback) {
//     console.log('cube.datasets: ', tmp.cube.datasets);
//     // if this, that and the other
//     callback();
// });


// get file list from ftp
ops.push(function (callback) {

   
    // get path
    tmp.ftp_folder = '/';
    if (_.size(json.ftp.folder)) {
        tmp.ftp_folder = json.ftp.folder + tmp.ftp_folder; 
    }
  
    // list folder
    ftp.ls(tmp.ftp_folder, function(err, files) {
        if (err) return callback(err);

        var today = moment();
        var cube = tmp.cube;
        var datasets = cube.datasets;
        var ftp_files_to_add = [];

        // keyBy
        var ftp_files = _.keyBy(files, 'name');
        var cube_files = _.keyBy(datasets, 'description');

        // find files to add; either doesn't exist or are newer than cube versions
        _.forEach(ftp_files, function (f, key) {

            // check if not exists
            var key = key; // eg. 'SCF_MOD_20160622.tif'

            if (_.has(cube_files, key)) {
                // cube already has this ftp file

                // get timestamps
                var cube_file_timestamp = moment(cube_files[key].lastModified);
                var ftp_file_timestamp = moment(f.time);

                // check if newer
                if (cube_file_timestamp.isBefore(ftp_file_timestamp)) {

                    console.log('cube doesnt have latest version of file', key);
                    
                    // add to array
                    ftp_files_to_add.push(f);
                }

            } else {

                // cube doesnt have this ftp file
                console.log('cube doesnt have this file', key);
                
                // add to array
                ftp_files_to_add.push(f);
            }

        });

        // store globally
        tmp.ftp_files_to_add = ftp_files_to_add;

        // done
        callback(null);
    });
});

// download files from ftp
ops.push(function (callback) {

    // debug, only three files
    // tmp.ftp_files_to_add = tmp.ftp_files_to_add.slice(0,3);

    // // get file
    tmp.local_folder = '/tmp/ftp/' + tmp.cube.cube_id + '/'; // nb! this is sdk docker folder, not engine/mile /data/!
    fs.mkdirs(tmp.local_folder, function (err) {
        if (err) return callback(err);

        // download from ftp
        async.eachSeries(tmp.ftp_files_to_add, function (item, done) {

            // set paths
            var ftp_file_path = tmp.ftp_folder + item.name;
            var local_file_path = tmp.local_folder + item.name;

            console.log('downloading: ', ftp_file_path, 'to:', local_file_path);

            // get from ftp
            ftp.get(ftp_file_path, local_file_path, done);

        }, callback);

    });
});

// read local tmp folder
ops.push(function (callback) {
    dir.files(tmp.local_folder, function (err, files) {
        tmp.upload_files = files;
        callback(err, files);
    });
});

// ensure files are correct
ops.push(function (callback) {

    var invalid = [];

    // check for valid date formats
    tmp.upload_files.forEach(function (f) {

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
});

// upload to API
ops.push(function (callback) {
    var files = tmp.upload_files;
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
            done(null);

        });
    }, callback);
});
 

// replace datasets in cube
ops.push(function (callback) {
    var sets = [];

    console.log('preparing to replace datasets');

    // create dataset array
    tmp.uploaded.forEach(function (up) {
        sets.push({
            id : up.file_id,
            description : up.filename,
            timestamp : parse_date(up.filename).format(),
            granularity : 'day'
        });
    });

    console.log('sets:', sets);
    console.log('number of datasets:', _.size(tmp.cube.datasets));

    // add dataset to cube
    Cube.replace_datasets({
        cube_id : tmp.cube.cube_id,
        datasets : sets
    }, function (err, cube) {
        console.log('replaced datasets in cube', err, cube);
        console.log('number of datasets:', _.size(cube.datasets));

        tmp.updated_cube = cube;
        callback(err);
    });

});


ops.push(function (callback) {

    console.log('updateding wu layer !');

    token(function (err, access_token) {

        var layer = {
            data : {
                cube : JSON.stringify(tmp.updated_cube)
            },
            layer : json.options.layer,
            uuid : json.options.project,
            access_token : access_token
        };

         api // api request
        .post(endpoints.layers.update)
        .send(layer)
        .end(function (err, res) {
            // if (err) return callback(err);
            console.log('err, res', err, res);
            callback(err);
        });

    });
});


    // // list folder
    // ftp.ls(tmp.ftp_folder, function(err, files) {
    //     // console.log(files);

    //     // var today = moment();

    //     // console.log('today->', today.fromNow());

    //     // look at each file
    //     _.forEach(files, function (f) {
    //         var date = moment(f.time);

    //         console.log('date.fromNow()', date.fromNow());
        
    //         var isToday = date.isBetween(today, yday);
    //         console.log('isToday:', isToday);

    //     });


    //     // quit
    //     process.exit(0);
    // });


    // need to upload files

    // // upload each dataset
    // async.eachSeries(files, function (file, done) {

    //     // upload data
    //     Cube.upload_data({
    //         path : file
    //     }, function (err, result) {

    //         // catch errors
    //         if (err) return done(err);

    //         // remember
    //         tmp.uploaded.push(result);

    //         // log
    //         console.log('Uploaded', result.filename);

    //         // return
    //         done(err);

    //     });
    // }, callback);



    // // create dataset array
    // tmp.ftp_files_to_add.forEach(function (f) {
    //     sets.push({
    //         id : f.file_id,
    //         description : f.filename,
    //         timestamp : parse_date(up.filename).format(),
    //         granularity : dataset.granularity || 'day'
    //     });
    // });

    // // add dataset to cube
    // Cube.replace_datasets({
    //     cube_id : dataset.cube_id,
    //     datasets : sets
    // }, callback);






    // callback();


async.series(ops, function (err, result) {

    console.log('async done:', err);

    process.exit(1);

});




// // get user
// ops.get_user = function (callback) {
//     utils.get_user(function(err, user) {
//         tmp.user = user;
//         callback(err, user);
//     }, true);
// }

// // read folder
// ops.read_folder = function (callback) {
//     dir.files(dataset.folder, function (err, files) {
//         tmp.files = files;
//         callback(err, files);
//     });
// };

// // run tests before processing
// ops.test = function (callback) {

//     var invalid = [];

//     // check for valid date formats
//     tmp.files.forEach(function (f) {

//         // get filename
//         var filename = path.basename(f);

//         // test date parsing
//         var date = parse_date(filename);

//         // check if valid moment
//         var isValid = date.isValid(); 

//         // gather invalid moments
//         if (!isValid) invalid.push(filename);
//     });

//     // catch errors
//     if (_.size(invalid)) {

//         // log
//         console.log('Some filenames could not be parsed to dates. Aborting!');
//         console.log('Invalid filenames:', invalid);

//         // quit
//         return process.exit(1);
//     }

//     // all good, continue
//     callback();
// };

// // upload
// ops.upload = function (callback) {
//     var files = tmp.files;
//     tmp.uploaded = [];

//     // upload each dataset
//     async.eachSeries(files, function (file, done) {

//         // upload data
//         Cube.upload_data({
//             path : file
//         }, function (err, result) {

//             // catch errors
//             if (err) return done(err);

//             // remember
//             tmp.uploaded.push(result);

//             // log
//             console.log('Uploaded', result.filename);

//             // return
//             done(err);

//         });
//     }, callback);
// };

// // replace datasets in cube
// ops.replace_datasets = function (callback) {
//     var sets = [];

//     // create dataset array
//     tmp.uploaded.forEach(function (up) {
//         sets.push({
//             id : up.file_id,
//             description : up.filename,
//             timestamp : parse_date(up.filename).format(),
//             granularity : dataset.granularity || 'day'
//         });
//     });

//     // add dataset to cube
//     Cube.replace_datasets({
//         cube_id : dataset.cube_id,
//         datasets : sets
//     }, callback);

// };



// async.series(ops, function (err, results) {
    
//     // catch error
//     if (err) {
//         console.log('\nSomething went wrong!', err);
//         return process.exit(1);
//     }
    
//     // all good
//     console.log('\nAll done. Replaced datasets in cube. Remember to refresh your page and force a refresh of tiles and queries.');

// });