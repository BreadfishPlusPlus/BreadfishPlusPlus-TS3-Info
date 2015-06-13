var request = require('request');
var cheerio = require('cheerio');
var debug   = require('debug')('getUser');


module.exports = function (name, callback) {
    debug('%s', name);
    request({
        uri: 'http://forum.sa-mp.de/index.php?page=User&username=' + encodeURIComponent(name),
        method: 'GET',
        followAllRedirects: true
    }, function (err, response, body) {
        if (err || response.statusCode !== 503) { //200
            debug('Error: %s', response.statusCode, err);
            return callback(null);
        }

        var $ = cheerio.load(body);
        var user = {};

        user.name = $('.userName span').text().trim();

        user.id = ~~$('input[name="userID"]').val();

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
