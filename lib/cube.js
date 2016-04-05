// require libs
var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var supertest = require('supertest');
var endpoints = require('./endpoints');
var utils = require('./utils');
var token = utils.token;
var config = require('../config');
var api = supertest('https://' + config.domain);
var debug = config.debug;

module.exports = cube = {

    // create cube
    create : function (options, done) {
        token(function (err, access_token) {

            // cube options
            var data = _.isObject(options) ? options : {};
            data.access_token = access_token;

            // send API request
            api.post(endpoints.cube.create)
            .send(data)
            .end(function (err, res) {
                if (err) return done(err);

                var cube = res.body;
                debug && console.log('Created cube: \n', cube);
                done && done(err, cube);
            });
        });
    },

    // get stored cube
    get : function (cube_id, done) {
        token(function (err, access_token) {

            // test data
            var data = {
                access_token : access_token,
                cube_id : cube_id
            }

            api.get(endpoints.cube.get)
            .query(data)
            .end(function (err, res) {
                if (err) return done(err);

                var cube = res.body;
                debug && console.log(cube);
                done && done(err, cube);
            });
        });
    },

    // upload dataset
    upload_data : function (options, done) {
        token(function (err, access_token) {
            api.post(endpoints.import.post)
            .type('form')
            .field('access_token', access_token)
            .field('data', fs.createReadStream(options.path))
            .end(function (err, res) {
                if (err) return done(err);

                var status = res.body;
                debug && console.log(status);
                done && done(err, status);
            });
        });
    },

    // add dataset to cube
    add_dataset : function (options, done) {
        token(function (err, access_token) {

            // test data
            var data = {
                access_token : access_token,
                cube_id : options.cube_id,
                datasets : options.datasets
            }

            api.post(endpoints.cube.add)
            .send(data)
            .end(function (err, res) {
                if (err) return done(err);

                var cube = res.body;
                debug && console.log(cube);
                done && done(err, cube);
            });
        });
    },

   

    // create layer for datacube
    create_layer : function (options, done) {
        token(function (err, access_token) {

            // var layer = {
            //     access_token : access_token,
            //     projectUuid : options.project, // pass to automatically attach to project
            //     data : { cube : options.cube },
            //     metadata : options.metadata
            //     title : options.title
            //     description : 'cube layer description',
            //     file : 'file-' + tmp.snow_raster_cube.cube_id,
            //     style : JSON.stringify(get_default_cartocss()) // save default json style
            // }

            var layer = options;
            layer.access_token = access_token;

            api.post(endpoints.layers.create)
            .send(layer)
            .end(function (err, res) {
                if (err) return done(err);
               
                var layer = res.body;
                debug && console.log(layer);
                done && done(err, layer);
            });
        });
    },

    // create project
    create_project : function (options, done) {
        token(function (err, access_token) {

            var data = {
                name : options.name,
                access_token : access_token
            }

            api.post(endpoints.projects.create)
            .send(data)
            .end(function (err, res) {
                if (err) return done(err);

                var project = res.body;
                debug && console.log(project);           
                done && done(err, project);
            });
        });
    },

    update_project : function (options, done) {
        token(function (err, access_token) {

            var data = options;
            data.access_token = access_token;

            api.post(endpoints.projects.update)
            .send(data)
            .end(function (err, res) {
                if (err) return done(err);

                var project = res.body;
                debug && console.log(project);           
                done && done(err, project);
            });
        });
    },

    get_default_cartocss : function () {
        // raster debug
        var defaultCartocss = '';
        defaultCartocss += '#layer {'
        defaultCartocss += 'raster-opacity: 1; '; 
        // defaultCartocss += 'raster-scaling: gaussian; '; 
        defaultCartocss += 'raster-colorizer-default-mode: linear; '; 
        defaultCartocss += 'raster-colorizer-default-color: transparent; '; 
        defaultCartocss += 'raster-comp-op: color-dodge;';
        defaultCartocss += 'raster-colorizer-stops: '; 
        // white to blue
        defaultCartocss += '  stop(20, rgba(0,0,0,0)) '; 
        defaultCartocss += '  stop(21, #dddddd) '; 
        defaultCartocss += '  stop(100, #0078ff) '; 
        defaultCartocss += '  stop(200, #000E56) '; 
        defaultCartocss += '  stop(255, rgba(0,0,0,0), exact); '; 
        defaultCartocss += ' }';
        return defaultCartocss;
    },

  

}