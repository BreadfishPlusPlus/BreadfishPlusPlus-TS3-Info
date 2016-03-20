const debug = require("debug")("webserver");
import {getClientIp} from "request-ip";
import express from "express";
import cache from "./cache";

const webserver = express();

webserver.set("case sensitive routing", true);
webserver.set("json spaces", 2);
webserver.set("trust proxy", true);
webserver.set("x-powered-by", false);

webserver.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Expose-Headers", "Content-Type");
    debug(`serving reqeust ${req.url} from ${getClientIp(req)}`);
    next();
});
webserver.get("/", (req, res) => res.json(cache.getData()));
webserver.use((req, res) => res.status(404).send("400 + 4"));

const svr = webserver.listen(process.env.PORT, "0.0.0.0", (error) => {
    if (error) {
        throw error;
    }
    debug(`webserver started: ${JSON.stringify(svr.address())}`);
});

cache.requestData();
