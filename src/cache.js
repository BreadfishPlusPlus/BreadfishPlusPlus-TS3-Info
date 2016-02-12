"use strict";

const debug = require("debug")("cache");
import {defaults, filter} from "lodash";
import Teamspeak from "./teamspeak";

class Cache {
    constructor() {
        this.serverinfo = {};
        this.channellist = {};
        this.clientlist = {};
        this.lastUpdate = null;
        this.error = null;
    }
    getData() {
        debug(`getData ...`);
        return defaults({
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
            cacheLifetime: process.env.CHECK_INTERVAL,
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
    setupTimeout() {
        debug(`setupTimeout ...`);
        setTimeout(this.requestData.bind(this), process.env.CHECK_INTERVAL);
    }
    async requestData() {
        debug(`requestData ...`);

        this.error = null;

        try {
            const tsclient = new Teamspeak();

            /* connect */
            await tsclient.connect(process.env.TS_ADDRESS, process.env.TS_PORT);


            /* login */
            await tsclient.login(process.env.USER_NAME, process.env.USER_PASS);


            /* selectVirtualServer */
            await tsclient.selectVirtualServer(process.env.TS_VS);


            /* requestServerinfo */
            this.serverinfo = await tsclient.getServerInfo();


            /* requestChannels */
            this.channellist = {};
            let response = await tsclient.getChannelList();
            response.forEach((channel) => this.channellist[channel.cid] = channel.channel_name);
            response = null;


            /* requestClients */
            this.clientlist = {};
            response = await tsclient.getClients();
            // ServerQuery clients rausfiltern
            filter(response, (client) => client.client_type !== 1).forEach((client) => {
                this.clientlist[client.client_nickname] = client.cid;
            });

            /* disconnect */
            await tsclient.disconnect();
        }
        catch (error) {
            debug(`Error: ${error.message}`, {error});
            this.error = error.message;
        }
        this.lastUpdate = Date.now();
        this.setupTimeout();
    }
}

export default new Cache();
