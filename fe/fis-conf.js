//产品名称
fis.set('namespace', 'fenda');

//模块名称
fis.set('module', 'fenda');

// 模块化开发使用 cmd
fis.hook('cmd', {
  // 配置项
});

//只处理 src 目录下的文件及 map.json（资源映射）
fis.set('project.files', ['src/**', 'map.json']);

//设置 HTML 部署路径
fis.match(/^\/src\/(.*\.html)$/i, {
  release: 'templates/${module}/$1',
  isMod: true
});

// 设置 lib JS ，所有的 lib 文件 release 后还在 lib 目录下
fis.match(/^\/src\/static\/(lib\/.*\.js)$/i, {
  useHash: true,
  isMod: false,
  release: 'static/$1'
});

// 设置 lib JS ，所有的 lib 文件 release 后还在 lib 目录下
fis.match(/^\/src\/static\/(lib\/.*\.swf)$/i, {
  useHash: false,
  isMod: false,
  release: 'static/$1'
});

// 设置 lib Css，所有的 lib 文件 release 后还在 lib 目录下
fis.match(/^\/src\/static\/(lib\/.*\.styl)$/i, {
  useHash: true,
  useSprite: true,
  rExt: '.css', //将 styl文件部署后的后缀改为.css
  parser: fis.plugin('stylus2'), //使用 stylus 插件将 styl 文件转换为 css
  release: 'static/$1'
});

// 设置 lib Css，所有的 lib 文件 release 后还在 lib 目录下
fis.match(/^\/src\/static\/(lib\/.*\.css)$/i, {
  useHash: true,
  release: 'static/$1'
});

// 设置 font 文件
fis.match(/^\/src\/static\/(lib\/css\/fonts\/.*)$/i, {
  useHash: true,
  release: 'static/$1'
});

// page 模块化目录配置，release 后在 public 目录下
fis.match(/^\/src\/(page\/.*\.js)/i, {
  useHash: true,
  isMod: true,
  release: 'static/public/js/$1'
});

// page 模块化目录配置，release 后在 public 目录下
fis.match(/^\/src\/(page\/.*\.styl)/i, {
  useHash: true,
  isMod: true,
  rExt: '.css', //将 styl文件部署后的后缀改为.css
  parser: fis.plugin('stylus2'), //使用 stylus 插件将 styl 文件转换为 css
  release: 'static/public/css/$1'
});

// page 模块化目录配置，release 后在 public 目录下
fis.match(/^\/src\/(page\/.*\.css)/i, {
  useHash: true,
  release: 'static/public/css/$1'
});

//设置图片等多媒体文件
fis.match(/^\/src\/(.*\/([\w-\.]+\.(png|gif|mp3|svg|jpg|jpeg|flv|f4v|ico)))$/i, {
  useHash: true,
  release: 'static/media/$1'
});

// 类库合并
// fis.match('::package', {
//   postpackager: fis.plugin('loader', {
//     useInLineMap: true,
//     resoucemap: "/static/map/${filepath}_map.js"
//   })
// });

fis.match('/src/static/lib/js/third/sea.js', {
      packTo: '/static/pkg/aio.js'
    })
    .match('/src/static/lib/js/third/refix.js', {
      packTo: '/static/pkg/aio.js'
    })
    .match('/src/static/lib/js/third/zepto.js', {
      packTo: '/static/pkg/aio.js'
    })
    .match('/src/static/lib/js/third/iscroll.js', {
      packTo: '/static/pkg/aio.js'
    })
    .match('/src/static/lib/js/third/fastclick.js', {
      packTo: '/static/pkg/aio.js'
    })
    .match('/src/static/lib/js/third/jsmod.mobile.js', {
      packTo: '/static/pkg/aio.js'
    })
    .match('/src/static/lib/js/third/swig.min.js', {
      packTo: '/static/pkg/aio.js'
    })
    .match('/src/static/lib/js/self/unicorn.js', {
      packTo: '/static/pkg/aio.js'
    })
    .match('/src/static/lib/js/self/jsmod-extend.js', {
      packTo: '/static/pkg/aio.js'
    })
    .match('/src/page/layout/base.js', {
      packTo: '/static/pkg/aio.js'
    });

fis.match('/src/static/lib/css/self/reset.css', {
      packTo: '/static/pkg/aio.css'
    })
    .match('/src/static/lib/css/self/font.css', {
      packTo: '/static/pkg/aio.css'
    })
    .match('/src/page/layout/base.styl', {
      packTo: '/static/pkg/aio.css'
    });

/**
 * ------------------------- 部署配置 ------------------------------
 * -----------------------------------------------------------------
 * -----------------------------------------------------------------
 */
//线上部署时对 JS 文件进行压缩处理
fis.media('online').match('*.js', {
  optimizer: fis.plugin('uglify-js'), //使用uglify压缩代码
  useHash: true
});

//线上部署时，对 CSS 文件进行压缩优化处理
fis.media('online').match('*.{styl,css}', {
  optimizer: fis.plugin('clean-css'), //使用 clean-css 对 css 代码压缩优化
  useHash: true
});

//线上部署时，压缩 png 图片
fis.media('online').match('*.png', {
  optimizer: fis.plugin('png-compressor') //压缩 png图片
});

// debug 增加hash处理
fis.media('debug').match('*.{js,css}', {
  useHash: true
});

//代码部署配置
// fis.media("debug").match(/.*\/(dragon)\/.*/, {
//     deploy: fis.plugin('http-push', {
//         receiver: 'http://120.24.7.220:8888/receiver.php',
//         to: '/home/work/unicorn/webapp/fe' // 注意这个是指的是测试机器的路径，而非本地机器
//     })
// });


// fis.media("debug").match(/.*\/(awardRotate|jquery\.liMarquee).*/, {
//     deploy: fis.plugin('http-push', {
//         receiver: 'http://120.24.7.220:8888/receiver.php',
//         to: '/home/work/unicorn/webapp/fe' // 注意这个是指的是测试机器的路径，而非本地机器
//     })
// });

// fis.media("debug").match('*', {
//     deploy: fis.plugin('http-push', {
//         receiver: 'http://120.24.7.220:8888/receiver.php',
//         to: '/home/work/unicorn/webapp/fe' // 注意这个是指的是测试机器的路径，而非本地机器
//     })
// });

 //fis.media("debug").match('*', {
 //    deploy: fis.plugin('http-push', {
 //        receiver: 'http://192.168.33.9:8888/receiver.php',
 //        to: '/home/vagrant/workspace/fe' // 注意这个是指的是测试机器的路径，而非本地机器
 //    })
 //})

