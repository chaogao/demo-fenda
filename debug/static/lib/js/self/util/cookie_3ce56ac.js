/**
 * cookie 信息
 * @return {[type]} [description]
 */
(function () {

    /**
     * @module static/util/Cookie
     * copy from tangram
     */
    var _isValidKey = function (key) {
        // http://www.w3.org/Protocols/rfc2109/rfc2109
        // Syntax:  General
        // The two state management headers, Set-Cookie and Cookie, have common
        // syntactic properties involving attribute-value pairs.  The following
        // grammar uses the notation, and tokens DIGIT (decimal digits) and
        // token (informally, a sequence of non-special, non-white space
        // characters) from the HTTP/1.1 specification [RFC 2068] to describe
        // their syntax.
        // av-pairs   = av-pair *(";" av-pair)
        // av-pair    = attr ["=" value] ; optional value
        // attr       = token
        // value      = word
        // word       = token | quoted-string
        
        // http://www.ietf.org/rfc/rfc2068.txt
        // token      = 1*<any CHAR except CTLs or tspecials>
        // CHAR       = <any US-ASCII character (octets 0 - 127)>
        // CTL        = <any US-ASCII control character
        //              (octets 0 - 31) and DEL (127)>
        // tspecials  = "(" | ")" | "<" | ">" | "@"
        //              | "," | ";" | ":" | "\" | <">
        //              | "/" | "[" | "]" | "?" | "="
        //              | "{" | "}" | SP | HT
        // SP         = <US-ASCII SP, space (32)>
        // HT         = <US-ASCII HT, horizontal-tab (9)>
            
        return (new RegExp("^[^\\x00-\\x20\\x7f\\(\\)<>@,;:\\\\\\\"\\[\\]\\?=\\{\\}\\/\\u0080-\\uffff]+\x24")).test(key);
    };

    var getRaw = function (key) {
        if (_isValidKey(key)) {
            var reg = new RegExp("(^| )" + key + "=([^;]*)(;|\x24)"),
                result = reg.exec(document.cookie);
                
            if (result) {
                return result[2] || null;
            }
        }

        return null;
    };

     
    var get = function (key) {
        var value = getRaw(key);
        if ('string' == typeof value) {
            value = decodeURIComponent(value);
            return value;
        }
        return null;
    };

    var setRaw = function (key, value, options) {
        if (!_isValidKey(key)) {
            return;
        }
        
        options = options || {};
        //options.path = options.path || "/"; // meizz 20100402 设定一个初始值，方便后续的操作
        //berg 20100409 去掉，因为用户希望默认的path是当前路径，这样和浏览器对cookie的定义也是一致的
        
        // 计算cookie过期时间
        var expires = options.expires;
        if ('number' == typeof options.expires) {
            expires = new Date();
            expires.setTime(expires.getTime() + options.expires);
        }
        
        document.cookie =
            key + "=" + value
            + (options.path ? "; path=" + options.path : "")
            + (expires ? "; expires=" + expires.toGMTString() : "")
            + (options.domain ? "; domain=" + options.domain : "")
            + (options.secure ? "; secure" : ''); 
    };

    var remove = function (key, options) {
        options = options || {};
        options.expires = new Date(0);
        setRaw(key, '', options);
    };

    var set = function (key, value, options) {
        setRaw(key, encodeURIComponent(value), options);
    };

    jsmod.util.cookie = {
        getRaw:getRaw,
        get:get,
        remove:remove,
        setRaw:setRaw,
        set:set
    };
})();

