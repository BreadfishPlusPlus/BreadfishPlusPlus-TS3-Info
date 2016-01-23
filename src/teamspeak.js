"use strict";

const debug             = require("debug")("teamspeak");
const TeamSpeakClient   = require("node-teamspeak");
const _                 = require("lodash");
const Promise           = require("bluebird");

module.exports = class Teamspeak {
    constructor() {
        this.client = null;
        this.serverinfo = {};
        this.channellist = {};
        this.clientlist = {};
        this.lastUpdate = null;
        this.error = null;

        this.setup();
    }
    setupInterval() {
        debug(`setupInterval`);
        setTimeout(this.setup.bind(this), parseInt(process.env.CHECK_INTERVAL, 10));
    }
    getData() {
        debug(`getData`);
        return _.defaults({
            port: this.serverinfo.virtualserver_port,
            name: this.serverinfo.virtualserver_name,
            welcomemessage: this.serverinfo.virtualserver_welcomemessage,
            platform: this.serverinfo.virtualserver_platform,
            version: this.serverinfo.virtualserver_version,
            uptime: this.serverinfo.virtualserver_uptime,
            maxclients: this.serverinfo.virtualserver_maxclients,

            channellist: this.channellist,

            clientlist: this.clientlist,

            lastUpdate: this.lastUpdate,

            error: this.error
        }, {
            lastUpdate: 0,
            address: process.env.TS_ADDRESS,
            port: null,
            cacheLifetime: parseInt(process.env.CHECK_INTERVAL, 10),
            name: null,
            welcomemessage: null,
            platform: null,
            version: null,
            uptime: 0,
            maxclients: 0,
            channellist: {},
            clientlist: {},
            error: null
        });
    }
    setup() {
        debug(`setup`);
        Promise.resolve()
            .bind(this)
            .then(this.connect)
            .then(this.login)
            .then(this.selectVirtualServer)
            .then(this.requestServerinfo)
            .then(this.requestChannels)
            .then(this.requestClients)
            .then(this.close)
            .then(this.setupInterval)
            .then(() => this.lastUpdate = Date.now())
            .catch((error) => this.error = error);
    }
    connect() {
        return new Promise((resolve, reject) => {
            debug(`connecting to ${process.env.TS_ADDRESS}:${process.env.TS_PORT}...`);
            this.client = new TeamSpeakClient(process.env.TS_ADDRESS, parseInt(process.env.TS_PORT, 10));

            this.client.once("connect", () => {
                debug("connected");
                resolve();
            });
            this.client.once("error", (error) => {
                debug("error", error);
                reject(error);
            });
            this.client.once("close", (queue) => {
                debug("close", queue);
            });
            this.client.once("timeout", () => {
                debug("timeout");
            });
        });
    }
    close() {
        debug("closing connection...");
        return new Promise((resolve) => {
            this.client.once("timeout", () => {
                this.client.removeAllListeners();
                this.client = null;
                debug("connection closed");
                resolve();
            });
            this.client.setTimeout(1);
        });
    }
    login() {
        return new Promise((resolve, reject) => {
            debug(`logging in with ${process.env.USER_NAME}@${process.env.USER_PASS.replace(/./g, "*")}...`);

            this.client.send("login", {
                client_login_name: process.env.USER_NAME,
                client_login_password: process.env.USER_PASS
            }, (error) => {
                if (error && error.id !== 0) {
                    debug(`error logging in: ${JSON.stringify(error)}`);
                    reject(error.msg);
                } else {
                    debug("successfully logged in");
                    resolve();
                }
            });
        });
    }
    selectVirtualServer() {
        return new Promise((resolve, reject) => {
            debug(`selecting virtual server ${process.env.TS_VS}...`);

            this.client.send("use", {
                sid: parseInt(process.env.TS_VS, 10)
            }, (error) => {
                if (error && error.id !== 0) {
                    debug(`error selecting virtual server: ${JSON.stringify(error)}`);
                    reject(error.msg);
                } else {
                    debug("virtual server selected");
                    resolve();
                }
            });
        });
    }
    requestServerinfo() {
        return new Promise((resolve, reject) => {
            debug("requesting serverinfo");

            this.client.send("serverinfo", (error, response) => {
                this.serverinfo = {};
                if (error && error.id !== 0) {
                    debug(`error requesting serverinfo: ${JSON.stringify(error)}`);
                    reject(error.msg);
                } else {
                    debug("serverinfo response", response);
                    this.serverinfo = response;
                    resolve();
                }
            });
        });
    }
    requestChannels() {
        return new Promise((resolve, reject) => {
            debug("requesting channellist");

            this.client.send("channellist", (error, response) => {
                this.channellist = {};
                if (error && error.id !== 0) {
                    debug(`error requesting channels: ${JSON.stringify(error)}`);
                    reject(error.msg);
                } else {
                    debug("successfully requested channellist", response);
                    response.forEach((channel) => this.channellist[channel.cid] = channel.channel_name);
                    resolve();
                }
            });
        });
    }
    requestClients() {
        return new Promise((resolve, reject) => {
            debug("requesting clientlist");

            this.client.send("clientlist", (error, response) => {
                this.clientlist = {};
                if (error && error.id !== 0) {
                    debug(`error requesting clients: ${JSON.stringify(error)}`);
                    reject(error.msg);
                } else {
                    debug("successfully requested clientlist", response);

                    if (!_.isArray(response)) {
                        response = [response];
                    }

                    // ServerQuery clients rausfiltern
                    response = _.filter(response, (client) => client.client_type !== 1);

                    response.forEach((client) => this.clientlist[client.client_nickname] = client.cid);

                    resolve();
                }
            });
        });
    }
};
