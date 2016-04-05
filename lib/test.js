// require libs
var fs = require('fs-extra');
var path = require('path');
var supertest = require('supertest');
var endpoints = require('./endpoints');
var utils = require('./utils');
var config = require('../config');
var Cube = require('./cube');
var api = supertest('https://' + config.domain);
var debug = config.debug;

utils.token(function (err, access_token) {
	if (err || !access_token) {
		console.log(false);
		return;
	}

	if (access_token.length == 43) {
		console.log(true)
		return;
	}
});