/**
 * Created by tony on 16/6/22.
 */

var request = require('request')
var fs = require('fs');

var dest = '/tmp/doodle.html';

var stream = fs.createWriteStream(dest);

stream.on("close", function() {
    console.log('下载完成');

     var status = fs.statSync(dest);
     //console.log(status);
});

var body = [];

request('https://m.baidu.com/')
    .on('response', function (response) {


        console.log('filesize' + response.headers["content-length"]);

        if (response.statusCode==404)
        {
            console.log('删文件')
            fs.unlinkSync(dest)
        }

    })
    .on('data', function (chunk) {
        body.push(chunk);
    })
    .on('end', function (chunk) {
        body = Buffer.concat(body) ;
        console.log(body.toString().length);
    })
    .pipe(stream)

