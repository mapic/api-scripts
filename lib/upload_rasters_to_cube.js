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

function parse_date_YYYY_DDD(f) {
    var a = f.split('.');
    var b = a[0].split('_');
    var year = b[2];
    var day = b[3];
    var yd = year + '-' + day;
    var date = moment(yd, "YYYY-DDDD");
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

    // debug: only allow ten files for now
    var limit = 10;
    if (files.length > limit) {
        console.log('\nError: No more than', limit, 'files allowed in upload folder during debug!');
        console.log('Please remove some files from', dataset.folder);
        process.exit(1);
    }

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

// create cube
ops.create_cube = function (callback) {
    Cube.create({
        title : dataset.title,
        style : Cube.get_default_cartocss()
    }, function (err, cube) {
        console.log('Created cube', cube.cube_id);
        tmp.cube = cube;
        callback(err, cube);
    });
};

// add datasets to cube
ops.add_datasets = function (callback) {
    var uploaded = tmp.uploaded;
    var sets = [];

  
    uploaded.forEach(function (up) {
        sets.push({
            uuid : up.file_id,
            meta : {
                text : 'Filename: ' + up.filename,
                date : parse_date_YYYY_DDD(up.filename)
            }
        });
    });

    Cube.add_dataset({
        cube_id : tmp.cube.cube_id,
        datasets : sets
    }, function (err, cube) {
        console.log('Added datasets to cube.')
        tmp.cube = cube;
        callback(err, cube);
    })

};

// create project
ops.create_project = function (callback) {
    var project_id = dataset.project;
    if (project_id) {
        tmp.project = {
            uuid : project_id
        }
        return callback(); // project already exists
    }
    Cube.create_project({
        name : dataset.title + ' project ' + utils.rnd(3)
    }, function (err, result) {
        console.log('Created project "' + result.project.name + '"');
        tmp.project = result.project;
        callback(err, result.project);
    });
};

// create layer
ops.create_layer = function (callback) {
    var layerOptions = {
        projectUuid : tmp.project.uuid, // pass to automatically attach to project
        data : { cube : tmp.cube },
        // metadata : tmp.uploaded[0].metadata, // TODO: after processing done!
        title : dataset.title,
        file : 'file-' + tmp.cube.cube_id,
        style : Cube.get_default_cartocss() // save default json style
    }

    Cube.create_layer(layerOptions, function (err, layer) {
        console.log('Created layer "' + layer.title + '"');
        tmp.layer = layer;
        callback(err, layer);
    });
};

// add layer to layermenu
ops.add_layer = function (callback) {
    var options = {
        layermenu : [{
            uuid : utils.guid('layerMenuItem'),
            layer : tmp.layer.uuid,
            caption : dataset.title,
            pos : 0,
            zIndex : 1,
            opacity : 1
        }],
        uuid : tmp.project.uuid
    };

    Cube.update_project(options, function (err, layermenu) {
        console.log('Added layer to project');
        callback(err);
    });
}   


async.series(ops, function (err, results) {
    if (err) {
        console.log('\nSomething went wrong!', err);
        return process.exit(1);
    }

    console.log('\nAll done. Check out your project on https://' + config.domain + '/' + tmp.user.username + '/' + tmp.project.slug);

});