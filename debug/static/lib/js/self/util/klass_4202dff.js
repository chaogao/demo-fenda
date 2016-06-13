jsmod.util.klass = (function (root) {
    function each (arr, callback) {
        for (var key in arr) {
            if (callback.call(arr[key], key, arr[key]) === false) return arr
        }
        return arr;
    }

    /**
     * 实现继承关系
     * @param {function}   _super       继承的
     * @param  {object}    option       子类 prototy 上的方法，必须包括一个 initialize 方法作为构造函数
     * @param {function[]} _implements  实现的接口
     */
    var inherit = function (_super, option, _implements) {
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

    /**
     * 生成 class
     * @param {object}     option       必须包括 initialize 函数
     * @param {function}   _super       继承的 _super
     * @param {function[]} _implements  实现的接口
     */
    var klass = function (option, _super, _implements) {
        var C;

        if (_super) {
            C = inherit(_super, option, _implements);
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

    return klass;
})();