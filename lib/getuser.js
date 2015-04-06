var request = require('request');
var cheerio = require('cheerio');
var url     = require('url');
var debug   = require('debug')('http');

var getUserProfile = function (userId, callback) {
    debug('getUserProfile -> %s', userId);
    request({
        uri: 'http://forum.sa-mp.de/index.php?page=User&userID=' + userId,
        method: 'GET',
        followAllRedirects: true
    }, function (err, response, body) {
        if (err || response.statusCode !== 200) {
            debug('Error: %s', response.statusCode, err);
            return callback(null);
        }
        var $ = cheerio.load(body);
        var user = {};

        user.name = $('.userName span').text().trim();

        user.id = userId;

        if ($('.userRank img[src="wcf/icon/userRankAdminS.png"]').length === 4) {
            user.rank = 'Administrator';
        } else if ($('.userRank img[src="wcf/icon/userRankAdminS.png"]').length === 3) {
            user.rank = 'Kon-Administrator';
        } else if ($('.userRank img[src="wcf/icon/userRankAdminS.png"]').length === 2) {
            user.rank = 'Super Moderator';
        } else if ($('.userRank img[src="wcf/icon/userRankAdminS.png"]').length === 1) {
            user.rank = 'Moderator';
        } else if ($('.userRank img[src="wcf/icon/supporter.gif"]').length === 1) {
            user.rank = 'Donator';
        } else {
            user.rank = 'User';
        }

        return callback(user);
    });
};

module.exports = function (name, callback) {
    debug('getUser -> %s', name);
    request({
        uri: 'http://forum.sa-mp.de/index.php?form=MembersSearch',
        method: 'POST',
        form: {
            'staticParameters[username]': name
        },
        followAllRedirects: true
    }, function (err, response, body) {
        if (err || response.statusCode !== 200) {
            debug('Error: %s', response.statusCode, err);
            return callback(null);
        }

        var $ = cheerio.load(body);
        var userId = null;

        $('.membersList tbody tr td.columnUsername .containerContentSmall').each(function () {
            var lName = $(this).find('a').text();
            if (name !== lName) {
                return;
            }

            userId = parseInt(url.parse($(this).find('a').attr('href'), true).query.userID, 10);
        });

        if (!userId) {
            return callback(null);
        }

        getUserProfile(userId, function (user) {
            debug('Ok: %j', user);
            callback(user);
        });
    });
};