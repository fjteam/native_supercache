var express = require('express');
var router = express.Router();

var phantom = require('phantom');
var async = require('async');
var path = require('path');
var fs = require('fs');
var fsUtils = require("nodejs-fs-utils");
var request = require('request');
var superagent = require('superagent');

var md5 = require('md5');
var _ = require('underscore');
var crc = require("crc");
var uuid = require('node-uuid');

var sitepage = null;
var phInstance = null;


//要设置模拟app的useragent,不然会被redirect去pc页面,以及页面不会加载cordova.js
var user_agent = 'ZZCIOS/5.2.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1';
//var user_agent = 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 6 Build/LYZ28E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.23 Mobile Safari/537.36';


var download_v2 = function (task, tmp_dir, cb) {

    var url = task.url;
    var referer = task.referer;
    var dest = path.join(tmp_dir, md5(url));


    task.filename = path.basename(dest);
    task.tmpname = dest;
    task.group = crc.crc32(referer).toString(16);


    superagent
        .get(url)
        .set('User-Agent', user_agent)
        .set('Referer', referer)
        .set('Accept-Language', 'zh-CN,zh;q=0.8')
        .set('Cache-Control', 'no-cache')
        .set('Pragma', 'no-cache')
        .end(function (err, res) {
            // Calling the end function will send the request
            console.log(res);

            cb(null, task);
        });


}


/**
 * 从url下载
 */
var download = function (task, tmp_dir, cb) {

        var url = task.url;
        var referer = task.referer;
        var dest = path.join(tmp_dir, md5(url));


        task.filename = path.basename(dest);
        task.tmpname = dest;
        task.group = crc.crc32(referer).toString(16);


        var filesize = 0;

        var options = {
            url: url,
            headers: {
                'User-Agent': user_agent,
                'Referer': referer,
                'Accept-Language': 'zh-CN,zh;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
            ,
            timeout: 10 * 1000
        }

        var stream = fs.createWriteStream(dest, {flags: 'w+'});

        stream.on("close", function () {
                if (fs.existsSync(dest)) {
                    var status = fs.statSync(dest);

                    /**
                     * 防止下到烂文件
                     */
                    if (!_.isUndefined(filesize) && status.size == filesize) {


                        console.log('文件size校验ok: ' + url + ' > ' + dest + '网络:' + filesize + ' 实际:' + status.size);

                        cb(null, task);//成功回调
                    }
                    else if (_.isUndefined(filesize))  //租租车的服务器的*.php返回都有这个问题
                    {
                        cb(null, task);//成功回调
                    }
                    else {
                        console.error('文件size校验错误' + url + ' > ' + dest + '网络:' + filesize + ' 实际:' + status.size);

                        cb(null, null);//失败回调
                        try {
                            fs.unlinkSync(dest)
                        }
                        catch (err) {

                        }
                    }
                }
            }
        );


        request.get(options)
            .on('response', function (response) {

                if (response.statusCode != 200) {
                    console.error('返回错误,删文件' + url + ' ' + response.statusCode)
                    try {
                        fs.unlinkSync(dest)
                        cb(null, null);//失败回调
                    }
                    catch (err) {

                    }
                }
                else {
                    filesize = response.headers["content-length"];
                }

            })
            .on('error', function (e) {
                console.error(e.message);
                try {
                    fs.unlinkSync(dest)
                    cb(null, null);//错误回调
                }
                catch (err) {

                }



            })
            .pipe(stream);

    }
    ;


/* GET home page. */
router.get('/super_cache/run', function (req, res, next) {

    var sitepage = null;
    var phInstance = null;
    var resoures_url_to_cache_final = [];


    phantom.create()
        .then(instance => {
            phInstance = instance;
            return instance.createPage();
        })
        .then(page => {
            sitepage = page;

            page.setting('userAgent', user_agent);
            page.setting('resourceTimeout', 10*1000);


            page.on('onResourceRequested', function (requestData, networkRequest) {


                //过滤一些不需要缓存或者在黑名单内的url
                if (requestData.method == 'GET' && !_.some(req.config.black_list, function (black) {
                        return requestData.url.startsWith(black) || requestData.url.match(black);
                    })) {
                    console.log('加入缓存队列: ' + requestData.id + ' ' + requestData.url);
                    console.log(requestData);
                    resoures_url_to_cache_final.push({url: requestData.url, referer: ''});
                }

            });

            _.each(req.config.page_urls_to_cache, function (url) {
                page.open(url);
            });


        })
        .then(status => {
            //console.log(status);

            return sitepage.property('content');
        })
        .then(content => {
            // console.log(content);

           // console.log(resoures_url_to_cache_final);


            //目录索引
            var down_list = [];

            //建一个任务临时目录
            var tmp_dir = path.join("/tmp/supercache_tmp_" + uuid.v1());
            fsUtils.mkdirsSync(tmp_dir);
            fsUtils.mkdirsSync(req.config.cache_path);


            console.log('准备开始下载');
            //开始下载,控制并发
            async.mapLimit(resoures_url_to_cache_final, 20, function (task, cb) {

                    console.log(task);
                    download(task, tmp_dir, cb);
                },
                function (err, ok_results) { //results 此时是之前download里面cb回调的数组

                    console.log('全部下载完成');
                    console.log(ok_results);

                    //从临时目录复制到正式cache目录,过滤0字节的,并且计算hash
                    _.each(ok_results, function (ok_task) {
                        if (!_.isNull(ok_task)) {
                            if (fsUtils.fsizeSync(ok_task.tmpname) > 0) {
                                fsUtils.copySync(ok_task.tmpname, path.join(req.config.cache_path, ok_task.filename), function (err, cache) {
                                    if (!err) {
                                        down_list.push(ok_task);

                                    } else {
                                        console.error("Error", err)
                                    }
                                });
                            }
                        }

                    });


                    try {
                        setTimeout(function () {

                                //按照gruop排一下序,过滤一下重复（url相同但referer不同的那些）
                                down_list = _.sortBy(down_list, 'group');

                                fs.writeFileSync(path.join(tmp_dir, "_list.json"), JSON.stringify(down_list));
                                fsUtils.copySync(path.join(tmp_dir, "_list.json"), path.join(req.config.cache_path, '_list.json'), function (err, cache) {
                                    if (!err) {

                                    } else {
                                        console.error("Error", err)
                                    }
                                });
                                fsUtils.removeSync(tmp_dir);
                            }
                            , 2000);

                    } catch (err) {

                        console.error("Error", err)
                    }


                    console.log('移动文件完成' + req.config.cache_path);

                    res.render('run', {title: 'done'});


                });


            sitepage.close();
            phInstance.exit();
        })
        .catch(error => {
            console.log(error);
            phInstance.exit();
        });


})
;


module.exports = router;
