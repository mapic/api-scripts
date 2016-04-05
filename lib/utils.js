var _ = require('lodash');
var supertest = require('supertest');
var endpoints = require('./endpoints');
var config = require('../config.json');
var api = supertest('https://' + config.domain);

module.exports = utils = {

    token : function (done) {
        utils.get_access_token(function (err, tokens) {
            done(err, tokens.access_token);
        });
    },

    get_access_token : function (done) {
        api.get(endpoints.users.token.token)
            .query({
                username : config.username,
                password : config.password
            })
            .send()
            .end(function (err, res) {
                var tokens = utils.parse(res.text);
                done(err, tokens);
            });
    },

    parse : function (body) {
        if (_.isObject(body)) return body;
        try { var parsed = JSON.parse(body); } 
        catch (e) { return console.log('failed to parse:', body);}
        return parsed;
    },

}