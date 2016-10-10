// require libs
var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var _ = require('lodash');
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

// get dataset.json
if (!args[2]) return 'Please provide a .json file. Usage: ./upload_dataset.sh dataset.json';
var dataset = require('../' + args[2]);

// check that all variables are present
if (!dataset) return 'Please provide a valid dataset. See datacube.json.template for a valid example.';
if (!dataset.datasets) return 'Please provide datasets to upload. See datacube.json.template for a valid example.';
if (!dataset.options) return 'Please provide dataset options. See datacube.json.template for a valid example.';
if (!dataset.options.dateformat) return 'Please provide a date format. See datacube.json.template for a valid example.';
if (!dataset.options.type) return 'Please provide a cube type. See datacube.json.template for a valid example.';
if (!dataset.title) return 'Please provide a title. See datacube.json.template for a valid example.';
if (!config) return 'Please provide a valid config.json. See config.json.template for a valid example.';
if (!config.domain) return 'Please provide a valid config.json. See config.json.template for a valid example.';
if (!config.username) return 'Please provide a valid config.json. See config.json.template for a valid example.';
if (!config.password) return 'Please provide a valid config.json. See config.json.template for a valid example.';


// get user
ops.get_user = function (callback) {
    utils.get_user(function(err, user) {
        if (err) return callback(err);
        tmp.user = user;
        callback();
    }, true);
}

// read folder
ops.read_folder = function (callback) {
    dir.files(dataset.datasets, function (err, files) {
        if (err) return callback(err);
        tmp.files = files;
        callback();
    });
};

// upload datasets to api
ops.upload = function (callback) {
    var files = tmp.files;
    var uploaded = [];

    // debug: only allow ten files for now
    // var limit = 10;
    // if (files.length > limit) {
    //     console.log('\nError: No more than', limit, 'files allowed in upload folder during debug!');
    //     console.log('Please remove some files from', dataset.folder);
    //     process.exit(1);
    // }

    async.eachSeries(files, function (file, done) {
        Cube.upload_data({
            path : file
        }, function (err, result) {
            if (err) return done(err);
            uploaded.push(result);
            console.log('Uploaded', result.filename);
            done();
        });
    }, function (err) {
        if (err) return callback(err);
        tmp.uploaded = uploaded;
        callback();
    });
};


// create empty cube with title + style
ops.create_cube = function (callback) {
    Cube.create({
        title : dataset.title,
        style : Cube.get_default_cartocss(),
        options : dataset.options,
    }, function (err, cube) {
        if (err) return callback(err);
        console.log('Created cube', cube.cube_id);
        tmp.cube = cube;
        callback();
    });
};


// add uploaded datasets to cube
ops.add_datasets = function (callback) {
    var uploaded = tmp.uploaded;
    var sets = [];

    // set array
    uploaded.forEach(function (up) {
        var timestamp = parse_date_YYYYMMDD(up.filename);
        sets.push({
            id : up.file_id,
            description : up.filename,
            timestamp : timestamp
        });
    });

    // add dataset to cube
    Cube.add_dataset({
        cube_id : tmp.cube.cube_id,
        datasets : sets
    }, function (err, cube) {
        if (err) return callback(err);
        console.log('Added datasets to cube.', err, cube);
        tmp.cube = cube;
        callback();
    });

};


// add mask to cube
var masks = dataset.masks
if (masks && _.isArray(masks) && _.size(masks)) {

    ops.add_mask = function (callback) {

        async.eachSeries(masks, function (mask, done) {

            var data = {
                cube_id : tmp.cube.cube_id,
                mask : {
                    // title : mask.title,
                    // description : mask.description,
                    type : 'geojson',
                    geometry : fs.readJsonSync(mask.geojson),
                    meta : mask.meta,
                    data : mask.data ? fs.readJsonSync(mask.data) : null
                }
            }

            // add data if available
            // if (mask.data) {
            //     data.data = fs.readJsonSync(mask.data);
            // }

            Cube.add_mask(data, function (err, updated_cube) {
                if (err) return done(err);
                tmp.cube = updated_cube;
                done();
            });

        }, function (err) {
            if (err) return callback(err);
            callback();
        });


    }

}


// create project
ops.create_project = function (callback) {
    var project_id = dataset.project;
    if (project_id) {
        tmp.project = {
            uuid : project_id
        }
        return callback(null); // project already exists
    }
    Cube.create_project({
        name : dataset.title + ' project ' + utils.rnd(3)
    }, function (err, result) {
        if (err) return callback(err);
        console.log('Created project "' + result.project.name + '"');
        tmp.project = result.project;
        callback();
    });
};


// create layer
ops.create_layer = function (callback) {
    var layerOptions = {
        projectUuid : tmp.project.uuid, // pass to automatically attach to project
        data : { cube : tmp.cube },
        title : dataset.title,
        file : 'file-' + tmp.cube.cube_id,
        style : Cube.get_default_cartocss() // save default json style
    }

    // create wu layer
    Cube.create_layer(layerOptions, function (err, layer) {
        if (err) return callback(err);
        console.log('Created layer "' + layer.title + '"');
        tmp.layer = layer;
        callback();
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
        console.log('Added layer to project layermenu');
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


function parse_date(f) {
    var d = dataset.options.dateformat;
    if (d == "YYYYMMDD") return parse_date_YYYYMMDD(f);
    if (d == "YYYYDDD") return parse_date_YYYY_DDD(f);
}

// helper functions
function parse_date_YYYY_DDD(f) {
    // f is eg. "SCF_MOD_2014_002.tif"
    var a = f.split('.');
    var b = a[0].split('_');
    var year = b[2];
    var day = b[3];
    var yd = year + '-' + day;
    var date = moment.utc(yd, "YYYY-DDDD").format();
    return date;
}

function parse_date_YYYYMMDD(f) {
    // f is eg. "SCF_MOD_20150101.tif"
    var a = f.split('.');
    var b = a[0].split('_');
    var dato = b[2];
    var date = moment.utc(dato, "YYYYMMDD").format();
    return date;
}
