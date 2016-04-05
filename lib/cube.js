// require libs
var fs = require('fs-extra');
var path = require('path');
var supertest = require('supertest');
var endpoints = require('./endpoints');
var utils = require('./utils');
var config = require('../config');
var api = supertest('https://' + config.domain);
var debug = config.debug;

module.exports = cube = {

    // create cube
    create : function (options, done) {
        utils.token(function (err, access_token) {

            // cube options
            var options = _.isObject(options) ? options : {};
            options.access_token = access_token;

            // send API request
            api.post(endpoints.cube.create)
            .send(options)
            .end(function (err, res) {
                var cube = res.body;
                debug && console.log('Created cube: \n', cube);
                done && done(err, cube);
            });
        });

    },
}
