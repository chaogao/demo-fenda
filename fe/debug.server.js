var express = require('express');
var swig = require('swig');
var path = require('path');
var app = express();
var request = require('request');
var fs = require('fs');

var loadTemplate = function (app) {
    app.engine('html', swig.renderFile);
    app.set('view engine', 'html');
    app.set('views', path.join(__dirname, '..', 'debug', 'templates'));
    app.set('view cache', false);

    swig.setDefaults({
      cache: false
    });

    app.get('/create', function (req, res) {
      res.render('fenda/page/create/create.html', {
        user: {id: 1, userId: 'gaochao'}
      });
    });
}

var initStatic = function (app) {
  app.use('/static', express.static(path.join(__dirname, '..', 'debug', 'static')));
}

loadTemplate(app);
initStatic(app);

app.listen(8080, function (error) {
  if (error) {
    console.error(error)
  } else {
    console.info("==> 🌎  Listening on port %s. Open up http://localhost:%s/ in your browser.", 8080, 8080)
  }
});