// require libs
var fs = require('fs-extra');
var path = require('path');
var supertest = require('supertest');
var endpoints = require('./endpoints');
var utils = require('./utils');
var config = require('../config');
var Cube = require('./cube');

// domain resolution compatible with localhost setup (must run from within Docker container)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0" 
var current_domain = config.domain || process.env.MAPIC_DOMAIN;
var domain = (current_domain == 'localhost') ? 'https://172.17.0.1' : 'https://' + current_domain;
var api = supertest(domain);

utils.token(function (err, access_token) {
	if (err || !access_token) {
		console.log(0);
		return;
	}

	if (access_token.length == 43) {
		console.log(1)
		return;
	}
});