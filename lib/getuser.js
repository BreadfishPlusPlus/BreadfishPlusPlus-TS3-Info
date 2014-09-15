/*jslint unparam: true*/
"use strict";

var request = require('request');
var cheerio = require('cheerio');

var getParameterByName = function (name, from) { //http://stackoverflow.com/a/901144
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(from);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};

module.exports = function (name, callback) {
    request({
        uri: 'http://forum.sa-mp.de/index.php?form=MembersSearch',
        method: 'POST',
        form: {
            'staticParameters[username]': name
        },
        followAllRedirects: true
    }, function (err, response, body) {
        if (err || response.statusCode !== 200) {
            return callback(null);
        }

        var $ = cheerio.load(body),
            user = null;

        $('.membersList tbody tr td.columnUsername .containerContentSmall').each(function (i, elem) {
            var lName = $(this).find('a').text();
            if (name !== lName) {
                return;
            }
            user = {};
            user.name = name;
            user.id = parseInt(getParameterByName('userID', $(this).find('a').attr('href')), 10);

            if ($(this).find('.smallFont img[src="wcf/icon/userRankAdminS.png"]').length === 4) {
                user.rank = 'Administrator';
            } else if ($(this).find('.smallFont img[src="wcf/icon/userRankAdminS.png"]').length === 3) {
                user.rank = 'Kon-Administrator';
            } else if ($(this).find('.smallFont img[src="wcf/icon/userRankAdminS.png"]').length === 2) {
                user.rank = 'Super Moderator';
            } else if ($(this).find('.smallFont img[src="wcf/icon/userRankAdminS.png"]').length === 1) {
                user.rank = 'Moderator';
            } else if ($(this).find('.smallFont img[src="wcf/icon/supporter.gif"]').length === 1) {
                user.rank = 'Donator';
            } else {
                user.rank = 'User';
            }
        });

        callback(user);
    });
};