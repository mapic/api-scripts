// require libs
var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var _ = require('lodash');
var dir = require('node-dir');
var moment = require('moment');
var node_uuid = require('node-uuid');
var supertest = require('supertest');
var endpoints = require('./endpoints');
var utils = require('./utils');
var token = utils.token;
var config = require('../config');
var Cube = require('./cube');
var debug = config.debug;
var args = process.argv;
var stripComments = require('strip-json-comments');
var ops = {};
var tmp = {};
moment.utc(); // set utc

// domain resolution compatible with localhost setup (must run from within Docker container)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0" 
var current_domain = config.domain || process.env.MAPIC_DOMAIN;
var domain = (current_domain == 'localhost') ? 'https://172.17.0.1' : 'https://' + current_domain;
var api = supertest(domain);
var wd = process.cwd();

// get dataset.json
if (!args[2]) return console.log('Please provide a .json file. Usage: ./upload_dataset.sh dataset.json');
var dataset_path = wd + '/' + args[2];
var dataset_raw = fs.readFileSync(dataset_path, 'utf-8');
var stripped = stripComments(dataset_raw);
var dataset = JSON.parse(stripped);


// check that all variables are present
if (!dataset)                       return console.log('Please provide a valid dataset. See datacube.json.template for a valid example.');
if (!dataset.datasets)              return console.log('Please provide datasets to upload. See datacube.json.template for a valid example.');
if (!dataset.mvel_dataset)          return console.log('Please provide mvel dataset to upload. See datacube.json.template for a valid example.');
if (!dataset.options)               return console.log('Please provide dataset options. See datacube.json.template for a valid example.');
if (!dataset.options.dateformat)    return console.log('Please provide a date format. See datacube.json.template for a valid example.');
if (!dataset.options.type)          return console.log('Please provide a cube type. See datacube.json.template for a valid example.');
if (!dataset.title)                 return console.log('Please provide a title. See datacube.json.template for a valid example.');
if (!config)                        return console.log('Please provide a valid config.json. See config.json.template for a valid example.');
if (!config.domain)                 return console.log('Please provide a valid config.json. See config.json.template for a valid example.');
if (!config.username)               return console.log('Please provide a valid config.json. See config.json.template for a valid example.');
if (!config.password)               return console.log('Please provide a valid config.json. See config.json.template for a valid example.');



