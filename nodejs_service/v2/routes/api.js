var express = require('express');
var router = express.Router();

var phantom = require('phantom');
var async = require('async');
var path = require('path');
var fs = require('fs');
var fsUtils = require("nodejs-fs-utils");
var request = require('request');
var md5 = require('md5');
var _ = require('underscore');
var crc = require("crc");
var spawn = require('child_process').spawn;
var uuid = require('node-uuid');


function get_cache_list_hash(dir, b_full_info) {
    b_full_info = _.isUndefined(b_full_info) ? true : b_full_info;

    var hash_table = [];

    var downlist = JSON.parse(fs.readFileSync(path.join(dir, '_list.json')));

    _.each(downlist, function (v) {

        var filename = path.join(dir, v.filename)

        if (fs.existsSync(filename)) {
            var rfile = fs.statSync(filename);
            if (!rfile.isDirectory() && rfile.size > 0) {
                v.crc32 = crc.crc32(fs.readFileSync(filename)).toString(16);

                if (b_full_info != true) {
                    delete(v.tmpname);
                    delete(v.referer);
                    //delete(v.url);
                }
                hash_table.push(v);
            }
        }

    });

    return hash_table;
}


/**
 * 下载单一cache文件
 */
router.get('/super_cache/api/download/:filename', function (req, res, next) {
    if (!fs.existsSync(req.config.cache_path)) {
        res.sendStatus(500);
        return;
    }

    //安全校验
    var filename = req.params.filename;
    if (!/^[a-z0-9]+$/i.test(filename)) {
        res.sendStatus(404);
        return;
    }

    var realpath = path.join(req.config.cache_path, filename);
    //console.log(realpath);

    if (fs.existsSync(realpath)) {

        //在返回的头部加上crc32
        res.append('Crc32', crc.crc32(fs.readFileSync(realpath)).toString(16));

        res.download(realpath, filename);

        console.log('下载: ' + realpath);
    }
    else {
        res.sendStatus(404);
    }
});

/**
 * 下载所有的cache文件（压缩）
 */
router.get('/super_cache/api/download_all_zip', function (req, res, next) {

    if (_.isEmpty(req.query.run))
    {
        res.render('downloadalltips', {});
    }
    else
    {
        if (!fs.existsSync(req.config.cache_path)) {
            res.sendStatus(500);
            return;
        }

        var zipfilename = path.normalize(path.join(req.config.cache_path, '../', '_latest_native_supercached_' + uuid.v1() + '.zip'));

        var cwd = process.cwd();
        process.chdir(req.config.cache_path);

        var zip = spawn('zip', ['-rqX9', zipfilename, '.', '-x', '_list.json']);

        // 捕获标准输出并将其打印到控制台
        zip.stdout.on('data', function (data) {
            console.log('标准输出：\n' + data);
        });

// 捕获标准错误输出并将其打印到控制台
        zip.stderr.on('data', function (data) {
            console.log('标准错误输出：\n' + data);
        });

        // 注册子进程关闭事件
        zip.on('exit', function (code, signal) {
            console.log('子进程已退出，代码：' + code);
            process.chdir(cwd);
            res.download(zipfilename);
        });

        setTimeout(function () {
            fs.unlinkSync(zipfilename);
        }, 5000)
    }

});



/**
 * 返回最新的cache完整文件列表
 */
router.get('/super_cache/api/cache_get_full_list', function (req, res, next) {

    if (!fs.existsSync(req.config.cache_path)) {
        res.sendStatus(500);
        return;
    }

    var hash_table = get_cache_list_hash(req.config.cache_path);

    res.append('Content-Type', 'text/json');
    res.render('api', {json: JSON.stringify(hash_table)});
});

/**
 * 返回更新了的cache列表
 */
router.post('/super_cache/api/cache_get_updated_list', function (req, res, next) {

    if (!fs.existsSync(req.config.cache_path)) {
        res.sendStatus(500);
        return;
    }

    var current_list = req.body;

    var full_list = get_cache_list_hash(req.config.cache_path, false);


    var diff_list = [];

    _.each(full_list, function (a_v) {

        var found = false;
        _.each(current_list, function (b_v) {
            if (a_v.filename == b_v.filename && a_v.crc32 == b_v.crc32) {
                found = true;
                console.log("一样:");
                console.log(a_v);
                console.log(b_v);
            }
        });

        if (found == false) {
            diff_list.push(a_v);
        }
    });

    console.log("更新了的文件:");
    console.log(diff_list);


    res.append('Content-Type', 'text/json');
    res.render('api', {json: JSON.stringify(diff_list)});
});


module.exports = router;


