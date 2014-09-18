/*jslint nomen: true, unparam: true*/
"use strict";

process.env.DEBUG = "*";

var config          = require('./../config.json');
var TeamSpeakClient = require("node-teamspeak");
var http            = require('http');
var debug           = require('debug')("TS3-Query-Info");
var async           = require('async');
var _               = require('underscore');

var getuser         = require('./getuser');

var CACHED_DATA = {
    error: null,
    lastUpdate: 0,
    name: null,
    address: null,
    port: 0,
    cacheLifetime: 0,
    welcomemessage: null,
    plattform: null,
    version: null,
    uptime: 0,
    maxclients: 0,
    clients: [],
    channels: []
};

var login = function (client, callback) {
    debug("loggin in");
    client.send("login", {
        client_login_name: config.user,
        client_login_password: config.pass
    }, function (err) {
        if (err.id !== 0) {
            debug("error logging in: %j", err);
            return callback(err.msg);
        }
        debug("successfully logged in");
        return callback(null, client);
    });
};

var bind = function (callback) {
    debug("binding callbacks");
    var client = new TeamSpeakClient(config.ts.address);
    client.on('connect', function () {
        debug("connected");
        callback(null, client);
    });
    client.on('error', function (error) {
        debug("error", error);
        if (error.code === 'ECONNREFUSED') {
            callback('ECONNREFUSED - Der Server hat die Verbindung abgelehnt.', null);
        } else {
            callback(error.code, null);
        }
    });
};

var useVS = function (client, callback) {
    debug("selecting virtual server");
    client.send("use", {
        sid: config.ts.virtualServer
    }, function (err, response) {
        if (err.id !== 0) {
            debug("error selecting virtual server: %j", err);
            return callback(err.msg);
        }
        debug("virtual server selected");
        return callback(null, client);
    });
};

var requestServerinfo = function (client, callback) {
    debug("requesting serverinfo");
    client.send("serverinfo", function (err, response) {
        CACHED_DATA.address         = config.ts.address;
        CACHED_DATA.port            = config.ts.port;
        CACHED_DATA.cacheLifetime   = config.cacheLifetime;
        CACHED_DATA.name            = null;
        CACHED_DATA.welcomemessage  = null;
        CACHED_DATA.plattform       = null;
        CACHED_DATA.version         = null;
        CACHED_DATA.uptime          = 0;
        CACHED_DATA.maxclients      = 0;
        if (err.id !== 0) {
            debug("error requesting serverinfo: %j", err);
            return callback(err.msg);
        }
        debug("successfully requested serverinfo");
        CACHED_DATA.name            = response.virtualserver_name;
        CACHED_DATA.welcomemessage  = response.virtualserver_welcomemessage;
        CACHED_DATA.plattform       = response.virtualserver_platform;
        CACHED_DATA.version         = response.virtualserver_version;
        CACHED_DATA.uptime          = response.virtualserver_uptime;
        CACHED_DATA.maxclients      = response.virtualserver_maxclients;
        return callback(null, client);
    });
};

var requestChannels = function (client, callback) {
    debug("Requesting channellist");
    client.send("channellist", function (err, response) {
        CACHED_DATA.channels = [];
        if (err.id !== 0) {
            debug("error requesting channels: %j", err);
            return callback(err.msg);
        }
        debug("successfully requested channels");
        CACHED_DATA.channels = _.map(response, function (c) {
            return {
                id: c.cid,
                name: c.channel_name
            };
        });
        return callback(null, client);
    });
};

var requestClients = function (client, callback) {
    debug("requesting clients");
    client.send("clientlist", function (err, response) {
        CACHED_DATA.clients = [];
        if (err.id !== 0) {
            debug("error requesting clients: %j", err);
            return callback(err.msg);
        }
        debug("successfully requested clients");

        if (!_.isArray(response)) {
            response = [response];
        }

        response = _.filter(response, function (client) {
            return client.client_type !== 1;
        });

        CACHED_DATA.clients = _.map(response, function (c) {
            return {
                id: c.clid,
                name: c.client_nickname,
                channel: c.cid
            };
        });

        async.mapSeries(CACHED_DATA.clients, function (item, callback) {
            getuser(item.name, function (user) {
                if (user) {
                    item.breadfish = user;
                }
                callback(null, item);
            });
        }, function (err, results) {
            CACHED_DATA.clients = results;
            return callback(null);
        });
    });
};

var updateCache = function (callback) {
    if (CACHED_DATA.lastUpdate < (Date.now() - config.cacheLifetime)) {
        debug("updateing cache");
        async.waterfall([
            bind,
            login,
            useVS,
            requestServerinfo,
            requestChannels,
            requestClients
        ], function (error, result) {
            CACHED_DATA.error = error;
            CACHED_DATA.lastUpdate = Date.now();
            return callback();
        });
    } else {
        return callback();
    }
};

var getIp = function (req) {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
};

http.createServer(function (req, res) {
    var ipAddress = getIp(req);

    updateCache(function () {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset="utf8"; charset=utf8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(JSON.stringify(CACHED_DATA));
        debug("Serving reqeust from %s", ipAddress);
    });
}).listen(config.webport);
debug("webserver started @ port %s", config.webport);