"use strict";

var getClientIp = require("request-ip").getClientIp;
var debug       = require("debug")("server");
var TsClient    = require(__dirname + "/tsclient.js");

require("http").createServer(function (request, response) {
    var clientIp = getClientIp(request);
    debug("serving reqeust from %s", clientIp);
    return TsClient.getData()
        .then(function (data) {
            response.writeHead(200, {
                "Content-Type": "application/json; charset=\'utf8\'; charset=utf8",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Expires": "0"
            });
            return response.end(JSON.stringify(data, null, 2));
        })
        .catch(function (error) {
            response.writeHead(500, {
                "Content-Type": "application/json; charset=\'utf8\'; charset=utf8",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Expires": "0"
            });
            return response.end(JSON.stringify({
                error: error
            }, null, 2));
        });

}).listen(parseInt(process.env.PORT, 10));
debug("webserver started @ port %s", parseInt(process.env.PORT, 10));
