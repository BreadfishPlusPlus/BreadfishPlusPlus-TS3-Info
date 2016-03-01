const debug = require("debug")("teamspeak");
import Promise from "bluebird";
import TeamSpeakClient from "node-teamspeak";
import {merge, isArray} from "lodash";

export default class Teamspeak {
    constructor() {
        this.client = null;
    }
    async query(command, data) {
        return new Promise((resolve, reject) => {
            debug(`query "${command}" ...`, data);

            this.client.send(command, data, (error, response) => {
                debug("client response", {error, response});
                if (error) {
                    return reject(merge(new Error(error.msg), error));
                }
                return resolve(response);
            });
        });
    }
    async connect(address, port) {
        return new Promise((resolve, reject) => {
            debug(`connecting to ${address}:${port}...`);
            this.client = new TeamSpeakClient(address, port);

            this.client.once("connect", () => {
                debug("connected");
                resolve(this.client);
            });
            this.client.once("error", (error) => {
                debug(`error connecting in: ${JSON.stringify(error)}`);
                reject(new Error("Es konnte keine Verbindung zum Teamspeak-Server hergestellt werden."));
            });
            this.client.once("close", (queue) => {
                debug("close", queue);
            });
            this.client.once("timeout", () => {
                debug("timeout");
            });
        });
    }

    async disconnect() {
        return new Promise((resolve) => {
            debug("disconnecting ...");
            this.client.once("timeout", () => {
                this.client.removeAllListeners();
                this.client = null;
                debug("connection closed");
                resolve();
            });
            this.client.setTimeout(1);
        });
    }
    async login(name, password) {
        debug("logging in ...");
        try {
            await this.query("login", { client_login_name: name, client_login_password: password });
            debug("successfully logged in");
        }
        catch (error) {
            error.message = "Anmeldung fehlgeschlagen.";
            throw error;
        }
    }
    async selectVirtualServer(serverId) {
        debug(`selecting virtual server "${serverId}" ...`);
        try {
            await this.query("use", { sid: serverId });
            debug("virtual server selected");
        }
        catch (error) {
            error.message = "VS konnte nicht gewählt werden.";
            throw error;
        }
    }
    async getServerInfo() {
        debug("requesting serverinfo ...");
        try {
            const response = await this.query("serverinfo");
            debug("serverinfo successfully requested");
            return response;
        }
        catch (error) {
            error.message = "Abfrage der Server Informationen ist fehlgeschlagen.";
            throw error;
        }
    }
    async getChannelList() {
        debug("requesting channellist ...");
        try {
            const response = await this.query("channellist");
            debug("channellist successfully requested");
            return response;
        }
        catch (error) {
            error.message = "Abfrage der Channelliste ist fehlgeschlagen.";
            throw error;
        }
    }
    async getClients() {
        debug("requesting clientlist ...");
        try {
            let response = await this.query("clientlist");
            if (!isArray(response)) {
                response = [response];
            }
            debug("clientlist successfully requested");
            return response;
        }
        catch (error) {
            error.message = "Abfrage der Client Informationen ist fehlgeschlagen.";
            throw error;
        }
    }
}
