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
var requestServerinfo, requestClientInfo, requestClientlist, requestChannellist, updateCache, login, setup;
var cronJob = new CronJob(config.cacheUpdateCronjob, updateCache, null, false);

requestServerinfo = function () {
    debug("Requesting serverinfo");
    TeamspeakQueryClient.send("serverinfo", function (err, response) {
        if (err.id !== 0) {
            debug("Error requesting serverinfo: %j", err);
            REQUEST_CACHE.name              = null;
            REQUEST_CACHE.address           = config.ts.address;
            REQUEST_CACHE.port              = config.ts.port;
            REQUEST_CACHE.welcomemessage    = null;
            REQUEST_CACHE.plattform         = null;
            REQUEST_CACHE.version           = null;
            REQUEST_CACHE.channels          = 0;
            REQUEST_CACHE.uptime            = 0;
            REQUEST_CACHE.maxclients        = 0;
        } else {
            debug("Successfully requested serverinfo");
            REQUEST_CACHE.name              = response.virtualserver_name;
            REQUEST_CACHE.address           = config.ts.address;
            REQUEST_CACHE.port              = config.ts.port;
            REQUEST_CACHE.welcomemessage    = response.virtualserver_welcomemessage;
            REQUEST_CACHE.plattform         = response.virtualserver_platform;
            REQUEST_CACHE.version           = response.virtualserver_version;
            REQUEST_CACHE.channels          = response.virtualserver_channelsonline;
            REQUEST_CACHE.uptime            = response.virtualserver_uptime;
            REQUEST_CACHE.maxclients        = response.virtualserver_maxclients;
        }
    });
};

requestClientInfo = function (client, callback) {
    debug("Requesting clientinfo for \"%s\"", client.client_nickname);
    TeamspeakQueryClient.send("clientinfo", {
        clid: client.clid
    }, function (err, response) {
        var newClient = {
            name: null,
            channel: null
        };
        if (err.id !== 0) {
            debug("Error requesting clientinfo for \"%s\": %j", client.client_nickname, err);
            REQUEST_CACHE.clients = [];
        } else {
            debug("Successfully requested clientinfo for \"%s\"", client.client_nickname);
            newClient.name = response.client_nickname;
            newClient.channel = _.find(CHANNEL_LIST, function (c) {
                return c.cid === response.cid;
            }).channel_name;
        }
        callback(null, newClient);
    });
};

requestClientlist = function () {
    debug("Requesting clientlist");
    TeamspeakQueryClient.send("clientlist", function (err, response) {
        if (err.id !== 0) {
            debug("Error requesting clientlist: %j", err);
            REQUEST_CACHE.clients = [];
        } else {
            debug("Successfully requested clientlist");
            if (!_.isArray(response)) {
                response = [response];
            }

            var onlineList = _.filter(response, function (client) {
                return client.client_type !== 1;
            });

            async.map(onlineList, requestClientInfo, function (err, results) {
                REQUEST_CACHE.clients = results;
            });
        }
    });
};

requestChannellist = function () {
    debug("Requesting channellist");
    TeamspeakQueryClient.send("channellist", function (err, response) {
        if (err.id !== 0) {
            debug("Error requesting channellist: %j", err);
            CHANNEL_LIST = [];
        } else {
            debug("Successfully requested channellist");
            CHANNEL_LIST = response;
        }
    });
};

updateCache = function () {
    debug("Updating cache");
    REQUEST_CACHE.lastUpdate = Date.now();

    requestServerinfo();

    requestChannellist();
    requestClientlist();
};

login = function () {
    debug("Logging in");
    TeamspeakQueryClient.send("login", {
        client_login_name: config.user,
        client_login_password: config.pass
    }, function (err) {
        if (err.id !== 0) {
            debug("Error logging in: %j", err);
        } else {
            debug("Successfully logged in");
            debug("Selecting virtual server (%s)", config.ts.virtualServer);
            TeamspeakQueryClient.send("use", {
                sid: config.ts.virtualServer
            }, function (err, response) {
                if (err.id !== 0) {
                    debug("Erro selecting virtual server (%s): %j", config.ts.virtualServer, err);
                } else {
                    debug("Successfully selected virtual server (%s)", config.ts.virtualServer);
                    updateCache();
                    cronJob.start();
                }
            });
        }
    });
};

setup = function () {
    TeamspeakQueryClient = new TeamSpeakClient(config.ts.address);

    TeamspeakQueryClient.on("connect", function () {
        REQUEST_CACHE.error = null;
        debug("TeamspeakQueryClient connected!");
        login();
    });

    TeamspeakQueryClient.on("error", function (err) {
        REQUEST_CACHE.error = err.toString();
        REQUEST_CACHE.lastUpdate = Date.now();
        debug("TeamspeakQueryClient error: %s", err);
        cronJob.stop();
    });

    TeamspeakQueryClient.on("close", function (queue) {
        debug("TeamspeakQueryClient closed: %j", queue);
        cronJob.stop();
        setTimeout(setup, config.reconnectInterval);
    });
};
setup();

http.createServer(function (req, res) {
    var ipAddress = req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress;

    res.writeHead(200, {
        'Content-Type': 'application/json; charset="utf8"; charset=utf8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    res.end(JSON.stringify(REQUEST_CACHE));

    debug("Serving reqeust from %s", ipAddress);
}).listen(config.webport);
debug("Webserver started @ port %s", config.webport);
