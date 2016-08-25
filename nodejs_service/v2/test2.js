/**
 * Created by tony on 16/7/11.
 */

var s = 'com.tantu.map/5.2.02299393939';

var version_compare= require('version-comparison');



function get_tantu_app_version(user_agent)
{
    user_agent = user_agent || '';

    var m = user_agent.match(/com.tantu.map.*?\/([0-9\.]+)/i);

    if (m && m[1])
    {
        var v = m[1].split('.');

        if (v[2]>100)
        {
            v[2] = v[2].substr(0,1);
        }

        return v.join('.');
    }
    else
    {
        return '0';
    }
}


console.log(get_tantu_app_version(s))

console.log(version_compare(get_tantu_app_version(s),'5.2.0'))

