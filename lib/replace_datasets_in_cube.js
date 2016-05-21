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
var api = supertest('https://' + config.domain);
var Cube = require('./cube');
var debug = config.debug;
var args = process.argv;
var ops = {};
var tmp = {};
moment.utc(); // set utc

function parse_date_YYYY_DDD(f) {
    // f is eg. "SCF_MOD_2014_002.tif"
    var a = f.split('.');
    var b = a[0].split('_');
    var year = b[2];
    var day = b[3];
    var yd = year + '-' + day;
    var date = moment(yd, "YYYY-DDDD").format();
    return date;
}

function parse_date_YYYYMMDD(f) {
    // f is eg. "SCF_MOD_20150101.tif"
    var a = f.split('.');
    var b = a[0].split('_');
    var dato = b[2];
    var date = moment(dato, "YYYYMMDD").format();
    return date;
}

// get dataset.json
if (!args[2]) return utils.missing();
var dataset = require('../' + args[2]);
if (!dataset || !dataset.folder) return utils.missing();

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

// upload
ops.upload = function (callback) {
    var files = tmp.files;
    var uploaded = [];

    // upload each dataset
    async.eachSeries(files, function (file, done) {
        Cube.upload_data({
            path : file
        }, function (err, result) {
            if (err) return done(err);
            uploaded.push(result);
            console.log('Uploaded', result.filename);
            done(err);
        });
    }, function (err) {
        tmp.uploaded = uploaded;
        callback(err, uploaded);
    });
};


// // create cube
// ops.create_cube = function (callback) {
//     Cube.create({
//         title : dataset.title,
//         style : Cube.get_default_cartocss()
//     }, function (err, cube) {
//         console.log('Created cube', cube.cube_id);
//         tmp.cube = cube;
//         callback(err, cube);
//     });
// };


// replace datasets in cube
ops.replace_datasets = function (callback) {
    var uploaded = tmp.uploaded;
    var sets = [];

    // set array
    uploaded.forEach(function (up) {
        sets.push({
            id : up.file_id,
            description : up.filename,
            timestamp : parse_date_YYYYMMDD(up.filename),
            granularity : dataset.granularity || 'day'
        });
    });

    // add dataset to cube
    Cube.replace_datasets({
        cube_id : dataset.cube_id,
        datasets : sets
    }, function (err, cube) {
        console.log('Replaced datasets in cube.', err);
        tmp.cube = cube;
        callback(err, cube);
    });

};


// // create project
// ops.create_project = function (callback) {
//     var project_id = dataset.project;
//     if (project_id) {
//         tmp.project = {
//             uuid : project_id
//         }
//         return callback(); // project already exists
//     }
//     Cube.create_project({
//         name : dataset.title + ' project ' + utils.rnd(3)
//     }, function (err, result) {
//         console.log('Created project "' + result.project.name + '"');
//         tmp.project = result.project;
//         callback(err, result.project);
//     });
// };


// // create layer
// ops.create_layer = function (callback) {
//     var layerOptions = {
//         projectUuid : tmp.project.uuid, // pass to automatically attach to project
//         data : { cube : tmp.cube },
//         title : dataset.title,
//         file : 'file-' + tmp.cube.cube_id,
//         style : Cube.get_default_cartocss() // save default json style
//     }

//     Cube.create_layer(layerOptions, function (err, layer) {
//         console.log('Created layer "' + layer.title + '"');
//         tmp.layer = layer;
//         callback(err, layer);
//     });
// };

// // add layer to layermenu
// ops.add_layer = function (callback) {
//     var options = {
//         layermenu : [{
//             uuid : utils.guid('layerMenuItem'),
//             layer : tmp.layer.uuid,
//             caption : dataset.title,
//             pos : 0,
//             zIndex : 1,
//             opacity : 1
//         }],
//         uuid : tmp.project.uuid
//     };

//     Cube.update_project(options, function (err, layermenu) {
//         console.log('Added layer to project');
//         callback(err);
//     });
// }   


async.series(ops, function (err, results) {
    if (err) {
        console.log('\nSomething went wrong!', err);
        return process.exit(1);
    }
    console.log('\nAll done. Replaced datasets in cube.');
    // console.log('\nAll done. Check out your project on https://' + config.domain + '/' + tmp.user.username + '/' + tmp.project.slug);

});