// default int16 styles
var default_cartocss = "#layer { raster-opacity: 1; raster-colorizer-default-mode: linear; raster-colorizer-default-color: transparent; raster-comp-op: color-dodge; raster-colorizer-stops:  stop(0, rgba(0,0,0,0)) stop(31999, rgba(0,0,0,0)) stop(32000, rgba(255,255,255,0)) stop(32767, rgba(101,253,0,1)) stop(33400, rgba(255,255,0,1)) stop(36999, rgba(255,0,0,1)) stop(37000, rgba(0,0,0,0)) stop(65534, rgba(0,0,0,0), exact);}";
var default_style = "{\"stops\":[{\"val\":32000,\"col\":{\"r\":255,\"g\":255,\"b\":255,\"a\":0},\"DOM\":{\"wrapper\":{},\"container\":{},\"range\":{},\"number\":{},\"colorBall\":{\"options\":{\"appendTo\":{},\"type\":\"colorball\",\"id\":0,\"right\":false,\"value\":\"rgba(255,255,255,0)\",\"className\":\"raster-color\",\"on\":true,\"showAlpha\":true,\"format\":\"rgba\"},\"color\":{}}},\"list\":{\"line\":{},\"addButton\":{\"_leaflet_events\":{}},\"noWrap\":{},\"noTitle\":{},\"valWrap\":{},\"valInput\":{\"_leaflet_events\":{}},\"colWrap\":{},\"rInput\":{\"_leaflet_events\":{}},\"gInput\":{\"_leaflet_events\":{}},\"bInput\":{\"_leaflet_events\":{}},\"alphaWrap\":{},\"aInput\":{\"_leaflet_events\":{}},\"colorWrap\":{},\"color\":{\"options\":{\"appendTo\":{},\"type\":\"colorball\",\"id\":0,\"right\":false,\"value\":\"rgba(255,255,255,0)\",\"className\":\"stop-list-color-ball\",\"on\":true,\"showAlpha\":true,\"format\":\"rgba\"},\"color\":{}},\"killButton\":{\"_leaflet_events\":{}}}},{\"val\":32767,\"col\":{\"r\":101,\"g\":253,\"b\":0,\"a\":1},\"DOM\":{\"wrapper\":{},\"container\":{},\"range\":{},\"number\":{},\"colorBall\":{\"options\":{\"appendTo\":{},\"type\":\"colorball\",\"id\":1,\"right\":false,\"value\":\"rgba(101,253,0,1)\",\"className\":\"raster-color\",\"on\":true,\"showAlpha\":true,\"format\":\"rgba\"},\"color\":{}}},\"list\":{\"line\":{},\"addButton\":{\"_leaflet_events\":{}},\"noWrap\":{},\"noTitle\":{},\"valWrap\":{},\"valInput\":{\"_leaflet_events\":{}},\"colWrap\":{},\"rInput\":{\"_leaflet_events\":{}},\"gInput\":{\"_leaflet_events\":{}},\"bInput\":{\"_leaflet_events\":{}},\"alphaWrap\":{},\"aInput\":{\"_leaflet_events\":{}},\"colorWrap\":{},\"color\":{\"options\":{\"appendTo\":{},\"type\":\"colorball\",\"id\":1,\"right\":false,\"value\":\"rgba(101,253,0,1)\",\"className\":\"stop-list-color-ball\",\"on\":true,\"showAlpha\":true,\"format\":\"rgba\"},\"color\":{}},\"killButton\":{\"_leaflet_events\":{}}}},{\"val\":33400,\"col\":{\"r\":255,\"g\":255,\"b\":0,\"a\":1},\"DOM\":{\"wrapper\":{},\"container\":{},\"range\":{},\"number\":{},\"colorBall\":{\"options\":{\"appendTo\":{},\"type\":\"colorball\",\"id\":2,\"right\":false,\"value\":\"rgba(255,255,0,1)\",\"className\":\"raster-color\",\"on\":true,\"showAlpha\":true,\"format\":\"rgba\"},\"color\":{}}},\"list\":{\"line\":{},\"addButton\":{\"_leaflet_events\":{}},\"noWrap\":{},\"noTitle\":{},\"valWrap\":{},\"valInput\":{\"_leaflet_events\":{}},\"colWrap\":{},\"rInput\":{\"_leaflet_events\":{}},\"gInput\":{\"_leaflet_events\":{}},\"bInput\":{\"_leaflet_events\":{}},\"alphaWrap\":{},\"aInput\":{\"_leaflet_events\":{}},\"colorWrap\":{},\"color\":{\"options\":{\"appendTo\":{},\"type\":\"colorball\",\"id\":2,\"right\":false,\"value\":\"rgba(255,255,0,1)\",\"className\":\"stop-list-color-ball\",\"on\":true,\"showAlpha\":true,\"format\":\"rgba\"},\"color\":{}},\"killButton\":{\"_leaflet_events\":{}}}},{\"val\":36999,\"col\":{\"r\":255,\"g\":0,\"b\":0,\"a\":1},\"DOM\":{\"wrapper\":{},\"container\":{},\"range\":{},\"number\":{},\"colorBall\":{\"options\":{\"appendTo\":{},\"type\":\"colorball\",\"id\":3,\"right\":false,\"value\":\"rgba(255,0,0,1)\",\"className\":\"raster-color\",\"on\":true,\"showAlpha\":true,\"format\":\"rgba\"},\"color\":{}}},\"list\":{\"line\":{},\"noWrap\":{},\"noTitle\":{},\"valWrap\":{},\"valInput\":{\"_leaflet_events\":{}},\"colWrap\":{},\"rInput\":{\"_leaflet_events\":{}},\"gInput\":{\"_leaflet_events\":{}},\"bInput\":{\"_leaflet_events\":{}},\"alphaWrap\":{},\"aInput\":{\"_leaflet_events\":{}},\"colorWrap\":{},\"color\":{\"options\":{\"appendTo\":{},\"type\":\"colorball\",\"id\":3,\"right\":false,\"value\":\"rgba(255,0,0,1)\",\"className\":\"stop-list-color-ball\",\"on\":true,\"showAlpha\":true,\"format\":\"rgba\"},\"color\":{}},\"killButton\":{\"_leaflet_events\":{}}}}],\"range\":{\"min\":0,\"max\":65534}}";


// upload deformation rasters
// --------------------------
// see https://github.com/mapic/mapic.js/issues/29
// 
// 
// steps:
// 1. upload mvel raster
// 2. create tile layer (mile)
// 2. create a normal layer (engine), with `layer_type = 'defo_raster'`
// 3. upload all daily defo rasters
// 4. add id's to layer under 'data.defo_raster' 
// 5. that's it! rest is in client.
// 6. mile: queries for each of daily defo_rasters



var debug = true;






// get user
ops.get_user = function (callback) {
    utils.get_user(function(err, user) {
        if (err) return callback(err);
        tmp.user = user;
        debug && console.log('user:', user);
        callback();
    }, true);
}

// read folder
ops.read_folder = function (callback) {
    dir.files('/data' + dataset.datasets, function (err, files) {
        if (err) return callback(err);
        tmp.files = files;
        debug && console.log('files: ', files);
        callback();
    });
};

ops.upload_mvel = function (callback) {

    var mvel_path = '/data' + dataset.mvel_dataset;

    token(function (err, access_token) {
        api.post(endpoints.data.import)
        .type('form')
        .field('access_token', access_token)
        .field('data', fs.createReadStream(mvel_path))
        .end(function (err, res) {
            if (err) return callback(err);
            debug && console.log('status:', res.body);
            tmp.status = res.body;
            callback(err);
        });
    });

}

