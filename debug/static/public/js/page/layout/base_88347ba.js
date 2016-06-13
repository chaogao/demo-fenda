define('fenda:src/page/layout/base', ["unicorn/user", 'unicorn/log'], function(require, exports, module) {

  var User = require("unicorn/user");
  var Log = require('unicorn/log');
  
  var Base = jsmod.util.klass({
      initialize: function (option) {
          var self = this;
  
          this.option = option;
          // fastclick
          window.FastClick.attach(document.body);
  
          // lazyload
          $(".common-img-lazy").each(function () {
              jsmod.util.lazy.add(this);
          });
  
          this.headerEvent();
          this.serchInput();
          this.initScrollTop();
          this.initAjax();
          this.initFooterAction();
          this.initLinkClick();
          
          require.async(["http://res.wx.qq.com/open/js/jweixin-1.0.0.js"], function (_wx) {
              wx = _wx;
  
              self.initWx();
          });
      },
  
      initWx: function () {
          var self = this;
  
          $.ajax({
              url: "/api/wx_config/?url=" + encodeURIComponent(window.location.href),
              dataType: "json",
              success: function (data) {
                  var config = $.extend({}, self.option.wxConfig, data);
  
                  delete config.url;
  
                  wx.config(config);
                  wx.ready(function(){
                      self.initWxShare();
                  });
  
                  wx.error(function(res){});
              }
          });
      },
  
      initWxShare: function () {
          var self = this;
  
          var DEFAULT_TIMELINE_IMAGE = 'http://image.sellergrowth.com/images%2Flogo300.png';
  
          // 注入 success 回调
          this.option.wxShare.success = function () {
              var ch = jsmod.util.url.getParam(window.location.href, 'ch');
              var inviter_uid = jsmod.util.url.getParam(window.location.href, 'inviter_uid');
  
              if (!ch || !inviter_uid) {
                  return;
              }
  
              $.ajax({
                  url: '/api/event/api/wechat_forward/',
                  type: 'post',
                  dataType: "json",
                  contentType: "application/json",
                  processData: false,
                  data: {
                      ch: ch,
                      inviter_uid: inviter_uid
                  }
              });
          }
  
          wx.onMenuShareAppMessage(this.option.wxShare);
  
          // 如果 title 和描述一致 那么分享朋友圈时只显示 title
          var shareTimeLineDesc = this.option.wxShare.title.replace("卖家成长-", "") == this.option.wxShare.desc ? 
              "" : this.option.wxShare.desc;
  
          wx.onMenuShareTimeline(
              $.extend({}, this.option.wxShare, {
                  imgUrl: this.option.wxShare.imgUrlTimeline || DEFAULT_TIMELINE_IMAGE,
                  title: "【" + this.option.wxShare.title.replace("卖家成长-", "") + "】" + shareTimeLineDesc
              })
          );
      },
  
      initFooterAction: function () {
          $(".footer-action .seller-login").on("click", function () {
              User.login();
          });
  
          $(".footer-action .seller-register").on("click", function () {
              User.register();
          });
      },
  
      initAjax: function () {
          $(document).on("ajaxBeforeSend", function (e, xhr, setting) {
              // 统一改成json格式
              setting.dataType = "json";
              if (!/^(GET|HEAD|OPTIONS|TRACE)$/.test(setting.type)) {
                  xhr.setRequestHeader("X-CSRFToken", jsmod.util.cookie.getRaw('csrftoken'));
                  if (setting.data) {
                      setting.data = JSON.stringify(setting.data); 
                  }
              }
          });
      },
  
      initScrollTop: function () {
          var $scrollEl = $(".seller-right-fixed .action-top").on("click", function () {
              window.scroll(0, 0);
          });
  
          var $aboutlEl = $(".seller-right-fixed .action-about");
  
          $(window).on("scroll", function () {
              var height = $(window).height();
              var top = $(window).scrollTop();
  
              if (top > height) {
                  $scrollEl.css("display", "block");
                  $aboutlEl.css("display", "block");
              } else {
                  $scrollEl.css("display", "none");
                  $aboutlEl.css("display", "none");
              }   
          });
      },
  
      headerEvent: function () {
          var $header = $(".seller-header");
  
          $header.on("click", ".seller-logout-action", function () {
              $.ajax({
                  url: "/api/accounts/api/account_logout/",
                  dataType: "json",
                  success: function () {
                      window.location.reload();
                  }
              });
          });
  
          $header.on("click", ".seller-action-back", function () {
              if (window.history.length <= 1 || jsmod.util.url.getParam(window.location.href, "_s") == "login") {
                  window.location.href = "/";
              } else {
                  window.history.go(-1);   
              }
          });
  
          $header.on("click", ".seller-nav-action", function () {
              $mask = $(".seller-mask");
  
              if (!$mask.length) {
                  $mask = $("<div class='seller-mask'></div>");
                  $("body").append($mask);
              }
  
              $mask.show();
              // 防止 ios 点透
              setTimeout(function () {
                  $header.find(".seller-nav-list").show();
              }, 100);
          });
  
          $(document).on("click", ".seller-mask", function () {
              $(".seller-mask").hide();
              $header.find(".seller-nav-list").hide();
          });
      },
  
      serchInput: function () {
          var $input = $("#search"),
              $footerFixed = $(".seller-footer-fixed"),
              $clearBtn = $(".seller-search .icon-circle-cross"),
              query;
  
          $input.on("focus", function () {
              $input.prop("placeholder", "");
              $footerFixed.hide();
              $clearBtn.show();
          }).on("blur", function () {
              $input.prop("placeholder", "请输入要搜索的内容");
              $footerFixed.show();
              $clearBtn.hide();
          });
  
          $clearBtn.on("tap", function () {
              $input.val("");
          });
  
          $(".input-wrap form").on("submit", function () {
              if (!$input.val()) {
                  return false;
              }
          });
      },
  
      initLinkClick: function () {   
          $('body').delegate('a', 'click', function () {
              var href = $(this).prop('href'),
                  target = $(this).prop('target');
  
              var url = Log.getLink(href);
  
              if (url) {
                  if (target == '_blank') {
                      window.open(url);
                  } else {
                      window.location.href = url;
                  }
  
                  return false;
              }
          });
      }
  
  });
  
  module.exports = Base;

});