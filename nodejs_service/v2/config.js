/**
 * Created by tony on 16/6/23.
 */
var _ = require('underscore');

var version_compare = require('version-comparison');
var app_version = require('./lib/app_version');


/**
 * 判断使用哪个配置文件
 * @type
 */
exports = module.exports = function configParser(secret, options) {
    return function configParser(req, res, next) {

        var config_json = null;

        var app_ua = req.headers['user-agent'];

        if ((version_compare(app_version.get_zuzuche_app_version(app_ua), '5.2.0') >= 0 && req.hostname.match('m-dev.zuzuche.com')) || req.query.run == 'zuzuche-520-dev') {
            config_json = require('./conf/config.zuzuche-520-dev.json');
        }
        else if (version_compare(app_version.get_zuzuche_app_version(app_ua), '5.2.0') >= 0 || req.query.run == 'zuzuche-520') {
            config_json = require('./conf/config.zuzuche-520.json');
        }
        else if ((app_ua.match(/com\.tantu\.map/i) && req.hostname.match('m-dev.zuzuche.com')) || req.query.run == 'tantu-dev') {
            config_json = require('./conf/config.tantu-dev.json');
        }
        else if (app_ua.match(/com\.tantu\.map/i) || req.hostname.match('native-supercache.tantu.com') || req.query.run == 'tantu') {
            config_json = require('./conf/config.tantu.json');
        }
        else if (req.hostname.match('m-dev.zuzuche.com') || req.query.run == 'zuzuche-dev') {
            config_json = require('./conf/config.zuzuche-dev.json');
        }
        else {
            config_json = require('./conf/config.zuzuche.json');
        }


        req.config = Object.create(null);
        req.config = config_json;

        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        console.log('------------remote-ip-------------- : ' + ip);
         //console.log(req.config);
        next();
    };
};

