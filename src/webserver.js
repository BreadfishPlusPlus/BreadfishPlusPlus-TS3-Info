"use strict";

const getClientIp   = require("request-ip").getClientIp;
const debug         = require("debug")("webserver");
const Teamspeak     = require(__dirname + "/teamspeak.js");
const ts            = new Teamspeak();
const PORT          = parseInt(process.env.PORT, 10);

require("http").createServer(function (request, response) {
    const clientIp = getClientIp(request);
    debug(`serving reqeust ${request.url} from ${clientIp}`);

    response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Expires": "0"
    });
    return response.end(JSON.stringify(ts.getData(), null, 2));
}).listen(PORT);
debug(`webserver started @ port ${PORT}`);
