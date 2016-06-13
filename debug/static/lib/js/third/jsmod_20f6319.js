/**
 * jsmod 主入口，版本、配置信息
 * WIKI：http://wiki.baidu.com/display/LBSPLAC/JSMOD+FOR+MOBILE
 * API: http://jsmodmobile.newoffline.bae.baidu.com/api/
 * DEMOS: http://jsmodmobile.newoffline.bae.baidu.com/views/example/ui/dialog.html
 * MIT Licensed
 * changelog 
 * 0.1.1
 * 增加对 webview 的支持删除判断 fixed
 * 0.1.2
 * 修复 banner 模块的 bug
 */
(function (root) {
    /**
     * @namespace
     * @name jsmod
     */
    root.jsmod = {
        version: "0.1.2"
    };
    /**
     * @namespace
     * @name jsmod.ui
     */
    root.jsmod.ui = {};
    /**
     * @namespace
     * @name jsmod.util
     */
    root.jsmod.util = {};


    root.jsmod.detector = {};
    root.jsmod.style = {};
})(window);

;(function (root) {
    root.jsmod.style["jsmod.ui.IOSDialog"]  = {
        // dialog 容器整体样式
        "ELEMENT": {
            "background-color": "#f6f6f6",
            "border-radius": "5px",
            "padding": "10px 0 0 0"
        },
        // dialog 头部内容样式
        "TITLE": {
            "color": "#000000",
            "text-align": "center",
            "font-size": "14px",
            "font-weight": "bold",
            "padding": "0 10px 5px 10px"
        },
        // dialog 中详情容器样式
        "CONTENT": {
            "color": "#000000",
            "text-align": "center",
            "font-size": "12px",
            "line-height": "1.6em",
            "padding": "0 10px",
            "max-Height": "200px"
        }
    }
})(window);
;(function (root) {
    root.jsmod.style["jsmod.ui.Confirm"]  = {
        "FOOTER": {
            "color": "#0d72de",
            "font-size": "15px",
            "font-weight": "bold",
            "line-height": "2.5em",
            "text-align": "center",
            "border-top": "1px solid #c1c1c1",
            "display": "-webkit-box"
        },
        "BUTTON": {
            "-webkit-box-flex": "1",
            "text-align": "center",
            "width": "0",
            "display": "block"
        },
        "BUTTON_NO": {
            "border-right": "1px solid #c1c1c1",
            "color": "#0d72de",
            "text-decoration": "none"
        },
        "BUTTON_OK": {
            "color": "#0d72de",
            "text-decoration": "none"
        }
    }
})(window);
;(function (root) {
    root.jsmod.style["jsmod.ui.Alert"]  = {
        // dialog 底部容器样式
        "FOOTER": {
            "color": "#0d72de",
            "font-size": "14px",
            "font-weight": "bold",
            "line-height": "2.5em",
            "text-align": "center",
            "border-top": "1px solid #c1c1c1"
        }
    }
})(window);
;(function (root) {
    root.jsmod.style["jsmod.ui.Toast"]  = {
        "ELEMENT": {
            "background-color": "rgba(51, 51, 51, 0.85)",
            "color": "#f6f6f6",
            "border-radius": "5px",
            "font-size": "12px",
            "line-height": "1.6em",
            "padding": "5px"
        }
    }
})(window);
;(function (root) {
    root.jsmod.style["jsmod.ui.Banner"]  = {
        "BOTTOM_BAR": {
            "position": "absolute",
            "padding": "5px;",
            "bottom": 0,
            "left": 0,
            "right": 0,
            "font-size": "12px",
            "line-height": "20px",
            "height": "20px",
            "background-color": "rgba(0, 0, 0, 0.7)",
            "color": "#fff",
            "z-index": "1"
        },
        "IMAGE": {
            "opacity": 0,
            "-webkit-transition": "opacity 0.3s"
        }
    }
})(window);
;/**
 * 检查器模块
 */
