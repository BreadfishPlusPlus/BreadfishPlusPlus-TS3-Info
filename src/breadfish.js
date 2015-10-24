"use strict";

var Promise     = require("bluebird");
var request     = require("request");
var _           = require("lodash");
var debug       = require("debug")("breadfish");

exports.getTokens = function getTokens(clientIp) {
    debug("getTokens()");
    return new Promise(function (resolve, reject) {
        request({
            uri: "http://forum.sa-mp.de/index.php?members-list/",
            method: "GET",
            followAllRedirects: true,
            headers: {
                "X-Forwarded-For": clientIp,
                "User-Agent": "Breadfish++ Teamspeak-Info Token Abfrage"
            }
        }, function (error, response, body) {
            if (error) {
                return reject(error);
            }
            if (response.statusCode !== 200) {
                return reject("response.statusCode !== 200");
            }

            resolve({
                t: body.match(/var SECURITY_TOKEN = '(.+)';/i)[1],
                s: body.match(/var SID_ARG_2ND(?:\s+)= '&s=(.+)';/i)[1]
            });
        });
    });
};

exports.getUser = function (qs, client, clientIp) {
    debug("getUser(%s, %s)", JSON.stringify(qs), JSON.stringify(client));
    return new Promise(function (resolve, reject) {
        request({
            uri: "http://forum.sa-mp.de/index.php?ajax-proxy/",
            method: "POST",
            followAllRedirects: true,
            json: true,
            qs: qs,
            form: {
                "actionName": "getSearchResultList",
                "className": "wcf\\data\\user\\UserAction",
                "interfaceName": "wcf\\data\\ISearchAction",
                "parameters[data][searchString]": client.client_nickname,
                "parameters[data][includeUserGroups]": "0"
            },
            headers: {
                "X-Forwarded-For": clientIp,
                "User-Agent": "Breadfish++ Teamspeak-Info User Abfrage"
            }
        }, function (error, response, json) {
            if (error) {
                return reject(error);
            }
            if (response.statusCode !== 200) {
                return reject("response.statusCode !== 200");
            }

            var user = _.findWhere(json.returnValues, {label: client.client_nickname});

            return resolve({
                name: client.client_nickname,
                id: user ? user.objectID : -1,
                channel: client.cid
            });
        });
    });
};
