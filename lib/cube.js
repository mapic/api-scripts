// require libs
var fs = require('fs-extra');
var path = require('path');
var supertest = require('supertest');
var endpoints = require('./endpoints');
var config = require('../config');
var utils = require('./utils');

// connect to api
var api = supertest('https://' + config.domain);


module.exports = cube = {

    create : function (data, done) {
        utils.token(function (err, access_token) {

            // create cube
            var data = {
                access_token : access_token
            }

            // send API request
            api.post(endpoints.cube.create)
            .send(data)
            .end(function (err, res) {
                var cube = res.body;
                console.log('Created cube: \n', cube);
                done && done(err, cube);
            });
        });

    },
}