(function (root) {
    var detector = root.jsmod.detector;

    detector.isAnimation = function () {
        return !!($.fx);
    }
})(window);
;(function (root) {
    var handlers = {},
        _zid = 1;

    // 事件对象
    function returnFalse () {
        return false;
    };

    function returnTrue () {
        return true;
    };

    function Event (name, data) {
        this.type = this.name = name;
        data && $.extend(this, data);
    };

    Event.prototype = {
        isDefaultPrevented: returnFalse,
        isPropagationStopped: returnFalse,
        preventDefault: function() {
            this.isDefaultPrevented = returnTrue;
        },
        stopPropagation: function() {
            this.isPropagationStopped = returnTrue;
        }
    };

    /**
     * 为上下文生成唯一 zid, 用于事件检索
     * @private
     */
    function zid (context) {
        return context._zid || (context._zid = _zid++)
    }

    /**
     * 查询 handler 
     * @private
     */
    function findHandlers(context, name, fn) {
        return (handlers[zid(context)] || []).filter(function(handler) {
            return handler && (!name || name == handler.name)
                && (!fn || fn == handler.fn);
        });
    }

    root.jsmod.util.EventCreator = Event;

    root.jsmod.util.Event = {
        /**
         * 添加事件
         * @param {string}   name      事件名称
         * @param {function} fn        回调逻辑
         * @param {object}   [context] 处理回调的上下文
         */
        on: function (name, fn, context) {
            var id = zid(this),
                set = (handlers[id] || (handlers[id] = []));

            context = context || this;   // 绑定上下文

            set.push({
                fn: fn,
                name: name,
                i: set.length,
                context: context
            });

            return this;
        },
        /**
         * 移除事件
         */
        off: function (name, fn, context) {
            var id = zid(this);

            findHandlers(this, name, fn).forEach(function (handler) {
                delete handlers[id][handler.i];
            });
        },
        /**
         * 触发事件
         */
        trigger: function (name, data) {
            var id = zid(this),
                e;

            e = typeof(name) == "object" ? name : new Event(name);

            name = (name && name.type) || name;

            findHandlers(this, name).forEach(function (handler) {

                if (handler.fn.apply(handler.context, [e].concat(data)) === false 
                        || (e.isPropagationStopped && e.isPropagationStopped())) {
                    return false;
                };
            });

            return e;
        }
    }
    
})(window);
;(function (root) {
    function extend (target, source) {
        for (key in source) {
            source[key] !== undefined && (target[key] = source[key]);
        }
    }

    root.jsmod.util.extend = function (target) {
        var args = [].slice.call(arguments, 1);

        args.forEach(function (arg) {
            extend(target, arg); 
        });

        return target
    }
})(window);
;(function (root) {
    var jsmod = root.jsmod,
        util = jsmod.util;

    function each (arr, callback) {
        for (var key in arr) {
            if (callback.call(arr[key], key, arr[key]) === false) return arr
        }
        return arr;
    }

    /**
     * 生成 class
     * @param {object}     option       必须包括 initialize 函数
     * @param {function}   _super       继承的 _super
     * @param {function[]} _implements  实现的接口
     */
    util.klass = function (option, _super, _implements) {
        var C;

        if (_super) {
            C = util.inherit(_super, option, _implements);
        } else {
            C = function () {
                if (this.initialize) {
                    this.initialize.apply(this, Array.prototype.slice.call(arguments, 0));
                }
            }

            each([option].concat(_implements || []), function (i, obj) {
                each(typeof obj === "function" ? obj.prototype : obj, function (j, fun) {   // 如果是函数则遍历 prototype

                    typeof fun === "function"                         // 必须为函数
                        && (i == 0 || (i != 0 && j != "initialize"))  // 如果是接口则 initialize 不能加入
                        && (C.prototype[j] = fun);                    // 实现函数拷贝

                });
            });
        }

        return C;
    }


    /**
     * 实现继承关系
     * @param {function}   _super       继承的
     * @param  {object}    option       子类 prototy 上的方法，必须包括一个 initialize 方法作为构造函数
     * @param {function[]} _implements  实现的接口
     */
    util.inherit = function (_super, option, _implements) {
        var F = function () {},
            C;

        F.prototype = _super.prototype;

        C = function () {
            if (this.initialize) {
                this.initialize.apply(this, Array.prototype.slice.call(arguments, 0));
            }
        }
        C.prototype = new F;
        C.prototype.constructor = C;

        each([option].concat(_implements || []), function (i, obj) {
            each(typeof obj === "function" ? obj.prototype : obj, function (j, fun) {   // 如果是函数则遍历 prototype

                typeof fun === "function"                         // 必须为函数
                    && (i == 0 || (i != 0 && j != "initialize"))  // 如果是接口则 initialize 不能加入
                    && (C.prototype[j] = fun);                    // 实现函数拷贝

            });
        });

        return C;
    }
})(window);
;(function (root) {
    var doc = document,
        option = {
            offset: 50,
            isFade: true,
            isLoop: false  // 是否循环监听元素的改变，默认为false
        }, lazy, watches = [];


    /**
     * 延迟加载
     * @namespace 
     * @name jsmod.util.lazy
     */
    lazy = root.jsmod.util.lazy = {
        /**
         * 开始监听屏幕滚动，使用 lazy load
         * @memberof! jsmod.util.lazy#
         * @param {object} opt               配置参数
         * @param {int}    [opt.offset=30]   判断是否在屏幕内扩大的范围
         * @param {bool}   [opt.isFade=true] 是否使用 fade 显示加载完成后的图片
         */
        start: function (opt) {
            $.extend(option, opt);

            // 动画是否支持设置
            option.isFade = jsmod.detector.isAnimation() ? option.isFade : false;

            !this.isStart() && this._start();
        },
        /**
         * 停止各种监听
         * @memberof! jsmod.util.lazy#
         */
        stop: function () {
            this._isStart = false;
            this._setLoopTimer && clearTimeout(this._setLoopTimer);
            this._observerIns && this._observerIns.disconnect();

            $(root).off("scroll.lazy")
                .off("resize.lazy");
        },
        /**
         * 清除所有监听的 watches 但还会继续监听新的数据
         * @memberof! jsmod.util.lazy#
         */
        clear: function () {
            watches = [];
        },
        /**
         * 判断 lazyload 是否已经启用
         * @memberof! jsmod.util.lazy#
         */
        isStart: function () {
            return !!this._isStart;
        },
        /**
         * 将元素加入监听
         * @memberof! jsmod.util.lazy#
         * @param {dom} dom 需要加入的元素
         */
        add: function (dom) {
            if (this._checkVisible(dom)) {
                this._show(dom);
            } else if ($.inArray(dom, watches) === -1) {
                dom._lazyIndex = watches.length;
                watches.push(dom);
            }
        },
        /**
         * @memberof! jsmod.util.lazy#
         * 获取base64像素点的代码
         */
        getBase64: function () {
            return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAMAAAAoyzS7AAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAA1JREFUeNoBAgD9/wAAAAIAAVMrnDAAAAAASUVORK5CYII=";
        },
        /**
         * @private
         */
        _start: function () {
            var self = this,
                checkFun = this._getCheckFun(this._loopElement),
                setLoop = function (cb) {
                    self._setLoopTimer = setTimeout(function () {
                        cb();
                        setLoop(cb);
                    }, 30);
                }

            this._isStart = true;

            $(root).on("scroll.lazy", checkFun)
                .on("resize.lazy", checkFun);

            if (typeof window['MutationObserver'] === 'function') {   // 有函数则用函数没有则每个 30 毫秒检查一次
                this._observer(checkFun);
            } else if (option.isLoop) {
                setLoop(checkFun);
            }
        },
        /**
         * 循环判断是否应该加载
         * @private
         */
        _loopElement: function () {
            var self = this;

            $.each(watches, function (i, watch) {
                if (watch && self._checkVisible(watch)) {
                    self._show(watch);
                    delete watches[watch._lazyIndex];
                }
            });
        },
        /**
         * 显示一个监听的图片
         * @private
         */
        _show: function (watch) {
            var w = $(watch);

            if (option.isFade && w.attr("lazyed") != "1") {
                w.one("load", function () {
                    w.animate({
                        opacity: 1
                    });
                }).css("opacity", 0)
            }

            w.prop("src", w.data("src"))
                .attr("lazyed", "1");
        },
        /**
         * 检测是否可以显示
         * @private
         */
        _checkVisible: function (el) {
            var viewport = {
                width: option.offset,
                height: option.offset
            }, bodyRect, elRect, pos, visible;

            viewport.width += doc.documentElement.clientWidth;
            viewport.height += doc.documentElement.clientHeight;

            elRect = el.getBoundingClientRect();

            bodyRect = {
                bottom: doc.body.scrollHeight,
                top: 0,
                left: 0,
                right: doc.body.scrollWidth
            };

            pos = {
                left: elRect.left,
                top: elRect.top
            };

            visible =
                !(
                    elRect.right < bodyRect.left ||
                    elRect.left > bodyRect.right ||
                    elRect.bottom < bodyRect.top ||
                    elRect.top > bodyRect.bottom
                ) && (
                    pos.top <= viewport.height &&
                    pos.left <= viewport.width
                );

            return visible;
        },
        /**
         * 监听页面内部元素改变
         * @private
         */
        _observer: function (cb) {
            var observerIns = new MutationObserver(watch),
                filter = Array.prototype.filter;

            this._observerIns = observerIns;

            observerIns.observe(doc.body, {
                childList: true,
                subtree: true
            });

            function watch (mutations) {
                setTimeout(cb, 10);
            }
        },
        /**
         * 获取需要check的函数滚动会有 30ms 执行延迟
         * @private
         */
        _getCheckFun: function (func) {
            var self = this,
                timer;

            return function () {
                var args = arguments;
                clearTimeout(timer);
                timer = setTimeout(function() {
                    timer = null;
                    func.apply(self, args);
                }, 30);
            }
        }
    };

})(window);
;(function (root) {

    var MAX_DEEP = 10;

    var _maxDeep;

    /**
     * @mixin
     * @name root.jsmod.util.merge
     * 实现
     */
    root.jsmod.util.merge = {
        /**
         * 将第二个参数对象深度merge到第一个参数，返回一个新创建的对象，默认深度为 3 
         * @param {object} obj1           被 merge 的对象，必须为 javascript 对象
         * @param {object} obj2           merge 的对象，必须为 javascript 对象
         * @param {int}    [isNew=false]  是否返回
         * @param {int}    [maxDeep=3]    遍历深度，必须设定一个固定深度，避免进入死循环
         */
        merge: function (obj1, obj2, isNew, maxDeep) {
            obj1 = isNew ? this.merge({}, obj1, undefined, maxDeep) : obj1;

            _maxDeep = maxDeep || MAX_DEEP;

            this._merge(obj1, obj2, 0);

            return obj1;
        },
        _merge: function (obj1, obj2, deep) {
            // 遍历第二个节点
            for (var key in obj2) {
                if ($.isPlainObject(obj2[key]) && deep < _maxDeep) { // 都是 js 对象且未到达最大深度继续遍历
                    obj1[key] = this._merge((obj1[key] || {}), obj2[key], ++deep);
                } else { // 其余的情况直接拷贝
                    obj1[key] = obj2[key];
                }
            }

            return obj1;
        }
    }
})(window);
;(function (root) {
    jsmod.ui.Base = root.jsmod.util.extend({
        /**
         * 设置 style 对象
         * @param {object} style 一组 style 对象
         */
        setStyle: function (style) {
            // 若已经有 style 则做 merge
            if (this._style) {
                this._style = this.merge(this._style, style, true);
            } else {
                this._style = style || {};
            }
        },
        /**
         * 获取 style 对象中的一项
         * @param {string}  name           style 对象中的 name 值
         * @param {boolean} [isText=false] 是否返回 cssText 数据
         */
        getStyle: function (name, isText) {
            var props;

            if (this._style && (props = this._style[name])) {
                if (isText) {
                    props = $.map(props, function (value, key) {
                        return key + ":" + value;
                    });

                    return props.join(";");
                } else {
                    return props;
                }
            }

            return null;
        },
        /**
         * 模板生成函数
         */
        templateEngine: function (str, data) {
            var cache = {};

            template = function tmpl(str, data){
                // Figure out if we're getting a template, or if we need to
                // load the template - and be sure to cache the result.
                var fn = !/\W/.test(str) ?
                    cache[str] = cache[str] ||
                        tmpl(document.getElementById(str).innerHTML) :
                 
                // Generate a reusable function that will serve as a template
                // generator (and which will be cached).
                new Function("obj",
                    "var p=[],print=function(){p.push.apply(p,arguments);};" +

                    // Introduce the data as local variables using with(){}
                    "with(obj){p.push('" +

                    // Convert the template into pure JavaScript
                    str
                      .replace(/[\r\t\n]/g, " ")
                      .split("<%").join("\t")
                      .replace(/((^|%>)[^\t]*)'/g, "$1\r")
                      .replace(/\t=(.*?)%>/g, "',$1,'")
                      .split("\t").join("');")
                      .split("%>").join("p.push('")
                      .split("\r").join("\\'")
                    + "');}return p.join('');");

                // Provide some basic currying to the user
                return data ? fn( data ) : fn;
            }

            return template(str, data);
        }
    }, jsmod.util.Event, root.jsmod.util.merge);
})(window);
;(function (win) {
    var _option;

    _option = {
        isMask: true,                     // 是否开启蒙层
        isMaskClickHide: true,            // 是否点击蒙层后关闭弹窗
        isAutoShow: false,                // 是否初始化后自动显示
        isIScroll: false,                 // 是否使用 iscroll
        isAnimation: true,                // 是否使用动画
        isScaleAnimation: false,          // 是否使用缩放动画
        isScrollAble: false,              // 是否可以滚动
        isInFixed: true,                  // 内容是否在 fixed 蒙层内部，默认为 true，如果内容内部有 input 元素，选择 false
        maskIndex: 1000,                  // 蒙层的zindex
        opacity: 0.7,                     // 蒙层的透明度
        animateCount: 133,                // 显示，关闭动画的持续时间
        IScrollOption: {                  // 默认的 iscroll 配置信息
            mouseWheel: false,
            scrollbars: true 
        }
    };

    /**
     * Dialog模块，默认居中定位，并显示遮罩图层，不能同时打开两个弹窗，默认阻止屏幕滚动
     * @class
     * @name jsmod.ui.Dialog
     * @constructs
     * @param {object} option
     * @param {string} option.width                    可传入百分比、具体数值；例如：80%, 200px
     * @param {string} option.height                   可传入百分比、具体数值；例如：80%, 200px
     * @param {string} option.html                     构建弹窗的 html 代码，和 element 参数二选一
     * @param {string} option.element                  构建弹窗的 dom 元素，和 html 参数二选一
     * @param {Coords} [option.offset]                 定位时的偏移
     * @param {double} [option.opacity=0.7]            蒙层的透明度
     * @param {int}    [option.animateCount=133]       显示，关闭动画的持续时间
     * @param {bool}   [option.isMask=true]            是否开启蒙层
     * @param {bool}   [option.isMaskClickHide=true]   是否点击蒙层后关闭弹窗
     * @param {bool}   [option.isAutoShow=false]       是否初始化后自动显示
     * @param {bool}   [option.isIScroll=false]        是否使用 iscroll
     * @param {bool}   [option.isAnimation=true]       是否使用动画
     * @param {bool}   [option.isScaleAnimation=false] 是否使用缩放动画
     * @param {bool}   [option.isScrollAble=false]     是否可以滚动
     * @param {bool}   [option.isInFixed=true]         是否内容是否在 fixed 蒙层内部，默认为 true，如果内容中有 input 元素，选择 false
     * @param {int}    [option.maskIndex=1000]         蒙层的zindex
     */
    jsmod.ui.Dialog = jsmod.util.klass(
    /** @lends jsmod.ui.Dialog.prototype */
    {
        initialize: function (option) {
            var self = this,
                element;

            self.option = $.extend({}, _option, option);
            self.resetFrame();

            if (self.option.isInFixed) {
                self._root = (self.createRootEl()).appendTo(self._mask);
            } else {
                self._root = self.createRootEl();
            }

            self._element = self.option.element ? $(self.option.element) : $(self.option.html);
            self._root.append(self._element);

            // 动画是否支持设置
            self.option.isAnimation = jsmod.detector.isAnimation() ? self.option.isAnimation : false;

            // 最大宽高
            self.maxHeight = self.option.maxHeight || parseInt($(window).height() * 0.9);
            self.maxWidth = self.option.maxWidth || parseInt($(window).width() * 0.9);

            // 设置宽高等
            self.setBox();

            // 是否自动显示
            if (self.option.isAutoShow) {
                self.show();
            }

            jsmod.ui.Dialog.addInstance(this);

            // 开始监听事件 resize 事件
            jsmod.ui.Dialog.listen();
        },
        /**
         * 设置宽高
         * @private
         */
        setBox: function () {
            var self = this,
                option = self.option,
                w, h;

            if (/%$/.test(option.width)) {
                w = parseInt($(window).width() * (parseInt(option.width) / 100));
            } else {
                w = parseInt(option.width);
            }

            if (/%$/.test(option.height)) {
                h = parseInt($(window).height() * (parseInt(option.height) / 100));
            } else {
                h = parseInt(option.height);
            }

            if (w > self.maxWidth) {
                w = self.maxWidth;
            }
            if (h > self.maxHeight) {
                h = self.maxHeight;
            }

            self._root.css({
                width: w,
                height: h,
                "box-sizing": "border-box"
            });

            self._element.css({
                width: w,
                height: h,
                "box-sizing": "border-box"
            });
        },
        /**
         * 创建 mask 的 html 代码
         * @private
         */
        createMaskEl: function () {
            var str = '<div class="mod-dialog-frame"' + 
                    'style="overflow:auto; display:none; position: fixed; ' + 
                    'left:0; top: 0; right:0; bottom: 0; z-index: ' + this.option.maskIndex + ';"></div>';

            return $(str);
        },
        /**
         * 创建 dialog 的 root 元素
         * @private
         */
        createRootEl: function () {
            var str = '<div style="overflow:hidden; position: absolute; z-index: ' + (this.option.maskIndex + 1) + ';"' +
                    'class="mod-dialog-wrap"></div>';

            return $(str);
        },
        /**
         * 重置蒙层
         * @private
         */
        resetFrame: function () {
            var self = this,
                option = self.option;

            if (!self._mask) {
                self._mask = self.createMaskEl();

                // 阻止触摸事件
                self._mask.on("touchstart", function (e) {
                    !option.isScrollAble && e.preventDefault();
                });

                // 点击后是否需要关闭
                if (option.isMaskClickHide) {
                    self._mask.on("tap", function (e) {
                        if (e.target == self._mask.get(0)) {
                            self.hide();
                        }
                    });
                }
            }

            self._mask.css("background-color", "rgba(0, 0, 0," + option.opacity + ")");
        },
        /**
         * 显示当前实例的 Dialog，显示前会触发 beforeshow 事件，显示完毕后会触发 shown 事件
         * @fires Dialog#beforeshow
         * @fires Dialog#shown
         */
        show: function () {
            if (this.trigger("beforeshow").isDefaultPrevented()) {
                return;
            }

            this._mask.show().appendTo(document.body);

            // 如果 root 不在 _mask 里面则要单独放置
            if (!this.option.isInFixed) {
                this._root.show().appendTo(document.body);
            }

            this.createIscroll();
            this.adjuestPosition();
            this.trigger("shown");
            this.option.shownCallback && this.option.shownCallback.apply(this);

            if (this.option.isAnimation) {
                this._mask.css({
                        "opacity": 0,
                        "-webkit-transform": this.option.isScaleAnimation ? "scale(1.1)" : "scale(1)"
                    }).animate({
                        "opacity": 1,
                        "-webkit-transform": "scale(1)"
                    }, this.option.animateCount);
            }
        },
        /**
         * 返回当前 dialog 是否显示
         * @return {bool}
         */
        isShown: function () {
            return !(this._mask.css("display") == "none");
        },
        /**
         * 只有当 option.isIScroll = true 时才需调用
         * 重置 iscroll 的高度，当修改 header，footer 的内容时有可能会导致内容区域高度变化；
         * 需要调用此函数重置内容区域的高度
         */
        resetIScrollHeight: function () {
            var self = this,
                allHeight, headerHeight, footerHeight, scrollHeight,
                iscrollWrap;

            // 重置
            iscrollWrap = self._element.find(".mod-dialog-iscroll-wrap");
            iscrollWrap.css("height", "auto");

            // 全部的高度
            allHeight = scrollHeight = self._element.height();

            // 处理头部内容
            if (self._element.find(".mod-dialog-header-wrap")) {
                headerHeight = self._element.find(".mod-dialog-header-wrap")
                        .height();

                scrollHeight -= headerHeight;
            }

            // 处理底部内容
            if (self._element.find(".mod-dialog-footer-wrap")) {
                footerHeight = self._element.find(".mod-dialog-footer-wrap")
                        .height();
                        
                scrollHeight -= footerHeight;
            }

            iscrollWrap.height(scrollHeight).css({
                overflow: "hidden",
                position: "relative"
            });
        },
        /**
         * 生成 iscroll 部分内容
         * @private
         */
        createIscroll: function () {
            var self = this,
                option = self.option;

            // 是否使用 iscroll
            // 只要需要使用 iscroll 则在显示时必会重置显示内容区域的高度
            if (option.isIScroll 
                    && this._element.find(".mod-dialog-iscroll-wrap").length 
                    && !this.iscroll) {

                self.resetIScrollHeight();
                this.iscroll = new IScroll(self._element.find(".mod-dialog-iscroll-wrap").get(0), {
                    mouseWheel: true,
                    scrollbars: true
                });
            } else if (self.iscroll) {
                self.resetIScrollHeight();
                self.iscroll.refresh();
            }
        },
        /**
         * 重置 dialog 的所有宽度高度的配置，只有当弹窗高度、宽度发生变化且显示时才应该调用
         * 如果配置了 option.isIScroll = true 则会调用 resetIScrollHeight 函数
         */
        resetDialog: function () {
            var self = this;

            this.iscroll && this.resetIScrollHeight();
            this.adjuestPosition();
            this.iscroll && setTimeout(function () {
                self.iscroll.refresh();
            }, 100);
        },
        /**
         * 调用隐藏 dialog
         * 隐藏前会触发 beforehide 事件，隐藏完毕后会触发 hidden 事件
         * @fires Dialog#beforehide
         * @fires Dialog#hidden
         */
        hide: function () {
            var self = this;

            if (this.trigger("beforehide").isDefaultPrevented()) {
                return;
            }

            if (self.option.isAnimation) {
                self._mask.animate({
                    "opacity": "0",
                    "-webkit-transform": this.option.isScaleAnimation ? "scale(1.1)" : "scale(1)"
                }, self.option.animateCount, "linear", function () {
                    self._mask.css({
                        "opacity": "1",
                        "-webkit-transform": "scale(1)"
                    }).hide().remove();
                    // 如果 root 不在 _mask 里面则要单独删除
                    if (!self.option.isInFixed) {
                        self._root.remove();
                    }
                    self.trigger("hidden");
                    self.option.hiddenCallback && self.option.hiddenCallback.apply(this);
                });
            } else {
                self._mask.hide().remove();
                // 如果 root 不在 _mask 里面则要单独放置
                if (!self.option.isInFixed) {
                    self._root.remove();
                }
                self.trigger("hidden");
                self.option.hiddenCallback && self.option.hiddenCallback.apply(this);
            }
        },
        /**
         * 调用计算 dialog 在屏幕中的合适位置
         */
        adjuestPosition: function () {
            var self = this,
                offset = self.option.offset || {},
                wHeight, wWidth, height, width, top, left;

            wHeight = self._mask.height();
            wWidth = self._mask.width();

            height = self._root.height();
            width = self._root.width();

            top = wHeight / 2 - height / 2 + (offset.top || 0);
            left = wWidth / 2 - width / 2 + (offset.left || 0);
            top = top < 0 ? 0 : top;
            left = left < 0 ? 0 : left;

            if (!self.option.isInFixed) {
                top += $(window).scrollTop();
            }

            self._root.css("top", top);
            self._root.css("left", left);
        },
        /**
         * 返回当前 dialog 的根节点
         * @return {dom}
         */
        getElement: function () {
            return this._element;
        },
        destroy: function () {
            this._mask.remove();
            this._mask = null;
        }
    }, null, jsmod.ui.Base);
    
    // 所有初始化过的实例
    jsmod.ui.Dialog._instances = [];

    /**
     * 将 dialog 实例加入
     * @static
     */
    jsmod.ui.Dialog.addInstance = function (ins) {
        if ($.inArray(ins, this._instances) == -1) {
            ins._insI = jsmod.ui.Dialog._instances.length;   // 保存引用的 index
            this._instances.push(ins);
        }
    }

    /**
     * 获取 dialog 中所有实例
     * @static
     */
    jsmod.ui.Dialog.getInstances = function () {
        return this._instances;
    }

    /**
     * 清除所有创建的 dialog
     */
    jsmod.ui.Dialog.removeAll = function () {
        this._instances.forEach(function (ins) {
            if (ins && ins._insI !== undefined) {
                ins.destroy();
                delete jsmod.ui.Dialog._instances[ins._insI];
            }
        });

        // 停止监听
        this._isListening = false;
        this.resizeTimer && clearTimeout(this.resizeTimer);
        $(window).off("resize.dialog");
    }

    /**
     * 开始监听 resize 进行 dialog 的重定位
     * 调用时 removeAll 停止监听
     */
    jsmod.ui.Dialog.listen = function () {
        var self = this;

        if (!self._isListening) {
            self._isListening = true;

            $(window).on("resize.dialog", function () {
                self.resizeTimer && clearTimeout(self.resizeTimer);

                self.resizeTimer = setTimeout(function () {
                    self.getInstances().forEach(function (ins) {
                        ins && ins.isShown() && ins.adjuestPosition();
                    });
                }, 300);
            });
        }
    }

})(window);
;(function (argument) {
    var _option = {
        isMaskClickHide: false,
        opacity: 0.3,
        width: "80%",
        maxWidth: 500,
        isIScroll: true,
        align: "left",                       // 内容对齐方式
        isAutoShow: true,                    // 是否自动显示
        title: "",                           // 头部标题
        html: ""                             // 内容详情
    }

    var TITLE_TPL = '<div class="mod-dialog-header-wrap"></div>';

    var CONTENT_TPL = '<div class="mod-dialog-iscroll-wrap"><div class="mod-dialog-iscroll-wrap-inner"></div></div>';

    var ELEMENT_TPL = '<div class="mod-dialog-ios"></div>';

    /**
     * IOS 样式弹窗的基础类，用于扩展为更多的 IOS-UIBASE 控件
     * @class
     * @name jsmod.ui.IOSDialog
     * @extends jsmod.ui.Dialog
     * @constructs
     * @param {object} option                配置参数
     * @param {string} option.html           中间内容区域 html 代码
     * @param {string} [option.title]        头部显示内容
     * @param {string} [option.align=left]   内容区域的对齐方式
     */
    var IOSDialog = jsmod.util.klass(
        /** @lends jsmod.ui.IOSDialog.prototype */
        {
        initialize: function (option) {
            this.setStyle(option.style ? 
                this.merge(jsmod.style["jsmod.ui.IOSDialog"], option.style, true) : jsmod.style["jsmod.ui.IOSDialog"]);

            option = $.extend({}, _option, option);
            this.initDom(option);

            jsmod.ui.Dialog.prototype.initialize.apply(this, [option]);
            this._initEvent(option);
        },
        /**
         * 抽象方法：实现按钮的样式配置
         * @abstract
         */
        setFooter: function (config) {
            throw new Error("需实现setButton");
        },
        /**
         * 抽象方法：初始化内部事件
         * @abstract
         */
        _initEvent: function () {
            throw new Error("需实现initEvent");
        },
        /**
         * 传入参数以修改当前 dialog 的内容，内部会调用 setFooter 方法
         * @param {object} config                配置参数，对于此类的子类而言可以将 footer 改变的内容传入
         * @param {string} [config.html]         中间内容区域 html 代码
         * @param {string} [config.title]        头部显示内容
         */
        setOption: function (config) {
            var self = this;

            if (config.title) {
                self._iosDialogTitle.html(config.title);
            }

            if (config.html) {
                self._iosDialogContent.find(".mod-dialog-iscroll-wrap-inner").html(config.html);
            }

            self.setFooter(config, true);

            // 只有当显示状态下才重置iscroll的高度
            if (self.isShown()) {
                self.resetDialog();
            }
        },
        /**
         * 初始化 dom 选项
         * @private
         */
        initDom: function (option) {
            var self = this;

            self._iosDialogElement = option.element = $(ELEMENT_TPL).css(self.getStyle("ELEMENT"));

            // 创建 title
            if (option.title) {
                self._iosDialogTitle = $(TITLE_TPL).html(option.title)
                        .appendTo(self._iosDialogElement).css(self.getStyle("TITLE"));
            }

            // 创建内容
            if (option.html) {
                self._iosDialogContent = $(CONTENT_TPL)
                        .appendTo(self._iosDialogElement).css(self.getStyle("CONTENT"))
                        .css("text-align", option.align);

                self._iosDialogContent.find(".mod-dialog-iscroll-wrap-inner").html(option.html);
            }

            self.setFooter(option);
        },
        /**
         * 对于子类而言可以重置隐藏的阻止
         * @private
         */
        resetPrevent: function () {
            this._preventHide = false;
        },
        /**
         * 在按钮的点击回调中执行此函数，可以阻止触发 hide 函数
         */
        preventHide: function () {
            this._preventHide = true;
        }
    }, jsmod.ui.Dialog);

    jsmod.ui.IOSDialog = IOSDialog;
})();
;/**
 * confirm 内容重写
 * @ios ui
 */
(function (argument) {
    var _option = {
        buttonOk: "好",                      // 按钮OK内容
        buttonNo: "取消",                    // 按钮NO内容
        align: "center"
    }

    var FOOTER_TPL = '<div class="mod-dialog-footer-wrap">' +
        '<a href="javascript:void(0);" class="mod-dialog-button-no"></a>' +
        '<a href="javascript:void(0);" class="mod-dialog-button-ok"></a>' +
    '</div>';

    /**
     * 继承自 IOSDialog 可自定义底部两个按钮的内容，以及点击后的回调函数
     * @param {object}   option                    配置参数
     * @param {string}   [option.buttonOk=好]      确认按钮的文案
     * @param {string}   [option.buttonNo=取消]    取消按钮的文案
     * @param {function} [option.buttonCallback]   点击按钮的回调
     * @class
     * @name jsmod.ui.Confirm
     * @extends jsmod.ui.IOSDialog
     * @constructs
     */
    var Confirm = jsmod.util.klass(
    /** @lends jsmod.ui.Confirm.prototype */
    {
        initialize: function (option) {
            this.setStyle(option.style ? 
                this.merge(jsmod.style["jsmod.ui.Confirm"], option.style, true) : jsmod.style["jsmod.ui.Confirm"]);


            option = $.extend({}, _option, option);
            jsmod.ui.IOSDialog.prototype.initialize.apply(this, [option]);
        },
        /**
         * 改变 footer 中 button 的内容
         * @param {object}   option                    配置参数
         * @param {string}   [option.buttonOk=好]      确认按钮的文案
         * @param {string}   [option.buttonNo=取消]    取消按钮的文案
         */
        setFooter: function (config, reset) {
            var self = this;

            if (!reset) {
                self._footerCotnent = $(FOOTER_TPL).appendTo(self._iosDialogElement).css(self.getStyle("FOOTER"));
                self._footerCotnent.find(".mod-dialog-button-no, .mod-dialog-button-ok")
                        .css(self.getStyle("BUTTON"));

                // 对两个 button 引用
                self._buttonNo = self._footerCotnent.find(".mod-dialog-button-no")
                        .css(self.getStyle("BUTTON_NO"));

                self._buttonOk = self._footerCotnent.find(".mod-dialog-button-ok")
                        .css(self.getStyle("BUTTON_OK"));
            }

            if (config.buttonNo) {
                self._buttonNo.html(config.buttonNo);
            }

            if (config.buttonOk) {
                self._buttonOk.html(config.buttonOk);
            }
        },
        /**
         * 重写事件
         * @private
         */
        _initEvent: function () {
            var self = this;

            self._buttonNo.on("tap", function (e) {
                self.resetPrevent();
                self.option.buttonCallback && self.option.buttonCallback.apply(self, [0]);

                if (!self._preventHide) {
                    self.hide();
                }
            });

            self._buttonOk.on("tap", function (e) {
                self.resetPrevent();
                self.option.buttonCallback && self.option.buttonCallback.apply(self, [1]);

                if (!self._preventHide) {
                    self.hide();
                }
            });
        }
    }, jsmod.ui.IOSDialog);

    jsmod.ui.Confirm = Confirm;
})();
;(function (argument) {
    var _option = {
        button: "关闭",                       // 按钮内容
        align: "center"
    }

    var FOOTER_TPL = '<div class="mod-dialog-footer-wrap"></div>';

    /**
     * 继承自 IOSDialog 可自定义底部内容，以及点击后的回调函数
     * @param {object}   option                  配置参数，如果传入的是 string 则作为简化模式创建 alert 实例
     * @param {string}   [option.button=关闭]    按钮上的文案
     * @param {function} [option.buttonCallback] 点击底部按钮之后的回调
     * @class
     * @name jsmod.ui.Alert
     * @extends jsmod.ui.IOSDialog
     * @constructs
     */
    var Alert = jsmod.util.klass(
    /** @lends jsmod.ui.Alert.prototype */
    {
        initialize: function (option) {
            // 对简易的 option 做处理
            if (typeof(option) == "string") {
                option = {
                    html: option
                }
            }

            this.setStyle(option.style ? 
                this.merge(jsmod.style["jsmod.ui.Alert"], option.style, true) : jsmod.style["jsmod.ui.Alert"]);

            option = $.extend({}, _option, option);
            jsmod.ui.IOSDialog.prototype.initialize.apply(this, [option]);
        },
        /**
         * 改变 footer 中 button 的内容
         * @param {object} config        footer 的配置信息
         * @param {object} config.button button 按钮上的文案
         * @param {bool}   [reset=false] 是否是由重写设置调用的函数，外部调用保持默认即可
         */
        setFooter: function (config, reset) {
            var self = this;

            if (config.button) {
                if (!reset) {
                    self._alertButton = $(FOOTER_TPL).html(config.button)
                            .appendTo(self._iosDialogElement).css(this.getStyle("FOOTER"));
                } else {
                    self._alertButton.html(config.button);
                }
            }
        },
        /**
         * 重写事件处理逻辑
         * @private
         */
        _initEvent: function () {
            var self = this;

            self._alertButton.on("tap", function (e) {
                self.resetPrevent();
                self.option.buttonCallback && self.option.buttonCallback.apply(self);

                if (!self._preventHide) {
                    self.hide();
                }
            });
        }
    }, jsmod.ui.IOSDialog);

    jsmod.ui.Alert = Alert;
})();
;/**
 * toast 提示
 */
(function () {
    var _option = {
        isMaskClickHide: true,
        opacity: 0,
        width: "90%",
        isIScroll: false,
        isScaleAnimation: false,
        maskIndex: 1001,                     // toast 优先级高于其他 dialog
        isScrollAble: true,
        isAutoShow: true,                    // 是否自动显示
        align: "center",                     // toast 内容显示位置
        autoHideCount: 3000,                 // toast 自动消失的时间，设置为 0 不会自动消失
        text: "",                            // toast 内容
        pos: 0.8                             // toast 在整个屏幕的偏移
    }

    var ELEMENT_TPL = '<div class="mod-dialog-toast"></div>';

    /**
     * 模拟 toast 进行用户提示，隐藏时会自动销毁
     * @class
     * @name jsmod.ui.Toast
     * @extends jsmod.ui.Dialog
     * @constructs
     * @param {object|string} option                      配置参数，简写第一个参数传入 toast 内容
     * @param {string}        [option.text]               toast 内容
     * @param {double}        [option.pos=0.8]            标识 toast 在屏幕中的位置，0 ~ 0.99 之间
     * @param {int}           [option.autoHideCount=3000] toast 自动消失的时间，设置为 0 不会自动消失
     */
    var Toast = jsmod.util.klass(
    /** @lends  jsmod.ui.Toast.prototype */
    {
        initialize: function (option) {
            // 对简易的 option 做处理
            if (typeof(option) == "string") {
                option = {
                    text: option
                }
            }

            option = $.extend({}, _option, option);
            
            this.setStyle(option.style ? 
                this.merge(jsmod.style["jsmod.ui.Toast"], option.style, true) : jsmod.style["jsmod.ui.Toast"]);

            this.initDom(option);

            // 初始化偏移
            if (option.pos < 1) {
                option.offset = {
                    left: 0,
                    top: parseInt($(window).height() * (0.5 - (1 - option.pos)))
                }
            }
            
            jsmod.ui.Dialog.prototype.initialize.apply(this, [option]);

            this._initEvent(option);
        },
        /**
         * 初始化事件
         * @private
         */
        _initEvent: function (option) {
            var self = this;

            if (option.autoHideCount === 0) {
                return;
            }

            self.hideTimer = setTimeout(function () {
                self.isShown() && self.hide();
            }, option.autoHideCount);

            // 将自动隐藏的 timer 取消掉 并且 destroy
            self.on("hidden", function (e) {
                self.hideTimer && clearTimeout(self.hideTimer);
                self.destroy();
            });
        },
        /**
         * 初始化 dom 选项
         * @private
         */
        initDom: function (option) {
            var self = this;

            self._totastElement = option.element = $(ELEMENT_TPL).css(this.getStyle("ELEMENT"));

            // 创建内容
            if (option.text) {
                self._totastElement.html(option.text)
                    .css("text-align", option.align);
            }
        }
    }, jsmod.ui.Dialog);
    
    jsmod.ui.Toast = Toast;    
})();
;(function (root) {
    var _option;

    _option = {
        count: 1,                       // 每页显示的个数可以为小数例如 3.5
        interval: 500,                  // 滚动的时间
        current: 0                      // 默认显示的索引
    };

    /**
     * 基础的轮播控件，脱离 html、css。使用时传入一组 html 代码
     * @constructs
     * @class
     * @name jsmod.ui.Carousel
     * @param {string|dom} element               生成轮播控件的容器，若非通过 option.htmls 生成每个
     *                                           则容器中的每一项需要制定 mod-carousel-item 的 className
     *                                        
     * @param {object}     option                配置参数
     * @param {string[]}   [option.htmls]        配置轮播的项目
     * @param {string}     [option.className]    自定义 className
     * @param {int}        [option.count=1]      每屏显示的个数
     * @param {int}        [option.current=0]    当前显示的位置
     * @param {int}        [option.interval=500] 调用 cur 时动画的持续时间
     */
    var Carousel = jsmod.util.klass(
    /** @lends  jsmod.ui.Carousel.prototype */
    {
        initialize: function (element, option) {
            var self = this;

            self.$element = $(element);
            self.option = $.extend({}, _option, option);
            
            // 判断是否是已 htmls 方式生成轮播控件
            if (!option.htmls) {
                self.total = self.$element.find(".mod-carousel-item").length;
                self.htmlMode = false;
            } else {
                self.total = self.option.htmls.length;
                self.htmlMode = true;
            }

            self.init();
        },
        /**
         * 生成所需的 dom 节点
         * @private
         */
        createDom: function () {
            var self = this,
                option = self.option,
                _items;

            // 生成列表容器
            self.$list = $('<ul class="mod-carousel"></ul>').css({
                "overflow": "hidden",
                "display": "block"
            });
            self.$items = $();

            // 获得每一个 item
            if (self.htmlMode) {
                if (option.count == 1 && self.total > 1) {
                    option.htmls.push(option.htmls[0]);
                    option.htmls.unshift(option.htmls[self.total - 1]);
                }

                // 创建列表数据
                $.each(option.htmls, function (i, str) {
                    var li;

                    // 为了守卫相接需要多做一些
                    if (option.count == 1 && self.total > 1) {
                        i -= 1;
                    }

                    li = $('<li style="display:inline-block;float:left;" class="mod-carousel-item"></li>')
                        .attr("data-index", i)
                        .html(str);

                    self.$items = self.$items.add(li);
                });

                self.$list.append(self.$items);
            } else {
                (_items = self.$element.find(".mod-carousel-item")).each(function (i) {
                    if (option.count == 1 && i == 0 && self.total > 1) {
                        self.$items = self.$items.add(_items.last().clone().attr("data-index", -1));
                    }
                    
                    self.$items = self.$items.add($(this).attr("data-index", i));
                    
                    if (option.count == 1 && i == (self.total - 1) && self.total > 1) {
                        self.$items = self.$items.add(_items.first().clone().attr("data-index", self.total));
                    }
                });

                self.$items.css({
                    "display": "inline-block",
                    "float": "left"
                });
                self.$list.append(self.$items);
            }

            // 计算每个栏目的宽度
            self.itemWidth = parseFloat((self.$element.width() / option.count).toFixed(2));

            // 设置单个width、总体width
            self.$items.width(self.itemWidth);
            self.$list.width(self.itemWidth * self.$items.length);
        },
        /**
         * 初始化数据等
         * @private
         */
        init: function () {
            var self = this,
                option = self.option;

            self.createDom();

            self.$element.css({
                    "position": "relative",
                    "overflow": "hidden"   
                }).append(self.$list);

            
            // 如果 total 和 count 都是 1 则不进行 iscroll 的调用
            // 调用 iscroll
            self.scroll = new IScroll(self.$element.get(0), {
                scrollX: (self.total == 1 && option.count == 1) ? false : true,
                scrollY: false,
                snapThreshold: 0.13,
                snapSpeed: 500,
                snap: option.count == 1 ? ".mod-carousel-item" : false,
                eventPassthrough: true,
                bounce: self.option.count == 1 ? false : true,
                disableMouse: true,
                disablePointer: true,
                momentum: self.option.count == 1 ? false : true
            }); 

            // 只有当 count 为 1 时处理滚动到第一屏，最后一屏的事件
            if (option.count == 1) {
                self.cur(option.current, undefined, true);
                
                // // 内部调用阻止动画的显示
                self.scroll.on("scrollEnd", function () {
                    // 滚动到第一屏的时候
                    if (this.currentPage.pageX == 0) {
                        self.cur(self.total - 1, undefined, true);
                    } else if (this.currentPage.pageX == self.total + 1) {
                        self.cur(0, undefined, true);
                    } else {
                        self.setCur(this.currentPage.pageX - 1, undefined, true);
                    }
                });
            }
        },
        /**
         * 显示前一个项目
         * @public
         * @param {function} callback 轮训动画完成后的回调
         */
        pre: function (callback) {
            return this.cur(this.index - 1, callback);
        },
        /**
         * 显示下一个项目
         * @public
         * @param {function} callback 轮训动画完成后的回调
         */
        next: function (callback) {
            return this.cur(this.index + 1, callback);
        },
        /**
         * 设置当前显示的项目，只有配置每屏显示 1 的时候起作用
         * @fires jsmod.ui.Carousel#active
         * @public
         * @param {int}      index              项目索引
         * @param {function} callback           轮训动画完成后的回调
         * @param {bool}     preventAnimate     是否阻止动画的显示
         */
        cur: function (index, callback, preventAnimate) {
            var self = this,
                option = self.option,
                interval;
            
            if (option.count > 1) {
                return;
            }

            interval = preventAnimate ? 0 : self.option.interval;

            self.scroll.goToPage((index + 1), 0, interval);

            // 如果是在最后一个触发向后
            if (index == self.total) {
                return self.setCur(0);
            }

            // 如果是在第一个时触发向前
            if (index == -1) {
                return self.setCur(self.total - 1);
            }

            return self.setCur(index);
        },
        /**
         * 设置当前 item 的样式类
         * @private
         */
        setCur: function (index) {
            var self = this, e;

            if (self.index !== undefined) {
               self.getItem(self.index).removeClass("mod-carousel-item-cur");
            }
            self.index = index;
            self.getItem(self.index).addClass("mod-carousel-item-cur");

            self.trigger("active", [index]);
            return index;
        },
        /**
         * 获取指定位置的 item, 返回的数据中可能包括两个item
         * @public
         * @param {int} index 项目索引
         */
        getItem: function (index) {
            var self = this;

            return this.$items.filter(function (idx) {
                if ($(this).data("index") == index) {
                    return true;
                }

                // 如果取得是第一个则把最后一个位置的也返回
                // 加二的原因是因为会对 count 为 1 的进行前后克隆
                if (self.option.count == 1 && index == 0 && idx == self.total + 2 - 1) {
                    return true;
                }

                // 如果选择了最后一个，则把第-1个位置的页返回
                if (self.option.count == 1 && index == self.total - 1 && idx == 0) {
                    return true;
                }

                // 如果选择了最后一个+1，则返回第一个
                if (self.option.count == 1 && index == self.total && $(this).data("index") == 0) {
                    return true;
                }
            });
        },
        /**
         * 获取整个 carousel 容器
         * @public
         */
        getElement: function () {
            return this.$element;
        },
        /**
         * 获取cur状态的项目索引
         * @public
         */
        getCurIndex: function () {
            return this.index;
        },
        /**
         * @public
         */
        destroy: function () {
            this.$list.remove();
            this.$list = null;  
            this.scroll.destroy();
        }
    }, null, jsmod.ui.Base);

    jsmod.ui.Carousel = Carousel;
})(window);
;/**
 * banner
 */
(function (root) {
    var BANNER_ITEM_TPL = '<div style="position:relative;overflow:hidden;width:<%= info.width%>px;height:<%= info.height%>px">' +
        '<% if (data.title) { %>' +
            '<span style="<%= style.BOTTOM_BAR %>">' +
                '<%= data.title %>' +
            '</span>' +
        '<% } %>' +
        '<img data-src="<%= data.src %>" style="<%= style.IMAGE %>">' +
    '</div>';

    var _option = {
        count: 1,                       // 每页显示的个数可以为小数例如 3.5
        current: 0,                     // 默认显示的索引
        autoRunInterval: 5000,          // 自动轮播的时间
        isAutoRun: true,                // 是否自动轮播
        isBlank: false,                 // 是否为新建页面打开
        isDisplayAll: false             // 是否对图片进行完全显示
    };

    /**
     * 一个以图片、描述、链接跳转为主，
     * 可以自动轮播的控件，包括了下一页预加载的处理，图片大小自动配置
     * @class
     * @name jsmod.ui.Banner
     * @extends jsmod.ui.Carousel
     * @constructor
     * @param {object}    option                       配置信息
     * @param {object[]}  option.datas                 配置数组，每一个配置项目包括
     *                                                 src, title, href 三个字段，src 必选，title、href可选
     * @param {element}   option.element               轮播容器，新建实例的时候容器必须可以获取到 width、height
     * @param {bool}      [option.current=0]           默认显示的索引
     * @param {bool}      [option.isBlank=false]       是否为新建页面打开
     * @param {bool}      [option.isDisplayAll=false]  是否对图片进行完全显示
     * @param {bool}      [option.isAutoRun=true]      是否自动轮播
     */
    var Banner = jsmod.util.klass({
        initialize: function (option) {
            this.setStyle(option.style ? 
                this.merge(jsmod.style["jsmod.ui.Banner"], option.style, true) : jsmod.style["jsmod.ui.Banner"]);

            option = $.extend({}, _option, option);
            option.htmls = this._createHTMLS(option.datas, option);

            jsmod.ui.Carousel.prototype.initialize.apply(this, [option.element, option]);

            this._bannerEvents();
        },
        /**
         * 初始化 banner 的各种事件
         * @private
         */
        _bannerEvents: function () {
            var self = this;

            self.$element.find("img").on("load", function () {
                var _w = this.width,
                    _h = this.height,
                    iwidth = $(this).parent().width(),
                    iheight = $(this).parent().height(),
                    _finalWidth, _finalHeight, ratio;

                if (self.option.isDisplayAll) {
                    ratio = Math.min(iwidth / _w, iheight / _h);
                } else {
                    ratio = Math.max(iwidth / _w, iheight / _h);
                }
                
                _finalWidth = parseInt(ratio * _w, 10) || iwidth;
                _finalHeight = parseInt(ratio * _h, 10) || iheight;

                $(this).css({
                    "width": _finalWidth + "px",
                    "height": _finalHeight + "px",
                    "margin-top": parseInt((iheight - _finalHeight) / 2, 10),
                    "margin-left": parseInt((iwidth - _finalWidth) / 2, 10),
                    "opacity": 1
                });
            });

            self.$element.on("click", ".mod-carousel-item-cur", function () {
                var href, data;

                href = (data = self.option.datas[$(this).data("index")]) && data.href;
                
                href ? (self.option.isBlank ? window.open(href) : window.location.href = href) : "";
            });

            self.on("active", function (e, idx) {
                self._loadIndex(idx);
                self.option.isAutoRun && self.option.datas.length > 1 && self._autoRunFun(); // 只有大于 1 个才轮播
            });
            // 触发加载第一个
            self._loadIndex(self.option.current);

            if (self.option.isAutoRun && self.option.datas.length > 1) {
                self._autoRunFun();
                self.scroll.on("scrollStart", function () {
                    self._autoRunTimer && clearTimeout(self._autoRunTimer);
                });
            }
        },
        /**
         * 自动轮播
         * @private
         */
        _autoRunFun: function () {
            var self = this;

            self._autoRunTimer && clearTimeout(self._autoRunTimer);
            self._autoRunTimer = setTimeout(function () {
                self.next();
            }, self.option.autoRunInterval);
        },
        /**
         * 加载对应 index 的图片
         * @private
         */
        _loadIndex: function (idx) {
            var img, imgNext;

            img = this.getItem(idx).find("img");

            // 更换地址
            if (!img.data("is-load")) {
                img.prop("src" ,img.data("src"))
                    .data("is-load", true);
            }

            // 把下一个也预加载了
            imgNext = this.getItem(idx + 1).find("img");

            // 更换地址
            if (imgNext.length && !imgNext.data("is-load")) {
                imgNext.prop("src" ,imgNext.data("src"))
                    .data("is-load", true);
            }
        },
        /**
         * 生成 html 对应的内容
         * @private
         */
        _createHTMLS: function (datas, option) {
            var self = this,
                info = {
                    width: $(option.element).width(),
                    height: $(option.element).height()
                },
                style = {
                    IMAGE: self.getStyle("IMAGE", true),
                    BOTTOM_BAR: self.getStyle("BOTTOM_BAR", true)
                };

            return ($.map(datas, function (data) {
                return self.templateEngine(BANNER_ITEM_TPL, {
                    info: info,
                    data: data,
                    style: style
                });
            }));
        }
    }, jsmod.ui.Carousel);

    jsmod.ui.Banner = Banner;

})(window);
;/**
 * @module jsmod/ui/tab
 */
(function (root) {
    var _option;

    _option = {
        animateCount: 300
    };

    var TAB_ITEM_CONTAINER = '';

    /**
     * Tab 基础控件，传入一个根节点，将其下 class 存在 mod-tab-item 的节点作为分栏
     * @example
     * <div class="test-tab-container">
     *     <div class="mod-tab-item">1</div>
     *     <div class="mod-tab-item">2</div>
     *     <div class="mod-tab-item">3</div>
     * </div>
     */
    var Tab = jsmod.util.klass({
        /**
         * 初始化
         * @param {object} option           配置选项
         * @param {string} option.container tab 的容器
         * @param {string} option.index     初始化时的 index
         */
        initialize: function (option) {
            var self = this,
                element;

            self.option = $.extend({}, _option, option);
            self.$container = $(option.container);
            self.$items = self.$container.find(".mod-tab-item");

            self.index = option.index || 0;

            self.initTab();
        },
        /**
         * 初始化化，计算宽度等
         */
        initTab: function () {
            var self = this;

            self.cur(self.index, true);
        },
        /**
         * 设置当前显示的项目
         * 当不传入任意参数时获取当前选中的 item 
         * @public
         * @param {int}      [index]              项目索引
         * @param {bool}     [preventAnimate]     是否阻止动画的显示
         */
        cur: function (index, preventAnimate) {
            var self = this,
                option = self.option;

            if (index === undefined && self.index !== undefined) {
                return self._curItem();
            }

            if (index > self.$items.length - 1) {
                return;
            }

            // 设置是否支持动画
            preventAnimate = jsmod.detector.isAnimation() ? preventAnimate : true;

            self.$items.eq(index)
                .show()
                .addClass("mod-tab-item-active")
                .css("opacity", preventAnimate ? 1 : 0)
                .animate({
                    opacity: 1
                }, self.option.animateCount)
                .siblings(".mod-tab-item")
                .removeClass("mod-tab-item-active")
                .hide();

            self.index = index;

            self.trigger("active", [index]);
        },
        /**
         * 获取当前的选中的项目
         */
        _curItem: function () {
            return this.$items.eq(this.index);
        }
    }, null, jsmod.ui.Base);

    root.jsmod.ui.Tab = Tab;
})(window);
;(function (root) {    
    var _option = {
        maskIndex: 1000,               // 蒙层的 zindex
        contentBg: "#f2f2f2",          // 内容容器的默认样式
        isScreenClickHide: true,       // 是否点击屏幕蒙层区域闭显示的 layer 
        isAnimation: false,            // 是否开启动画
        isIScroll: false,              // 是否使用 iscroll 
        opacity: 0.7                   // 蒙层透明度
        direction: 'vertical'          // layer 的出现方式，默认 vertical，可选：horizontal
    }

    /**
     * layer 可以加载自己的模板，完全将底层 dom 覆盖（或遮挡部分）
     * @class 
     * @name jsmod.ui.Layer
     * @constructs
     * @param {object} option 配置
     * @param {int}             [option.height]                 内容区域的高度
     *                                                          不指定则代表整个屏幕高度
     * @param {int}             [option.width]                  direction 指定为 horizontal 时可用
     *                                                          不指定则代表整个屏幕高度
     * @param {int}             [option.opacity=0.7]            蒙层透明度
     * @param {int}             [option.maskIndex=1000]         蒙层 z-index
     * @param {int}             [option.contentBg=#f2f2f2]      内容区域默认背景颜色
     * @param {bool}            [option.isScreenClickHide=true] 点击黑色蒙层区域是否关弹窗
     * @param {bool}            [option.isAnimation=false]      是否开启动画
     * 
     * @param {object|function} [option.otherElement]           当不设置 option.height时，且不希望弹出的 layer 以 fixed 形式进行显示
     *                                                          otherElement 代表了除蒙层以外的所有 dom 元素(或是其返回值)，在完成显示后
     *                                                          会将 layer 的 position 设置为 relative 且将其他 dom 元素隐藏
     */
    root.jsmod.ui.Layer = jsmod.util.klass(
    /** @lends jsmod.ui.Layer.prototype */
    {
        initialize: function (option) {
            var self = this,
                height = $(window).height();

            self.option = $.extend({}, _option, option);

            // 动画是否支持设置
            self.option.isAnimation = jsmod.detector.isAnimation() ? self.option.isAnimation : false;

            self.$maskScreen = self.createScreenEl().appendTo("body")
                .css("min-height", height)
                .css("background-color", "rgba(0, 0, 0," + self.option.opacity + ")");

            self.$maskContent = self.createContent().appendTo(self.$maskScreen);

            // 如果设置了高度就用高度，否则将最小高度设置为屏幕高度
            // 如果是垂直
            if (self.option.height) {
                self.$maskContent.css("height", self.option.height);
            } else {
                self.$maskContent.css("min-height", height);
            }

            self.$maskDetail = self.$maskContent.find(".mod-layer-detail");

            // 注册点击其他地方关闭事件
            if (self.option.isScreenClickHide) {
                self.$maskScreen.on("tap.layer", function (e) {
                    if (e.target == self.$maskScreen.get(0)) {
                        self.hide();
                    }
                });
            }

            jsmod.ui.Layer.addInstance(this);

            // 开始监听事件 resize 事件
            jsmod.ui.Layer.listen();
        },
        /**
         * 创建 content 容器
         * @private
         */
        createContent: function () {
            var str = '<div style="width: 100%; height: 100%; background-color: ' + 
                    this.option.contentBg + '" class="mod-layer-content">' +
                    '<div class="mod-layer-detail"></div>'  +
                '</div>';

            return $(str);
        },
        /**
         * 创建 screen 容器
         * @private
         */
        createScreenEl: function () {
            var str = '<div class="mod-layer-screen"' + 
                    'style="overflow:auto; display:none; position: fixed; ' + 
                    'left:0; top: 0; right:0; bottom: 0; z-index: ' + this.option.maskIndex + ';"></div>';

            return $(str);
        },
        /**
         * 重新计算位置
         */
        reset: function () {
            var self = this,
                posY;

            // 有高度或且 maskScreen 不会变成 relative 定位
            if (self.option.height || !self.option.otherElement) {
                // 计算滚动到的位置
                posY = $(window).height() - self.$maskContent.prop("clientHeight");

                if (self.option.isAnimation) {
                    self.$maskContent.css("-webkit-transform", 'translateY(' + posY + 'px)');
                } else {
                    self.$maskContent.css("margin-top", posY + 'px');
                }
            }
        },
        /**
         * 判断当前的显示状态
         */
        isShown: function () {
            return !(this.$maskScreen.css("display") == "none");
        },
        /**
         * 显示 mask
         * @fires jsmod.ui.Layer#beforeshow
         * @fires jsmod.ui.Layer#shown
         * @public
         */
        show: function (cb) {
            var self = this,
                height = $(window).height(),
                posY;

            if (this.trigger("beforeshow").isDefaultPrevented()) {
                return;
            }
            
            // 开启动画的情况
            if (self.option.isAnimation) {
                // 放到这里显示不然有bug
                self.$maskScreen.show();
                // 首先将其移动到屏幕外面
                self.$maskContent.css("-webkit-transform", 'translateY(' + height + 'px)');
                // 计算 layer 的位置
                posY = height - self.$maskContent.prop("clientHeight");

                self.$maskContent.off($.fx.animationEnd);
                self.$maskContent.animate({
                    "-webkit-transform": 'translateY(' + posY + 'px)'
                }, 300, "ease", function () {
                    if (!self.option.height && self.option.otherElement) {
                        // 回调成功后
                        if ((typeof(self.option.otherElement)).toLowerCase() == "function") {
                            $(self.option.otherElement()).hide();
                        } else {
                            $(self.option.otherElement).hide();
                        }

                        self.$maskScreen.css("position", "relative");
                    } else {
                        // 这个地方的事件很关键，阻止了 body 的滚动
                        self.$maskScreen.on("touchmove.layer", function (e) {
                            e.preventDefault();
                        });
                    }

                    // 事件，两个回调
                    self.trigger("shown");
                    cb && cb(self.$maskDetail);
                    self.option.shownCallback && self.option.shownCallback.apply(self);
                });
            } else {
                self.$maskScreen.show();

                if (!self.option.height && self.option.otherElement) {
                    if ((typeof(self.option.otherElement)).toLowerCase() == "function") {
                        $(self.option.otherElement()).hide();
                    } else {
                        $(self.option.otherElement).hide();
                    }

                    self.$maskScreen.css("position", "relative");
                } else {
                    // 计算滚动到的位置
                    posY = height - self.$maskContent.prop("clientHeight");
                    self.$maskContent.css("margin-top", posY + 'px');

                    // 这个地方的事件很关键，阻止了body的滚动
                    self.$maskScreen.on("touchmove.layer", function (e) {
                        e.preventDefault();
                    });
                }

                // 事件，两个回调
                self.trigger("shown");
                cb && cb(self.$maskDetail);
                self.option.shownCallback && self.option.shownCallback.apply(self);
            }
        },
        /**
         * 显示 mask
         * @fires jsmod.ui.Layer#beforehide
         * @fires jsmod.ui.Layer#hidden
         * @public
         */
        hide: function (cb) {
            var self = this,
                e;

            if (this.trigger("beforehide").isDefaultPrevented()) {
                return;
            }

            // 移除了 maskScreen 的事件
            self.$maskScreen.off("touchmove.layer");

            // 重置状态 otherElement 的状态
            if (!self.option.height && self.option.otherElement) {
                if ((typeof(self.option.otherElement)).toLowerCase() == "function") {
                    $(self.option.otherElement()).show();
                } else {
                    $(self.option.otherElement).show();
                }
            }

            self.$maskScreen.css("position", "fixed");

            if (self.option.isAnimation) {
                self.$maskContent.off($.fx.animationEnd);

                self.$maskScreen.animate({opacity: 0});
                self.$maskContent.animate({
                    "-webkit-transform": 'translateY(' + $(window).height() + 'px)'
                }, 300, "ease", function () {
                    self.$maskScreen.css("opacity", 1).hide();
                    // 事件，两个回调
                    self.trigger("hidden");
                    cb && cb(self.$maskDetail);
                    self.option.hiddenCallback && self.option.hiddenCallback.apply(self);
                });
            } else {
                self.$maskScreen.hide();
                self.$maskContent.css("margin-top", "0");
                // 事件，两个回调
                self.trigger("hidden");
                cb && cb(self.$maskDetail);
                self.option.hiddenCallback && self.option.hiddenCallback.apply(self);
            }
        },
        /**
         * 获取 layer 根节点
         */
        getElement: function () {
            return this.$maskDetail;
        },
        /**
         * 改变显示
         */
        switchDisplay: function () {
            this.isShown() ? this.hide() : this.show();
        },
        /**
         * 移除
         */ 
        destroy: function () {
            this.$maskScreen.remove();
        }
    },  null, jsmod.ui.Base);

    // 所有初始化过的实例
    jsmod.ui.Layer._instances = [];

    /**
     * 将 layer 实例加入
     * @static
     */
    jsmod.ui.Layer.addInstance = function (ins) {
        if ($.inArray(ins, this._instances) == -1) {
            ins._insI = jsmod.ui.Layer._instances.length;   // 保存引用的 index
            this._instances.push(ins);
        }
    }

    /**
     * 获取 layer 中所有实例
     * @static
     */
    jsmod.ui.Layer.getInstances = function () {
        return this._instances;
    }

    /**
     * 清除所有创建的 layer
     */
    jsmod.ui.Layer.removeAll = function () {
        this._instances.forEach(function (ins) {
            if (ins && ins._insI !== undefined) {
                ins.destroy();
                delete jsmod.ui.Layer._instances[ins._insI];
            }
        });

        // 停止监听
        this._isListening = false;
        this.resizeTimer && clearTimeout(this.resizeTimer);
        $(window).off("resize.layer");
    }

    /**
     * 开始监听 resize 进行 layer 的重定位
     * 调用时 removeAll 停止监听
     */
    jsmod.ui.Layer.listen = function () {
        var self = this;

        if (!self._isListening) {
            self._isListening = true;

            $(window).on("resize.layer", function () {
                self.resizeTimer && clearTimeout(self.resizeTimer);

                self.resizeTimer = setTimeout(function () {
                    self.getInstances().forEach(function (ins) {
                        ins && ins.isShown() && ins.reset();
                    });
                }, 300);
            });
        }
    }

})(window);