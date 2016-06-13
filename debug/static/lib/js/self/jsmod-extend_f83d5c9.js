(function () {
    // 需要引入的模块
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

;
    /**
 * 细粒度叫搞的工具模块
 */
$.extend(window.jsmod.util, (function () {
    var openBrowser = function(url) {
        if (typeof window.cefQuery === 'function') {
            window.cefQuery({
                request: 'Window.OpenUrl:' + url
            })
            return true
        }
        return false
    }


    var toTime = function (sec) {
        var hour = parseInt(sec / 3600);

        var min = parseInt((sec - hour * 3600) / 60);

        var s = parseInt(sec - hour * 3600 - min * 60);

        var fomat = function (count) {
            return count > 10 ? count.toString() : "0" + count;
        }

        return fomat(hour) + ":" + fomat(min) + ":" + fomat(s);
    }

    var toSec = function (time) {
        var timeArr = time.split(":");

        var sec = parseInt(timeArr[0]) * 60 * 60 + parseInt(timeArr[1]) * 60 + parseInt(timeArr[2]);

        return sec;
    }

    var prop = function (data, key) {
        var ns, obj;

        if (!key) {
            return data;
        }

        ns = key.split(".");
        obj = data;

        for (var i = 0, l = ns.length; i < l && obj; i++)
            obj = obj[ns[i]];

        return obj;
    }

    /**
     * 按照容器大小为中心，截取图
     * @author [liuping]
     * @param  {[type]} imgD        [img对象]
     * @param  {[type]} iwidth      [要固定的宽度]
     * @param  {[type]} iheight     [要固定的高度]
     * @param  {[type]} alignCenter [是否居中]
     */
    var stretchImg = function (imgD, iwidth, iheight, alignCenter, isShowAll) {
        var exec = function () {
            var _w = imgD.width,
                _h = imgD.height,
                _scale = _h / _w,
                _finalWidth,
                _finalHeight,
                moveLeft,
                moveTop;

            var maxRatio = Math.max(iwidth / _w, iheight / _h);
            isShowAll && (maxRatio=Math.min(iwidth / _w, iheight / _h))
            _finalWidth = parseInt(maxRatio * _w, 10) || iwidth;
            _finalHeight = parseInt(maxRatio * _h, 10) || iheight;

            imgD.style.width = _finalWidth + "px";
            imgD.style.height = _finalHeight + "px";

            moveTop = parseInt((iheight - _finalHeight) / 2, 10);
            moveLeft = parseInt((iwidth - _finalWidth) / 2, 10);
            if (alignCenter) {
                $(imgD).css({
                    "margin-top": moveTop,
                    "margin-left": moveLeft
                });
            }
            imgD.style.display = "";
        }

        // 如果加载完成直接缩图
        if (imgD.complete) {
            exec();
        } else {
            imgD.onload = function () {
                exec();
            }
        }
    }


    var inWx = function () {
        var ua = window.navigator.userAgent;

        if (/MicroMessenger/i.test(ua)) {
            return true;
        } else {
            return false;
        }
    }

    return {
        openBrowser: openBrowser,
        prop: prop,
        stretchImg: stretchImg,
        toTime: toTime,
        toSec: toSec,
        inWx: inWx
    };
    
})());;
    jsmod.util.url = (function () {
    var getParamStr = function(url) {
        if (!url) {
            return;
        }
        var urlParts = url.split("?");
        var pathname = urlParts[0];
        var urlParamString = url.substring(pathname.length + 1, url.length);
        return urlParamString;
    }
    var getParams = function(url) {
        var params = [];
        var urlParamString = getParamStr(url);
        if (!urlParamString) {
            return params;
        }
        params = urlParamString.split("&");
        return params;
    }
    var getParamMap = function(url) {
        var map = {};
        var params = getParams(url);
        $.each(params, function(index, val) {
            var kvs = val.split("=");
            var paramName = kvs[0];
            var value = val.substring(paramName.length + 1, val.length);
            map[paramName] = value;
        });
        return map;
    }

    var getParam = function(url, key) {
        var map = getParamMap(url);
        return map[key];
    }

    var getSplitValue = function (index) {
        var pathname = window.location.pathname;

        var splits = pathname.split("/");

        return splits[index + 1];
    }

    var addParam = function(url, paramStr) {
        if (getParamStr(url)) {
            url = url + "&" + paramStr;
        } else {
            url = url + "?" + paramStr;
        }
        return url;
    }

    return {
        getParamMap: getParamMap,
        addParam: addParam,
        getParam: getParam,
        getSplitValue: getSplitValue
    }
})();;
    /**
 * 各种日期处理函数
 * @return {[type]} [description]
 */
(function () {
    var daysInWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        shortMonthsInYear = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        longMonthsInYear = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"],
        shortMonthsToNumber = [];
    shortMonthsToNumber["Jan"] = "01";
    shortMonthsToNumber["Feb"] = "02";
    shortMonthsToNumber["Mar"] = "03";
    shortMonthsToNumber["Apr"] = "04";
    shortMonthsToNumber["May"] = "05";
    shortMonthsToNumber["Jun"] = "06";
    shortMonthsToNumber["Jul"] = "07";
    shortMonthsToNumber["Aug"] = "08";
    shortMonthsToNumber["Sep"] = "09";
    shortMonthsToNumber["Oct"] = "10";
    shortMonthsToNumber["Nov"] = "11";
    shortMonthsToNumber["Dec"] = "12";

    function strDay(value) {
        return daysInWeek[parseInt(value, 10)] || value;
    }

    function strMonth(value) {
        var monthArrayIndex = parseInt(value, 10) - 1;
        return shortMonthsInYear[monthArrayIndex] || value;
    }

    function strLongMonth(value) {
        var monthArrayIndex = parseInt(value, 10) - 1;
        return longMonthsInYear[monthArrayIndex] || value;
    }

    var parseMonth = function (value) {
        return shortMonthsToNumber[value] || value;
    },
    parseTime = function (value) {
        var retValue = value;
        var millis = "";
        if (retValue.indexOf(".") !== -1) {
            var delimited = retValue.split('.');
                retValue = delimited[0];
                millis = delimited[1];
            }

            var values3 = retValue.split(":");

            if (values3.length === 3) {
                hour = values3[0];
                minute = values3[1];
                second = values3[2];

                return {
                    time: retValue,
                    hour: hour,
                    minute: minute,
                    second: second,
                    millis: millis
                };
            } else {
                return {
                    time: "",
                    hour: "",
                    minute: "",
                    second: "",
                    millis: ""
                };
            }
    },
    padding = function (value, length) {
        var i = 0,
        paddingCount = length - String(value).length;
        for (;i< paddingCount; i++) {
            value = "0" + value;
        }
        return value;
    },

    format = function (value, format) {
        if (typeof this == "object" && this.constructor == Date) {
            format = value;
            value = this;
        }

        /*
         * value = new java.util.Date()
         * 2009-12-18 10:54:50.546
         */
        try {
            var date = null,
            year = null,
            month = null,
            dayOfMonth = null,
            dayOfWeek = null,
            time = null;
            if (typeof value == "number"){
                return this.date(new Date(value), format);
            } else if (typeof value.getFullYear == "function") {
                year = value.getFullYear();
                month = value.getMonth() + 1;
                dayOfMonth = value.getDate();
                dayOfWeek = value.getDay();
                time = parseTime(value.toTimeString());
            } else if (value.search(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d{0,3}[Z\-+]?(\d{2}:?\d{2})?/) != -1) {
                /* 2009-04-19T16:11:05+02:00 || 2009-04-19T16:11:05Z */
                var values = value.split(/[T\+-]/);
                year = values[0];
                month = values[1];
                dayOfMonth = values[2];
                time = parseTime(values[3].split(".")[0]);
                date = new Date(year, month - 1, dayOfMonth);
                dayOfWeek = date.getDay();
            } else {
                var values = value.split(" ");
                switch (values.length) {
                    case 6:
                        /* Wed Jan 13 10:43:41 CET 2010 */
                        year = values[5];
                        month = parseMonth(values[1]);
                        dayOfMonth = values[2];
                        time = parseTime(values[3]);
                        date = new Date(year, month - 1, dayOfMonth);
                        dayOfWeek = date.getDay();
                        break;
                    case 2:
                        /* 2009-12-18 10:54:50.546 */
                        var values2 = values[0].split("-");
                        year = values2[0];
                        month = values2[1];
                        dayOfMonth = values2[2];
                        time = parseTime(values[1]);
                        date = new Date(year, month - 1, dayOfMonth);
                        dayOfWeek = date.getDay();
                        break;
                    case 7:
                        /* Tue Mar 01 2011 12:01:42 GMT-0800 (PST) */
                    case 9:
                        /*added by Larry, for Fri Apr 08 2011 00:00:00 GMT+0800 (China Standard Time) */
                    case 10:
                        /* added by Larry, for Fri Apr 08 2011 00:00:00 GMT+0200 (W. Europe Daylight Time) */
                        year = values[3];
                        month = parseMonth(values[1]);
                        dayOfMonth = values[2];
                        time = parseTime(values[4]);
                        date = new Date(year, month - 1, dayOfMonth);
                        dayOfWeek = date.getDay();
                        break;
                    case 1:
                        /* added by Jonny, for 2012-02-07CET00:00:00 (Doctrine Entity -> Json Serializer) */
                        var values2 = values[0].split("");
                        year=values2[0]+values2[1]+values2[2]+values2[3];
                        month= values2[5]+values2[6];
                        dayOfMonth = values2[8]+values2[9];
                        time = parseTime(values2[13]+values2[14]+values2[15]+values2[16]+values2[17]+values2[18]+values2[19]+values2[20])
                            date = new Date(year, month - 1, dayOfMonth);
                        dayOfWeek = date.getDay();
                        break;
                    default:
                        return value;
                }
            }

            var pattern = "";
            var retValue = "";
            var unparsedRest = "";
            /*
               Issue 1 - variable scope issue in format.date
               Thanks jakemonO
               */
            for (var i = 0; i < format.length; i++) {
                var currentPattern = format.charAt(i);
                pattern += currentPattern;
                unparsedRest = "";
                switch (pattern) {
                    case "ddd":
                        retValue += strDay(dayOfWeek);
                        pattern = "";
                        break;
                    case "dd":
                        if (format.charAt(i + 1) == "d") {
                            break;
                        }
                        retValue += padding(dayOfMonth, 2);
                        pattern = "";
                        break;
                    case "d":
                        if (format.charAt(i + 1) == "d") {
                            break;
                        }
                        retValue += parseInt(dayOfMonth, 10);
                        pattern = "";
                        break;
                    case "D":
                        if (dayOfMonth == 1 || dayOfMonth == 21 || dayOfMonth == 31) {
                            dayOfMonth = dayOfMonth + 'st';
                        } else if (dayOfMonth == 2 || dayOfMonth == 22) {
                            dayOfMonth = dayOfMonth + 'nd';
                        } else if (dayOfMonth == 3 || dayOfMonth == 23) {
                            dayOfMonth = dayOfMonth + 'rd';
                        } else {
                            dayOfMonth = dayOfMonth + 'th';
                        }
                        retValue += dayOfMonth;
                        pattern = "";
                        break;
                    case "MMMM":
                        retValue += strLongMonth(month);
                        pattern = "";
                        break;
                    case "MMM":
                        if (format.charAt(i + 1) === "M") {
                            break;
                        }
                        retValue += strMonth(month);
                        pattern = "";
                        break;
                    case "MM":
                        if (format.charAt(i + 1) == "M") {
                            break;
                        }

                        retValue += padding(month, 2);
                        pattern = "";
                        break;
                    case "M":
                        if (format.charAt(i + 1) == "M") {
                            break;
                        }
                        retValue += parseInt(month, 10);
                        pattern = "";
                        break;
                    case "y":
                    case "yyy":
                        if (format.charAt(i + 1) == "y") {
                            break;
                        }
                        retValue += pattern;
                        pattern = "";
                        break;
                    case "yy":
                        if (format.charAt(i + 1) == "y" &&
                                format.charAt(i + 2) == "y") {
                            break;
                        }
                        retValue += String(year).slice(-2);
                        pattern = "";
                        break;
                    case "yyyy":
                        retValue += year;
                        pattern = "";
                        break;
                    case "HH":
                        retValue += padding(time.hour, 2);
                        pattern = "";
                        break;
                    case "H":
                        if (format.charAt(i + 1) == "H") {
                            break;
                        }
                        retValue += parseInt(time.hour, 10);
                        pattern = "";
                        break;                            
                    case "hh":
                        /* time.hour is "00" as string == is used instead of === */
                        var hour = (time.hour == 0 ? 12 : time.hour < 13 ? time.hour : time.hour - 12);
                        retValue += padding(hour, 2);
                        pattern = "";
                        break;
                    case "h":
                        if (format.charAt(i + 1) == "h") {
                            break;
                        }
                        var hour = (time.hour == 0 ? 12 : time.hour < 13 ? time.hour : time.hour - 12);
                        retValue += parseInt(hour, 10);
                        // Fixing issue https://github.com/phstc/jquery-dateFormat/issues/21
                        // retValue = parseInt(retValue, 10);
                        pattern = "";
                        break;
                    case "mm":
                        retValue += padding(time.minute,2);
                        pattern = "";
                        break;
                    case "m":
                        if (format.charAt(i + 1) == "m") {
                            break;
                        }
                        retValue += time.minute;
                        pattern = "";
                        break;
                    case "ss":
                        /* ensure only seconds are added to the return string */
                        retValue += padding(time.second.substring(0, 2), 2);
                        pattern = "";
                        break;
                    case "s":
                        if (format.charAt(i + 1) == "s") {
                            break;
                        }
                        retValue += time.second;
                        pattern = "";
                        break;
                    case "S":
                    case "SS":
                        if (format.charAt(i + 1) == "S") {
                            break;
                        }
                        retValue += pattern;
                        pattern = "";
                        break;
                    case "SSS":
                        retValue += time.millis.substring(0, 3);
                        pattern = "";
                        break;
                    case "a":
                        retValue += time.hour >= 12 ? "PM" : "AM";
                        pattern = "";
                        break;
                    case "p":
                        retValue += time.hour >= 12 ? "p.m." : "a.m.";
                        pattern = "";
                        break;
                    default:
                        retValue += currentPattern;
                        pattern = "";
                        break;
                }
            }
            retValue += unparsedRest;
            return retValue;
        } catch (e) {
            return value;
        }
    },
    /*
     * JavaScript Pretty Date
     * Copyright (c) 2011 John Resig (ejohn.org)
     * Licensed under the MIT and GPL licenses.
     *
     * Takes an ISO time and returns a string representing how long ago the date
     * represents
     *
     * ("2008-01-28T20:24:17Z") // => "2 hours ago"
     * ("2008-01-27T22:24:17Z") // => "Yesterday"
     * ("2008-01-26T22:24:17Z") // => "2 days ago"
     * ("2008-01-14T22:24:17Z") // => "2 weeks ago"
     * ("2007-12-15T22:24:17Z") // => more than 31 days
     *
     */
    prettyDate = function (time) {
        var date;
        var diff;
        var day_diff;

        if(typeof time === "string"){
            date = new Date(time);
        }
        if(typeof time === "object"){
            date = new Date(time.toString());
        }
        diff = (((new Date ()).getTime() - date.getTime()) / 1000);
        day_diff = Math.floor(diff / 86400);

        if (isNaN(day_diff) || day_diff < 0)
            return;

        if (day_diff >= 31)
            return "more than 31 days";

        return day_diff == 0 && (diff < 60 && "just now" || diff < 120 && "1 minute ago" || diff < 3600 && Math.floor(diff / 60) + " minutes ago" || diff < 7200 && "1 hour ago" || diff < 86400 && Math.floor(diff / 3600) + " hours ago") || day_diff == 1 && "Yesterday" || day_diff < 7 && day_diff + " days ago" || day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago";
    },
    parse = function (source) {
        var reg = new RegExp("^\\d+(\\-|\\/)\\d+(\\-|\\/)\\d+\x24");
        if ('string' == typeof source) {
            if (reg.test(source) || isNaN(Date.parse(source))) {
                var d = source.split(/ |T/),
                    d1 = d.length > 1 
                        ? d[1].split(/[^\d]/) 
                        : [0, 0, 0],
                        d0 = d[0].split(/[^\d]/);
                return new Date(d0[0] - 0, 
                        d0[1] - 1, 
                        d0[2] - 0, 
                        d1[0] - 0, 
                        d1[1] - 0, 
                        d1[2] - 0);
            } else {
                return new Date(source);
            }
        }

        return new Date();
    },
    toBrowserTimeZone = function (value, format) {
        return this.date(value, format || "MM/dd/yyyy");
    };

    // 增加日历扩展
    Date.prototype.format = format;

    jsmod.util.date = {
        format: format,
        parse: parse,
        prettyDate: prettyDate,
        toBrowserTimeZone: toBrowserTimeZone
    }
})();;
    
var Infinite = jsmod.util.klass({
    initialize: function (option) {
        this.option = option;
        this.initEvent();
    },

    handleScroll: function (e) {
        var self = this;
        var inf = self.inf;
        var scrollTop = inf.scrollTop();
        var scrollHeight = inf.get(0) == window ? $("body").prop("scrollHeight") : inf.prop("scrollHeight");
        var height = $(inf).height();
        var distance = self.option.distance || 50;

        if (distance > height) {
            distance = height;   
        }

        if (scrollTop + height >= scrollHeight - distance) {
            self.trigger('infinite');
        }
    },

    initEvent: function () {
        var self = this;

        if (self.option.container == "body" || self.option.container == document) {
            self.option.container = window;
        }

        $(self.option.container).on("scroll", self.handleScroll.bind(self));

        self.inf = $(self.option.container);
    }

}, null, [jsmod.util.Event]);

jsmod.util.Infinite = Infinite;;
})();