/*jslint nomen: true, unparam: true*/
"use strict";

process.env.DEBUG = "*";

var config = require('./config.json');
var TeamSpeakClient = require("node-teamspeak");
var http = require('http');
var CronJob = require('cron').CronJob;
var _ = require('underscore');
var debug = require('debug')("TS3-Query-Info");
var async = require('async');

var REQUEST_CACHE = {};
var CHANNEL_LIST = [];

var TeamspeakQueryClient = null;

var requestServerinfo = function () {
    TeamspeakQueryClient.send("serverinfo", function (err, response) {
        debug("Requesting Serverinfo", err);
        REQUEST_CACHE.name              = response.virtualserver_name;
        REQUEST_CACHE.address           = config.ts.address;
        REQUEST_CACHE.port              = config.ts.port;
        REQUEST_CACHE.welcomemessage    = response.virtualserver_welcomemessage;
        REQUEST_CACHE.plattform         = response.virtualserver_platform;
        REQUEST_CACHE.version           = response.virtualserver_version;
        REQUEST_CACHE.channels          = response.virtualserver_channelsonline;
        REQUEST_CACHE.uptime            = response.virtualserver_uptime;
        REQUEST_CACHE.maxclients        = response.virtualserver_maxclients;
    });
};

var requestClientInfo = function (client, callback) {
    TeamspeakQueryClient.send("clientinfo", {
        clid: client.clid
    }, function (err, response) {
        debug('Requesting client info (%s)', client.client_nickname, err);
        var newClient = {
            "name": response.client_nickname,
            "input_muted": !!response.client_input_muted,
            "output_muted": !!response.client_output_muted,
            "channel": _.find(CHANNEL_LIST, function (c) {
                return c.cid === response.cid;
            }).channel_name
        };
        callback(null, newClient);
    });
};

var requestClientlist = function () {
    TeamspeakQueryClient.send("clientlist", function (err, response) {
        debug("Requesting Client list", err);
        if (!_.isArray(response)) {
            response = [response];
        }
        var onlineList = _.filter(response, function (client) {
            return client.client_type !== 1;
        });
        async.map(onlineList, requestClientInfo, function (err, results) {
            REQUEST_CACHE.clients = results;
        });
    });
};

var requestChannellist = function () {
    TeamspeakQueryClient.send("channellist", function (err, response) {
        debug("Requesting Channel list", err);
        CHANNEL_LIST = response;
    });
};

var updateCache = function () {
    REQUEST_CACHE.lastUpdate = Math.round(Date.now() / 1e3);
    requestServerinfo();
    requestChannellist();
    requestClientlist();
};

var login = function () {
    TeamspeakQueryClient.send("login", {
        client_login_name: config.user,
        client_login_password: config.pass
    }, function (err, response) {
        debug("Logging in: %j", err || response);
        TeamspeakQueryClient.send("use", {
            sid: config.ts.virtualServer
        }, function (err, response) {
            debug("Selecting Virtual Server (%s)", config.ts.virtualServer, err);
            updateCache();
        });
    });
};

TeamspeakQueryClient = new TeamSpeakClient(config.ts.address);
login();

TeamspeakQueryClient.on("error", function (err) {
    debug("TeamspeakQueryClient error", err);
});

TeamspeakQueryClient.on("close", function (queue) {
    debug("TeamspeakQueryClient closesed", queue);
});

http.createServer(function (req, res) {
    var ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(REQUEST_CACHE));
    debug("Serving reqeust from %s", ipAddress);
}).listen(config.webport);


var cJ = new CronJob(config.croninterval, updateCache, null, true);