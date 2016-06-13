
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

jsmod.util.Infinite = Infinite;