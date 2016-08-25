/**
 * Created by tony on 16/8/3.
 */


var _this_obj = {};


/**
 * 获取租租车app的版本号
 * @param user_agent
 * @returns {*}
 */
_this_obj.get_zuzuche_app_version = function(user_agent)
{
    user_agent = user_agent || '';

    var m = user_agent.match(/^(ZZCIOS|ZZCAndroid)\/([0-9\.]+)/i);

    if (m && m[2])
    {
        return m[2]
    }
    else
    {
        return '0';
    }
}


/**
 * 获取探途的版本号（支持马甲）
 * @param user_agent
 * @returns 版本号
 */
_this_obj.get_tantu_app_version = function(user_agent)
{
    user_agent = user_agent || '';

    var m = user_agent.match(/com.tantu.map.*?\/([0-9\.]+)/i);

    if (m && m[1])
    {
        //处理马甲的版本号
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

module.exports = _this_obj;