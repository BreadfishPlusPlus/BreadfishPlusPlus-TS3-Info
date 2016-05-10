const debug = require("debug")("cache");
import {defaults, filter} from "lodash";
import Teamspeak from "./teamspeak";
import {getEnv} from "./getEnv";

const TS_ADDRESS = getEnv("TS_ADDRESS").optional("127.0.0.1").string();
const TS_PORT = getEnv("TS_PORT").optional(10011).number();
const CHECK_INTERVAL = getEnv("CHECK_INTERVAL").optional(300000).number();
const USER_NAME = getEnv("USER_NAME").required().string();
const USER_PASS = getEnv("USER_PASS").required().string();
const TS_VS = getEnv("TS_VS").optional(1).number();

class Cache {
    constructor() {
        this.serverinfo = {};
        this.channellist = {};
        this.clientlist = {};
        this.lastUpdate = null;
        this.error = null;
    }
    getData() {
        debug("getData ...");
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
            address: TS_ADDRESS,
            port: null,
            cacheLifetime: CHECK_INTERVAL,
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
        debug("setupTimeout ...");
        setTimeout(this.requestData.bind(this), CHECK_INTERVAL);
    }
    async requestData() {
        debug("requestData ...");

        this.error = null;

        try {
            const tsclient = new Teamspeak();

            /* connect */
            await tsclient.connect(TS_ADDRESS, TS_PORT);


            /* login */
            await tsclient.login(USER_NAME, USER_PASS);


            /* selectVirtualServer */
            await tsclient.selectVirtualServer(TS_VS);


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