// to get the File.Model after upload is done processing
// todo: check status first to see if processing is done
ops.get_file = function (callback) {
    setTimeout(function () {
        token(function (err, access_token) {
            var fileUuid = tmp.status.file_id;
            var GET = '/v2/data/import?fileUuid=' + fileUuid + '&access_token=' + access_token;
            api.get(GET)
            .end(function (err, response) {
                var body = response.body;
                debug && console.log('get file:', body);

                callback(err);
            }) 
        });
    }, 10000)
};

ops.create_project = function (callback) {

    token(function (err, access_token) {

        var project_json = {
            "name": dataset.title,
            "description": "",
            "access": {
                "edit": [],
                "read": [],
                "options": {
                    "share": true,
                    "download": true,
                    "isPublic": false
                }
            },
            "access_token": access_token
        };

        // create project
        api.post('/v2/projects/create')
        .send(project_json)
        .end(function (err, response) {
            var body = response.body;
            tmp.project = body.project;
            debug && console.log('create project:', body.project);

            callback();
        })
    })

};

ops.create_tile_layer = function (callback) {

    token(function (err, access_token) {

        var layer_json = {
          "geom_column": "rast",
          "geom_type": "raster",
          "raster_band": "",
          "srid": "",
          "affected_tables": "",
          "interactivity": "",
          "attributes": "",
          "access_token": access_token,
          "cartocss_version": "2.0.1",
          "cartocss": default_cartocss,
          "sql": "(SELECT * FROM " + tmp.status.file_id + ") as sub",
          "file_id": tmp.status.file_id,
          "return_model": true,
          "projectUuid": tmp.project.uuid,
          "cutColor": false
        }

        // create tile layer
        api.post('/v2/tiles/create')
        .send(layer_json)
        .end(function (err, response) {
            var body = response.body;
            tmp.tile_layer = body.options;
            debug && console.log('create tile layer:', body.options);

            callback();
        });

    })

};

ops.create_engine_layer = function (callback) {

    token(function (err, access_token) {

        var layer_json = {
            "projectUuid": tmp.project.uuid,
            "data": {
                "postgis": tmp.tile_layer
            },
            "metadata": tmp.tile_layer.metadata,
            "title": dataset.title,
            "description": "",
            "file": tmp.tile_layer.file_id,
            "layer_type" : "defo_raster",
            "style" : default_style,
            "access_token": access_token
        }

        // create tile layer
        api.post('/v2/layers/create')
        .send(layer_json)
        .end(function (err, response) {
            // console.log('err, reson', err, response);
            var body = response.body;
            debug && console.log('create engine layer:', body.options);
            tmp.layer = body;
            callback();
        });

    });

};


ops.add_to_layermenu = function (callback) {


    token(function (err, access_token) {

        var layermenu_json = {
            "layermenu": [
                {
                    "uuid" : "layerMenuItem-" + node_uuid.v4(),
                    "layer": tmp.layer.uuid,
                    "caption": dataset.title,
                    "pos": "0",
                    "opacity": "1",
                    "zIndex": "1"
                }
            ],
            "uuid": tmp.project.uuid,
            "access_token": access_token
        };

        // create tile layer
        api.post('/v2/projects/update')
        .send(layermenu_json)
        .end(function (err, response) {
            var body = response.body;
            debug && console.log('add to layermenu:', body);
            callback();
        });

    });

};

// upload data files
ops.upload_datasets = function (callback) {
    var files = tmp.files;

    tmp.uploaded_datasets = [];

    async.eachSeries(files, function (file, done) {

        token(function (err, access_token) {
            api.post(endpoints.data.import)
            .type('form')
            .field('access_token', access_token)
            .field('data', fs.createReadStream(file))
            .end(function (err, response) {
                tmp.uploaded_datasets.push(JSON.stringify({
                    file_id : response.body.file_id,
                    date : parse_date_YYYYMMDD(file)
                }));
                debug && console.log('upload datasets:', response.body);
                done(err);
            });
        });


    }, callback);

};

ops.add_datasets_to_layer = function (callback) {

    // var defo_raster_array = [];
    // tmp.uploaded_datasets.forEach(function (u) {
    //     defo_raster_array.push(u.file_id);        
    // });

    token(function (err, access_token) {

        var update_layer_json = {
            "defo_rasters" : tmp.uploaded_datasets,
            "layer": tmp.layer.uuid,
            "uuid": tmp.project.uuid,
            "access_token": access_token
        }

        // create tile layer
        api.post('/v2/layers/update')
        .send(update_layer_json)
        .end(function (err, response) {
            var body = response.body;
            debug && console.log('add datasets to layer:', body);
            callback();
        });
    });

};


async.series(ops, function (err, results) {
    console.log('All done!');
    console.log(err, results);
    console.log(tmp);
});

return;



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
    var b = a[0].split('_').reverse();
    var dato = b[0];
    var date = moment.utc(dato, "YYYYMMDD").format();
    return date;
}
