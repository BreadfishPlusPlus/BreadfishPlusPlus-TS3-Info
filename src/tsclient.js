"use strict";

var Promise         = require("bluebird");
var TeamSpeakClient = require("node-teamspeak");
var debug           = require("debug")("tsclient");
var _               = require("lodash");
var breadfish       = require(__dirname + "/breadfish.js");

var CACHED_DATA = {
    lastUpdate: 0
};

function connect() {
    return new Promise(function (resolve, reject) {
        debug("connecting...");
        var client = new TeamSpeakClient(process.env.TS_ADDRESS, parseInt(process.env.TS_PORT, 10));

        client.once("connect", function onConnect() {
            debug("connected");
            resolve(client);
            client.removeListener("connect", onConnect);
        });

        client.once("error", function onError(error) {
            debug("error", error);
            reject(error);
        });
    });
}

function login(client) {
    return new Promise(function (resolve, reject) {
        debug("logging in...");

        client.send("login", {
            client_login_name: process.env.USER_NAME,
            client_login_password: process.env.USER_PASS
        }, function (err) {
            if (err && err.id !== 0) {
                debug("error logging in: %j", err);
                reject(err.msg);
            } else {
                debug("successfully logged in");
                resolve(client);
            }
        });
    });
}

function selectVirtualServer(client) {
    return new Promise(function (resolve, reject) {
        debug("selecting virtual server...");

        client.send("use", {
            sid: parseInt(process.env.TS_VS, 10)
        }, function (err) {
            if (err && err.id !== 0) {
                debug("error selecting virtual server: %j", err);
                reject(err.msg);
            } else {
                debug("virtual server selected");
                resolve(client);
            }
        });
    });
}

function requestServerinfo(client) {
    return new Promise(function (resolve, reject) {
        debug("requesting serverinfo");

        client.send("serverinfo", function (err, response) {
            CACHED_DATA.address         = process.env.TS_ADDRESS;
            CACHED_DATA.port            = 9987;
            CACHED_DATA.cacheLifetime   = parseInt(process.env.CACHE_LIFETIME, 10);
            CACHED_DATA.name            = null;
            CACHED_DATA.welcomemessage  = null;
            CACHED_DATA.plattform       = null;
            CACHED_DATA.version         = null;
            CACHED_DATA.uptime          = 0;
            CACHED_DATA.maxclients      = 0;
            if (err && err.id !== 0) {
                debug("error requesting serverinfo: %j", err);
                return reject(err.msg);
            }
            debug("successfully requested serverinfo");
            CACHED_DATA.port            = response.virtualserver_port;
            CACHED_DATA.name            = response.virtualserver_name;
            CACHED_DATA.welcomemessage  = response.virtualserver_welcomemessage;
            CACHED_DATA.plattform       = response.virtualserver_platform;
            CACHED_DATA.version         = response.virtualserver_version;
            CACHED_DATA.uptime          = response.virtualserver_uptime;
            CACHED_DATA.maxclients      = response.virtualserver_maxclients;
            return resolve(client);
        });
    });
}

function requestChannels(client) {
    return new Promise(function (resolve, reject) {
        debug("requesting channellist");

        client.send("channellist", function (err, response) {
            CACHED_DATA.channels = [];
            if (err && err.id !== 0) {
                debug("error requesting channels: %j", err);
                return reject(err.msg);
            }
            debug("successfully requested channels");
            CACHED_DATA.channels = response.map(function (c) {
                return {
                    id: c.cid,
                    name: c.channel_name
                };
            });
            return resolve(client);
        });
    });
}

function requestClients(client, clientIp) {
    return new Promise(function (resolve, reject) {
        debug("requesting clients");

        client.send("clientlist", function (err, response) {
            CACHED_DATA.clients = [];
            if (err && err.id !== 0) {
                debug("error requesting clients: %j", err);
                return reject(err.msg);
            }
            debug("successfully requested clients");

            if (!_.isArray(response)) {
                response = [response];
            }

            response = _.filter(response, function (client) {
                return client.client_type !== 1;
            });

            breadfish
                .getTokens(clientIp)
                .then(function mapClients(qs) {
                    return Promise.map(response, function (client) {
                        return breadfish.getUser(qs, client, clientIp);
                    });
                })
                .then(function (clients) {
                    CACHED_DATA.clients = clients;
                    return resolve(client);
                })
                .catch(reject.bind(null));
        });
    });
}

exports.getData = function (clientIp) {
    return new Promise(function (resolve, reject) {

        debug(CACHED_DATA.lastUpdate);
        debug(Date.now() - parseInt(process.env.CACHE_LIFETIME, 10));

        if (CACHED_DATA.lastUpdate > (Date.now() - parseInt(process.env.CACHE_LIFETIME, 10))) {
            return resolve(CACHED_DATA);
        }

        return connect()
            .then(login)
            .then(selectVirtualServer)
            .then(requestServerinfo)
            .then(requestChannels)
            .then(function (client) {
                return requestClients(client, clientIp);
            })
            .then(function () {
                CACHED_DATA.lastUpdate = Date.now();
                return resolve(_.clone(CACHED_DATA));
            })
            .catch(reject);
    });
};
