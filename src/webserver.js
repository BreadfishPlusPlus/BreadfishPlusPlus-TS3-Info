const debug = require("debug")("webserver");
import {getClientIp} from "request-ip";
import {createServer} from "http";
import cache from "./cache";


createServer((request, response) => {
    const clientIp = getClientIp(request);
    debug(`serving reqeust ${request.url} from ${clientIp}`);

    response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Expires": "0"
    });
    return response.end(JSON.stringify(cache.getData(), null, 2));
}).listen(process.env.PORT);
debug(`webserver started @ port ${process.env.PORT}`);

cache.requestData();
