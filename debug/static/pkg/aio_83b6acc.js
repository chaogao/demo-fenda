;/*!/src/static/lib/js/third/refix.js*/
if (!String.prototype.repeat) {
  String.prototype.repeat = function(count) {
    if (this == null) {
      throw new TypeError('can\'t convert ' + this + ' to object');
    }
    var str = '' + this;
    count = +count;
    if (count != count) {
      count = 0;
    }
    if (count < 0) {
      throw new RangeError('repeat count must be non-negative');
    }
    if (count == Infinity) {
      throw new RangeError('repeat count must be less than infinity');
    }
    count = Math.floor(count);
    if (str.length == 0 || count == 0) {
      return '';
    }
    if (str.length * count >= 1 << 28) {
      throw new RangeError('repeat count must not overflow maximum string size');
    }
    var rpt = '';
    for (;;) {
      if ((count & 1) == 1) {
        rpt += str;
      }
      count >>>= 1;
      if (count == 0) {
        break;
      }
      str += str;
    }
    return rpt;
  }
}
;/*!/src/static/lib/js/third/sea.js*/
/**
 * Sea.js 3.0.0 | seajs.org/LICENSE.md
 */
(function(global, undefined) {

// Avoid conflicting when `sea.js` is loaded multiple times
if (global.seajs) {
  return
}

var seajs = global.seajs = {
  // The current version of Sea.js being used
  version: "3.0.0"
}

var data = seajs.data = {}


/**
 * util-lang.js - The minimal language enhancement
 */

function isType(type) {
  return function(obj) {
    return {}.toString.call(obj) == "[object " + type + "]"
  }
}

var isObject = isType("Object")
var isString = isType("String")
var isArray = Array.isArray || isType("Array")
var isFunction = isType("Function")

var _cid = 0
function cid() {
  return _cid++
}


/**
 * util-events.js - The minimal events support
 */

var events = data.events = {}

// Bind event
seajs.on = function(name, callback) {
  var list = events[name] || (events[name] = [])
  list.push(callback)
  return seajs
}

// Remove event. If `callback` is undefined, remove all callbacks for the
// event. If `event` and `callback` are both undefined, remove all callbacks
// for all events
seajs.off = function(name, callback) {
  // Remove *all* events
  if (!(name || callback)) {
    events = data.events = {}
    return seajs
  }

  var list = events[name]
  if (list) {
    if (callback) {
      for (var i = list.length - 1; i >= 0; i--) {
        if (list[i] === callback) {
          list.splice(i, 1)
        }
      }
    }
    else {
      delete events[name]
    }
  }

  return seajs
}

// Emit event, firing all bound callbacks. Callbacks receive the same
// arguments as `emit` does, apart from the event name
var emit = seajs.emit = function(name, data) {
  var list = events[name]

  if (list) {
    // Copy callback lists to prevent modification
    list = list.slice()

    // Execute event callbacks, use index because it's the faster.
    for(var i = 0, len = list.length; i < len; i++) {
      list[i](data)
    }
  }

  return seajs
}

/**
 * util-path.js - The utilities for operating path such as id, uri
 */

var DIRNAME_RE = /[^?#]*\//

var DOT_RE = /\/\.\//g
var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//
var MULTI_SLASH_RE = /([^:/])\/+\//g

// Extract the directory portion of a path
// dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
// ref: http://jsperf.com/regex-vs-split/2
function dirname(path) {
  return path.match(DIRNAME_RE)[0]
}

// Canonicalize a path
// realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
function realpath(path) {
  // /a/b/./c/./d ==> /a/b/c/d
  path = path.replace(DOT_RE, "/")

  /*
    @author wh1100717
    a//b/c ==> a/b/c
    a///b/////c ==> a/b/c
    DOUBLE_DOT_RE matches a/b/c//../d path correctly only if replace // with / first
  */
  path = path.replace(MULTI_SLASH_RE, "$1/")

  // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
  while (path.match(DOUBLE_DOT_RE)) {
    path = path.replace(DOUBLE_DOT_RE, "/")
  }

  return path
}

// Normalize an id
// normalize("path/to/a") ==> "path/to/a.js"
// NOTICE: substring is faster than negative slice and RegExp
function normalize(path) {
  var last = path.length - 1
  var lastC = path.charCodeAt(last)

  // If the uri ends with `#`, just return it without '#'
  if (lastC === 35 /* "#" */) {
    return path.substring(0, last)
  }

  return (path.substring(last - 2) === ".js" ||
      path.indexOf("?") > 0 ||
      lastC === 47 /* "/" */) ? path : path + ".js"
}


var PATHS_RE = /^([^/:]+)(\/.+)$/
var VARS_RE = /{([^{]+)}/g

function parseAlias(id) {
  var alias = data.alias
  return alias && isString(alias[id]) ? alias[id] : id
}

function parsePaths(id) {
  var paths = data.paths
  var m

  if (paths && (m = id.match(PATHS_RE)) && isString(paths[m[1]])) {
    id = paths[m[1]] + m[2]
  }

  return id
}

function parseVars(id) {
  var vars = data.vars

  if (vars && id.indexOf("{") > -1) {
    id = id.replace(VARS_RE, function(m, key) {
      return isString(vars[key]) ? vars[key] : m
    })
  }

  return id
}

function parseMap(uri) {
  var map = data.map
  var ret = uri

  if (map) {
    for (var i = 0, len = map.length; i < len; i++) {
      var rule = map[i]

      ret = isFunction(rule) ?
          (rule(uri) || uri) :
          uri.replace(rule[0], rule[1])

      // Only apply the first matched rule
      if (ret !== uri) break
    }
  }

  return ret
}


var ABSOLUTE_RE = /^\/\/.|:\//
var ROOT_DIR_RE = /^.*?\/\/.*?\//

function addBase(id, refUri) {
  var ret
  var first = id.charCodeAt(0)

  // Absolute
  if (ABSOLUTE_RE.test(id)) {
    ret = id
  }
  // Relative
  else if (first === 46 /* "." */) {
    ret = (refUri ? dirname(refUri) : data.cwd) + id
  }
  // Root
  else if (first === 47 /* "/" */) {
    var m = data.cwd.match(ROOT_DIR_RE)
    ret = m ? m[0] + id.substring(1) : id
  }
  // Top-level
  else {
    ret = data.base + id
  }

  // Add default protocol when uri begins with "//"
  if (ret.indexOf("//") === 0) {
    ret = location.protocol + ret
  }

  return realpath(ret)
}

function id2Uri(id, refUri) {
  if (!id) return ""

  id = parseAlias(id)
  id = parsePaths(id)
  id = parseAlias(id)
  id = parseVars(id)
  id = parseAlias(id)
  id = normalize(id)
  id = parseAlias(id)

  var uri = addBase(id, refUri)
  uri = parseAlias(uri)
  uri = parseMap(uri)

  return uri
}

// For Developers
seajs.resolve = id2Uri;

// Check environment
var isWebWorker = typeof window === 'undefined' && typeof importScripts !== 'undefined' && isFunction(importScripts);

// Ignore about:xxx and blob:xxx
var IGNORE_LOCATION_RE = /^(about|blob):/;
var loaderDir;
// Sea.js's full path
var loaderPath;
// Location is read-only from web worker, should be ok though
var cwd = (!location.href || IGNORE_LOCATION_RE.test(location.href)) ? '' : dirname(location.href);

if (isWebWorker) {
  // Web worker doesn't create DOM object when loading scripts
  // Get sea.js's path by stack trace.
  var stack;
  try {
    var up = new Error();
    throw up;
  } catch (e) {
    // IE won't set Error.stack until thrown
    stack = e.stack.split('\n');
  }
  // First line is 'Error'
  stack.shift();

  var m;
  // Try match `url:row:col` from stack trace line. Known formats:
  // Chrome:  '    at http://localhost:8000/script/sea-worker-debug.js:294:25'
  // FireFox: '@http://localhost:8000/script/sea-worker-debug.js:1082:1'
  // IE11:    '   at Anonymous function (http://localhost:8000/script/sea-worker-debug.js:295:5)'
  // Don't care about older browsers since web worker is an HTML5 feature
  var TRACE_RE = /.*?((?:http|https|file)(?::\/{2}[\w]+)(?:[\/|\.]?)(?:[^\s"]*)).*?/i
  // Try match `url` (Note: in IE there will be a tailing ')')
  var URL_RE = /(.*?):\d+:\d+\)?$/;
  // Find url of from stack trace.
  // Cannot simply read the first one because sometimes we will get:
  // Error
  //  at Error (native) <- Here's your problem
  //  at http://localhost:8000/_site/dist/sea.js:2:4334 <- What we want
  //  at http://localhost:8000/_site/dist/sea.js:2:8386
  //  at http://localhost:8000/_site/tests/specs/web-worker/worker.js:3:1
  while (stack.length > 0) {
    var top = stack.shift();
    m = TRACE_RE.exec(top);
    if (m != null) {
      break;
    }
  }
  var url;
  if (m != null) {
    // Remove line number and column number
    // No need to check, can't be wrong at this point
    var url = URL_RE.exec(m[1])[1];
  }
  // Set
  loaderPath = url
  // Set loaderDir
  loaderDir = dirname(url || cwd);
  // This happens with inline worker.
  // When entrance script's location.href is a blob url,
  // cwd will not be available.
  // Fall back to loaderDir.
  if (cwd === '') {
    cwd = loaderDir;
  }
}
else {
  var doc = document
  var scripts = doc.scripts

  // Recommend to add `seajsnode` id for the `sea.js` script element
  var loaderScript = doc.getElementById("seajsnode") ||
    scripts[scripts.length - 1]

  function getScriptAbsoluteSrc(node) {
    return node.hasAttribute ? // non-IE6/7
      node.src :
      // see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
      node.getAttribute("src", 4)
  }
  loaderPath = getScriptAbsoluteSrc(loaderScript)
  // When `sea.js` is inline, set loaderDir to current working directory
  loaderDir = dirname(loaderPath || cwd)
}

/**
 * util-request.js - The utilities for requesting script and style files
 * ref: tests/research/load-js-css/test.html
 */
if (isWebWorker) {
  function requestFromWebWorker(url, callback, charset) {
    // Load with importScripts
    var error;
    try {
      importScripts(url);
    } catch (e) {
      error = e;
    }
    callback(error);
  }
  // For Developers
  seajs.request = requestFromWebWorker;
}
else {
  var doc = document
  var head = doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement
  var baseElement = head.getElementsByTagName("base")[0]

  var currentlyAddingScript

  function request(url, callback, charset) {
    var node = doc.createElement("script")

    if (charset) {
      var cs = isFunction(charset) ? charset(url) : charset
      if (cs) {
        node.charset = cs
      }
    }

    addOnload(node, callback, url)

    node.async = true
    node.src = url

    // For some cache cases in IE 6-8, the script executes IMMEDIATELY after
    // the end of the insert execution, so use `currentlyAddingScript` to
    // hold current node, for deriving url in `define` call
    currentlyAddingScript = node

    // ref: #185 & http://dev.jquery.com/ticket/2709
    baseElement ?
        head.insertBefore(node, baseElement) :
        head.appendChild(node)

    currentlyAddingScript = null
  }

  function addOnload(node, callback, url) {
    var supportOnload = "onload" in node

    if (supportOnload) {
      node.onload = onload
      node.onerror = function() {
        emit("error", { uri: url, node: node })
        onload(true)
      }
    }
    else {
      node.onreadystatechange = function() {
        if (/loaded|complete/.test(node.readyState)) {
          onload()
        }
      }
    }

    function onload(error) {
      // Ensure only run once and handle memory leak in IE
      node.onload = node.onerror = node.onreadystatechange = null

      // Remove the script to reduce memory leak
      if (!data.debug) {
        head.removeChild(node)
      }

      // Dereference the node
      node = null

      callback(error)
    }
  }

  // For Developers
  seajs.request = request

}
var interactiveScript

function getCurrentScript() {
  if (currentlyAddingScript) {
    return currentlyAddingScript
  }

  // For IE6-9 browsers, the script onload event may not fire right
  // after the script is evaluated. Kris Zyp found that it
  // could query the script nodes and the one that is in "interactive"
  // mode indicates the current script
  // ref: http://goo.gl/JHfFW
  if (interactiveScript && interactiveScript.readyState === "interactive") {
    return interactiveScript
  }

  var scripts = head.getElementsByTagName("script")

  for (var i = scripts.length - 1; i >= 0; i--) {
    var script = scripts[i]
    if (script.readyState === "interactive") {
      interactiveScript = script
      return interactiveScript
    }
  }
}

/**
 * util-deps.js - The parser for dependencies
 * ref: tests/research/parse-dependencies/test.html
 * ref: https://github.com/seajs/searequire
 */

function parseDependencies(s) {
  if(s.indexOf('require') == -1) {
    return []
  }
  var index = 0, peek, length = s.length, isReg = 1, modName = 0, parentheseState = 0, parentheseStack = [], res = []
  while(index < length) {
    readch()
    if(isBlank()) {
    }
    else if(isQuote()) {
      dealQuote()
      isReg = 1
    }
    else if(peek == '/') {
      readch()
      if(peek == '/') {
        index = s.indexOf('\n', index)
        if(index == -1) {
          index = s.length
        }
      }
      else if(peek == '*') {
        index = s.indexOf('*/', index)
        if(index == -1) {
          index = length
        }
        else {
          index += 2
        }
      }
      else if(isReg) {
        dealReg()
        isReg = 0
      }
      else {
        index--
        isReg = 1
      }
    }
    else if(isWord()) {
      dealWord()
    }
    else if(isNumber()) {
      dealNumber()
    }
    else if(peek == '(') {
      parentheseStack.push(parentheseState)
      isReg = 1
    }
    else if(peek == ')') {
      isReg = parentheseStack.pop()
    }
    else {
      isReg = peek != ']'
      modName = 0
    }
  }
  return res
  function readch() {
    peek = s.charAt(index++)
  }
  function isBlank() {
    return /\s/.test(peek)
  }
  function isQuote() {
    return peek == '"' || peek == "'"
  }
  function dealQuote() {
    var start = index
    var c = peek
    var end = s.indexOf(c, start)
    if(end == -1) {
      index = length
    }
    else if(s.charAt(end - 1) != '\\') {
      index = end + 1
    }
    else {
      while(index < length) {
        readch()
        if(peek == '\\') {
          index++
        }
        else if(peek == c) {
          break
        }
      }
    }
    if(modName) {
      res.push(s.slice(start, index - 1))
      modName = 0
    }
  }
  function dealReg() {
    index--
    while(index < length) {
      readch()
      if(peek == '\\') {
        index++
      }
      else if(peek == '/') {
        break
      }
      else if(peek == '[') {
        while(index < length) {
          readch()
          if(peek == '\\') {
            index++
          }
          else if(peek == ']') {
            break
          }
        }
      }
    }
  }
  function isWord() {
    return /[a-z_$]/i.test(peek)
  }
  function dealWord() {
    var s2 = s.slice(index - 1)
    var r = /^[\w$]+/.exec(s2)[0]
    parentheseState = {
      'if': 1,
      'for': 1,
      'while': 1,
      'with': 1
    }[r]
    isReg = {
      'break': 1,
      'case': 1,
      'continue': 1,
      'debugger': 1,
      'delete': 1,
      'do': 1,
      'else': 1,
      'false': 1,
      'if': 1,
      'in': 1,
      'instanceof': 1,
      'return': 1,
      'typeof': 1,
      'void': 1
    }[r]
    modName = /^require\s*\(\s*(['"]).+?\1\s*\)/.test(s2)
    if(modName) {
      r = /^require\s*\(\s*['"]/.exec(s2)[0]
      index += r.length - 2
    }
    else {
      index += /^[\w$]+(?:\s*\.\s*[\w$]+)*/.exec(s2)[0].length - 1
    }
  }
  function isNumber() {
    return /\d/.test(peek)
      || peek == '.' && /\d/.test(s.charAt(index))
  }
  function dealNumber() {
    var s2 = s.slice(index - 1)
    var r
    if(peek == '.') {
      r = /^\.\d+(?:E[+-]?\d*)?\s*/i.exec(s2)[0]
    }
    else if(/^0x[\da-f]*/i.test(s2)) {
      r = /^0x[\da-f]*\s*/i.exec(s2)[0]
    }
    else {
      r = /^\d+\.?\d*(?:E[+-]?\d*)?\s*/i.exec(s2)[0]
    }
    index += r.length - 1
    isReg = 0
  }
}
/**
 * module.js - The core of module loader
 */

var cachedMods = seajs.cache = {}
var anonymousMeta

var fetchingList = {}
var fetchedList = {}
var callbackList = {}

var STATUS = Module.STATUS = {
  // 1 - The `module.uri` is being fetched
  FETCHING: 1,
  // 2 - The meta data has been saved to cachedMods
  SAVED: 2,
  // 3 - The `module.dependencies` are being loaded
  LOADING: 3,
  // 4 - The module are ready to execute
  LOADED: 4,
  // 5 - The module is being executed
  EXECUTING: 5,
  // 6 - The `module.exports` is available
  EXECUTED: 6,
  // 7 - 404
  ERROR: 7
}


function Module(uri, deps) {
  this.uri = uri
  this.dependencies = deps || []
  this.deps = {} // Ref the dependence modules
  this.status = 0

  this._entry = []
}

// Resolve module.dependencies
Module.prototype.resolve = function() {
  var mod = this
  var ids = mod.dependencies
  var uris = []

  for (var i = 0, len = ids.length; i < len; i++) {
    uris[i] = Module.resolve(ids[i], mod.uri)
  }
  return uris
}

Module.prototype.pass = function() {
  var mod = this

  var len = mod.dependencies.length

  for (var i = 0; i < mod._entry.length; i++) {
    var entry = mod._entry[i]
    var count = 0
    for (var j = 0; j < len; j++) {
      var m = mod.deps[mod.dependencies[j]]
      // If the module is unload and unused in the entry, pass entry to it
      if (m.status < STATUS.LOADED && !entry.history.hasOwnProperty(m.uri)) {
        entry.history[m.uri] = true
        count++
        m._entry.push(entry)
        if(m.status === STATUS.LOADING) {
          m.pass()
        }
      }
    }
    // If has passed the entry to it's dependencies, modify the entry's count and del it in the module
    if (count > 0) {
      entry.remain += count - 1
      mod._entry.shift()
      i--
    }
  }
}

// Load module.dependencies and fire onload when all done
Module.prototype.load = function() {
  var mod = this

  // If the module is being loaded, just wait it onload call
  if (mod.status >= STATUS.LOADING) {
    return
  }

  mod.status = STATUS.LOADING

  // Emit `load` event for plugins such as combo plugin
  var uris = mod.resolve()
  emit("load", uris)

  for (var i = 0, len = uris.length; i < len; i++) {
    mod.deps[mod.dependencies[i]] = Module.get(uris[i])
  }

  // Pass entry to it's dependencies
  mod.pass()

  // If module has entries not be passed, call onload
  if (mod._entry.length) {
    mod.onload()
    return
  }

  // Begin parallel loading
  var requestCache = {}
  var m

  for (i = 0; i < len; i++) {
    m = cachedMods[uris[i]]

    if (m.status < STATUS.FETCHING) {
      m.fetch(requestCache)
    }
    else if (m.status === STATUS.SAVED) {
      m.load()
    }
  }

  // Send all requests at last to avoid cache bug in IE6-9. Issues#808
  for (var requestUri in requestCache) {
    if (requestCache.hasOwnProperty(requestUri)) {
      requestCache[requestUri]()
    }
  }
}

// Call this method when module is loaded
Module.prototype.onload = function() {
  var mod = this
  mod.status = STATUS.LOADED

  // When sometimes cached in IE, exec will occur before onload, make sure len is an number
  for (var i = 0, len = (mod._entry || []).length; i < len; i++) {
    var entry = mod._entry[i]
    if (--entry.remain === 0) {
      entry.callback()
    }
  }

  delete mod._entry
}

// Call this method when module is 404
Module.prototype.error = function() {
  var mod = this
  mod.onload()
  mod.status = STATUS.ERROR
}

// Execute a module
Module.prototype.exec = function () {
  var mod = this

  // When module is executed, DO NOT execute it again. When module
  // is being executed, just return `module.exports` too, for avoiding
  // circularly calling
  if (mod.status >= STATUS.EXECUTING) {
    return mod.exports
  }

  mod.status = STATUS.EXECUTING

  if (mod._entry && !mod._entry.length) {
    delete mod._entry
  }

  //non-cmd module has no property factory and exports
  if (!mod.hasOwnProperty('factory')) {
    mod.non = true
    return
  }

  // Create require
  var uri = mod.uri

  function require(id) {
    var m = mod.deps[id] || Module.get(require.resolve(id))
    if (m.status == STATUS.ERROR) {
      throw new Error('module was broken: ' + m.uri);
    }
    return m.exec()
  }

  require.resolve = function(id) {
    return Module.resolve(id, uri)
  }

  require.async = function(ids, callback) {
    Module.use(ids, callback, uri + "_async_" + cid())
    return require
  }

  // Exec factory
  var factory = mod.factory

  var exports = isFunction(factory) ?
    factory(require, mod.exports = {}, mod) :
    factory

  if (exports === undefined) {
    exports = mod.exports
  }

  // Reduce memory leak
  delete mod.factory

  mod.exports = exports
  mod.status = STATUS.EXECUTED

  // Emit `exec` event
  emit("exec", mod)

  return mod.exports
}

// Fetch a module
Module.prototype.fetch = function(requestCache) {
  var mod = this
  var uri = mod.uri

  mod.status = STATUS.FETCHING

  // Emit `fetch` event for plugins such as combo plugin
  var emitData = { uri: uri }
  emit("fetch", emitData)
  var requestUri = emitData.requestUri || uri

  // Empty uri or a non-CMD module
  if (!requestUri || fetchedList.hasOwnProperty(requestUri)) {
    mod.load()
    return
  }

  if (fetchingList.hasOwnProperty(requestUri)) {
    callbackList[requestUri].push(mod)
    return
  }

  fetchingList[requestUri] = true
  callbackList[requestUri] = [mod]

  // Emit `request` event for plugins such as text plugin
  emit("request", emitData = {
    uri: uri,
    requestUri: requestUri,
    onRequest: onRequest,
    charset: isFunction(data.charset) ? data.charset(requestUri) || 'utf-8' : data.charset
  })

  if (!emitData.requested) {
    requestCache ?
      requestCache[emitData.requestUri] = sendRequest :
      sendRequest()
  }

  function sendRequest() {
    seajs.request(emitData.requestUri, emitData.onRequest, emitData.charset)
  }

  function onRequest(error) {
    delete fetchingList[requestUri]
    fetchedList[requestUri] = true

    // Save meta data of anonymous module
    if (anonymousMeta) {
      Module.save(uri, anonymousMeta)
      anonymousMeta = null
    }

    // Call callbacks
    var m, mods = callbackList[requestUri]
    delete callbackList[requestUri]
    while ((m = mods.shift())) {
      // When 404 occurs, the params error will be true
      if(error === true) {
        m.error()
      }
      else {
        m.load()
      }
    }
  }
}

// Resolve id to uri
Module.resolve = function(id, refUri) {
  // Emit `resolve` event for plugins such as text plugin
  var emitData = { id: id, refUri: refUri }
  emit("resolve", emitData)

  return emitData.uri || seajs.resolve(emitData.id, refUri)
}

// Define a module
Module.define = function (id, deps, factory) {
  var argsLen = arguments.length

  // define(factory)
  if (argsLen === 1) {
    factory = id
    id = undefined
  }
  else if (argsLen === 2) {
    factory = deps

    // define(deps, factory)
    if (isArray(id)) {
      deps = id
      id = undefined
    }
    // define(id, factory)
    else {
      deps = undefined
    }
  }

  // Parse dependencies according to the module factory code
  if (!isArray(deps) && isFunction(factory)) {
    deps = typeof parseDependencies === "undefined" ? [] : parseDependencies(factory.toString())
  }

  var meta = {
    id: id,
    uri: Module.resolve(id),
    deps: deps,
    factory: factory
  }

  // Try to derive uri in IE6-9 for anonymous modules
  if (!isWebWorker && !meta.uri && doc.attachEvent && typeof getCurrentScript !== "undefined") {
    var script = getCurrentScript()

    if (script) {
      meta.uri = script.src
    }

    // NOTE: If the id-deriving methods above is failed, then falls back
    // to use onload event to get the uri
  }

  // Emit `define` event, used in nocache plugin, seajs node version etc
  emit("define", meta)

  meta.uri ? Module.save(meta.uri, meta) :
    // Save information for "saving" work in the script onload event
    anonymousMeta = meta
}

// Save meta data to cachedMods
Module.save = function(uri, meta) {
  var mod = Module.get(uri)

  // Do NOT override already saved modules
  if (mod.status < STATUS.SAVED) {
    mod.id = meta.id || uri
    mod.dependencies = meta.deps || []
    mod.factory = meta.factory
    mod.status = STATUS.SAVED

    emit("save", mod)
  }
}

// Get an existed module or create a new one
Module.get = function(uri, deps) {
  return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
}

// Use function is equal to load a anonymous module
Module.use = function (ids, callback, uri) {
  var mod = Module.get(uri, isArray(ids) ? ids : [ids])

  mod._entry.push(mod)
  mod.history = {}
  mod.remain = 1

  mod.callback = function() {
    var exports = []
    var uris = mod.resolve()

    for (var i = 0, len = uris.length; i < len; i++) {
      exports[i] = cachedMods[uris[i]].exec()
    }

    if (callback) {
      callback.apply(global, exports)
    }

    delete mod.callback
    delete mod.history
    delete mod.remain
    delete mod._entry
  }

  mod.load()
}


// Public API

seajs.use = function(ids, callback) {
  Module.use(ids, callback, data.cwd + "_use_" + cid())
  return seajs
}

Module.define.cmd = {}
global.define = Module.define


// For Developers

seajs.Module = Module
data.fetchedList = fetchedList
data.cid = cid

seajs.require = function(id) {
  var mod = Module.get(Module.resolve(id))
  if (mod.status < STATUS.EXECUTING) {
    mod.onload()
    mod.exec()
  }
  return mod.exports
}

/**
 * config.js - The configuration for the loader
 */

// The root path to use for id2uri parsing
data.base = loaderDir

// The loader directory
data.dir = loaderDir

// The loader's full path
data.loader = loaderPath

// The current working directory
data.cwd = cwd

// The charset for requesting files
data.charset = "utf-8"

// data.alias - An object containing shorthands of module id
// data.paths - An object containing path shorthands in module id
// data.vars - The {xxx} variables in module id
// data.map - An array containing rules to map module uri
// data.debug - Debug mode. The default value is false

seajs.config = function(configData) {

  for (var key in configData) {
    var curr = configData[key]
    var prev = data[key]

    // Merge object config such as alias, vars
    if (prev && isObject(prev)) {
      for (var k in curr) {
        prev[k] = curr[k]
      }
    }
    else {
      // Concat array config such as map
      if (isArray(prev)) {
        curr = prev.concat(curr)
      }
      // Make sure that `data.base` is an absolute path
      else if (key === "base") {
        // Make sure end with "/"
        if (curr.slice(-1) !== "/") {
          curr += "/"
        }
        curr = addBase(curr)
      }

      // Set config
      data[key] = curr
    }
  }

  emit("config", configData)
  return seajs
}

})(this);

;/*!/src/static/lib/js/third/zepto.js*/
/* Zepto v1.0-1-ga3cab6c - polyfill zepto detect event ajax form fx - zeptojs.com/license */
/**
 * @external $
 */
;(function(undefined){
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){ return this.replace(/^\s+|\s+$/g, '') }

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) throw new TypeError()
      var t = Object(this), len = t.length >>> 0, k = 0, accumulator
      if(typeof fun != 'function') throw new TypeError()
      if(len == 0 && arguments.length == 1) throw new TypeError()

      if(arguments.length >= 2)
       accumulator = arguments[1]
      else
        do{
          if(k in t){
            accumulator = t[k++]
            break
          }
          if(++k >= len) throw new TypeError()
        } while (true)

      while (k < len){
        if(k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
        k++
      }
      return accumulator
    }

})()

var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], slice = emptyArray.slice, filter = emptyArray.filter,
    document = window.document,
    elementDisplay = {}, classCache = {},
    getComputedStyle = document.defaultView.getComputedStyle,
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,
    tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    rootNodeRE = /^(?:body|html)$/i,

    // special attributes that should be get/set via method calls
    methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]*)$/,
    tagSelectorRE = /^[\w-]+$/,
    class2type = {},
    toString = class2type.toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div')

  zepto.matches = function(element, selector) {
    if (!element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function type(obj) {
    return obj == null ? String(obj) :
      class2type[toString.call(obj)] || "object"
  }

  function isFunction(value) { return type(value) == "function" }
  function isWindow(obj)     { return obj != null && obj == obj.window }
  function isDocument(obj)   { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }
  function isObject(obj)     { return type(obj) == "object" }
  function isPlainObject(obj) {
    return isObject(obj) && !isWindow(obj) && obj.__proto__ == Object.prototype
  }
  function isArray(value) { return value instanceof Array }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return filter.call(array, function(item){ return item != null }) }
  function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return filter.call(array, function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  function children(element) {
    return 'children' in element ?
      slice.call(element.children) :
      $.map(element.childNodes, function(node){ if (node.nodeType == 1) return node })
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overriden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name, properties) {
    if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    if (!(name in containers)) name = '*'

    var nodes, dom, container = containers[name]
    container.innerHTML = '' + html
    dom = $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
    if (isPlainObject(properties)) {
      nodes = $(dom)
      $.each(properties, function(key, value) {
        if (methodAttributes.indexOf(key) > -1) nodes[key](value)
        else nodes.attr(key, value)
      })
    }
    return dom
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. Note that `__proto__` is not supported on Internet
  // Explorer. This method can be overriden in plugins.
  zepto.Z = function(dom, selector) {
    dom = dom || []
    dom.__proto__ = $.fn
    dom.selector = selector || ''
    return dom
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overriden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overriden in plugins.
  zepto.init = function(selector, context) {
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, juts return it
    else if (zepto.isZ(selector)) return selector
    else {
      var dom
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // Wrap DOM nodes. If a plain object is given, duplicate it.
      else if (isObject(selector))
        dom = [isPlainObject(selector) ? $.extend({}, selector) : selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
      // create a new Zepto collection from the nodes found
      return zepto.Z(dom, selector)
    }
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, which makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  function extend(target, source, deep) {
    for (key in source)
      if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
        if (isPlainObject(source[key]) && !isPlainObject(target[key]))
          target[key] = {}
        if (isArray(source[key]) && !isArray(target[key]))
          target[key] = []
        extend(target[key], source[key], deep)
      }
      else if (source[key] !== undefined) target[key] = source[key]
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    var deep, args = slice.call(arguments, 1)
    if (typeof target == 'boolean') {
      deep = target
      target = args.shift()
    }
    args.forEach(function(arg){ extend(target, arg, deep) })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overriden in plugins.
  zepto.qsa = function(element, selector){
    var found
    return (isDocument(element) && idSelectorRE.test(selector)) ?
      ( (found = element.getElementById(RegExp.$1)) ? [found] : [] ) :
      (element.nodeType !== 1 && element.nodeType !== 9) ? [] :
      slice.call(
        classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
        tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
        element.querySelectorAll(selector)
      )
  }

  function filtered(nodes, selector) {
    return selector === undefined ? $(nodes) : $(nodes).filter(selector)
  }

  $.contains = function(parent, node) {
    return parent !== node && parent.contains(node)
  }

  function funcArg(context, arg, idx, payload) {
    return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  function setAttribute(node, name, value) {
    value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
  }

  // access className property while respecting SVGAnimatedString
  function className(node, value){
    var klass = node.className,
        svg   = klass && klass.baseVal !== undefined

    if (value === undefined) return svg ? klass.baseVal : klass
    svg ? (klass.baseVal = value) : (node.className = value)
  }

  // "true"  => true
  // "false" => false
  // "null"  => null
  // "42"    => 42
  // "42.5"  => 42.5
  // JSON    => parse if valid
  // String  => self
  function deserializeValue(value) {
    var num
    try {
      return value ?
        value == "true" ||
        ( value == "false" ? false :
          value == "null" ? null :
          !isNaN(num = Number(value)) ? num :
          /^[\[\{]/.test(value) ? $.parseJSON(value) :
          value )
        : value
    } catch(e) {
      return value
    }
  }

  $.type = type
  $.isFunction = isFunction
  $.isWindow = isWindow
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.isEmptyObject = function(obj) {
    var name
    for (name in obj) return false
    return true
  }

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.camelCase = camelize
  $.trim = function(str) { return str.trim() }

  // plugin compatibility
  $.uuid = 0
  $.support = { }
  $.expr = { }

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  $.grep = function(elements, callback){
    return filter.call(elements, callback)
  }

  if (window.JSON) $.parseJSON = JSON.parse

  // Populate the class2type map
  $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
    class2type[ "[object " + name + "]" ] = name.toLowerCase()
  })

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    sort: emptyArray.sort,
    indexOf: emptyArray.indexOf,
    concat: emptyArray.concat,

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $($.map(this, function(el, i){ return fn.call(el, i, el) }))
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      if (readyRE.test(document.readyState)) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      emptyArray.every.call(this, function(el, idx){
        return callback.call(el, idx, el) !== false
      })
      return this
    },
    filter: function(selector){
      if (isFunction(selector)) return this.not(this.not(selector))
      return $(filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    has: function(selector){
      return this.filter(function(){
        return isObject(selector) ?
          $.contains(this, selector) :
          $(this).find(selector).size()
      })
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result, $this = this
      if (typeof selector == 'object')
        result = $(selector).filter(function(){
          var node = this
          return emptyArray.some.call($this, function(parent){
            return $.contains(parent, node)
          })
        })
      else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return result
    },
    closest: function(selector, context){
      var node = this[0], collection = false
      if (typeof selector == 'object') collection = $(selector)
      while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
        node = node !== context && !isDocument(node) && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return children(this) }), selector)
    },
    contents: function() {
      return this.map(function() { return slice.call(this.childNodes) })
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return filter.call(children(el.parentNode), function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return $.map(this, function(el){ return el[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = null)
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(structure){
      var func = isFunction(structure)
      if (this[0] && !func)
        var dom   = $(structure).get(0),
            clone = dom.parentNode || this.length > 1

      return this.each(function(index){
        $(this).wrapAll(
          func ? structure.call(this, index) :
            clone ? dom.cloneNode(true) : dom
        )
      })
    },
    wrapAll: function(structure){
      if (this[0]) {
        $(this[0]).before(structure = $(structure))
        var children
        // drill down to the inmost element
        while ((children = structure.children()).length) structure = children.first()
        $(structure).append(this)
      }
      return this
    },
    wrapInner: function(structure){
      var func = isFunction(structure)
      return this.each(function(index){
        var self = $(this), contents = self.contents(),
            dom  = func ? structure.call(this, index) : structure
        contents.length ? contents.wrapAll(dom) : self.append(dom)
      })
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return this.map(function(){ return this.cloneNode(true) })
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return this.each(function(){
        var el = $(this)
        ;(setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
      })
    },
    prev: function(selector){ return $(this.pluck('previousElementSibling')).filter(selector || '*') },
    next: function(selector){ return $(this.pluck('nextElementSibling')).filter(selector || '*') },
    html: function(html){
      return html === undefined ?
        (this.length > 0 ? this[0].innerHTML : null) :
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        })
    },
    text: function(text){
      return text === undefined ?
        (this.length > 0 ? this[0].textContent : null) :
        this.each(function(){ this.textContent = text })
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && value === undefined) ?
        (this.length == 0 || this[0].nodeType !== 1 ? undefined :
          (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
          else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ this.nodeType === 1 && setAttribute(this, name) })
    },
    prop: function(name, value){
      return (value === undefined) ?
        (this[0] && this[0][name]) :
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        })
    },
    data: function(name, value){
      var data = this.attr('data-' + dasherize(name), value)
      return data !== null ? deserializeValue(data) : undefined
    },
    val: function(value){
      return (value === undefined) ?
        (this[0] && (this[0].multiple ?
           $(this[0]).find('option').filter(function(o){ return this.selected }).pluck('value') :
           this[0].value)
        ) :
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
    },
    offset: function(coordinates){
      if (coordinates) return this.each(function(index){
        var $this = $(this),
            coords = funcArg(this, coordinates, index, $this.offset()),
            parentOffset = $this.offsetParent().offset(),
            props = {
              top:  coords.top  - parentOffset.top,
              left: coords.left - parentOffset.left
            }

        if ($this.css('position') == 'static') props['position'] = 'relative'
        $this.css(props)
      })
      if (this.length==0) return null
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: Math.round(obj.width),
        height: Math.round(obj.height)
      }
    },
    css: function(property, value){
      if (arguments.length < 2 && typeof property == 'string')
        return this[0] && (this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

      var css = ''
      if (type(property) == 'string') {
        if (!value && value !== 0)
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)
      } else {
        for (key in property)
          if (!property[key] && property[key] !== 0)
            this.each(function(){ this.style.removeProperty(dasherize(key)) })
          else
            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
      }

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      return emptyArray.some.call(this, function(el){
        return this.test(className(el))
      }, classRE(name))
    },
    addClass: function(name){
      return this.each(function(idx){
        classList = []
        var cls = className(this), newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (name === undefined) return className(this, '')
        classList = className(this)
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        className(this, classList.trim())
      })
    },
    toggleClass: function(name, when){
      return this.each(function(idx){
        var $this = $(this), names = funcArg(this, name, idx, className(this))
        names.split(/\s+/g).forEach(function(klass){
          (when === undefined ? !$this.hasClass(klass) : when) ?
            $this.addClass(klass) : $this.removeClass(klass)
        })
      })
    },
    scrollTop: function(){
      if (!this.length) return
      return ('scrollTop' in this[0]) ? this[0].scrollTop : this[0].scrollY
    },
    position: function() {
      if (!this.length) return

      var elem = this[0],
        // Get *real* offsetParent
        offsetParent = this.offsetParent(),
        // Get correct offsets
        offset       = this.offset(),
        parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

      // Subtract element margins
      // note: when an element has margin: auto the offsetLeft and marginLeft
      // are the same in Safari causing offset.left to incorrectly be 0
      offset.top  -= parseFloat( $(elem).css('margin-top') ) || 0
      offset.left -= parseFloat( $(elem).css('margin-left') ) || 0

      // Add offsetParent borders
      parentOffset.top  += parseFloat( $(offsetParent[0]).css('border-top-width') ) || 0
      parentOffset.left += parseFloat( $(offsetParent[0]).css('border-left-width') ) || 0

      // Subtract the two offsets
      return {
        top:  offset.top  - parentOffset.top,
        left: offset.left - parentOffset.left
      }
    },
    offsetParent: function() {
      return this.map(function(){
        var parent = this.offsetParent || document.body
        while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
          parent = parent.offsetParent
        return parent
      })
    }
  }

  // for now
  $.fn.detach = $.fn.remove

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    $.fn[dimension] = function(value){
      var offset, el = this[0],
        Dimension = dimension.replace(/./, function(m){ return m[0].toUpperCase() })
      if (value === undefined) return isWindow(el) ? el['inner' + Dimension] :
        isDocument(el) ? el.documentElement['offset' + Dimension] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function traverseNode(node, fun) {
    fun(node)
    for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(operator, operatorIndex) {
    var inside = operatorIndex % 2 //=> prepend, append

    $.fn[operator] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var argType, nodes = $.map(arguments, function(arg) {
            argType = type(arg)
            return argType == "object" || argType == "array" || arg == null ?
              arg : zepto.fragment(arg)
          }),
          parent, copyByClone = this.length > 1
      if (nodes.length < 1) return this

      return this.each(function(_, target){
        parent = inside ? target : target.parentNode

        // convert all methods to a "before" operation
        target = operatorIndex == 0 ? target.nextSibling :
                 operatorIndex == 1 ? target.firstChild :
                 operatorIndex == 2 ? target :
                 null

        nodes.forEach(function(node){
          if (copyByClone) node = node.cloneNode(true)
          else if (!parent) return $(node).remove()

          traverseNode(parent.insertBefore(node, target), function(el){
            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
               (!el.type || el.type === 'text/javascript') && !el.src)
              window['eval'].call(window, el.innerHTML)
          })
        })
      })
    }

    // after    => insertAfter
    // prepend  => prependTo
    // before   => insertBefore
    // append   => appendTo
    $.fn[inside ? operator+'To' : 'insert'+(operatorIndex ? 'Before' : 'After')] = function(html){
      $(html)[operator](this)
      return this
    }
  })

  zepto.Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.uniq = uniq
  zepto.deserializeValue = deserializeValue
  $.zepto = zepto

  return $
})()

window.Zepto = Zepto
'$' in window || (window.$ = Zepto)

;(function($){
  function detect(ua){
    var os = this.os = {}, browser = this.browser = {},
      webkit = ua.match(/WebKit\/([\d.]+)/),
      android = ua.match(/(Android)\s+([\d.]+)/),
      ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
      iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
      webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
      touchpad = webos && ua.match(/TouchPad/),
      kindle = ua.match(/Kindle\/([\d.]+)/),
      silk = ua.match(/Silk\/([\d._]+)/),
      blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/),
      bb10 = ua.match(/(BB10).*Version\/([\d.]+)/),
      rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/),
      playbook = ua.match(/PlayBook/),
      chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/),
      firefox = ua.match(/Firefox\/([\d.]+)/)

    // Todo: clean this up with a better OS/browser seperation:
    // - discern (more) between multiple browsers on android
    // - decide if kindle fire in silk mode is android or not
    // - Firefox on Android doesn't specify the Android version
    // - possibly devide in os, device and browser hashes

    if (browser.webkit = !!webkit) browser.version = webkit[1]

    if (android) os.android = true, os.version = android[2]
    if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
    if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
    if (webos) os.webos = true, os.version = webos[2]
    if (touchpad) os.touchpad = true
    if (blackberry) os.blackberry = true, os.version = blackberry[2]
    if (bb10) os.bb10 = true, os.version = bb10[2]
    if (rimtabletos) os.rimtabletos = true, os.version = rimtabletos[2]
    if (playbook) browser.playbook = true
    if (kindle) os.kindle = true, os.version = kindle[1]
    if (silk) browser.silk = true, browser.version = silk[1]
    if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
    if (chrome) browser.chrome = true, browser.version = chrome[1]
    if (firefox) browser.firefox = true, browser.version = firefox[1]

    os.tablet = !!(ipad || playbook || (android && !ua.match(/Mobile/)) || (firefox && ua.match(/Tablet/)))
    os.phone  = !!(!os.tablet && (android || iphone || webos || blackberry || bb10 ||
      (chrome && ua.match(/Android/)) || (chrome && ua.match(/CriOS\/([\d.]+)/)) || (firefox && ua.match(/Mobile/))))
  }

  detect.call($, navigator.userAgent)
  // make available to unit tests
  $.__detect = detect

})(Zepto)

;(function($){
  var $$ = $.zepto.qsa, handlers = {}, _zid = 1, specialEvents={},
      hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eachEvent(events, fn, iterator){
    if ($.type(events) != "string") $.each(events, iterator)
    else events.split(/\s/).forEach(function(type){ iterator(type, fn) })
  }

  function eventCapture(handler, captureSetting) {
    return handler.del &&
      (handler.e == 'focus' || handler.e == 'blur') ||
      !!captureSetting
  }

  function realEvent(type) {
    return hover[type] || type
  }

  function add(element, events, fn, selector, getDelegate, capture){
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    eachEvent(events, fn, function(event, fn){
      var handler   = parse(event)
      handler.fn    = fn
      handler.sel   = selector
      // emulate mouseenter, mouseleave
      if (handler.e in hover) fn = function(e){
        var related = e.relatedTarget
        if (!related || (related !== this && !$.contains(this, related)))
          return handler.fn.apply(this, arguments)
      }
      handler.del   = getDelegate && getDelegate(fn, event)
      var callback  = handler.del || fn
      handler.proxy = function (e) {
        var result = callback.apply(element, [e].concat(e.data))
        if (result === false) e.preventDefault(), e.stopPropagation()
        return result
      }
      handler.i = set.length
      set.push(handler)
      element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
    })
  }
  function remove(element, events, fn, selector, capture){
    var id = zid(element)
    eachEvent(events || '', fn, function(event, fn){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
        element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    if ($.isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (typeof context == 'string') {
      return $.proxy(fn[context], fn)
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, callback){
    return this.each(function(){
      add(this, event, callback)
    })
  }
  $.fn.unbind = function(event, callback){
    return this.each(function(){
      remove(this, event, callback)
    })
  }
  $.fn.one = function(event, callback){
    return this.each(function(i, element){
      add(this, event, callback, null, function(fn, type){
        return function(){
          var result = fn.apply(element, arguments)
          remove(element, type, fn)
          return result
        }
      })
    })
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      ignoreProperties = /^([A-Z]|layer[XY]$)/,
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }
  function createProxy(event) {
    var key, proxy = { originalEvent: event }
    for (key in event)
      if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

    $.each(eventMethods, function(name, predicate) {
      proxy[name] = function(){
        this[predicate] = returnTrue
        return event[name].apply(event, arguments)
      }
      proxy[predicate] = returnFalse
    })
    return proxy
  }

  // emulates the 'defaultPrevented' property for browsers that have none
  function fix(event) {
    if (!('defaultPrevented' in event)) {
      event.defaultPrevented = false
      var prevent = event.preventDefault
      event.preventDefault = function() {
        this.defaultPrevented = true
        prevent.call(this)
      }
    }
  }

  $.fn.delegate = function(selector, event, callback){
    return this.each(function(i, element){
      add(element, event, callback, selector, function(fn){
        return function(e){
          var evt, match = $(e.target).closest(selector, element).get(0)
          if (match) {
            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
            return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
          }
        }
      })
    })
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.bind(event, selector || callback) : this.delegate(selector, event, callback)
  }
  $.fn.off = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.unbind(event, selector || callback) : this.undelegate(selector, event, callback)
  }

  $.fn.trigger = function(event, data){
    if (typeof event == 'string' || $.isPlainObject(event)) event = $.Event(event)
    fix(event)
    event.data = data
    return this.each(function(){
      // items in the collection might not be DOM elements
      // (todo: possibly support events on plain old objects)
      if('dispatchEvent' in this) this.dispatchEvent(event)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, data){
    var e, result
    this.each(function(i, element){
      e = createProxy(typeof event == 'string' ? $.Event(event) : event)
      e.data = data
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback) {
      return callback ?
        this.bind(event, callback) :
        this.trigger(event)
    }
  })

  ;['focus', 'blur'].forEach(function(name) {
    $.fn[name] = function(callback) {
      if (callback) this.bind(name, callback)
      else this.each(function(){
        try { this[name]() }
        catch(e) {}
      })
      return this
    }
  })

  $.Event = function(type, props) {
    if (typeof type != 'string') props = type, type = props.type
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
    event.isDefaultPrevented = function(){ return this.defaultPrevented }
    return event
  }

})(Zepto)

;(function($){
  var jsonpID = 0,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.defaultPrevented
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options){
    if (!('type' in options)) return $.ajax(options)

    var callbackName = 'jsonp' + (++jsonpID),
      script = document.createElement('script'),
      cleanup = function() {
        clearTimeout(abortTimeout)
        $(script).remove()
        delete window[callbackName]
      },
      abort = function(type){
        cleanup()
        // In case of manual abort or timeout, keep an empty function as callback
        // so that the SCRIPT tag that eventually loads won't result in an error.
        if (!type || type == 'timeout') window[callbackName] = empty
        ajaxError(null, type || 'abort', xhr, options)
      },
      xhr = { abort: abort }, abortTimeout

    if (ajaxBeforeSend(xhr, options) === false) {
      abort('abort')
      return false
    }

    window[callbackName] = function(data){
      cleanup()
      ajaxSuccess(data, xhr, options)
    }

    script.onerror = function() { abort('error') }

    script.src = options.url.replace(/=\?/, '=' + callbackName)
    $('head').append(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
      abort('timeout')
    }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    accepts: {
      script: 'text/javascript, application/javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0,
    // Whether data should be serialized to string
    processData: true,
    // Whether the browser should be allowed to cache GET responses
    cache: true,
  }

  function mimeToDataType(mime) {
    if (mime) mime = mime.split(';', 2)[0]
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (options.processData && options.data && $.type(options.data) != "string")
      options.data = $.param(options.data, options.traditional)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data)
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {})
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
      RegExp.$2 != window.location.host

    if (!settings.url) settings.url = window.location.toString()
    serializeData(settings)
    if (settings.cache === false) settings.url = appendQuery(settings.url, '_=' + Date.now())

    var dataType = settings.dataType, hasPlaceholder = /=\?/.test(settings.url)
    if (dataType == 'jsonp' || hasPlaceholder) {
      if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
      return $.ajaxJSONP(settings)
    }

    var mime = settings.accepts[dataType],
        baseHeaders = { },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = settings.xhr(), abortTimeout

    if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
    if (mime) {
      baseHeaders['Accept'] = mime
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
      baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
    settings.headers = $.extend(baseHeaders, settings.headers || {})

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        xhr.onreadystatechange = empty;
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
          result = xhr.responseText

          try {
            // http://perfectionkills.com/global-eval-what-are-the-options/
            if (dataType == 'script')    (1,eval)(result)
            else if (dataType == 'xml')  result = xhr.responseXML
            else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
          } catch (e) { error = e }

          if (error) ajaxError(error, 'parsererror', xhr, settings)
          else ajaxSuccess(result, xhr, settings)
        } else {
          ajaxError(null, xhr.status ? 'error' : 'abort', xhr, settings)
        }
      }
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async)

    for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      return false
    }

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  // handle optional data/success arguments
  function parseArguments(url, data, success, dataType) {
    var hasData = !$.isFunction(data)
    return {
      url:      url,
      data:     hasData  ? data : undefined,
      success:  !hasData ? data : $.isFunction(success) ? success : undefined,
      dataType: hasData  ? dataType || success : success
    }
  }

  $.get = function(url, data, success, dataType){
    return $.ajax(parseArguments.apply(null, arguments))
  }

  $.post = function(url, data, success, dataType){
    var options = parseArguments.apply(null, arguments)
    options.type = 'POST'
    return $.ajax(options)
  }

  $.getJSON = function(url, data, success){
    var options = parseArguments.apply(null, arguments)
    options.dataType = 'json'
    return $.ajax(options)
  }

  $.fn.load = function(url, data, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector,
        options = parseArguments(url, data, success),
        callback = options.success
    if (parts.length > 1) options.url = parts[0], selector = parts[1]
    options.success = function(response){
      self.html(selector ?
        $('<div>').html(response.replace(rscript, "")).find(selector)
        : response)
      callback && callback.apply(self, arguments)
    }
    $.ajax(options)
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var type, array = $.isArray(obj)
    $.each(obj, function(key, value) {
      type = $.type(value)
      if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (type == "array" || (!traditional && type == "object"))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
    serialize(params, obj, traditional)
    return params.join('&').replace(/%20/g, '+')
  }
})(Zepto)

;(function ($) {
  $.fn.serializeArray = function () {
    var result = [], el
    $( Array.prototype.slice.call(this.get(0).elements) ).each(function () {
      el = $(this)
      var type = el.attr('type')
      if (this.nodeName.toLowerCase() != 'fieldset' &&
        !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
        ((type != 'radio' && type != 'checkbox') || this.checked))
        result.push({
          name: el.attr('name'),
          value: el.val()
        })
    })
    return result
  }

  $.fn.serialize = function () {
    var result = []
    this.serializeArray().forEach(function (elm) {
      result.push( encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value) )
    })
    return result.join('&')
  }

  $.fn.submit = function (callback) {
    if (callback) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.defaultPrevented) this.get(0).submit()
    }
    return this
  }

})(Zepto)

;(function($, undefined){
  var prefix = '', eventPrefix, endEventName, endAnimationName,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
    document = window.document, testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    transform,
    transitionProperty, transitionDuration, transitionTiming,
    animationName, animationDuration, animationTiming,
    cssReset = {}

  function dasherize(str) { return downcase(str.replace(/([a-z])([A-Z])/, '$1-$2')) }
  function downcase(str) { return str.toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : downcase(name) }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + downcase(vendor) + '-'
      eventPrefix = event
      return false
    }
  })

  transform = prefix + 'transform'
  cssReset[transitionProperty = prefix + 'transition-property'] =
  cssReset[transitionDuration = prefix + 'transition-duration'] =
  cssReset[transitionTiming   = prefix + 'transition-timing-function'] =
  cssReset[animationName      = prefix + 'animation-name'] =
  cssReset[animationDuration  = prefix + 'animation-duration'] =
  cssReset[animationTiming    = prefix + 'animation-timing-function'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    speeds: { _default: 400, fast: 200, slow: 600 },
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback){
    if ($.isPlainObject(duration))
      ease = duration.easing, callback = duration.complete, duration = duration.duration
    if (duration) duration = (typeof duration == 'number' ? duration :
                    ($.fx.speeds[duration] || $.fx.speeds._default)) / 1000
    return this.anim(properties, duration, ease, callback)
  }

  $.fn.anim = function(properties, duration, ease, callback){
    var key, cssValues = {}, cssProperties, transforms = '',
        that = this, wrappedCallback, endEvent = $.fx.transitionEnd

    if (duration === undefined) duration = 0.4
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssValues[animationName] = properties
      cssValues[animationDuration] = duration + 's'
      cssValues[animationTiming] = (ease || 'linear')
      endEvent = $.fx.animationEnd
    } else {
      cssProperties = []
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) transforms += key + '(' + properties[key] + ') '
        else cssValues[key] = properties[key], cssProperties.push(dasherize(key))

      if (transforms) cssValues[transform] = transforms, cssProperties.push(transform)
      if (duration > 0 && typeof properties === 'object') {
        cssValues[transitionProperty] = cssProperties.join(', ')
        cssValues[transitionDuration] = duration + 's'
        cssValues[transitionTiming] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, wrappedCallback)
      }
      $(this).css(cssReset)
      callback && callback.call(this)
    }
    if (duration > 0) this.bind(endEvent, wrappedCallback)

    // trigger page reflow so new elements can animate
    this.size() && this.get(0).clientLeft

    this.css(cssValues)

    if (duration <= 0) setTimeout(function() {
      that.each(function(){ wrappedCallback.call(this) })
    }, 0)

    return this
  }

  testEl = null
})(Zepto)

;(function($){
  var touch = {},
    touchTimeout, tapTimeout, swipeTimeout, longTapTimeout,
    longTapDelay = 750,
    gesture

  function swipeDirection(x1, x2, y1, y2) {
    return Math.abs(x1 - x2) >=
      Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
  }

  function longTap() {
    longTapTimeout = null
    if (touch.last) {
      touch.el.trigger('longTap')
      touch = {}
    }
  }

  function cancelLongTap() {
    if (longTapTimeout) clearTimeout(longTapTimeout)
    longTapTimeout = null
  }

  function cancelAll() {
    if (touchTimeout) clearTimeout(touchTimeout)
    if (tapTimeout) clearTimeout(tapTimeout)
    if (swipeTimeout) clearTimeout(swipeTimeout)
    if (longTapTimeout) clearTimeout(longTapTimeout)
    touchTimeout = tapTimeout = swipeTimeout = longTapTimeout = null
    touch = {}
  }

  function isPrimaryTouch(event){
    return event.pointerType == event.MSPOINTER_TYPE_TOUCH && event.isPrimary
  }

  $(document).ready(function(){
    var now, delta, deltaX = 0, deltaY = 0, firstTouch

    if ('MSGesture' in window) {
      gesture = new MSGesture()
      gesture.target = document.body
    }

    $(document)
      .bind('MSGestureEnd', function(e){
        var swipeDirectionFromVelocity =
          e.velocityX > 1 ? 'Right' : e.velocityX < -1 ? 'Left' : e.velocityY > 1 ? 'Down' : e.velocityY < -1 ? 'Up' : null;
        if (swipeDirectionFromVelocity) {
          touch.el.trigger('swipe')
          touch.el.trigger('swipe'+ swipeDirectionFromVelocity)
        }
      })
      .on('touchstart MSPointerDown', function(e){
        if(e.type == 'MSPointerDown' && !isPrimaryTouch(e)) return;
        firstTouch = e.type == 'MSPointerDown' ? e : e.touches[0]
        now = Date.now()
        delta = now - (touch.last || now)
        touch.el = $('tagName' in firstTouch.target ?
          firstTouch.target : firstTouch.target.parentNode)
        touchTimeout && clearTimeout(touchTimeout)
        touch.x1 = firstTouch.pageX
        touch.y1 = firstTouch.pageY
        if (delta > 0 && delta <= 250) touch.isDoubleTap = true
        touch.last = now
        longTapTimeout = setTimeout(longTap, longTapDelay)
        // adds the current touch contact for IE gesture recognition
        if (gesture && e.type == 'MSPointerDown') gesture.addPointer(e.pointerId);
      })
      .on('touchmove MSPointerMove', function(e){
        if(e.type == 'MSPointerMove' && !isPrimaryTouch(e)) return;
        firstTouch = e.type == 'MSPointerMove' ? e : e.touches[0]
        cancelLongTap()
        touch.x2 = firstTouch.pageX
        touch.y2 = firstTouch.pageY

        deltaX += Math.abs(touch.x1 - touch.x2)
        deltaY += Math.abs(touch.y1 - touch.y2)
      })
      .on('touchend MSPointerUp', function(e){
        if(e.type == 'MSPointerUp' && !isPrimaryTouch(e)) return;
        cancelLongTap()

        // swipe
        if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
            (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))

          swipeTimeout = setTimeout(function() {
            touch.el.trigger('swipe')
            touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
            touch = {}
          }, 0)

        // normal tap
        else if ('last' in touch)
          // don't fire tap when delta position changed by more than 30 pixels,
          // for instance when moving to a point and back to origin
          if (deltaX < 30 && deltaY < 30) {
            // delay by one tick so we can cancel the 'tap' event if 'scroll' fires
            // ('tap' fires before 'scroll')
            tapTimeout = setTimeout(function() {

              // trigger universal 'tap' with the option to cancelTouch()
              // (cancelTouch cancels processing of single vs double taps for faster 'tap' response)
              var event = $.Event('tap')
              event.cancelTouch = cancelAll
              touch.el.trigger(event)

              // trigger double tap immediately
              if (touch.isDoubleTap) {
                touch.el.trigger('doubleTap')
                touch = {}
              }

              // trigger single tap after 250ms of inactivity
              else {
                touchTimeout = setTimeout(function(){
                  touchTimeout = null
                  touch.el.trigger('singleTap')
                  touch = {}
                }, 250)
              }
            }, 0)
          } else {
            touch = {}
          }
          deltaX = deltaY = 0

      })
      // when the browser window loses focus,
      // for example when a modal dialog is shown,
      // cancel all ongoing events
      .on('touchcancel MSPointerCancel', cancelAll)

    // scrolling the window indicates intention of the user
    // to scroll, not tap or swipe, so cancel all ongoing events
    $(window).on('scroll', cancelAll)
  })

  ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown',
    'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(eventName){
    $.fn[eventName] = function(callback){ return this.on(eventName, callback) }
  })
})(Zepto)

;/*!/src/static/lib/js/third/iscroll.js*/
/*! iScroll v5.1.2 ~ (c) 2008-2014 Matteo Spinelli ~ http://cubiq.org/license */
(function (window, document, Math) {
var rAF = window.requestAnimationFrame	||
	window.webkitRequestAnimationFrame	||
	window.mozRequestAnimationFrame		||
	window.oRequestAnimationFrame		||
	window.msRequestAnimationFrame		||
	function (callback) { window.setTimeout(callback, 1000 / 60); };

var utils = (function () {
	var me = {};

	var _elementStyle = document.createElement('div').style;
	var _vendor = (function () {
		var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
			transform,
			i = 0,
			l = vendors.length;

		for ( ; i < l; i++ ) {
			transform = vendors[i] + 'ransform';
			if ( transform in _elementStyle ) return vendors[i].substr(0, vendors[i].length-1);
		}

		return false;
	})();

	function _prefixStyle (style) {
		if ( _vendor === false ) return false;
		if ( _vendor === '' ) return style;
		return _vendor + style.charAt(0).toUpperCase() + style.substr(1);
	}

	me.getTime = Date.now || function getTime () { return new Date().getTime(); };

	me.extend = function (target, obj) {
		for ( var i in obj ) {
			target[i] = obj[i];
		}
	};

	me.addEvent = function (el, type, fn, capture) {
		el.addEventListener(type, fn, !!capture);
	};

	me.removeEvent = function (el, type, fn, capture) {
		el.removeEventListener(type, fn, !!capture);
	};

	me.prefixPointerEvent = function (pointerEvent) {
		return window.MSPointerEvent ? 
			'MSPointer' + pointerEvent.charAt(9).toUpperCase() + pointerEvent.substr(10):
			pointerEvent;
	};

	me.momentum = function (current, start, time, lowerMargin, wrapperSize, deceleration) {
		var distance = current - start,
			speed = Math.abs(distance) / time,
			destination,
			duration;

		deceleration = deceleration === undefined ? 0.0006 : deceleration;

		destination = current + ( speed * speed ) / ( 2 * deceleration ) * ( distance < 0 ? -1 : 1 );
		duration = speed / deceleration;

		if ( destination < lowerMargin ) {
			destination = wrapperSize ? lowerMargin - ( wrapperSize / 2.5 * ( speed / 8 ) ) : lowerMargin;
			distance = Math.abs(destination - current);
			duration = distance / speed;
		} else if ( destination > 0 ) {
			destination = wrapperSize ? wrapperSize / 2.5 * ( speed / 8 ) : 0;
			distance = Math.abs(current) + destination;
			duration = distance / speed;
		}

		return {
			destination: Math.round(destination),
			duration: duration
		};
	};

	var _transform = _prefixStyle('transform');

	me.extend(me, {
		hasTransform: _transform !== false,
		hasPerspective: _prefixStyle('perspective') in _elementStyle,
		hasTouch: 'ontouchstart' in window,
		hasPointer: window.PointerEvent || window.MSPointerEvent, // IE10 is prefixed
		hasTransition: _prefixStyle('transition') in _elementStyle
	});

	// This should find all Android browsers lower than build 535.19 (both stock browser and webview)
	me.isBadAndroid = /Android /.test(window.navigator.appVersion) && !(/Chrome\/\d/.test(window.navigator.appVersion));

	me.extend(me.style = {}, {
		transform: _transform,
		transitionTimingFunction: _prefixStyle('transitionTimingFunction'),
		transitionDuration: _prefixStyle('transitionDuration'),
		transitionDelay: _prefixStyle('transitionDelay'),
		transformOrigin: _prefixStyle('transformOrigin')
	});

	me.hasClass = function (e, c) {
		var re = new RegExp("(^|\\s)" + c + "(\\s|$)");
		return re.test(e.className);
	};

	me.addClass = function (e, c) {
		if ( me.hasClass(e, c) ) {
			return;
		}

		var newclass = e.className.split(' ');
		newclass.push(c);
		e.className = newclass.join(' ');
	};

	me.removeClass = function (e, c) {
		if ( !me.hasClass(e, c) ) {
			return;
		}

		var re = new RegExp("(^|\\s)" + c + "(\\s|$)", 'g');
		e.className = e.className.replace(re, ' ');
	};

	me.offset = function (el) {
		var left = -el.offsetLeft,
			top = -el.offsetTop;

		// jshint -W084
		while (el = el.offsetParent) {
			left -= el.offsetLeft;
			top -= el.offsetTop;
		}
		// jshint +W084

		return {
			left: left,
			top: top
		};
	};

	me.preventDefaultException = function (el, exceptions) {
		for ( var i in exceptions ) {
			if ( exceptions[i].test(el[i]) ) {
				return true;
			}
		}

		return false;
	};

	me.extend(me.eventType = {}, {
		touchstart: 1,
		touchmove: 1,
		touchend: 1,

		mousedown: 2,
		mousemove: 2,
		mouseup: 2,

		pointerdown: 3,
		pointermove: 3,
		pointerup: 3,

		MSPointerDown: 3,
		MSPointerMove: 3,
		MSPointerUp: 3
	});

	me.extend(me.ease = {}, {
		quadratic: {
			style: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
			fn: function (k) {
				return k * ( 2 - k );
			}
		},
		circular: {
			style: 'cubic-bezier(0.1, 0.57, 0.1, 1)',	// Not properly "circular" but this looks better, it should be (0.075, 0.82, 0.165, 1)
			fn: function (k) {
				return Math.sqrt( 1 - ( --k * k ) );
			}
		},
		back: {
			style: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
			fn: function (k) {
				var b = 4;
				return ( k = k - 1 ) * k * ( ( b + 1 ) * k + b ) + 1;
			}
		},
		bounce: {
			style: '',
			fn: function (k) {
				if ( ( k /= 1 ) < ( 1 / 2.75 ) ) {
					return 7.5625 * k * k;
				} else if ( k < ( 2 / 2.75 ) ) {
					return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;
				} else if ( k < ( 2.5 / 2.75 ) ) {
					return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;
				} else {
					return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;
				}
			}
		},
		elastic: {
			style: '',
			fn: function (k) {
				var f = 0.22,
					e = 0.4;

				if ( k === 0 ) { return 0; }
				if ( k == 1 ) { return 1; }

				return ( e * Math.pow( 2, - 10 * k ) * Math.sin( ( k - f / 4 ) * ( 2 * Math.PI ) / f ) + 1 );
			}
		}
	});

	me.tap = function (e, eventName) {
		var ev = document.createEvent('Event');
		ev.initEvent(eventName, true, true);
		ev.pageX = e.pageX;
		ev.pageY = e.pageY;
		e.target.dispatchEvent(ev);
	};

	me.click = function (e) {
		var target = e.target,
			ev;

		if ( !(/(SELECT|INPUT|TEXTAREA)/i).test(target.tagName) ) {
			ev = document.createEvent('MouseEvents');
			ev.initMouseEvent('click', true, true, e.view, 1,
				target.screenX, target.screenY, target.clientX, target.clientY,
				e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
				0, null);

			ev._constructed = true;
			target.dispatchEvent(ev);
		}
	};

	return me;
})();

function IScroll (el, options) {
	this.wrapper = typeof el == 'string' ? document.querySelector(el) : el;
	this.scroller = this.wrapper.children[0];
	this.scrollerStyle = this.scroller.style;		// cache style for better performance

	this.options = {

		resizeScrollbars: true,

		mouseWheelSpeed: 20,

		snapThreshold: 0.334,

// INSERT POINT: OPTIONS 

		startX: 0,
		startY: 0,
		scrollY: true,
		directionLockThreshold: 5,
		momentum: true,

		bounce: true,
		bounceTime: 600,
		bounceEasing: '',

		preventDefault: true,
		preventDefaultException: { tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/ },

		HWCompositing: true,
		useTransition: true,
		useTransform: true
	};

	for ( var i in options ) {
		this.options[i] = options[i];
	}

	// Normalize options
	this.translateZ = this.options.HWCompositing && utils.hasPerspective ? ' translateZ(0)' : '';

	this.options.useTransition = utils.hasTransition && this.options.useTransition;
	this.options.useTransform = utils.hasTransform && this.options.useTransform;

	this.options.eventPassthrough = this.options.eventPassthrough === true ? 'vertical' : this.options.eventPassthrough;
	this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault;

	// If you want eventPassthrough I have to lock one of the axes
	this.options.scrollY = this.options.eventPassthrough == 'vertical' ? false : this.options.scrollY;
	this.options.scrollX = this.options.eventPassthrough == 'horizontal' ? false : this.options.scrollX;

	// With eventPassthrough we also need lockDirection mechanism
	this.options.freeScroll = this.options.freeScroll && !this.options.eventPassthrough;
	this.options.directionLockThreshold = this.options.eventPassthrough ? 0 : this.options.directionLockThreshold;

	this.options.bounceEasing = typeof this.options.bounceEasing == 'string' ? utils.ease[this.options.bounceEasing] || utils.ease.circular : this.options.bounceEasing;

	this.options.resizePolling = this.options.resizePolling === undefined ? 60 : this.options.resizePolling;

	if ( this.options.tap === true ) {
		this.options.tap = 'tap';
	}

	if ( this.options.shrinkScrollbars == 'scale' ) {
		this.options.useTransition = false;
	}

	this.options.invertWheelDirection = this.options.invertWheelDirection ? -1 : 1;

// INSERT POINT: NORMALIZATION

	// Some defaults	
	this.x = 0;
	this.y = 0;
	this.directionX = 0;
	this.directionY = 0;
	this._events = {};

// INSERT POINT: DEFAULTS

	this._init();
	this.refresh();

	this.scrollTo(this.options.startX, this.options.startY);
	this.enable();
}

IScroll.prototype = {
	version: '5.1.2',

	_init: function () {
		this._initEvents();

		if ( this.options.scrollbars || this.options.indicators ) {
			this._initIndicators();
		}

		if ( this.options.mouseWheel ) {
			this._initWheel();
		}

		if ( this.options.snap ) {
			this._initSnap();
		}

		if ( this.options.keyBindings ) {
			this._initKeys();
		}

// INSERT POINT: _init

	},

	destroy: function () {
		this._initEvents(true);

		this._execEvent('destroy');
	},

	_transitionEnd: function (e) {
		if ( e.target != this.scroller || !this.isInTransition ) {
			return;
		}

		this._transitionTime();
		if ( !this.resetPosition(this.options.bounceTime) ) {
			this.isInTransition = false;
			this._execEvent('scrollEnd');
		}
	},

	_start: function (e) {
		// React to left mouse button only
		if ( utils.eventType[e.type] != 1 ) {
			if ( e.button !== 0 ) {
				return;
			}
		}

		if ( !this.enabled || (this.initiated && utils.eventType[e.type] !== this.initiated) ) {
			return;
		}

		if ( this.options.preventDefault && !utils.isBadAndroid && !utils.preventDefaultException(e.target, this.options.preventDefaultException) ) {
			e.preventDefault();
		}

		var point = e.touches ? e.touches[0] : e,
			pos;

		this.initiated	= utils.eventType[e.type];
		this.moved		= false;
		this.distX		= 0;
		this.distY		= 0;
		this.directionX = 0;
		this.directionY = 0;
		this.directionLocked = 0;

		this._transitionTime();

		this.startTime = utils.getTime();

		if ( this.options.useTransition && this.isInTransition ) {
			this.isInTransition = false;
			pos = this.getComputedPosition();
			this._translate(Math.round(pos.x), Math.round(pos.y));
			this._execEvent('scrollEnd');
		} else if ( !this.options.useTransition && this.isAnimating ) {
			this.isAnimating = false;
			this._execEvent('scrollEnd');
		}

		this.startX    = this.x;
		this.startY    = this.y;
		this.absStartX = this.x;
		this.absStartY = this.y;
		this.pointX    = point.pageX;
		this.pointY    = point.pageY;

		this._execEvent('beforeScrollStart');
	},

	_move: function (e) {
		if ( !this.enabled || utils.eventType[e.type] !== this.initiated ) {
			return;
		}

		if ( this.options.preventDefault ) {	// increases performance on Android? TODO: check!
			e.preventDefault();
		}

		var point		= e.touches ? e.touches[0] : e,
			deltaX		= point.pageX - this.pointX,
			deltaY		= point.pageY - this.pointY,
			timestamp	= utils.getTime(),
			newX, newY,
			absDistX, absDistY;

		this.pointX		= point.pageX;
		this.pointY		= point.pageY;

		this.distX		+= deltaX;
		this.distY		+= deltaY;
		absDistX		= Math.abs(this.distX);
		absDistY		= Math.abs(this.distY);

		// We need to move at least 10 pixels for the scrolling to initiate
		if ( timestamp - this.endTime > 300 && (absDistX < 10 && absDistY < 10) ) {
			return;
		}

		// If you are scrolling in one direction lock the other
		if ( !this.directionLocked && !this.options.freeScroll ) {
			if ( absDistX > absDistY + this.options.directionLockThreshold ) {
				this.directionLocked = 'h';		// lock horizontally
			} else if ( absDistY >= absDistX + this.options.directionLockThreshold ) {
				this.directionLocked = 'v';		// lock vertically
			} else {
				this.directionLocked = 'n';		// no lock
			}
		}

		if ( this.directionLocked == 'h' ) {
			if ( this.options.eventPassthrough == 'vertical' ) {
				e.preventDefault();
			} else if ( this.options.eventPassthrough == 'horizontal' ) {
				this.initiated = false;
				return;
			}

			deltaY = 0;
		} else if ( this.directionLocked == 'v' ) {
			if ( this.options.eventPassthrough == 'horizontal' ) {
				e.preventDefault();
			} else if ( this.options.eventPassthrough == 'vertical' ) {
				this.initiated = false;
				return;
			}

			deltaX = 0;
		}

		deltaX = this.hasHorizontalScroll ? deltaX : 0;
		deltaY = this.hasVerticalScroll ? deltaY : 0;

		newX = this.x + deltaX;
		newY = this.y + deltaY;

		// Slow down if outside of the boundaries
		if ( newX > 0 || newX < this.maxScrollX ) {
			newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX;
		}
		if ( newY > 0 || newY < this.maxScrollY ) {
			newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY;
		}

		this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
		this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

		if ( !this.moved ) {
			this._execEvent('scrollStart');
		}

		this.moved = true;

		this._translate(newX, newY);

/* REPLACE START: _move */

		if ( timestamp - this.startTime > 300 ) {
			this.startTime = timestamp;
			this.startX = this.x;
			this.startY = this.y;
		}

/* REPLACE END: _move */

	},

	_end: function (e) {
		if ( !this.enabled || utils.eventType[e.type] !== this.initiated ) {
			return;
		}

		if ( this.options.preventDefault && !utils.preventDefaultException(e.target, this.options.preventDefaultException) ) {
			e.preventDefault();
		}

		var point = e.changedTouches ? e.changedTouches[0] : e,
			momentumX,
			momentumY,
			duration = utils.getTime() - this.startTime,
			newX = Math.round(this.x),
			newY = Math.round(this.y),
			distanceX = Math.abs(newX - this.startX),
			distanceY = Math.abs(newY - this.startY),
			time = 0,
			easing = '';

		this.isInTransition = 0;
		this.initiated = 0;
		this.endTime = utils.getTime();

		// reset if we are outside of the boundaries
		if ( this.resetPosition(this.options.bounceTime) ) {
			return;
		}

		this.scrollTo(newX, newY);	// ensures that the last position is rounded

		// we scrolled less than 10 pixels
		if ( !this.moved ) {
			if ( this.options.tap ) {
				utils.tap(e, this.options.tap);
			}

			if ( this.options.click ) {
				utils.click(e);
			}

			this._execEvent('scrollCancel');
			return;
		}

		if ( this._events.flick && duration < 200 && distanceX < 100 && distanceY < 100 ) {
			this._execEvent('flick');
			return;
		}

		// start momentum animation if needed
		if ( this.options.momentum && duration < 300 ) {
			momentumX = this.hasHorizontalScroll ? utils.momentum(this.x, this.startX, duration, this.maxScrollX, this.options.bounce ? this.wrapperWidth : 0, this.options.deceleration) : { destination: newX, duration: 0 };
			momentumY = this.hasVerticalScroll ? utils.momentum(this.y, this.startY, duration, this.maxScrollY, this.options.bounce ? this.wrapperHeight : 0, this.options.deceleration) : { destination: newY, duration: 0 };
			newX = momentumX.destination;
			newY = momentumY.destination;
			time = Math.max(momentumX.duration, momentumY.duration);
			this.isInTransition = 1;
		}


		if ( this.options.snap ) {
			var snap = this._nearestSnap(newX, newY);
			this.currentPage = snap;
			time = this.options.snapSpeed || Math.max(
					Math.max(
						Math.min(Math.abs(newX - snap.x), 1000),
						Math.min(Math.abs(newY - snap.y), 1000)
					), 300);
			newX = snap.x;
			newY = snap.y;

			this.directionX = 0;
			this.directionY = 0;
			easing = this.options.bounceEasing;
		}

// INSERT POINT: _end

		if ( newX != this.x || newY != this.y ) {
			// change easing function when scroller goes out of the boundaries
			if ( newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY ) {
				easing = utils.ease.quadratic;
			}

			this.scrollTo(newX, newY, time, easing);
			return;
		}

		this._execEvent('scrollEnd');
	},

	_resize: function () {
		var that = this;

		clearTimeout(this.resizeTimeout);

		this.resizeTimeout = setTimeout(function () {
			that.refresh();
		}, this.options.resizePolling);
	},

	resetPosition: function (time) {
		var x = this.x,
			y = this.y;

		time = time || 0;

		if ( !this.hasHorizontalScroll || this.x > 0 ) {
			x = 0;
		} else if ( this.x < this.maxScrollX ) {
			x = this.maxScrollX;
		}

		if ( !this.hasVerticalScroll || this.y > 0 ) {
			y = 0;
		} else if ( this.y < this.maxScrollY ) {
			y = this.maxScrollY;
		}

		if ( x == this.x && y == this.y ) {
			return false;
		}

		this.scrollTo(x, y, time, this.options.bounceEasing);

		return true;
	},

	disable: function () {
		this.enabled = false;
	},

	enable: function () {
		this.enabled = true;
	},

	refresh: function () {
		var rf = this.wrapper.offsetHeight;		// Force reflow

		this.wrapperWidth	= this.wrapper.clientWidth;
		this.wrapperHeight	= this.wrapper.clientHeight;

/* REPLACE START: refresh */

		this.scrollerWidth	= this.scroller.offsetWidth;
		this.scrollerHeight	= this.scroller.offsetHeight;

		this.maxScrollX		= this.wrapperWidth - this.scrollerWidth;
		this.maxScrollY		= this.wrapperHeight - this.scrollerHeight;

/* REPLACE END: refresh */

		this.hasHorizontalScroll	= this.options.scrollX && this.maxScrollX < 0;
		this.hasVerticalScroll		= this.options.scrollY && this.maxScrollY < 0;

		if ( !this.hasHorizontalScroll ) {
			this.maxScrollX = 0;
			this.scrollerWidth = this.wrapperWidth;
		}

		if ( !this.hasVerticalScroll ) {
			this.maxScrollY = 0;
			this.scrollerHeight = this.wrapperHeight;
		}

		this.endTime = 0;
		this.directionX = 0;
		this.directionY = 0;

		this.wrapperOffset = utils.offset(this.wrapper);

		this._execEvent('refresh');

		this.resetPosition();

// INSERT POINT: _refresh

	},

	on: function (type, fn) {
		if ( !this._events[type] ) {
			this._events[type] = [];
		}

		this._events[type].push(fn);
	},

	off: function (type, fn) {
		if ( !this._events[type] ) {
			return;
		}

		var index = this._events[type].indexOf(fn);

		if ( index > -1 ) {
			this._events[type].splice(index, 1);
		}
	},

	_execEvent: function (type) {
		if ( !this._events[type] ) {
			return;
		}

		var i = 0,
			l = this._events[type].length;

		if ( !l ) {
			return;
		}

		for ( ; i < l; i++ ) {
			this._events[type][i].apply(this, [].slice.call(arguments, 1));
		}
	},

	scrollBy: function (x, y, time, easing) {
		x = this.x + x;
		y = this.y + y;
		time = time || 0;

		this.scrollTo(x, y, time, easing);
	},

	scrollTo: function (x, y, time, easing) {
		easing = easing || utils.ease.circular;

		this.isInTransition = this.options.useTransition && time > 0;

		if ( !time || (this.options.useTransition && easing.style) ) {
			this._transitionTimingFunction(easing.style);
			this._transitionTime(time);
			this._translate(x, y);
		} else {
			this._animate(x, y, time, easing.fn);
		}
	},

	scrollToElement: function (el, time, offsetX, offsetY, easing) {
		el = el.nodeType ? el : this.scroller.querySelector(el);

		if ( !el ) {
			return;
		}

		var pos = utils.offset(el);

		pos.left -= this.wrapperOffset.left;
		pos.top  -= this.wrapperOffset.top;

		// if offsetX/Y are true we center the element to the screen
		if ( offsetX === true ) {
			offsetX = Math.round(el.offsetWidth / 2 - this.wrapper.offsetWidth / 2);
		}
		if ( offsetY === true ) {
			offsetY = Math.round(el.offsetHeight / 2 - this.wrapper.offsetHeight / 2);
		}

		pos.left -= offsetX || 0;
		pos.top  -= offsetY || 0;

		pos.left = pos.left > 0 ? 0 : pos.left < this.maxScrollX ? this.maxScrollX : pos.left;
		pos.top  = pos.top  > 0 ? 0 : pos.top  < this.maxScrollY ? this.maxScrollY : pos.top;

		time = time === undefined || time === null || time === 'auto' ? Math.max(Math.abs(this.x-pos.left), Math.abs(this.y-pos.top)) : time;

		this.scrollTo(pos.left, pos.top, time, easing);
	},

	_transitionTime: function (time) {
		time = time || 0;

		this.scrollerStyle[utils.style.transitionDuration] = time + 'ms';

		if ( !time && utils.isBadAndroid ) {
			this.scrollerStyle[utils.style.transitionDuration] = '0.001s';
		}


		if ( this.indicators ) {
			for ( var i = this.indicators.length; i--; ) {
				this.indicators[i].transitionTime(time);
			}
		}


// INSERT POINT: _transitionTime

	},

	_transitionTimingFunction: function (easing) {
		this.scrollerStyle[utils.style.transitionTimingFunction] = easing;


		if ( this.indicators ) {
			for ( var i = this.indicators.length; i--; ) {
				this.indicators[i].transitionTimingFunction(easing);
			}
		}


// INSERT POINT: _transitionTimingFunction

	},

	_translate: function (x, y) {
		if ( this.options.useTransform ) {

/* REPLACE START: _translate */

			this.scrollerStyle[utils.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.translateZ;

/* REPLACE END: _translate */

		} else {
			x = Math.round(x);
			y = Math.round(y);
			this.scrollerStyle.left = x + 'px';
			this.scrollerStyle.top = y + 'px';
		}

		this.x = x;
		this.y = y;


	if ( this.indicators ) {
		for ( var i = this.indicators.length; i--; ) {
			this.indicators[i].updatePosition();
		}
	}


// INSERT POINT: _translate

	},

	_initEvents: function (remove) {
		var eventType = remove ? utils.removeEvent : utils.addEvent,
			target = this.options.bindToWrapper ? this.wrapper : window;

		eventType(window, 'orientationchange', this);
		eventType(window, 'resize', this);

		if ( this.options.click ) {
			eventType(this.wrapper, 'click', this, true);
		}

		if ( !this.options.disableMouse ) {
			eventType(this.wrapper, 'mousedown', this);
			eventType(target, 'mousemove', this);
			eventType(target, 'mousecancel', this);
			eventType(target, 'mouseup', this);
		}

		if ( utils.hasPointer && !this.options.disablePointer ) {
			eventType(this.wrapper, utils.prefixPointerEvent('pointerdown'), this);
			eventType(target, utils.prefixPointerEvent('pointermove'), this);
			eventType(target, utils.prefixPointerEvent('pointercancel'), this);
			eventType(target, utils.prefixPointerEvent('pointerup'), this);
		}

		if ( utils.hasTouch && !this.options.disableTouch ) {
			eventType(this.wrapper, 'touchstart', this);
			eventType(target, 'touchmove', this);
			eventType(target, 'touchcancel', this);
			eventType(target, 'touchend', this);
		}

		eventType(this.scroller, 'transitionend', this);
		eventType(this.scroller, 'webkitTransitionEnd', this);
		eventType(this.scroller, 'oTransitionEnd', this);
		eventType(this.scroller, 'MSTransitionEnd', this);
	},

	getComputedPosition: function () {
		var matrix = window.getComputedStyle(this.scroller, null),
			x, y;

		if ( this.options.useTransform ) {
			matrix = matrix[utils.style.transform].split(')')[0].split(', ');
			x = +(matrix[12] || matrix[4]);
			y = +(matrix[13] || matrix[5]);
		} else {
			x = +matrix.left.replace(/[^-\d.]/g, '');
			y = +matrix.top.replace(/[^-\d.]/g, '');
		}

		return { x: x, y: y };
	},

	_initIndicators: function () {
		var interactive = this.options.interactiveScrollbars,
			customStyle = typeof this.options.scrollbars != 'string',
			indicators = [],
			indicator;

		var that = this;

		this.indicators = [];

		if ( this.options.scrollbars ) {
			// Vertical scrollbar
			if ( this.options.scrollY ) {
				indicator = {
					el: createDefaultScrollbar('v', interactive, this.options.scrollbars),
					interactive: interactive,
					defaultScrollbars: true,
					customStyle: customStyle,
					resize: this.options.resizeScrollbars,
					shrink: this.options.shrinkScrollbars,
					fade: this.options.fadeScrollbars,
					listenX: false
				};

				this.wrapper.appendChild(indicator.el);
				indicators.push(indicator);
			}

			// Horizontal scrollbar
			if ( this.options.scrollX ) {
				indicator = {
					el: createDefaultScrollbar('h', interactive, this.options.scrollbars),
					interactive: interactive,
					defaultScrollbars: true,
					customStyle: customStyle,
					resize: this.options.resizeScrollbars,
					shrink: this.options.shrinkScrollbars,
					fade: this.options.fadeScrollbars,
					listenY: false
				};

				this.wrapper.appendChild(indicator.el);
				indicators.push(indicator);
			}
		}

		if ( this.options.indicators ) {
			// TODO: check concat compatibility
			indicators = indicators.concat(this.options.indicators);
		}

		for ( var i = indicators.length; i--; ) {
			this.indicators.push( new Indicator(this, indicators[i]) );
		}

		// TODO: check if we can use array.map (wide compatibility and performance issues)
		function _indicatorsMap (fn) {
			for ( var i = that.indicators.length; i--; ) {
				fn.call(that.indicators[i]);
			}
		}

		if ( this.options.fadeScrollbars ) {
			this.on('scrollEnd', function () {
				_indicatorsMap(function () {
					this.fade();
				});
			});

			this.on('scrollCancel', function () {
				_indicatorsMap(function () {
					this.fade();
				});
			});

			this.on('scrollStart', function () {
				_indicatorsMap(function () {
					this.fade(1);
				});
			});

			this.on('beforeScrollStart', function () {
				_indicatorsMap(function () {
					this.fade(1, true);
				});
			});
		}


		this.on('refresh', function () {
			_indicatorsMap(function () {
				this.refresh();
			});
		});

		this.on('destroy', function () {
			_indicatorsMap(function () {
				this.destroy();
			});

			delete this.indicators;
		});
	},

	_initWheel: function () {
		utils.addEvent(this.wrapper, 'wheel', this);
		utils.addEvent(this.wrapper, 'mousewheel', this);
		utils.addEvent(this.wrapper, 'DOMMouseScroll', this);

		this.on('destroy', function () {
			utils.removeEvent(this.wrapper, 'wheel', this);
			utils.removeEvent(this.wrapper, 'mousewheel', this);
			utils.removeEvent(this.wrapper, 'DOMMouseScroll', this);
		});
	},

	_wheel: function (e) {
		if ( !this.enabled ) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		var wheelDeltaX, wheelDeltaY,
			newX, newY,
			that = this;

		if ( this.wheelTimeout === undefined ) {
			that._execEvent('scrollStart');
		}

		// Execute the scrollEnd event after 400ms the wheel stopped scrolling
		clearTimeout(this.wheelTimeout);
		this.wheelTimeout = setTimeout(function () {
			that._execEvent('scrollEnd');
			that.wheelTimeout = undefined;
		}, 400);

		if ( 'deltaX' in e ) {
			wheelDeltaX = -e.deltaX;
			wheelDeltaY = -e.deltaY;
		} else if ( 'wheelDeltaX' in e ) {
			wheelDeltaX = e.wheelDeltaX / 120 * this.options.mouseWheelSpeed;
			wheelDeltaY = e.wheelDeltaY / 120 * this.options.mouseWheelSpeed;
		} else if ( 'wheelDelta' in e ) {
			wheelDeltaX = wheelDeltaY = e.wheelDelta / 120 * this.options.mouseWheelSpeed;
		} else if ( 'detail' in e ) {
			wheelDeltaX = wheelDeltaY = -e.detail / 3 * this.options.mouseWheelSpeed;
		} else {
			return;
		}

		wheelDeltaX *= this.options.invertWheelDirection;
		wheelDeltaY *= this.options.invertWheelDirection;

		if ( !this.hasVerticalScroll ) {
			wheelDeltaX = wheelDeltaY;
			wheelDeltaY = 0;
		}

		if ( this.options.snap ) {
			newX = this.currentPage.pageX;
			newY = this.currentPage.pageY;

			if ( wheelDeltaX > 0 ) {
				newX--;
			} else if ( wheelDeltaX < 0 ) {
				newX++;
			}

			if ( wheelDeltaY > 0 ) {
				newY--;
			} else if ( wheelDeltaY < 0 ) {
				newY++;
			}

			this.goToPage(newX, newY);

			return;
		}

		newX = this.x + Math.round(this.hasHorizontalScroll ? wheelDeltaX : 0);
		newY = this.y + Math.round(this.hasVerticalScroll ? wheelDeltaY : 0);

		if ( newX > 0 ) {
			newX = 0;
		} else if ( newX < this.maxScrollX ) {
			newX = this.maxScrollX;
		}

		if ( newY > 0 ) {
			newY = 0;
		} else if ( newY < this.maxScrollY ) {
			newY = this.maxScrollY;
		}

		this.scrollTo(newX, newY, 0);

// INSERT POINT: _wheel
	},

	_initSnap: function () {
		this.currentPage = {};

		if ( typeof this.options.snap == 'string' ) {
			this.options.snap = this.scroller.querySelectorAll(this.options.snap);
		}

		this.on('refresh', function () {
			var i = 0, l,
				m = 0, n,
				cx, cy,
				x = 0, y,
				stepX = this.options.snapStepX || this.wrapperWidth,
				stepY = this.options.snapStepY || this.wrapperHeight,
				el;

			this.pages = [];

			if ( !this.wrapperWidth || !this.wrapperHeight || !this.scrollerWidth || !this.scrollerHeight ) {
				return;
			}

			if ( this.options.snap === true ) {
				cx = Math.round( stepX / 2 );
				cy = Math.round( stepY / 2 );

				while ( x > -this.scrollerWidth ) {
					this.pages[i] = [];
					l = 0;
					y = 0;

					while ( y > -this.scrollerHeight ) {
						this.pages[i][l] = {
							x: Math.max(x, this.maxScrollX),
							y: Math.max(y, this.maxScrollY),
							width: stepX,
							height: stepY,
							cx: x - cx,
							cy: y - cy
						};

						y -= stepY;
						l++;
					}

					x -= stepX;
					i++;
				}
			} else {
				el = this.options.snap;
				l = el.length;
				n = -1;

				for ( ; i < l; i++ ) {
					if ( i === 0 || el[i].offsetLeft <= el[i-1].offsetLeft ) {
						m = 0;
						n++;
					}

					if ( !this.pages[m] ) {
						this.pages[m] = [];
					}

					x = Math.max(-el[i].offsetLeft, this.maxScrollX);
					y = Math.max(-el[i].offsetTop, this.maxScrollY);
					cx = x - Math.round(el[i].offsetWidth / 2);
					cy = y - Math.round(el[i].offsetHeight / 2);

					this.pages[m][n] = {
						x: x,
						y: y,
						width: el[i].offsetWidth,
						height: el[i].offsetHeight,
						cx: cx,
						cy: cy
					};

					if ( x > this.maxScrollX ) {
						m++;
					}
				}
			}

			this.goToPage(this.currentPage.pageX || 0, this.currentPage.pageY || 0, 0);

			// Update snap threshold if needed
			if ( this.options.snapThreshold % 1 === 0 ) {
				this.snapThresholdX = this.options.snapThreshold;
				this.snapThresholdY = this.options.snapThreshold;
			} else {
				this.snapThresholdX = Math.round(this.pages[this.currentPage.pageX][this.currentPage.pageY].width * this.options.snapThreshold);
				this.snapThresholdY = Math.round(this.pages[this.currentPage.pageX][this.currentPage.pageY].height * this.options.snapThreshold);
			}
		});

		this.on('flick', function () {
			var time = this.options.snapSpeed || Math.max(
					Math.max(
						Math.min(Math.abs(this.x - this.startX), 1000),
						Math.min(Math.abs(this.y - this.startY), 1000)
					), 300);

			this.goToPage(
				this.currentPage.pageX + this.directionX,
				this.currentPage.pageY + this.directionY,
				time
			);
		});
	},

	_nearestSnap: function (x, y) {
		if ( !this.pages.length ) {
			return { x: 0, y: 0, pageX: 0, pageY: 0 };
		}

		var i = 0,
			l = this.pages.length,
			m = 0;

		// Check if we exceeded the snap threshold
		if ( Math.abs(x - this.absStartX) < this.snapThresholdX &&
			Math.abs(y - this.absStartY) < this.snapThresholdY ) {
			return this.currentPage;
		}

		if ( x > 0 ) {
			x = 0;
		} else if ( x < this.maxScrollX ) {
			x = this.maxScrollX;
		}

		if ( y > 0 ) {
			y = 0;
		} else if ( y < this.maxScrollY ) {
			y = this.maxScrollY;
		}

		for ( ; i < l; i++ ) {
			if ( x >= this.pages[i][0].cx ) {
				x = this.pages[i][0].x;
				break;
			}
		}

		l = this.pages[i].length;

		for ( ; m < l; m++ ) {
			if ( y >= this.pages[0][m].cy ) {
				y = this.pages[0][m].y;
				break;
			}
		}

		if ( i == this.currentPage.pageX ) {
			i += this.directionX;

			if ( i < 0 ) {
				i = 0;
			} else if ( i >= this.pages.length ) {
				i = this.pages.length - 1;
			}

			x = this.pages[i][0].x;
		}

		if ( m == this.currentPage.pageY ) {
			m += this.directionY;

			if ( m < 0 ) {
				m = 0;
			} else if ( m >= this.pages[0].length ) {
				m = this.pages[0].length - 1;
			}

			y = this.pages[0][m].y;
		}

		return {
			x: x,
			y: y,
			pageX: i,
			pageY: m
		};
	},

	goToPage: function (x, y, time, easing) {
		easing = easing || this.options.bounceEasing;

		if ( x >= this.pages.length ) {
			x = this.pages.length - 1;
		} else if ( x < 0 ) {
			x = 0;
		}

		if ( y >= this.pages[x].length ) {
			y = this.pages[x].length - 1;
		} else if ( y < 0 ) {
			y = 0;
		}

		var posX = this.pages[x][y].x,
			posY = this.pages[x][y].y;

		time = time === undefined ? this.options.snapSpeed || Math.max(
			Math.max(
				Math.min(Math.abs(posX - this.x), 1000),
				Math.min(Math.abs(posY - this.y), 1000)
			), 300) : time;

		this.currentPage = {
			x: posX,
			y: posY,
			pageX: x,
			pageY: y
		};

		this.scrollTo(posX, posY, time, easing);
	},

	next: function (time, easing) {
		var x = this.currentPage.pageX,
			y = this.currentPage.pageY;

		x++;

		if ( x >= this.pages.length && this.hasVerticalScroll ) {
			x = 0;
			y++;
		}

		this.goToPage(x, y, time, easing);
	},

	prev: function (time, easing) {
		var x = this.currentPage.pageX,
			y = this.currentPage.pageY;

		x--;

		if ( x < 0 && this.hasVerticalScroll ) {
			x = 0;
			y--;
		}

		this.goToPage(x, y, time, easing);
	},

	_initKeys: function (e) {
		// default key bindings
		var keys = {
			pageUp: 33,
			pageDown: 34,
			end: 35,
			home: 36,
			left: 37,
			up: 38,
			right: 39,
			down: 40
		};
		var i;

		// if you give me characters I give you keycode
		if ( typeof this.options.keyBindings == 'object' ) {
			for ( i in this.options.keyBindings ) {
				if ( typeof this.options.keyBindings[i] == 'string' ) {
					this.options.keyBindings[i] = this.options.keyBindings[i].toUpperCase().charCodeAt(0);
				}
			}
		} else {
			this.options.keyBindings = {};
		}

		for ( i in keys ) {
			this.options.keyBindings[i] = this.options.keyBindings[i] || keys[i];
		}

		utils.addEvent(window, 'keydown', this);

		this.on('destroy', function () {
			utils.removeEvent(window, 'keydown', this);
		});
	},

	_key: function (e) {
		if ( !this.enabled ) {
			return;
		}

		var snap = this.options.snap,	// we are using this alot, better to cache it
			newX = snap ? this.currentPage.pageX : this.x,
			newY = snap ? this.currentPage.pageY : this.y,
			now = utils.getTime(),
			prevTime = this.keyTime || 0,
			acceleration = 0.250,
			pos;

		if ( this.options.useTransition && this.isInTransition ) {
			pos = this.getComputedPosition();

			this._translate(Math.round(pos.x), Math.round(pos.y));
			this.isInTransition = false;
		}

		this.keyAcceleration = now - prevTime < 200 ? Math.min(this.keyAcceleration + acceleration, 50) : 0;

		switch ( e.keyCode ) {
			case this.options.keyBindings.pageUp:
				if ( this.hasHorizontalScroll && !this.hasVerticalScroll ) {
					newX += snap ? 1 : this.wrapperWidth;
				} else {
					newY += snap ? 1 : this.wrapperHeight;
				}
				break;
			case this.options.keyBindings.pageDown:
				if ( this.hasHorizontalScroll && !this.hasVerticalScroll ) {
					newX -= snap ? 1 : this.wrapperWidth;
				} else {
					newY -= snap ? 1 : this.wrapperHeight;
				}
				break;
			case this.options.keyBindings.end:
				newX = snap ? this.pages.length-1 : this.maxScrollX;
				newY = snap ? this.pages[0].length-1 : this.maxScrollY;
				break;
			case this.options.keyBindings.home:
				newX = 0;
				newY = 0;
				break;
			case this.options.keyBindings.left:
				newX += snap ? -1 : 5 + this.keyAcceleration>>0;
				break;
			case this.options.keyBindings.up:
				newY += snap ? 1 : 5 + this.keyAcceleration>>0;
				break;
			case this.options.keyBindings.right:
				newX -= snap ? -1 : 5 + this.keyAcceleration>>0;
				break;
			case this.options.keyBindings.down:
				newY -= snap ? 1 : 5 + this.keyAcceleration>>0;
				break;
			default:
				return;
		}

		if ( snap ) {
			this.goToPage(newX, newY);
			return;
		}

		if ( newX > 0 ) {
			newX = 0;
			this.keyAcceleration = 0;
		} else if ( newX < this.maxScrollX ) {
			newX = this.maxScrollX;
			this.keyAcceleration = 0;
		}

		if ( newY > 0 ) {
			newY = 0;
			this.keyAcceleration = 0;
		} else if ( newY < this.maxScrollY ) {
			newY = this.maxScrollY;
			this.keyAcceleration = 0;
		}

		this.scrollTo(newX, newY, 0);

		this.keyTime = now;
	},

	_animate: function (destX, destY, duration, easingFn) {
		var that = this,
			startX = this.x,
			startY = this.y,
			startTime = utils.getTime(),
			destTime = startTime + duration;

		function step () {
			var now = utils.getTime(),
				newX, newY,
				easing;

			if ( now >= destTime ) {
				that.isAnimating = false;
				that._translate(destX, destY);

				if ( !that.resetPosition(that.options.bounceTime) ) {
					that._execEvent('scrollEnd');
				}

				return;
			}

			now = ( now - startTime ) / duration;
			easing = easingFn(now);
			newX = ( destX - startX ) * easing + startX;
			newY = ( destY - startY ) * easing + startY;
			that._translate(newX, newY);

			if ( that.isAnimating ) {
				rAF(step);
			}
		}

		this.isAnimating = true;
		step();
	},
	handleEvent: function (e) {
		switch ( e.type ) {
			case 'touchstart':
			case 'pointerdown':
			case 'MSPointerDown':
			case 'mousedown':
				this._start(e);
				break;
			case 'touchmove':
			case 'pointermove':
			case 'MSPointerMove':
			case 'mousemove':
				this._move(e);
				break;
			case 'touchend':
			case 'pointerup':
			case 'MSPointerUp':
			case 'mouseup':
			case 'touchcancel':
			case 'pointercancel':
			case 'MSPointerCancel':
			case 'mousecancel':
				this._end(e);
				break;
			case 'orientationchange':
			case 'resize':
				this._resize();
				break;
			case 'transitionend':
			case 'webkitTransitionEnd':
			case 'oTransitionEnd':
			case 'MSTransitionEnd':
				this._transitionEnd(e);
				break;
			case 'wheel':
			case 'DOMMouseScroll':
			case 'mousewheel':
				this._wheel(e);
				break;
			case 'keydown':
				this._key(e);
				break;
			case 'click':
				if ( !e._constructed ) {
					e.preventDefault();
					e.stopPropagation();
				}
				break;
		}
	}
};
function createDefaultScrollbar (direction, interactive, type) {
	var scrollbar = document.createElement('div'),
		indicator = document.createElement('div');

	if ( type === true ) {
		scrollbar.style.cssText = 'position:absolute;z-index:9999';
		indicator.style.cssText = '-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.9);border-radius:3px';
	}

	indicator.className = 'iScrollIndicator';

	if ( direction == 'h' ) {
		if ( type === true ) {
			scrollbar.style.cssText += ';height:7px;left:2px;right:2px;bottom:0';
			indicator.style.height = '100%';
		}
		scrollbar.className = 'iScrollHorizontalScrollbar';
	} else {
		if ( type === true ) {
			scrollbar.style.cssText += ';width:7px;bottom:2px;top:2px;right:1px';
			indicator.style.width = '100%';
		}
		scrollbar.className = 'iScrollVerticalScrollbar';
	}

	scrollbar.style.cssText += ';overflow:hidden';

	if ( !interactive ) {
		scrollbar.style.pointerEvents = 'none';
	}

	scrollbar.appendChild(indicator);

	return scrollbar;
}

function Indicator (scroller, options) {
	this.wrapper = typeof options.el == 'string' ? document.querySelector(options.el) : options.el;
	this.wrapperStyle = this.wrapper.style;
	this.indicator = this.wrapper.children[0];
	this.indicatorStyle = this.indicator.style;
	this.scroller = scroller;

	this.options = {
		listenX: true,
		listenY: true,
		interactive: false,
		resize: true,
		defaultScrollbars: false,
		shrink: false,
		fade: false,
		speedRatioX: 0,
		speedRatioY: 0
	};

	for ( var i in options ) {
		this.options[i] = options[i];
	}

	this.sizeRatioX = 1;
	this.sizeRatioY = 1;
	this.maxPosX = 0;
	this.maxPosY = 0;

	if ( this.options.interactive ) {
		if ( !this.options.disableTouch ) {
			utils.addEvent(this.indicator, 'touchstart', this);
			utils.addEvent(window, 'touchend', this);
		}
		if ( !this.options.disablePointer ) {
			utils.addEvent(this.indicator, utils.prefixPointerEvent('pointerdown'), this);
			utils.addEvent(window, utils.prefixPointerEvent('pointerup'), this);
		}
		if ( !this.options.disableMouse ) {
			utils.addEvent(this.indicator, 'mousedown', this);
			utils.addEvent(window, 'mouseup', this);
		}
	}

	if ( this.options.fade ) {
		this.wrapperStyle[utils.style.transform] = this.scroller.translateZ;
		this.wrapperStyle[utils.style.transitionDuration] = utils.isBadAndroid ? '0.001s' : '0ms';
		this.wrapperStyle.opacity = '0';
	}
}

Indicator.prototype = {
	handleEvent: function (e) {
		switch ( e.type ) {
			case 'touchstart':
			case 'pointerdown':
			case 'MSPointerDown':
			case 'mousedown':
				this._start(e);
				break;
			case 'touchmove':
			case 'pointermove':
			case 'MSPointerMove':
			case 'mousemove':
				this._move(e);
				break;
			case 'touchend':
			case 'pointerup':
			case 'MSPointerUp':
			case 'mouseup':
			case 'touchcancel':
			case 'pointercancel':
			case 'MSPointerCancel':
			case 'mousecancel':
				this._end(e);
				break;
		}
	},

	destroy: function () {
		if ( this.options.interactive ) {
			utils.removeEvent(this.indicator, 'touchstart', this);
			utils.removeEvent(this.indicator, utils.prefixPointerEvent('pointerdown'), this);
			utils.removeEvent(this.indicator, 'mousedown', this);

			utils.removeEvent(window, 'touchmove', this);
			utils.removeEvent(window, utils.prefixPointerEvent('pointermove'), this);
			utils.removeEvent(window, 'mousemove', this);

			utils.removeEvent(window, 'touchend', this);
			utils.removeEvent(window, utils.prefixPointerEvent('pointerup'), this);
			utils.removeEvent(window, 'mouseup', this);
		}

		if ( this.options.defaultScrollbars ) {
			this.wrapper.parentNode.removeChild(this.wrapper);
		}
	},

	_start: function (e) {
		var point = e.touches ? e.touches[0] : e;

		e.preventDefault();
		e.stopPropagation();

		this.transitionTime();

		this.initiated = true;
		this.moved = false;
		this.lastPointX	= point.pageX;
		this.lastPointY	= point.pageY;

		this.startTime	= utils.getTime();

		if ( !this.options.disableTouch ) {
			utils.addEvent(window, 'touchmove', this);
		}
		if ( !this.options.disablePointer ) {
			utils.addEvent(window, utils.prefixPointerEvent('pointermove'), this);
		}
		if ( !this.options.disableMouse ) {
			utils.addEvent(window, 'mousemove', this);
		}

		this.scroller._execEvent('beforeScrollStart');
	},

	_move: function (e) {
		var point = e.touches ? e.touches[0] : e,
			deltaX, deltaY,
			newX, newY,
			timestamp = utils.getTime();

		if ( !this.moved ) {
			this.scroller._execEvent('scrollStart');
		}

		this.moved = true;

		deltaX = point.pageX - this.lastPointX;
		this.lastPointX = point.pageX;

		deltaY = point.pageY - this.lastPointY;
		this.lastPointY = point.pageY;

		newX = this.x + deltaX;
		newY = this.y + deltaY;

		this._pos(newX, newY);

// INSERT POINT: indicator._move

		e.preventDefault();
		e.stopPropagation();
	},

	_end: function (e) {
		if ( !this.initiated ) {
			return;
		}

		this.initiated = false;

		e.preventDefault();
		e.stopPropagation();

		utils.removeEvent(window, 'touchmove', this);
		utils.removeEvent(window, utils.prefixPointerEvent('pointermove'), this);
		utils.removeEvent(window, 'mousemove', this);

		if ( this.scroller.options.snap ) {
			var snap = this.scroller._nearestSnap(this.scroller.x, this.scroller.y);

			var time = this.options.snapSpeed || Math.max(
					Math.max(
						Math.min(Math.abs(this.scroller.x - snap.x), 1000),
						Math.min(Math.abs(this.scroller.y - snap.y), 1000)
					), 300);

			if ( this.scroller.x != snap.x || this.scroller.y != snap.y ) {
				this.scroller.directionX = 0;
				this.scroller.directionY = 0;
				this.scroller.currentPage = snap;
				this.scroller.scrollTo(snap.x, snap.y, time, this.scroller.options.bounceEasing);
			}
		}

		if ( this.moved ) {
			this.scroller._execEvent('scrollEnd');
		}
	},

	transitionTime: function (time) {
		time = time || 0;
		this.indicatorStyle[utils.style.transitionDuration] = time + 'ms';

		if ( !time && utils.isBadAndroid ) {
			this.indicatorStyle[utils.style.transitionDuration] = '0.001s';
		}
	},

	transitionTimingFunction: function (easing) {
		this.indicatorStyle[utils.style.transitionTimingFunction] = easing;
	},

	refresh: function () {
		this.transitionTime();

		if ( this.options.listenX && !this.options.listenY ) {
			this.indicatorStyle.display = this.scroller.hasHorizontalScroll ? 'block' : 'none';
		} else if ( this.options.listenY && !this.options.listenX ) {
			this.indicatorStyle.display = this.scroller.hasVerticalScroll ? 'block' : 'none';
		} else {
			this.indicatorStyle.display = this.scroller.hasHorizontalScroll || this.scroller.hasVerticalScroll ? 'block' : 'none';
		}

		if ( this.scroller.hasHorizontalScroll && this.scroller.hasVerticalScroll ) {
			utils.addClass(this.wrapper, 'iScrollBothScrollbars');
			utils.removeClass(this.wrapper, 'iScrollLoneScrollbar');

			if ( this.options.defaultScrollbars && this.options.customStyle ) {
				if ( this.options.listenX ) {
					this.wrapper.style.right = '8px';
				} else {
					this.wrapper.style.bottom = '8px';
				}
			}
		} else {
			utils.removeClass(this.wrapper, 'iScrollBothScrollbars');
			utils.addClass(this.wrapper, 'iScrollLoneScrollbar');

			if ( this.options.defaultScrollbars && this.options.customStyle ) {
				if ( this.options.listenX ) {
					this.wrapper.style.right = '2px';
				} else {
					this.wrapper.style.bottom = '2px';
				}
			}
		}

		var r = this.wrapper.offsetHeight;	// force refresh

		if ( this.options.listenX ) {
			this.wrapperWidth = this.wrapper.clientWidth;
			if ( this.options.resize ) {
				this.indicatorWidth = Math.max(Math.round(this.wrapperWidth * this.wrapperWidth / (this.scroller.scrollerWidth || this.wrapperWidth || 1)), 8);
				this.indicatorStyle.width = this.indicatorWidth + 'px';
			} else {
				this.indicatorWidth = this.indicator.clientWidth;
			}

			this.maxPosX = this.wrapperWidth - this.indicatorWidth;

			if ( this.options.shrink == 'clip' ) {
				this.minBoundaryX = -this.indicatorWidth + 8;
				this.maxBoundaryX = this.wrapperWidth - 8;
			} else {
				this.minBoundaryX = 0;
				this.maxBoundaryX = this.maxPosX;
			}

			this.sizeRatioX = this.options.speedRatioX || (this.scroller.maxScrollX && (this.maxPosX / this.scroller.maxScrollX));	
		}

		if ( this.options.listenY ) {
			this.wrapperHeight = this.wrapper.clientHeight;
			if ( this.options.resize ) {
				this.indicatorHeight = Math.max(Math.round(this.wrapperHeight * this.wrapperHeight / (this.scroller.scrollerHeight || this.wrapperHeight || 1)), 8);
				this.indicatorStyle.height = this.indicatorHeight + 'px';
			} else {
				this.indicatorHeight = this.indicator.clientHeight;
			}

			this.maxPosY = this.wrapperHeight - this.indicatorHeight;

			if ( this.options.shrink == 'clip' ) {
				this.minBoundaryY = -this.indicatorHeight + 8;
				this.maxBoundaryY = this.wrapperHeight - 8;
			} else {
				this.minBoundaryY = 0;
				this.maxBoundaryY = this.maxPosY;
			}

			this.maxPosY = this.wrapperHeight - this.indicatorHeight;
			this.sizeRatioY = this.options.speedRatioY || (this.scroller.maxScrollY && (this.maxPosY / this.scroller.maxScrollY));
		}

		this.updatePosition();
	},

	updatePosition: function () {
		var x = this.options.listenX && Math.round(this.sizeRatioX * this.scroller.x) || 0,
			y = this.options.listenY && Math.round(this.sizeRatioY * this.scroller.y) || 0;

		if ( !this.options.ignoreBoundaries ) {
			if ( x < this.minBoundaryX ) {
				if ( this.options.shrink == 'scale' ) {
					this.width = Math.max(this.indicatorWidth + x, 8);
					this.indicatorStyle.width = this.width + 'px';
				}
				x = this.minBoundaryX;
			} else if ( x > this.maxBoundaryX ) {
				if ( this.options.shrink == 'scale' ) {
					this.width = Math.max(this.indicatorWidth - (x - this.maxPosX), 8);
					this.indicatorStyle.width = this.width + 'px';
					x = this.maxPosX + this.indicatorWidth - this.width;
				} else {
					x = this.maxBoundaryX;
				}
			} else if ( this.options.shrink == 'scale' && this.width != this.indicatorWidth ) {
				this.width = this.indicatorWidth;
				this.indicatorStyle.width = this.width + 'px';
			}

			if ( y < this.minBoundaryY ) {
				if ( this.options.shrink == 'scale' ) {
					this.height = Math.max(this.indicatorHeight + y * 3, 8);
					this.indicatorStyle.height = this.height + 'px';
				}
				y = this.minBoundaryY;
			} else if ( y > this.maxBoundaryY ) {
				if ( this.options.shrink == 'scale' ) {
					this.height = Math.max(this.indicatorHeight - (y - this.maxPosY) * 3, 8);
					this.indicatorStyle.height = this.height + 'px';
					y = this.maxPosY + this.indicatorHeight - this.height;
				} else {
					y = this.maxBoundaryY;
				}
			} else if ( this.options.shrink == 'scale' && this.height != this.indicatorHeight ) {
				this.height = this.indicatorHeight;
				this.indicatorStyle.height = this.height + 'px';
			}
		}

		this.x = x;
		this.y = y;

		if ( this.scroller.options.useTransform ) {
			this.indicatorStyle[utils.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.scroller.translateZ;
		} else {
			this.indicatorStyle.left = x + 'px';
			this.indicatorStyle.top = y + 'px';
		}
	},

	_pos: function (x, y) {
		if ( x < 0 ) {
			x = 0;
		} else if ( x > this.maxPosX ) {
			x = this.maxPosX;
		}

		if ( y < 0 ) {
			y = 0;
		} else if ( y > this.maxPosY ) {
			y = this.maxPosY;
		}

		x = this.options.listenX ? Math.round(x / this.sizeRatioX) : this.scroller.x;
		y = this.options.listenY ? Math.round(y / this.sizeRatioY) : this.scroller.y;

		this.scroller.scrollTo(x, y);
	},

	fade: function (val, hold) {
		if ( hold && !this.visible ) {
			return;
		}

		clearTimeout(this.fadeTimeout);
		this.fadeTimeout = null;

		var time = val ? 250 : 500,
			delay = val ? 0 : 300;

		val = val ? '1' : '0';

		this.wrapperStyle[utils.style.transitionDuration] = time + 'ms';

		this.fadeTimeout = setTimeout((function (val) {
			this.wrapperStyle.opacity = val;
			this.visible = +val;
		}).bind(this, val), delay);
	}
};

IScroll.utils = utils;

// webview webapp 适配都直接搞到 window 上
// if ( typeof module != 'undefined' && module.exports ) {
// 	module.exports = IScroll;
// } else {
	window.IScroll = IScroll;
// }

})(window, document, Math);
;/*!/src/static/lib/js/third/fastclick.js*/
(function () {
	'use strict';
	
	/**
	 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
	 *
	 * @version 1.0.3
	 * @codingstandard ftlabs-jsv2
	 * @copyright The Financial Times Limited [All Rights Reserved]
	 * @license MIT License (see LICENSE.txt)
	 */
	
	/*jslint browser:true, node:true*/
	/*global define, Event, Node*/
	
	
	/**
	 * Instantiate fast-clicking listeners on the specified layer.
	 *
	 * @constructor
	 * @param {Element} layer The layer to listen on
	 * @param {Object} options The options to override the defaults
	 */
	function FastClick(layer, options) {
		var oldOnClick;
	
		options = options || {};
	
		/**
		 * Whether a click is currently being tracked.
		 *
		 * @type boolean
		 */
		this.trackingClick = false;
	
	
		/**
		 * Timestamp for when click tracking started.
		 *
		 * @type number
		 */
		this.trackingClickStart = 0;
	
	
		/**
		 * The element being tracked for a click.
		 *
		 * @type EventTarget
		 */
		this.targetElement = null;
	
	
		/**
		 * X-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartX = 0;
	
	
		/**
		 * Y-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartY = 0;
	
	
		/**
		 * ID of the last touch, retrieved from Touch.identifier.
		 *
		 * @type number
		 */
		this.lastTouchIdentifier = 0;
	
	
		/**
		 * Touchmove boundary, beyond which a click will be cancelled.
		 *
		 * @type number
		 */
		this.touchBoundary = options.touchBoundary || 10;
	
	
		/**
		 * The FastClick layer.
		 *
		 * @type Element
		 */
		this.layer = layer;
	
		/**
		 * The minimum time between tap(touchstart and touchend) events
		 *
		 * @type number
		 */
		this.tapDelay = options.tapDelay || 200;
	
		if (FastClick.notNeeded(layer)) {
			return;
		}
	
		// Some old versions of Android don't have Function.prototype.bind
		function bind(method, context) {
			return function() { return method.apply(context, arguments); };
		}
	
	
		var methods = ['onMouse', 'onClick', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
		var context = this;
		for (var i = 0, l = methods.length; i < l; i++) {
			context[methods[i]] = bind(context[methods[i]], context);
		}
	
		// Set up event handlers as required
		if (deviceIsAndroid) {
			layer.addEventListener('mouseover', this.onMouse, true);
			layer.addEventListener('mousedown', this.onMouse, true);
			layer.addEventListener('mouseup', this.onMouse, true);
		}
	
		layer.addEventListener('click', this.onClick, true);
		layer.addEventListener('touchstart', this.onTouchStart, false);
		layer.addEventListener('touchmove', this.onTouchMove, false);
		layer.addEventListener('touchend', this.onTouchEnd, false);
		layer.addEventListener('touchcancel', this.onTouchCancel, false);
	
		// Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
		// which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
		// layer when they are cancelled.
		if (!Event.prototype.stopImmediatePropagation) {
			layer.removeEventListener = function(type, callback, capture) {
				var rmv = Node.prototype.removeEventListener;
				if (type === 'click') {
					rmv.call(layer, type, callback.hijacked || callback, capture);
				} else {
					rmv.call(layer, type, callback, capture);
				}
			};
	
			layer.addEventListener = function(type, callback, capture) {
				var adv = Node.prototype.addEventListener;
				if (type === 'click') {
					adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
						if (!event.propagationStopped) {
							callback(event);
						}
					}), capture);
				} else {
					adv.call(layer, type, callback, capture);
				}
			};
		}
	
		// If a handler is already declared in the element's onclick attribute, it will be fired before
		// FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
		// adding it as listener.
		if (typeof layer.onclick === 'function') {
	
			// Android browser on at least 3.2 requires a new reference to the function in layer.onclick
			// - the old one won't work if passed to addEventListener directly.
			oldOnClick = layer.onclick;
			layer.addEventListener('click', function(event) {
				oldOnClick(event);
			}, false);
			layer.onclick = null;
		}
	}
	
	
	/**
	 * Android requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0;
	
	
	/**
	 * iOS requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent);
	
	
	/**
	 * iOS 4 requires an exception for select elements.
	 *
	 * @type boolean
	 */
	var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);
	
	
	/**
	 * iOS 6.0(+?) requires the target element to be manually derived
	 *
	 * @type boolean
	 */
	var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS ([6-9]|\d{2})_\d/).test(navigator.userAgent);
	
	/**
	 * BlackBerry requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsBlackBerry10 = navigator.userAgent.indexOf('BB10') > 0;
	
	/**
	 * Determine whether a given element requires a native click.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element needs a native click
	 */
	FastClick.prototype.needsClick = function(target) {
		switch (target.nodeName.toLowerCase()) {
	
		// Don't send a synthetic click to disabled inputs (issue #62)
		case 'button':
		case 'select':
		case 'textarea':
			if (target.disabled) {
				return true;
			}
	
			break;
		case 'input':
	
			// File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
			if ((deviceIsIOS && target.type === 'file') || target.disabled) {
				return true;
			}
	
			break;
		case 'label':
		case 'video':
			return true;
		}
	
		return (/\bneedsclick\b/).test(target.className);
	};
	
	
	/**
	 * Determine whether a given element requires a call to focus to simulate click into element.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
	 */
	FastClick.prototype.needsFocus = function(target) {
		switch (target.nodeName.toLowerCase()) {
		case 'textarea':
			return true;
		case 'select':
			return !deviceIsAndroid;
		case 'input':
			switch (target.type) {
			case 'button':
			case 'checkbox':
			case 'file':
			case 'image':
			case 'radio':
			case 'submit':
				return false;
			}
	
			// No point in attempting to focus disabled inputs
			return !target.disabled && !target.readOnly;
		default:
			return (/\bneedsfocus\b/).test(target.className);
		}
	};
	
	
	/**
	 * Send a click event to the specified element.
	 *
	 * @param {EventTarget|Element} targetElement
	 * @param {Event} event
	 */
	FastClick.prototype.sendClick = function(targetElement, event) {
		var clickEvent, touch;
	
		// On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
		if (document.activeElement && document.activeElement !== targetElement) {
			document.activeElement.blur();
		}
	
		touch = event.changedTouches[0];
	
		// Synthesise a click event, with an extra attribute so it can be tracked
		clickEvent = document.createEvent('MouseEvents');
		clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
		clickEvent.forwardedTouchEvent = true;
		targetElement.dispatchEvent(clickEvent);
	};
	
	FastClick.prototype.determineEventType = function(targetElement) {
	
		//Issue #159: Android Chrome Select Box does not open with a synthetic click event
		if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
			return 'mousedown';
		}
	
		return 'click';
	};
	
	
	/**
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.focus = function(targetElement) {
		var length;
	
		// Issue #160: on iOS 7, some input elements (e.g. date datetime) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
		if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time') {
			length = targetElement.value.length;
			targetElement.setSelectionRange(length, length);
		} else {
			targetElement.focus();
		}
	};
	
	
	/**
	 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
	 *
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.updateScrollParent = function(targetElement) {
		var scrollParent, parentElement;
	
		scrollParent = targetElement.fastClickScrollParent;
	
		// Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
		// target element was moved to another parent.
		if (!scrollParent || !scrollParent.contains(targetElement)) {
			parentElement = targetElement;
			do {
				if (parentElement.scrollHeight > parentElement.offsetHeight) {
					scrollParent = parentElement;
					targetElement.fastClickScrollParent = parentElement;
					break;
				}
	
				parentElement = parentElement.parentElement;
			} while (parentElement);
		}
	
		// Always update the scroll top tracker if possible.
		if (scrollParent) {
			scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
		}
	};
	
	
	/**
	 * @param {EventTarget} targetElement
	 * @returns {Element|EventTarget}
	 */
	FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {
	
		// On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
		if (eventTarget.nodeType === Node.TEXT_NODE) {
			return eventTarget.parentNode;
		}
	
		return eventTarget;
	};
	
	
	/**
	 * On touch start, record the position and scroll offset.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchStart = function(event) {
		var targetElement, touch, selection;
	
		// Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
		if (event.targetTouches.length > 1) {
			return true;
		}
	
		targetElement = this.getTargetElementFromEventTarget(event.target);
		touch = event.targetTouches[0];
	
		if (deviceIsIOS) {
	
			// Only trusted events will deselect text on iOS (issue #49)
			selection = window.getSelection();
			if (selection.rangeCount && !selection.isCollapsed) {
				return true;
			}
	
			if (!deviceIsIOS4) {
	
				// Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
				// when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
				// with the same identifier as the touch event that previously triggered the click that triggered the alert.
				// Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
				// immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
				// Issue 120: touch.identifier is 0 when Chrome dev tools 'Emulate touch events' is set with an iOS device UA string,
				// which causes all touch events to be ignored. As this block only applies to iOS, and iOS identifiers are always long,
				// random integers, it's safe to to continue if the identifier is 0 here.
				if (touch.identifier && touch.identifier === this.lastTouchIdentifier) {
					event.preventDefault();
					return false;
				}
	
				this.lastTouchIdentifier = touch.identifier;
	
				// If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
				// 1) the user does a fling scroll on the scrollable layer
				// 2) the user stops the fling scroll with another tap
				// then the event.target of the last 'touchend' event will be the element that was under the user's finger
				// when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
				// is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
				this.updateScrollParent(targetElement);
			}
		}
	
		this.trackingClick = true;
		this.trackingClickStart = event.timeStamp;
		this.targetElement = targetElement;
	
		this.touchStartX = touch.pageX;
		this.touchStartY = touch.pageY;
	
		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			event.preventDefault();
		}
	
		return true;
	};
	
	
	/**
	 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.touchHasMoved = function(event) {
		var touch = event.changedTouches[0], boundary = this.touchBoundary;
	
		if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
			return true;
		}
	
		return false;
	};
	
	
	/**
	 * Update the last position.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchMove = function(event) {
		if (!this.trackingClick) {
			return true;
		}
	
		// If the touch has moved, cancel the click tracking
		if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
			this.trackingClick = false;
			this.targetElement = null;
		}
	
		return true;
	};
	
	
	/**
	 * Attempt to find the labelled control for the given label element.
	 *
	 * @param {EventTarget|HTMLLabelElement} labelElement
	 * @returns {Element|null}
	 */
	FastClick.prototype.findControl = function(labelElement) {
	
		// Fast path for newer browsers supporting the HTML5 control attribute
		if (labelElement.control !== undefined) {
			return labelElement.control;
		}
	
		// All browsers under test that support touch events also support the HTML5 htmlFor attribute
		if (labelElement.htmlFor) {
			return document.getElementById(labelElement.htmlFor);
		}
	
		// If no for attribute exists, attempt to retrieve the first labellable descendant element
		// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
		return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
	};
	
	
	/**
	 * On touch end, determine whether to send a click event at once.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchEnd = function(event) {
		var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;
	
		if (!this.trackingClick) {
			return true;
		}
	
		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			this.cancelNextClick = true;
			return true;
		}
	
		// Reset to prevent wrong click cancel on input (issue #156).
		this.cancelNextClick = false;
	
		this.lastClickTime = event.timeStamp;
	
		trackingClickStart = this.trackingClickStart;
		this.trackingClick = false;
		this.trackingClickStart = 0;
	
		// On some iOS devices, the targetElement supplied with the event is invalid if the layer
		// is performing a transition or scroll, and has to be re-detected manually. Note that
		// for this to function correctly, it must be called *after* the event target is checked!
		// See issue #57; also filed as rdar://13048589 .
		if (deviceIsIOSWithBadTarget) {
			touch = event.changedTouches[0];
	
			// In certain cases arguments of elementFromPoint can be negative, so prevent setting targetElement to null
			targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
			targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
		}
	
		targetTagName = targetElement.tagName.toLowerCase();
		if (targetTagName === 'label') {
			forElement = this.findControl(targetElement);
			if (forElement) {
				this.focus(targetElement);
				if (deviceIsAndroid) {
					return false;
				}
	
				targetElement = forElement;
			}
		} else if (this.needsFocus(targetElement)) {
	
			// Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
			// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
			if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
				this.targetElement = null;
				return false;
			}
	
			this.focus(targetElement);
			this.sendClick(targetElement, event);
	
			// Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
			// Also this breaks opening selects when VoiceOver is active on iOS6, iOS7 (and possibly others)
			if (!deviceIsIOS || targetTagName !== 'select') {
				this.targetElement = null;
				event.preventDefault();
			}
	
			return false;
		}
	
		if (deviceIsIOS && !deviceIsIOS4) {
	
			// Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
			// and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
			scrollParent = targetElement.fastClickScrollParent;
			if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
				return true;
			}
		}
	
		// Prevent the actual click from going though - unless the target node is marked as requiring
		// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
		if (!this.needsClick(targetElement)) {
			event.preventDefault();
			this.sendClick(targetElement, event);
		}
	
		return false;
	};
	
	
	/**
	 * On touch cancel, stop tracking the click.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.onTouchCancel = function() {
		this.trackingClick = false;
		this.targetElement = null;
	};
	
	
	/**
	 * Determine mouse events which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onMouse = function(event) {
	
		// If a target element was never set (because a touch event was never fired) allow the event
		if (!this.targetElement) {
			return true;
		}
	
		if (event.forwardedTouchEvent) {
			return true;
		}
	
		// Programmatically generated events targeting a specific element should be permitted
		if (!event.cancelable) {
			return true;
		}
	
		// Derive and check the target element to see whether the mouse event needs to be permitted;
		// unless explicitly enabled, prevent non-touch click events from triggering actions,
		// to prevent ghost/doubleclicks.
		if (!this.needsClick(this.targetElement) || this.cancelNextClick) {
	
			// Prevent any user-added listeners declared on FastClick element from being fired.
			if (event.stopImmediatePropagation) {
				event.stopImmediatePropagation();
			} else {
	
				// Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
				event.propagationStopped = true;
			}
	
			// Cancel the event
			event.stopPropagation();
			event.preventDefault();
	
			return false;
		}
	
		// If the mouse event is permitted, return true for the action to go through.
		return true;
	};
	
	
	/**
	 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
	 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
	 * an actual click which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onClick = function(event) {
		var permitted;
	
		// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
		if (this.trackingClick) {
			this.targetElement = null;
			this.trackingClick = false;
			return true;
		}
	
		// Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
		if (event.target.type === 'submit' && event.detail === 0) {
			return true;
		}
	
		permitted = this.onMouse(event);
	
		// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
		if (!permitted) {
			this.targetElement = null;
		}
	
		// If clicks are permitted, return true for the action to go through.
		return permitted;
	};
	
	
	/**
	 * Remove all FastClick's event listeners.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.destroy = function() {
		var layer = this.layer;
	
		if (deviceIsAndroid) {
			layer.removeEventListener('mouseover', this.onMouse, true);
			layer.removeEventListener('mousedown', this.onMouse, true);
			layer.removeEventListener('mouseup', this.onMouse, true);
		}
	
		layer.removeEventListener('click', this.onClick, true);
		layer.removeEventListener('touchstart', this.onTouchStart, false);
		layer.removeEventListener('touchmove', this.onTouchMove, false);
		layer.removeEventListener('touchend', this.onTouchEnd, false);
		layer.removeEventListener('touchcancel', this.onTouchCancel, false);
	};
	
	
	/**
	 * Check whether FastClick is needed.
	 *
	 * @param {Element} layer The layer to listen on
	 */
	FastClick.notNeeded = function(layer) {
		var metaViewport;
		var chromeVersion;
		var blackberryVersion;
	
		// Devices that don't support touch don't need FastClick
		if (typeof window.ontouchstart === 'undefined') {
			return true;
		}
	
		// Chrome version - zero for other browsers
		chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];
	
		if (chromeVersion) {
	
			if (deviceIsAndroid) {
				metaViewport = document.querySelector('meta[name=viewport]');
	
				if (metaViewport) {
					// Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// Chrome 32 and above with width=device-width or less don't need FastClick
					if (chromeVersion > 31 && document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}
	
			// Chrome desktop doesn't need FastClick (issue #15)
			} else {
				return true;
			}
		}
	
		if (deviceIsBlackBerry10) {
			blackberryVersion = navigator.userAgent.match(/Version\/([0-9]*)\.([0-9]*)/);
	
			// BlackBerry 10.3+ does not require Fastclick library.
			// https://github.com/ftlabs/fastclick/issues/251
			if (blackberryVersion[1] >= 10 && blackberryVersion[2] >= 3) {
				metaViewport = document.querySelector('meta[name=viewport]');
	
				if (metaViewport) {
					// user-scalable=no eliminates click delay.
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// width=device-width (or less than device-width) eliminates click delay.
					if (document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}
			}
		}
	
		// IE10 with -ms-touch-action: none, which disables double-tap-to-zoom (issue #97)
		if (layer.style.msTouchAction === 'none') {
			return true;
		}
	
		return false;
	};
	
	
	/**
	 * Factory method for creating a FastClick object
	 *
	 * @param {Element} layer The layer to listen on
	 * @param {Object} options The options to override the defaults
	 */
	FastClick.attach = function(layer, options) {
		return new FastClick(layer, options);
	};
	
	window.FastClick = FastClick;
}());

;/*!/src/static/lib/js/third/jsmod.mobile.js*/
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
 * 0.1.3
 * 修复 dialog animate show、hide bug
 * 修复 dialog、layer hide、show 时不能为相同状态
 */
(function (root) {
    /**
     * @namespace
     * @name jsmod
     */
    root.jsmod = {
        version: "0.1.3"
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
    var detector = root.jsmod.detector,
        _result,
        _ua;

    _ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

    // detector.isAnimation = function () {
    //     var gradeA = detector.os().ios 
    //             && detector.os().osversion 
    //             && detector.os().osversion.split(".")[0] >= 6; 

    //     return !!($.fx) && !!gradeA;
    // }
    /**
     * 判断是否支持动画
     * @return {Boolean} [description]
     */
    detector.isAnimation = function () {
        return !!($.fx);
    }

    /**
     * 获取当前浏览器的相关信息
     * @return {object} resutl             各种浏览器信息
     * @return {string} resutl.name        客户端名如：Andriod, iPhone, iPad
     * @return {string} resutl.version     浏览器版本
     * @return {string} resutl.osversion   操作系统版本（性能判断的关键指标）
     * @return {string} resutl.os          操作系统：ios, andriod
     * @return {bool}   [resutl.ios]       是否为 ios 系统
     * @return {bool}   [resutl.android]   是否为 android 系统
     */
    detector.os = function () {
        return _result;
    }

    _result = (function (ua) {
        if (!ua) {
            return {};
        }

        function getFirstMatch (regex) {
            var match = ua.match(regex);
            return (match && match.length > 1 && match[1]) || '';
        }

        var iosdevice = getFirstMatch(/(ipod|iphone|ipad)/i).toLowerCase(),
            likeAndroid = /like android/i.test(ua),
            android = !likeAndroid && /android/i.test(ua),
            versionIdentifier = getFirstMatch(/version\/(\d+(\.\d+)?)/i),
            tablet = /tablet/i.test(ua),
            t = true,
            result;

    
        if (iosdevice) {
            result = {
                name : iosdevice == 'iphone' ? 'iPhone' : iosdevice == 'ipad' ? 'iPad' : 'iPod'
            };
            // WTF: version is not part of user agent in web apps
            if (versionIdentifier) {
                result.version = versionIdentifier;
            };
        } else if (android) {
            result = {
                name: 'Android',
                version: versionIdentifier
            };
        } else {
            result = {};
        }

        // set OS flags for platforms that have multiple browsers
        if (android) {
            result.android = t;
            result.os = "android";
        } else if (iosdevice) {
            result[iosdevice] = t;
            result.ios = t;
            result.os = "ios";
        }

        // 系统版本
        var osVersion = '';

        if (iosdevice) {
            osVersion = getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i);
            osVersion = osVersion.replace(/[_\s]/g, '.');
        } else if (android) {
            osVersion = getFirstMatch(/android[ \/-](\d+(\.\d+)*)/i);
        }

        if (osVersion) {
            result.osversion = osVersion;
        }

        return result;
    })(_ua);
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
            // 动画用的回调栈
            self._callBackStack = [];

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
            var self = this;

            // 不能重复显示
            if (self.isShown()) {
                return;
            }

            if (self.trigger("beforeshow").isDefaultPrevented()) {
                return;
            }

            self._mask.show().appendTo(document.body);

            // 如果 root 不在 _mask 里面则要单独放置
            if (!self.option.isInFixed) {
                self._root.show().appendTo(document.body);
            }

            self.createIscroll();
            self.adjuestPosition();
            self.trigger("shown");
            self.option.shownCallback && self.option.shownCallback.apply(self);

            if (self.option.isAnimation) {
                self._mask.css({
                        "opacity": 0.01,
                        "-webkit-transform": self.option.isScaleAnimation ? "scale(1.1)" : "scale(1)"
                    }).animate({
                        "opacity": 1,
                        "-webkit-transform": "scale(1)"
                    }, self.option.animateCount, "linear", function () {
                        while (self._callBackStack.length) {
                            (self._callBackStack.shift())();
                        }
                    });
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
         * 创建上下文绑定
         * @private
         */
        _createContextBind: function (fun, context) {
            return $.proxy(fun, context);
        },
        /**
         * 调用隐藏 dialog
         * 隐藏前会触发 beforehide 事件，隐藏完毕后会触发 hidden 事件
         * @fires Dialog#beforehide
         * @fires Dialog#hidden
         */
        hide: function () {
            var self = this,
                hideCb;

            // 不能隐藏显示
            if (!self.isShown()) {
                return;
            }

            if (this.trigger("beforehide").isDefaultPrevented()) {
                return;
            }

            hideCb = self._createContextBind(function () {
                this._mask.css({
                    "opacity": "1",
                    "-webkit-transform": "scale(1)"
                }).hide().remove();
                // 如果 root 不在 _mask 里面则要单独删除
                if (!this.option.isInFixed) {
                    this._root.remove();
                }
                this.trigger("hidden");
                this.option.hiddenCallback && this.option.hiddenCallback.apply(this);
            }, this);

            // 加入栈确保都会执行
            self._callBackStack.push(hideCb);

            if (self.option.isAnimation) {
                self._mask.animate({
                    "opacity": 0,
                    "-webkit-transform": this.option.isScaleAnimation ? "scale(1.1)" : "scale(1)"
                }, self.option.animateCount, "linear", function () {
                    while (self._callBackStack.length) {
                        (self._callBackStack.shift())();
                    }
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

            self._alertButton && self._alertButton.on("tap", function (e) {
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
                disableTouch: option.disableTouch || false,
                momentum: self.option.count == 1 ? false : true,
                scrollbars: self.option.scrollbars || false
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
        opacity: 0.7,                  // 蒙层透明度
        direction: 'vertical',         // layer 的出现方式，默认 vertical，可选：horizontal
        horizontalFloat: 'right'       // layer 在 horizontal 时的浮动方式
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
                height = $(window).height(),
                width = $(window).width();

            self.option = $.extend({}, _option, option);
            // 动画用的回调栈
            self._callBackStack = [];

            // 动画是否支持设置
            self.option.isAnimation = jsmod.detector.isAnimation() ? self.option.isAnimation : false;

            self.$maskScreen = self.createScreenEl().appendTo("body")
                .css("min-height", height)
                .css("background-color", "rgba(0, 0, 0," + self.option.opacity + ")");

            self.$maskContent = self.createContent().appendTo(self.$maskScreen);

            // 判断不同的朝向
            if (self.option.direction == 'vertical') {
                // 如果设置了高度就用高度，否则将最小高度设置为屏幕高度
                if (self.option.height) {
                    self.$maskContent.css("height", self.option.height);
                } else {
                    self.$maskContent.css("min-height", height);
                }
            } else {
                self.$maskContent.css('min-height', height);

                if (self.option.width) {
                    self.$maskContent.css('width', self.option.width);
                } else {
                    self.$maskContent.css('width', width);
                }

                self.$maskContent.css('float', self.option.horizontalFloat);
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

            // 不能重复显示
            if (self.isShown()) {
                return;
            }

            if (this.trigger("beforeshow").isDefaultPrevented()) {
                return;
            }
            
            // 开启动画的情况
            if (self.option.isAnimation && self.option.direction == 'vertical') {
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

            // 不能重复显示
            if (!self.isShown()) {
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

            if (self.option.isAnimation && self.option.direction == 'vertical') {
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
;/*!/src/static/lib/js/third/swig.min.js*/
/*! Swig v1.4.2 | https://paularmstrong.github.com/swig | @license https://github.com/paularmstrong/swig/blob/master/LICENSE */
/*! DateZ (c) 2011 Tomo Universalis | @license https://github.com/TomoUniversalis/DateZ/blob/master/LISENCE */
!function e(t,n,r){function o(a,s){if(!n[a]){if(!t[a]){var u="function"==typeof require&&require;if(!s&&u)return u(a,!0);if(i)return i(a,!0);throw new Error("Cannot find module '"+a+"'")}var c=n[a]={exports:{}};t[a][0].call(c.exports,function(e){var n=t[a][1][e];return o(n?n:e)},c,c.exports,e,t,n,r)}return n[a].exports}for(var i="function"==typeof require&&require,a=0;a<r.length;a++)o(r[a]);return o}({1:[function(e){var t=e("../lib/swig");"function"==typeof window.define&&"object"==typeof window.define.amd?window.define("swig",[],function(){return t}):window.swig=t},{"../lib/swig":9}],2:[function(e,t,n){var r=e("./utils"),o={full:["January","February","March","April","May","June","July","August","September","October","November","December"],abbr:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]},i={full:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],abbr:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],alt:{"-1":"Yesterday",0:"Today",1:"Tomorrow"}};n.tzOffset=0,n.DateZ=function(){var e={"default":["getUTCDate","getUTCDay","getUTCFullYear","getUTCHours","getUTCMilliseconds","getUTCMinutes","getUTCMonth","getUTCSeconds","toISOString","toGMTString","toUTCString","valueOf","getTime"],z:["getDate","getDay","getFullYear","getHours","getMilliseconds","getMinutes","getMonth","getSeconds","getYear","toDateString","toLocaleDateString","toLocaleTimeString"]},t=this;t.date=t.dateZ=arguments.length>1?new Date(Date.UTC.apply(Date,arguments)+6e4*(new Date).getTimezoneOffset()):1===arguments.length?new Date(new Date(arguments[0])):new Date,t.timezoneOffset=t.dateZ.getTimezoneOffset(),r.each(e.z,function(e){t[e]=function(){return t.dateZ[e]()}}),r.each(e["default"],function(e){t[e]=function(){return t.date[e]()}}),this.setTimezoneOffset(n.tzOffset)},n.DateZ.prototype={getTimezoneOffset:function(){return this.timezoneOffset},setTimezoneOffset:function(e){return this.timezoneOffset=e,this.dateZ=new Date(this.date.getTime()+6e4*this.date.getTimezoneOffset()-6e4*this.timezoneOffset),this}},n.d=function(e){return(e.getDate()<10?"0":"")+e.getDate()},n.D=function(e){return i.abbr[e.getDay()]},n.j=function(e){return e.getDate()},n.l=function(e){return i.full[e.getDay()]},n.N=function(e){var t=e.getDay();return t>=1?t:7},n.S=function(e){var t=e.getDate();return t%10===1&&11!==t?"st":t%10===2&&12!==t?"nd":t%10===3&&13!==t?"rd":"th"},n.w=function(e){return e.getDay()},n.z=function(e,t,r){var o=e.getFullYear(),i=new n.DateZ(o,e.getMonth(),e.getDate(),12,0,0),a=new n.DateZ(o,0,1,12,0,0);return i.setTimezoneOffset(t,r),a.setTimezoneOffset(t,r),Math.round((i-a)/864e5)},n.W=function(e){var t,n=new Date(e.valueOf()),r=(e.getDay()+6)%7;return n.setDate(n.getDate()-r+3),t=n.valueOf(),n.setMonth(0,1),4!==n.getDay()&&n.setMonth(0,1+(4-n.getDay()+7)%7),1+Math.ceil((t-n)/6048e5)},n.F=function(e){return o.full[e.getMonth()]},n.m=function(e){return(e.getMonth()<9?"0":"")+(e.getMonth()+1)},n.M=function(e){return o.abbr[e.getMonth()]},n.n=function(e){return e.getMonth()+1},n.t=function(e){return 32-new Date(e.getFullYear(),e.getMonth(),32).getDate()},n.L=function(e){return 29===new Date(e.getFullYear(),1,29).getDate()},n.o=function(e){var t=new Date(e.valueOf());return t.setDate(t.getDate()-(e.getDay()+6)%7+3),t.getFullYear()},n.Y=function(e){return e.getFullYear()},n.y=function(e){return e.getFullYear().toString().substr(2)},n.a=function(e){return e.getHours()<12?"am":"pm"},n.A=function(e){return e.getHours()<12?"AM":"PM"},n.B=function(e){var t,n=e.getUTCHours();return n=23===n?0:n+1,t=Math.abs((60*(60*n+e.getUTCMinutes())+e.getUTCSeconds())/86.4).toFixed(0),"000".concat(t).slice(t.length)},n.g=function(e){var t=e.getHours();return 0===t?12:t>12?t-12:t},n.G=function(e){return e.getHours()},n.h=function(e){var t=e.getHours();return(10>t||t>12&&22>t?"0":"")+(12>t?t:t-12)},n.H=function(e){var t=e.getHours();return(10>t?"0":"")+t},n.i=function(e){var t=e.getMinutes();return(10>t?"0":"")+t},n.s=function(e){var t=e.getSeconds();return(10>t?"0":"")+t},n.O=function(e){var t=e.getTimezoneOffset();return(0>t?"-":"+")+(10>t/60?"0":"")+Math.abs(t/60)+"00"},n.Z=function(e){return 60*e.getTimezoneOffset()},n.c=function(e){return e.toISOString()},n.r=function(e){return e.toUTCString()},n.U=function(e){return e.getTime()/1e3}},{"./utils":26}],3:[function(e,t,n){function r(e){var t=this,n={};return o.isArray(e)?o.map(e,function(){return t.apply(null,arguments)}):"object"==typeof e?(o.each(e,function(e,r){n[r]=t.apply(null,arguments)}),n):void 0}var o=e("./utils"),i=e("./dateformatter");n.addslashes=function(e){var t=r.apply(n.addslashes,arguments);return void 0!==t?t:e.replace(/\\/g,"\\\\").replace(/\'/g,"\\'").replace(/\"/g,'\\"')},n.capitalize=function(e){var t=r.apply(n.capitalize,arguments);return void 0!==t?t:e.toString().charAt(0).toUpperCase()+e.toString().substr(1).toLowerCase()},n.date=function(e,t,n,r){var o,a=t.length,s=new i.DateZ(e),u=0,c="";for(n&&s.setTimezoneOffset(n,r),u;a>u;u+=1)o=t.charAt(u),"\\"===o?(u+=1,c+=a>u?t.charAt(u):o):c+=i.hasOwnProperty(o)?i[o](s,n,r):o;return c},n["default"]=function(e,t){return"undefined"==typeof e||!e&&"number"!=typeof e?t:e},n.escape=function(e,t){var o,i=r.apply(n.escape,arguments),a=e,s=0;if(void 0!==i)return i;if("string"!=typeof e)return e;switch(i="",t){case"js":for(a=a.replace(/\\/g,"\\u005C"),s;s<a.length;s+=1)o=a.charCodeAt(s),32>o?(o=o.toString(16).toUpperCase(),o=o.length<2?"0"+o:o,i+="\\u00"+o):i+=a[s];return i.replace(/&/g,"\\u0026").replace(/</g,"\\u003C").replace(/>/g,"\\u003E").replace(/\'/g,"\\u0027").replace(/"/g,"\\u0022").replace(/\=/g,"\\u003D").replace(/-/g,"\\u002D").replace(/;/g,"\\u003B");default:return a.replace(/&(?!amp;|lt;|gt;|quot;|#39;)/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}},n.e=n.escape,n.first=function(e){if("object"==typeof e&&!o.isArray(e)){var t=o.keys(e);return e[t[0]]}return"string"==typeof e?e.substr(0,1):e[0]},n.groupBy=function(e,t){if(!o.isArray(e))return e;var n={};return o.each(e,function(e){if(e.hasOwnProperty(t)){{var r=e[t];o.extend({},e)}delete e[t],n[r]||(n[r]=[]),n[r].push(e)}}),n},n.join=function(e,t){if(o.isArray(e))return e.join(t);if("object"==typeof e){var n=[];return o.each(e,function(e){n.push(e)}),n.join(t)}return e},n.json=function(e,t){return JSON.stringify(e,null,t||0)},n.json_encode=n.json,n.last=function(e){if("object"==typeof e&&!o.isArray(e)){var t=o.keys(e);return e[t[t.length-1]]}return"string"==typeof e?e.charAt(e.length-1):e[e.length-1]},n.lower=function(e){var t=r.apply(n.lower,arguments);return void 0!==t?t:e.toString().toLowerCase()},n.raw=function(e){return n.safe(e)},n.raw.safe=!0,n.replace=function(e,t,n,r){var o=new RegExp(t,r);return e.replace(o,n)},n.reverse=function(e){return n.sort(e,!0)},n.safe=function(e){return e},n.safe.safe=!0,n.sort=function(e,t){var n;if(o.isArray(e))n=e.sort();else switch(typeof e){case"object":n=o.keys(e).sort();break;case"string":return n=e.split(""),t?n.reverse().join(""):n.sort().join("")}return n&&t?n.reverse():n||e},n.striptags=function(e){var t=r.apply(n.striptags,arguments);return void 0!==t?t:e.toString().replace(/(<([^>]+)>)/gi,"")},n.title=function(e){var t=r.apply(n.title,arguments);return void 0!==t?t:e.toString().replace(/\w\S*/g,function(e){return e.charAt(0).toUpperCase()+e.substr(1).toLowerCase()})},n.uniq=function(e){var t;return e&&o.isArray(e)?(t=[],o.each(e,function(e){-1===t.indexOf(e)&&t.push(e)}),t):""},n.upper=function(e){var t=r.apply(n.upper,arguments);return void 0!==t?t:e.toString().toUpperCase()},n.url_encode=function(e){var t=r.apply(n.url_encode,arguments);return void 0!==t?t:encodeURIComponent(e)},n.url_decode=function(e){var t=r.apply(n.url_decode,arguments);return void 0!==t?t:decodeURIComponent(e)}},{"./dateformatter":2,"./utils":26}],4:[function(e,t,n){function r(e){var t;return o.some(a,function(n){return o.some(n.regex,function(r){var o,i=e.match(r);if(i)return o=i[n.idx||0].replace(/\s*$/,""),o=n.hasOwnProperty("replace")&&n.replace.hasOwnProperty(o)?n.replace[o]:o,t={match:o,type:n.type,length:i[0].length},!0})}),t||(t={match:e,type:i.UNKNOWN,length:e.length}),t}var o=e("./utils"),i={WHITESPACE:0,STRING:1,FILTER:2,FILTEREMPTY:3,FUNCTION:4,FUNCTIONEMPTY:5,PARENOPEN:6,PARENCLOSE:7,COMMA:8,VAR:9,NUMBER:10,OPERATOR:11,BRACKETOPEN:12,BRACKETCLOSE:13,DOTKEY:14,ARRAYOPEN:15,CURLYOPEN:17,CURLYCLOSE:18,COLON:19,COMPARATOR:20,LOGIC:21,NOT:22,BOOL:23,ASSIGNMENT:24,METHODOPEN:25,UNKNOWN:100},a=[{type:i.WHITESPACE,regex:[/^\s+/]},{type:i.STRING,regex:[/^""/,/^".*?[^\\]"/,/^''/,/^'.*?[^\\]'/]},{type:i.FILTER,regex:[/^\|\s*(\w+)\(/],idx:1},{type:i.FILTEREMPTY,regex:[/^\|\s*(\w+)/],idx:1},{type:i.FUNCTIONEMPTY,regex:[/^\s*(\w+)\(\)/],idx:1},{type:i.FUNCTION,regex:[/^\s*(\w+)\(/],idx:1},{type:i.PARENOPEN,regex:[/^\(/]},{type:i.PARENCLOSE,regex:[/^\)/]},{type:i.COMMA,regex:[/^,/]},{type:i.LOGIC,regex:[/^(&&|\|\|)\s*/,/^(and|or)\s+/],idx:1,replace:{and:"&&",or:"||"}},{type:i.COMPARATOR,regex:[/^(===|==|\!==|\!=|<=|<|>=|>|in\s|gte\s|gt\s|lte\s|lt\s)\s*/],idx:1,replace:{gte:">=",gt:">",lte:"<=",lt:"<"}},{type:i.ASSIGNMENT,regex:[/^(=|\+=|-=|\*=|\/=)/]},{type:i.NOT,regex:[/^\!\s*/,/^not\s+/],replace:{not:"!"}},{type:i.BOOL,regex:[/^(true|false)\s+/,/^(true|false)$/],idx:1},{type:i.VAR,regex:[/^[a-zA-Z_$]\w*((\.\$?\w*)+)?/,/^[a-zA-Z_$]\w*/]},{type:i.BRACKETOPEN,regex:[/^\[/]},{type:i.BRACKETCLOSE,regex:[/^\]/]},{type:i.CURLYOPEN,regex:[/^\{/]},{type:i.COLON,regex:[/^\:/]},{type:i.CURLYCLOSE,regex:[/^\}/]},{type:i.DOTKEY,regex:[/^\.(\w+)/],idx:1},{type:i.NUMBER,regex:[/^[+\-]?\d+(\.\d+)?/]},{type:i.OPERATOR,regex:[/^(\+|\-|\/|\*|%)/]}];n.types=i,n.read=function(e){for(var t,n,o=0,i=[];o<e.length;)t=e.substring(o),n=r(t),o+=n.length,i.push(n);return i}},{"./utils":26}],5:[function(e,t){var n=e("__browserify_process"),r=e("fs"),o=e("path");t.exports=function(e,t){var i={};return t=t||"utf8",e=e?o.normalize(e):null,i.resolve=function(t,r){return r=e?e:r?o.dirname(r):n.cwd(),o.resolve(r,t)},i.load=function(e,n){if(!r||n&&!r.readFile||!r.readFileSync)throw new Error("Unable to find file "+e+" because there is no filesystem to read from.");return e=i.resolve(e),n?void r.readFile(e,t,n):r.readFileSync(e,t)},i}},{__browserify_process:31,fs:28,path:29}],6:[function(e,t,n){n.fs=e("./filesystem"),n.memory=e("./memory")},{"./filesystem":5,"./memory":7}],7:[function(e,t){var n=e("path"),r=e("../utils");t.exports=function(e,t){var o={};return t=t?n.normalize(t):null,o.resolve=function(e,r){return r=t?t:r?n.dirname(r):"/",n.resolve(r,e)},o.load=function(t,n){var o,i;return i=[t,t.replace(/^(\/|\\)/,"")],o=e[i[0]]||e[i[1]],o||r.throwError('Unable to find template "'+t+'".'),n?void n(null,o):o},o}},{"../utils":26,path:29}],8:[function(e,t,n){function r(e){return e.replace(/[\-\/\\\^$*+?.()|\[\]{}]/g,"\\$&")}function o(e,t,n,r,o){this.out=[],this.state=[],this.filterApplyIdx=[],this._parsers={},this.line=r,this.filename=o,this.filters=t,this.escape=n,this.parse=function(){var t=this;return t._parsers.start&&t._parsers.start.call(t),i.each(e,function(n,r){var o=e[r-1];if(t.isLast=r===e.length-1,o)for(;o.type===s.WHITESPACE;)r-=1,o=e[r-1];t.prevToken=o,t.parseToken(n)}),t._parsers.end&&t._parsers.end.call(t),t.escape&&(t.filterApplyIdx=[0],"string"==typeof t.escape?(t.parseToken({type:s.FILTER,match:"e"}),t.parseToken({type:s.COMMA,match:","}),t.parseToken({type:s.STRING,match:String(n)}),t.parseToken({type:s.PARENCLOSE,match:")"})):t.parseToken({type:s.FILTEREMPTY,match:"e"})),t.out}}var i=e("./utils"),a=e("./lexer"),s=a.types,u=["break","case","catch","continue","debugger","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","this","throw","try","typeof","var","void","while","with"];o.prototype={on:function(e,t){this._parsers[e]=t},parseToken:function(e){var t,n=this,r=n._parsers[e.type]||n._parsers["*"],o=e.match,a=n.prevToken,u=a?a.type:null,c=n.state.length?n.state[n.state.length-1]:null;if(!r||"function"!=typeof r||r.call(this,e))switch(c&&a&&c===s.FILTER&&u===s.FILTER&&e.type!==s.PARENCLOSE&&e.type!==s.COMMA&&e.type!==s.OPERATOR&&e.type!==s.FILTER&&e.type!==s.FILTEREMPTY&&n.out.push(", "),c&&c===s.METHODOPEN&&(n.state.pop(),e.type!==s.PARENCLOSE&&n.out.push(", ")),e.type){case s.WHITESPACE:break;case s.STRING:n.filterApplyIdx.push(n.out.length),n.out.push(o.replace(/\\/g,"\\\\"));break;case s.NUMBER:case s.BOOL:n.filterApplyIdx.push(n.out.length),n.out.push(o);break;case s.FILTER:n.filters.hasOwnProperty(o)&&"function"==typeof n.filters[o]||i.throwError('Invalid filter "'+o+'"',n.line,n.filename),n.escape=n.filters[o].safe?!1:n.escape,n.out.splice(n.filterApplyIdx[n.filterApplyIdx.length-1],0,'_filters["'+o+'"]('),n.state.push(e.type);break;case s.FILTEREMPTY:n.filters.hasOwnProperty(o)&&"function"==typeof n.filters[o]||i.throwError('Invalid filter "'+o+'"',n.line,n.filename),n.escape=n.filters[o].safe?!1:n.escape,n.out.splice(n.filterApplyIdx[n.filterApplyIdx.length-1],0,'_filters["'+o+'"]('),n.out.push(")");break;case s.FUNCTION:case s.FUNCTIONEMPTY:n.out.push("((typeof _ctx."+o+' !== "undefined") ? _ctx.'+o+" : ((typeof "+o+' !== "undefined") ? '+o+" : _fn))("),n.escape=!1,e.type===s.FUNCTIONEMPTY?n.out[n.out.length-1]=n.out[n.out.length-1]+")":n.state.push(e.type),n.filterApplyIdx.push(n.out.length-1);break;case s.PARENOPEN:n.state.push(e.type),n.filterApplyIdx.length?(n.out.splice(n.filterApplyIdx[n.filterApplyIdx.length-1],0,"("),a&&u===s.VAR?(t=a.match.split(".").slice(0,-1),n.out.push(" || _fn).call("+n.checkMatch(t)),n.state.push(s.METHODOPEN),n.escape=!1):n.out.push(" || _fn)("),n.filterApplyIdx.push(n.out.length-3)):(n.out.push("("),n.filterApplyIdx.push(n.out.length-1));break;case s.PARENCLOSE:t=n.state.pop(),t!==s.PARENOPEN&&t!==s.FUNCTION&&t!==s.FILTER&&i.throwError("Mismatched nesting state",n.line,n.filename),n.out.push(")"),n.filterApplyIdx.pop(),t!==s.FILTER&&n.filterApplyIdx.pop();break;case s.COMMA:c!==s.FUNCTION&&c!==s.FILTER&&c!==s.ARRAYOPEN&&c!==s.CURLYOPEN&&c!==s.PARENOPEN&&c!==s.COLON&&i.throwError("Unexpected comma",n.line,n.filename),c===s.COLON&&n.state.pop(),n.out.push(", "),n.filterApplyIdx.pop();break;case s.LOGIC:case s.COMPARATOR:a&&u!==s.COMMA&&u!==e.type&&u!==s.BRACKETOPEN&&u!==s.CURLYOPEN&&u!==s.PARENOPEN&&u!==s.FUNCTION||i.throwError("Unexpected logic",n.line,n.filename),n.out.push(e.match);break;case s.NOT:n.out.push(e.match);break;case s.VAR:n.parseVar(e,o,c);break;case s.BRACKETOPEN:!a||u!==s.VAR&&u!==s.BRACKETCLOSE&&u!==s.PARENCLOSE?(n.state.push(s.ARRAYOPEN),n.filterApplyIdx.push(n.out.length)):n.state.push(e.type),n.out.push("[");break;case s.BRACKETCLOSE:t=n.state.pop(),t!==s.BRACKETOPEN&&t!==s.ARRAYOPEN&&i.throwError("Unexpected closing square bracket",n.line,n.filename),n.out.push("]"),n.filterApplyIdx.pop();break;case s.CURLYOPEN:n.state.push(e.type),n.out.push("{"),n.filterApplyIdx.push(n.out.length-1);break;case s.COLON:c!==s.CURLYOPEN&&i.throwError("Unexpected colon",n.line,n.filename),n.state.push(e.type),n.out.push(":"),n.filterApplyIdx.pop();break;case s.CURLYCLOSE:c===s.COLON&&n.state.pop(),n.state.pop()!==s.CURLYOPEN&&i.throwError("Unexpected closing curly brace",n.line,n.filename),n.out.push("}"),n.filterApplyIdx.pop();break;case s.DOTKEY:(!a||u!==s.VAR&&u!==s.BRACKETCLOSE&&u!==s.DOTKEY&&u!==s.PARENCLOSE&&u!==s.FUNCTIONEMPTY&&u!==s.FILTEREMPTY&&u!==s.CURLYCLOSE)&&i.throwError('Unexpected key "'+o+'"',n.line,n.filename),n.out.push("."+o);break;case s.OPERATOR:n.out.push(" "+o+" "),n.filterApplyIdx.pop()}},parseVar:function(e,t,n){var r=this;return t=t.split("."),-1!==u.indexOf(t[0])&&i.throwError('Reserved keyword "'+t[0]+'" attempted to be used as a variable',r.line,r.filename),r.filterApplyIdx.push(r.out.length),n===s.CURLYOPEN?(t.length>1&&i.throwError("Unexpected dot",r.line,r.filename),void r.out.push(t[0])):void r.out.push(r.checkMatch(t))},checkMatch:function(e){function t(t){var n=t+o,r=e,a="";return a="(typeof "+n+' !== "undefined" && '+n+" !== null",i.each(r,function(e,t){0!==t&&(a+=" && "+n+"."+e+" !== undefined && "+n+"."+e+" !== null",n+="."+e)}),a+=")"}function n(n){return"("+t(n)+" ? "+n+e.join(".")+' : "")'}var r,o=e[0];return r="("+t("_ctx.")+" ? "+n("_ctx.")+" : "+n("")+")","("+r+" !== null ? "+r+' : "" )'}},n.parse=function(e,t,u,c,l){function p(e,t){var n,r,s=a.read(i.strip(e));return n=new o(s,l,d,t,u.filename),r=n.parse().join(""),n.state.length&&i.throwError('Unable to parse "'+e+'"',t,u.filename),{compile:function(){return"_output += "+r+";\n"}}}function f(t,n){var r,p,f,h,g,m,y;if(i.startsWith(t,"end")){if(y=M[M.length-1],y&&y.name===t.split(/\s+/)[0].replace(/^end/,"")&&y.ends){switch(y.name){case"autoescape":d=u.autoescape;break;case"raw":D=!1}return void M.pop()}D||i.throwError('Unexpected end of tag "'+t.replace(/^end/,"")+'"',n,u.filename)}if(!D){switch(f=t.split(/\s+(.+)?/),h=f.shift(),c.hasOwnProperty(h)||i.throwError('Unexpected tag "'+t+'"',n,u.filename),r=a.read(i.strip(f.join(" "))),p=new o(r,l,!1,n,u.filename),g=c[h],g.parse(f[1],n,p,s,M,u,e)||i.throwError('Unexpected tag "'+h+'"',n,u.filename),p.parse(),m=p.out,h){case"autoescape":d="false"!==m[0]?m[0]:!1;break;case"raw":D=!0}return{block:!!c[h].block,compile:g.compile,args:m,content:[],ends:g.ends,name:h}}}function h(e){return"string"==typeof e&&(e=e.replace(/\s*$/,"")),e}t=t.replace(/\r\n/g,"\n");var g,d=u.autoescape,m=u.tagControls[0],y=u.tagControls[1],v=u.varControls[0],w=u.varControls[1],O=r(m),E=r(y),x=r(v),b=r(w),A=new RegExp("^"+O+"-?\\s*-?|-?\\s*-?"+E+"$","g"),T=new RegExp("^"+O+"-"),C=new RegExp("-"+E+"$"),N=new RegExp("^"+x+"-?\\s*-?|-?\\s*-?"+b+"$","g"),R=new RegExp("^"+x+"-"),_=new RegExp("-"+b+"$"),P=u.cmtControls[0],k=u.cmtControls[1],S="[\\s\\S]*?",I=new RegExp("("+O+S+E+"|"+x+S+b+"|"+r(P)+S+r(k)+")"),U=1,M=[],j=null,F=[],L={},D=!1;return n.parseVariable=p,i.each(t.split(I),function(e){var t,n,r,o,a;if(e){if(!D&&i.startsWith(e,v)&&i.endsWith(e,w))r=R.test(e),g=_.test(e),t=p(e.replace(N,""),U);else if(i.startsWith(e,m)&&i.endsWith(e,y))r=T.test(e),g=C.test(e),t=f(e.replace(A,""),U),t&&("extends"===t.name?j=t.args.join("").replace(/^\'|\'$/g,"").replace(/^\"|\"$/g,""):t.block&&!M.length&&(L[t.args.join("")]=t)),D&&!t&&(t=e);else if(D||!i.startsWith(e,P)&&!i.endsWith(e,k))t=g?e.replace(/^\s*/,""):e,g=!1;else if(i.startsWith(e,P)&&i.endsWith(e,k))return;r&&F.length&&(o=F.pop(),"string"==typeof o?o=h(o):o.content&&o.content.length&&(a=h(o.content.pop()),o.content.push(a)),F.push(o)),t&&(M.length?M[M.length-1].content.push(t):F.push(t),t.name&&t.ends&&M.push(t),n=e.match(/\n/g),U+=n?n.length:0)}}),{name:u.filename,parent:j,tokens:F,blocks:L}},n.compile=function(e,t,r,o){var a="",s=i.isArray(e)?e:e.tokens;return i.each(s,function(e){var i;return"string"==typeof e?void(a+='_output += "'+e.replace(/\\/g,"\\\\").replace(/\n|\r/g,"\\n").replace(/"/g,'\\"')+'";\n'):(i=e.compile(n.compile,e.args?e.args.slice(0):[],e.content?e.content.slice(0):[],t,r,o),void(a+=i||""))}),a}},{"./lexer":4,"./utils":26}],9:[function(e,t,n){function r(){return""}function o(e){if(e){if(i.each(["varControls","tagControls","cmtControls"],function(t){if(e.hasOwnProperty(t)){if(!i.isArray(e[t])||2!==e[t].length)throw new Error('Option "'+t+'" must be an array containing 2 different control strings.');if(e[t][0]===e[t][1])throw new Error('Option "'+t+'" open and close controls must not be the same.');i.each(e[t],function(e,n){if(e.length<2)throw new Error('Option "'+t+'" '+(n?"open ":"close ")+'control must be at least 2 characters. Saw "'+e+'" instead.')})}}),e.hasOwnProperty("cache")&&e.cache&&"memory"!==e.cache&&(!e.cache.get||!e.cache.set))throw new Error("Invalid cache option "+JSON.stringify(e.cache)+' found. Expected "memory" or { get: function (key) { ... }, set: function (key, value) { ... } }.');if(e.hasOwnProperty("loader")&&e.loader&&(!e.loader.load||!e.loader.resolve))throw new Error("Invalid loader option "+JSON.stringify(e.loader)+" found. Expected { load: function (pathname, cb) { ... }, resolve: function (to, from) { ... } }.")}}var i=e("./utils"),a=e("./tags"),s=e("./filters"),u=e("./parser"),c=e("./dateformatter"),l=e("./loaders");n.version="1.4.2";var p,f={autoescape:!0,varControls:["{{","}}"],tagControls:["{%","%}"],cmtControls:["{#","#}"],locals:{},cache:"memory",loader:l.fs()};n.setDefaults=function(e){o(e),p.options=i.extend(p.options,e)},n.setDefaultTZOffset=function(e){c.tzOffset=e},n.Swig=function(e){function t(e){return e&&e.locals?i.extend({},d.options.locals,e.locals):d.options.locals}function n(e){return e=e||{},e.hasOwnProperty("cache")&&!e.cache||!d.options.cache}function c(e,t){return n(t)?void 0:"memory"===d.options.cache?d.cache[e]:d.options.cache.get(e)}function l(e,t,r){return n(t)?void 0:"memory"===d.options.cache?void(d.cache[e]=r):void d.options.cache.set(e,r)}function p(e,t){return i.map(t,function(t){var n=t.args?t.args.join(""):"";return"block"===t.name&&e[n]&&(t=e[n]),t.content&&t.content.length&&(t.content=p(e,t.content)),t})}function h(e,t){var n=[];i.each(e,function(e){n.push(e)}),i.each(n.reverse(),function(e){"block"!==e.name&&t.unshift(e)})}function g(e,t){for(var n,r,o,a=e.parent,s=[],u=[];a;){if(!t||!t.filename)throw new Error('Cannot extend "'+a+'" because current template has no filename.');if(n=n||t.filename,n=d.options.loader.resolve(a,n),r=c(n,t)||d.parseFile(n,i.extend({},t,{filename:n})),a=r.parent,-1!==s.indexOf(n))throw new Error('Illegal circular extends of "'+n+'".');s.push(n),u.push(r)}for(o=u.length,o=u.length-2;o>=0;o-=1)u[o].tokens=p(u[o].blocks,u[o+1].tokens),h(u[o].blocks,u[o].tokens);return u}o(e),this.options=i.extend({},f,e||{}),this.cache={},this.extensions={};var d=this,m=a,y=s;this.invalidateCache=function(){"memory"===d.options.cache&&(d.cache={})},this.setFilter=function(e,t){if("function"!=typeof t)throw new Error('Filter "'+e+'" is not a valid function.');y[e]=t},this.setTag=function(e,t,n,r,o){if("function"!=typeof t)throw new Error('Tag "'+e+'" parse method is not a valid function.');if("function"!=typeof n)throw new Error('Tag "'+e+'" compile method is not a valid function.');m[e]={parse:t,compile:n,ends:r||!1,block:!!o}},this.setExtension=function(e,t){d.extensions[e]=t},this.parse=function(e,n){o(n);var r,a=t(n),s={};for(r in n)n.hasOwnProperty(r)&&"locals"!==r&&(s[r]=n[r]);return n=i.extend({},d.options,s),n.locals=a,u.parse(this,e,n,m,y)},this.parseFile=function(e,t){var n;return t||(t={}),e=d.options.loader.resolve(e,t.resolveFrom),n=d.options.loader.load(e),t.filename||(t=i.extend({filename:e},t)),d.parse(n,t)},this.precompile=function(e,t){var n,r=d.parse(e,t),o=g(r,t);o.length&&(r.tokens=p(r.blocks,o[0].tokens),h(r.blocks,r.tokens));try{n=new Function("_swig","_ctx","_filters","_utils","_fn",'  var _ext = _swig.extensions,\n    _output = "";\n'+u.compile(r,o,t)+"\n  return _output;\n")}catch(a){i.throwError(a,null,t.filename)}return{tpl:n,tokens:r}},this.render=function(e,t){return d.compile(e,t)()},this.renderFile=function(e,t,n){return n?void d.compileFile(e,{},function(e,r){var o;if(e)return void n(e);try{o=r(t)}catch(i){return void n(i)}n(null,o)}):d.compileFile(e)(t)},this.compile=function(e,n){function o(e){var t;return t=e&&s?i.extend({},a,e):e&&!s?e:!e&&s?a:{},u.tpl(d,t,y,i,r)}var a,s,u,p=n?n.filename:null,f=p?c(p,n):null;return f?f:(a=t(n),s=i.keys(a).length,u=this.precompile(e,n),i.extend(o,u.tokens),p&&l(p,n,o),o)},this.compileFile=function(e,t,n){var r,o;return t||(t={}),e=d.options.loader.resolve(e,t.resolveFrom),t.filename||(t=i.extend({filename:e},t)),(o=c(e,t))?n?void n(null,o):o:n?void d.options.loader.load(e,function(e,r){if(e)return void n(e);var o;try{o=d.compile(r,t)}catch(i){return void n(i)}n(e,o)}):(r=d.options.loader.load(e),d.compile(r,t))},this.run=function(e,n,o){var a=t({locals:n});return o&&l(o,{},e),e(d,a,y,i,r)}},p=new n.Swig,n.setFilter=p.setFilter,n.setTag=p.setTag,n.setExtension=p.setExtension,n.parseFile=p.parseFile,n.precompile=p.precompile,n.compile=p.compile,n.compileFile=p.compileFile,n.render=p.render,n.renderFile=p.renderFile,n.run=p.run,n.invalidateCache=p.invalidateCache,n.loaders=l},{"./dateformatter":2,"./filters":3,"./loaders":6,"./parser":8,"./tags":20,"./utils":26}],10:[function(e,t,n){var r=e("../utils"),o=["html","js"];n.compile=function(e,t,n,r,o,i){return e(n,r,o,i)},n.parse=function(e,t,n,i,a,s){var u;return n.on("*",function(e){return u||e.type!==i.BOOL&&(e.type!==i.STRING||-1!==o.indexOf(e.match))?void r.throwError('Unexpected token "'+e.match+'" in autoescape tag',t,s.filename):(this.out.push(e.match),void(u=!0))}),!0},n.ends=!0},{"../utils":26}],11:[function(e,t,n){n.compile=function(e,t,n,r,o){return e(n,r,o,t.join(""))},n.parse=function(e,t,n){return n.on("*",function(e){this.out.push(e.match)}),!0},n.ends=!0,n.block=!0},{}],12:[function(e,t,n){n.compile=function(){return"} else {\n"},n.parse=function(e,t,n,r,o){return n.on("*",function(e){throw new Error('"else" tag does not accept any tokens. Found "'+e.match+'" on line '+t+".")}),o.length&&"if"===o[o.length-1].name}},{}],13:[function(e,t,n){var r=e("./if").parse;n.compile=function(e,t){return"} else if ("+t.join(" ")+") {\n"},n.parse=function(e,t,n,o,i){var a=r(e,t,n,o,i);return a&&i.length&&"if"===i[i.length-1].name}},{"./if":17}],14:[function(e,t,n){n.compile=function(){},n.parse=function(){return!0},n.ends=!1},{}],15:[function(e,t,n){var r=e("../filters");n.compile=function(e,t,n,r,o,i){var a=t.shift().replace(/\($/,""),s='(function () {\n  var _output = "";\n'+e(n,r,o,i)+"  return _output;\n})()";return")"===t[t.length-1]&&t.pop(),t=t.length?", "+t.join(""):"",'_output += _filters["'+a+'"]('+s+t+");\n"},n.parse=function(e,t,n,o){function i(e){if(!r.hasOwnProperty(e))throw new Error('Filter "'+e+'" does not exist on line '+t+".")}var a;return n.on(o.FUNCTION,function(e){return a?!0:(a=e.match.replace(/\($/,""),i(a),this.out.push(e.match),void this.state.push(e.type))}),n.on(o.VAR,function(e){return a?!0:(a=e.match,i(a),void this.out.push(a))}),!0},n.ends=!0},{"../filters":3}],16:[function(e,t,n){var r="_ctx.",o=r+"loop";n.compile=function(e,t,n,i,a,s){var u,c=t.shift(),l="__k",p=(r+"__loopcache"+Math.random()).replace(/\./g,"");return t[0]&&","===t[0]&&(t.shift(),l=c,c=t.shift()),u=t.join(""),["(function () {\n","  var __l = "+u+', __len = (_utils.isArray(__l) || typeof __l === "string") ? __l.length : _utils.keys(__l).length;\n',"  if (!__l) { return; }\n","    var "+p+" = { loop: "+o+", "+c+": "+r+c+", "+l+": "+r+l+" };\n","    "+o+" = { first: false, index: 1, index0: 0, revindex: __len, revindex0: __len - 1, length: __len, last: false };\n","  _utils.each(__l, function ("+c+", "+l+") {\n","    "+r+c+" = "+c+";\n","    "+r+l+" = "+l+";\n","    "+o+".key = "+l+";\n","    "+o+".first = ("+o+".index0 === 0);\n","    "+o+".last = ("+o+".revindex0 === 0);\n","    "+e(n,i,a,s),"    "+o+".index += 1; "+o+".index0 += 1; "+o+".revindex -= 1; "+o+".revindex0 -= 1;\n","  });\n","  "+o+" = "+p+".loop;\n","  "+r+c+" = "+p+"."+c+";\n","  "+r+l+" = "+p+"."+l+";\n","  "+p+" = undefined;\n","})();\n"].join("")},n.parse=function(e,t,n,r){var o,i;return n.on(r.NUMBER,function(e){var n=this.state.length?this.state[this.state.length-1]:null;if(!i||n!==r.ARRAYOPEN&&n!==r.CURLYOPEN&&n!==r.CURLYCLOSE&&n!==r.FUNCTION&&n!==r.FILTER)throw new Error('Unexpected number "'+e.match+'" on line '+t+".");return!0}),n.on(r.VAR,function(e){return i&&o?!0:(this.out.length||(o=!0),void this.out.push(e.match))}),n.on(r.COMMA,function(e){return o&&this.prevToken.type===r.VAR?void this.out.push(e.match):!0}),n.on(r.COMPARATOR,function(e){if("in"!==e.match||!o)throw new Error('Unexpected token "'+e.match+'" on line '+t+".");i=!0,this.filterApplyIdx.push(this.out.length)}),!0},n.ends=!0},{}],17:[function(e,t,n){n.compile=function(e,t,n,r,o,i){return"if ("+t.join(" ")+") { \n"+e(n,r,o,i)+"\n}"},n.parse=function(e,t,n,r){if("undefined"==typeof e)throw new Error("No conditional statement provided on line "+t+".");return n.on(r.COMPARATOR,function(e){if(this.isLast)throw new Error('Unexpected logic "'+e.match+'" on line '+t+".");if(this.prevToken.type===r.NOT)throw new Error('Attempted logic "not '+e.match+'" on line '+t+". Use !(foo "+e.match+") instead.");this.out.push(e.match),this.filterApplyIdx.push(this.out.length)}),n.on(r.NOT,function(e){if(this.isLast)throw new Error('Unexpected logic "'+e.match+'" on line '+t+".");this.out.push(e.match)}),n.on(r.BOOL,function(e){this.out.push(e.match)}),n.on(r.LOGIC,function(e){if(!this.out.length||this.isLast)throw new Error('Unexpected logic "'+e.match+'" on line '+t+".");this.out.push(e.match),this.filterApplyIdx.pop()}),!0},n.ends=!0},{}],18:[function(e,t,n){var r=e("../utils");n.compile=function(e,t){var n=t.pop(),o="_ctx."+n+' = {};\n  var _output = "";\n',i=r.map(t,function(e){return{ex:new RegExp("_ctx."+e.name,"g"),re:"_ctx."+n+"."+e.name}});return r.each(t,function(e){var t=e.compiled;r.each(i,function(e){t=t.replace(e.ex,e.re)}),o+=t}),o},n.parse=function(t,n,o,i,a,s,u){var c,l,p=e("../parser").compile,f={resolveFrom:s.filename},h=r.extend({},s,f);return o.on(i.STRING,function(e){var t=this;if(!c)return c=u.parseFile(e.match.replace(/^("|')|("|')$/g,""),f).tokens,void r.each(c,function(e){var n,r="";e&&"macro"===e.name&&e.compile&&(n=e.args[0],r+=e.compile(p,e.args,e.content,[],h)+"\n",t.out.push({compiled:r,name:n}))});throw new Error("Unexpected string "+e.match+" on line "+n+".")}),o.on(i.VAR,function(e){var t=this;if(!c||l)throw new Error('Unexpected variable "'+e.match+'" on line '+n+".");if("as"!==e.match)return l=e.match,t.out.push(l),!1}),!0},n.block=!0},{"../parser":8,"../utils":26}],19:[function(e,t,n){var r="ignore",o="missing",i="only";n.compile=function(e,t){var n=t.shift(),r=t.indexOf(i),a=-1!==r?t.splice(r,1):!1,s=(t.pop()||"").replace(/\\/g,"\\\\"),u=t[t.length-1]===o?t.pop():!1,c=t.join("");return(u?"  try {\n":"")+"_output += _swig.compileFile("+n+', {resolveFrom: "'+s+'"})('+(a&&c?c:c?"_utils.extend({}, _ctx, "+c+")":"_ctx")+");\n"+(u?"} catch (e) {}\n":"")},n.parse=function(e,t,n,a,s,u){var c,l;return n.on(a.STRING,function(e){return c?!0:(c=e.match,void this.out.push(c))}),n.on(a.VAR,function(e){if(!c)return c=e.match,!0;if(!l&&"with"===e.match)return void(l=!0);if(l&&e.match===i&&"with"!==this.prevToken.match)return void this.out.push(e.match);if(e.match===r)return!1;if(e.match===o){if(this.prevToken.match!==r)throw new Error('Unexpected token "'+o+'" on line '+t+".");return this.out.push(e.match),!1}if(this.prevToken.match===r)throw new Error('Expected "'+o+'" on line '+t+' but found "'+e.match+'".');return!0}),n.on("end",function(){this.out.push(u.filename||null)}),!0}},{}],20:[function(e,t,n){n.autoescape=e("./autoescape"),n.block=e("./block"),n["else"]=e("./else"),n.elseif=e("./elseif"),n.elif=n.elseif,n["extends"]=e("./extends"),n.filter=e("./filter"),n["for"]=e("./for"),n["if"]=e("./if"),n["import"]=e("./import"),n.include=e("./include"),n.macro=e("./macro"),n.parent=e("./parent"),n.raw=e("./raw"),n.set=e("./set"),n.spaceless=e("./spaceless")},{"./autoescape":10,"./block":11,"./else":12,"./elseif":13,"./extends":14,"./filter":15,"./for":16,"./if":17,"./import":18,"./include":19,"./macro":21,"./parent":22,"./raw":23,"./set":24,"./spaceless":25}],21:[function(e,t,n){n.compile=function(e,t,n,r,o,i){var a=t.shift();return"_ctx."+a+" = function ("+t.join("")+') {\n  var _output = "",\n    __ctx = _utils.extend({}, _ctx);\n  _utils.each(_ctx, function (v, k) {\n    if (["'+t.join('","')+'"].indexOf(k) !== -1) { delete _ctx[k]; }\n  });\n'+e(n,r,o,i)+"\n _ctx = _utils.extend(_ctx, __ctx);\n  return _output;\n};\n_ctx."+a+".safe = true;\n"},n.parse=function(e,t,n,r){var o;return n.on(r.VAR,function(e){if(-1!==e.match.indexOf("."))throw new Error('Unexpected dot in macro argument "'+e.match+'" on line '+t+".");this.out.push(e.match)}),n.on(r.FUNCTION,function(e){o||(o=e.match,this.out.push(o),this.state.push(r.FUNCTION))}),n.on(r.FUNCTIONEMPTY,function(e){o||(o=e.match,this.out.push(o))}),n.on(r.PARENCLOSE,function(){if(!this.isLast)throw new Error("Unexpected parenthesis close on line "+t+".")
}),n.on(r.COMMA,function(){return!0}),n.on("*",function(){}),!0},n.ends=!0,n.block=!0},{}],22:[function(e,t,n){n.compile=function(e,t,n,r,o,i){if(!r||!r.length)return"";var a,s,u=t[0],c=!0,l=r.length,p=0;for(p;l>p;p+=1)if(a=r[p],a.blocks&&a.blocks.hasOwnProperty(i)&&c&&u!==a.name)return s=a.blocks[i],s.compile(e,[i],s.content,r.slice(p+1),o)+"\n"},n.parse=function(e,t,n,r,o,i){return n.on("*",function(e){throw new Error('Unexpected argument "'+e.match+'" on line '+t+".")}),n.on("end",function(){this.out.push(i.filename)}),!0}},{}],23:[function(e,t,n){n.compile=function(e,t,n,r,o,i){return e(n,r,o,i)},n.parse=function(e,t,n){return n.on("*",function(e){throw new Error('Unexpected token "'+e.match+'" in raw tag on line '+t+".")}),!0},n.ends=!0},{}],24:[function(e,t,n){n.compile=function(e,t){return t.join(" ")+";\n"},n.parse=function(e,t,n,r){var o,i="";return n.on(r.VAR,function(e){return o?void(o+="_ctx."+e.match):n.out.length?!0:void(i+=e.match)}),n.on(r.BRACKETOPEN,function(e){return o||this.out.length?!0:void(o=e.match)}),n.on(r.STRING,function(e){return o&&!this.out.length?void(o+=e.match):!0}),n.on(r.BRACKETCLOSE,function(e){return o&&!this.out.length?(i+=o+e.match,void(o=void 0)):!0}),n.on(r.DOTKEY,function(e){return o||i?void(i+="."+e.match):!0}),n.on(r.ASSIGNMENT,function(e){if(this.out.length||!i)throw new Error('Unexpected assignment "'+e.match+'" on line '+t+".");this.out.push("_ctx."+i),this.out.push(e.match),this.filterApplyIdx.push(this.out.length)}),!0},n.block=!0},{}],25:[function(e,t,n){var r=e("../utils");n.compile=function(e,t,n,o,i,a){function s(e){return r.map(e,function(e){return e.content||"string"!=typeof e?(e.content=s(e.content),e):e.replace(/^\s+/,"").replace(/>\s+</g,"><").replace(/\s+$/,"")})}return e(s(n),o,i,a)},n.parse=function(e,t,n){return n.on("*",function(e){throw new Error('Unexpected token "'+e.match+'" on line '+t+".")}),!0},n.ends=!0},{"../utils":26}],26:[function(e,t,n){var r;n.strip=function(e){return e.replace(/^\s+|\s+$/g,"")},n.startsWith=function(e,t){return 0===e.indexOf(t)},n.endsWith=function(e,t){return-1!==e.indexOf(t,e.length-t.length)},n.each=function(e,t){var n,o;if(r(e))for(n=0,o=e.length,n;o>n&&t(e[n],n,e)!==!1;n+=1);else for(n in e)if(e.hasOwnProperty(n)&&t(e[n],n,e)===!1)break;return e},n.isArray=r=Array.hasOwnProperty("isArray")?Array.isArray:function(e){return e?"object"==typeof e&&-1!==Object.prototype.toString.call(e).indexOf():!1},n.some=function(e,t){var o,i,a=0;if(r(e))for(i=e.length,a;i>a&&!(o=t(e[a],a,e));a+=1);else n.each(e,function(n,r){return o=t(n,r,e),!o});return!!o},n.map=function(e,t){var n,o=0,i=[];if(r(e))for(n=e.length,o;n>o;o+=1)i[o]=t(e[o],o);else for(o in e)e.hasOwnProperty(o)&&(i[o]=t(e[o],o));return i},n.extend=function(){var e,t,n=arguments,r=n[0],o=n.length>1?Array.prototype.slice.call(n,1):[],i=0,a=o.length;for(i;a>i;i+=1){t=o[i]||{};for(e in t)t.hasOwnProperty(e)&&(r[e]=t[e])}return r},n.keys=function(e){return e?Object.keys?Object.keys(e):n.map(e,function(e,t){return t}):[]},n.throwError=function(e,t,n){throw t&&(e+=" on line "+t),n&&(e+=" in file "+n),new Error(e+".")}},{}],27:[function(e,t,n){function r(e){return"[object Array]"===c.call(e)}function o(e,t){var n;if(null===e)n={__proto__:null};else{if("object"!=typeof e)throw new TypeError("typeof prototype["+typeof e+"] != 'object'");var r=function(){};r.prototype=e,n=new r,n.__proto__=e}return"undefined"!=typeof t&&Object.defineProperties&&Object.defineProperties(n,t),n}function i(e){return"object"!=typeof e&&"function"!=typeof e||null===e}function a(e){if(i(e))throw new TypeError("Object.keys called on a non-object");var t=[];for(var n in e)l.call(e,n)&&t.push(n);return t}function s(e){if(i(e))throw new TypeError("Object.getOwnPropertyNames called on a non-object");var t=a(e);return n.isArray(e)&&-1===n.indexOf(e,"length")&&t.push("length"),t}function u(e,t){return{value:e[t]}}var c=Object.prototype.toString,l=Object.prototype.hasOwnProperty;n.isArray="function"==typeof Array.isArray?Array.isArray:r,n.indexOf=function(e,t){if(e.indexOf)return e.indexOf(t);for(var n=0;n<e.length;n++)if(t===e[n])return n;return-1},n.filter=function(e,t){if(e.filter)return e.filter(t);for(var n=[],r=0;r<e.length;r++)t(e[r],r,e)&&n.push(e[r]);return n},n.forEach=function(e,t,n){if(e.forEach)return e.forEach(t,n);for(var r=0;r<e.length;r++)t.call(n,e[r],r,e)},n.map=function(e,t){if(e.map)return e.map(t);for(var n=new Array(e.length),r=0;r<e.length;r++)n[r]=t(e[r],r,e);return n},n.reduce=function(e,t,n){if(e.reduce)return e.reduce(t,n);var r,o=!1;2<arguments.length&&(r=n,o=!0);for(var i=0,a=e.length;a>i;++i)e.hasOwnProperty(i)&&(o?r=t(r,e[i],i,e):(r=e[i],o=!0));return r},n.substr="b"!=="ab".substr(-1)?function(e,t,n){return 0>t&&(t=e.length+t),e.substr(t,n)}:function(e,t,n){return e.substr(t,n)},n.trim=function(e){return e.trim?e.trim():e.replace(/^\s+|\s+$/g,"")},n.bind=function(){var e=Array.prototype.slice.call(arguments),t=e.shift();if(t.bind)return t.bind.apply(t,e);var n=e.shift();return function(){t.apply(n,e.concat([Array.prototype.slice.call(arguments)]))}},n.create="function"==typeof Object.create?Object.create:o;var p="function"==typeof Object.keys?Object.keys:a,f="function"==typeof Object.getOwnPropertyNames?Object.getOwnPropertyNames:s;if((new Error).hasOwnProperty("description")){var h=function(e,t){return"[object Error]"===c.call(e)&&(t=n.filter(t,function(e){return"description"!==e&&"number"!==e&&"message"!==e})),t};n.keys=function(e){return h(e,p(e))},n.getOwnPropertyNames=function(e){return h(e,f(e))}}else n.keys=p,n.getOwnPropertyNames=f;if("function"==typeof Object.getOwnPropertyDescriptor)try{Object.getOwnPropertyDescriptor({a:1},"a"),n.getOwnPropertyDescriptor=Object.getOwnPropertyDescriptor}catch(g){n.getOwnPropertyDescriptor=function(e,t){try{return Object.getOwnPropertyDescriptor(e,t)}catch(n){return u(e,t)}}}else n.getOwnPropertyDescriptor=u},{}],28:[function(){},{}],29:[function(e,t,n){function r(e,t){for(var n=0,r=e.length-1;r>=0;r--){var o=e[r];"."===o?e.splice(r,1):".."===o?(e.splice(r,1),n++):n&&(e.splice(r,1),n--)}if(t)for(;n--;n)e.unshift("..");return e}var o=e("__browserify_process"),i=e("util"),a=e("_shims"),s=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/,u=function(e){return s.exec(e).slice(1)};n.resolve=function(){for(var e="",t=!1,n=arguments.length-1;n>=-1&&!t;n--){var s=n>=0?arguments[n]:o.cwd();if(!i.isString(s))throw new TypeError("Arguments to path.resolve must be strings");s&&(e=s+"/"+e,t="/"===s.charAt(0))}return e=r(a.filter(e.split("/"),function(e){return!!e}),!t).join("/"),(t?"/":"")+e||"."},n.normalize=function(e){var t=n.isAbsolute(e),o="/"===a.substr(e,-1);return e=r(a.filter(e.split("/"),function(e){return!!e}),!t).join("/"),e||t||(e="."),e&&o&&(e+="/"),(t?"/":"")+e},n.isAbsolute=function(e){return"/"===e.charAt(0)},n.join=function(){var e=Array.prototype.slice.call(arguments,0);return n.normalize(a.filter(e,function(e){if(!i.isString(e))throw new TypeError("Arguments to path.join must be strings");return e}).join("/"))},n.relative=function(e,t){function r(e){for(var t=0;t<e.length&&""===e[t];t++);for(var n=e.length-1;n>=0&&""===e[n];n--);return t>n?[]:e.slice(t,n-t+1)}e=n.resolve(e).substr(1),t=n.resolve(t).substr(1);for(var o=r(e.split("/")),i=r(t.split("/")),a=Math.min(o.length,i.length),s=a,u=0;a>u;u++)if(o[u]!==i[u]){s=u;break}for(var c=[],u=s;u<o.length;u++)c.push("..");return c=c.concat(i.slice(s)),c.join("/")},n.sep="/",n.delimiter=":",n.dirname=function(e){var t=u(e),n=t[0],r=t[1];return n||r?(r&&(r=r.substr(0,r.length-1)),n+r):"."},n.basename=function(e,t){var n=u(e)[2];return t&&n.substr(-1*t.length)===t&&(n=n.substr(0,n.length-t.length)),n},n.extname=function(e){return u(e)[3]}},{__browserify_process:31,_shims:27,util:30}],30:[function(e,t,n){function r(e,t){var r={seen:[],stylize:i};return arguments.length>=3&&(r.depth=arguments[2]),arguments.length>=4&&(r.colors=arguments[3]),g(t)?r.showHidden=t:t&&n._extend(r,t),O(r.showHidden)&&(r.showHidden=!1),O(r.depth)&&(r.depth=2),O(r.colors)&&(r.colors=!1),O(r.customInspect)&&(r.customInspect=!0),r.colors&&(r.stylize=o),s(r,e,r.depth)}function o(e,t){var n=r.styles[t];return n?"["+r.colors[n][0]+"m"+e+"["+r.colors[n][1]+"m":e}function i(e){return e}function a(e){var t={};return S.forEach(e,function(e){t[e]=!0}),t}function s(e,t,r){if(e.customInspect&&t&&T(t.inspect)&&t.inspect!==n.inspect&&(!t.constructor||t.constructor.prototype!==t)){var o=t.inspect(r);return v(o)||(o=s(e,o,r)),o}var i=u(e,t);if(i)return i;var g=S.keys(t),d=a(g);if(e.showHidden&&(g=S.getOwnPropertyNames(t)),0===g.length){if(T(t)){var m=t.name?": "+t.name:"";return e.stylize("[Function"+m+"]","special")}if(E(t))return e.stylize(RegExp.prototype.toString.call(t),"regexp");if(b(t))return e.stylize(Date.prototype.toString.call(t),"date");if(A(t))return c(t)}var y="",w=!1,O=["{","}"];if(h(t)&&(w=!0,O=["[","]"]),T(t)){var x=t.name?": "+t.name:"";y=" [Function"+x+"]"}if(E(t)&&(y=" "+RegExp.prototype.toString.call(t)),b(t)&&(y=" "+Date.prototype.toUTCString.call(t)),A(t)&&(y=" "+c(t)),0===g.length&&(!w||0==t.length))return O[0]+y+O[1];if(0>r)return E(t)?e.stylize(RegExp.prototype.toString.call(t),"regexp"):e.stylize("[Object]","special");e.seen.push(t);var C;return C=w?l(e,t,r,d,g):g.map(function(n){return p(e,t,r,d,n,w)}),e.seen.pop(),f(C,y,O)}function u(e,t){if(O(t))return e.stylize("undefined","undefined");if(v(t)){var n="'"+JSON.stringify(t).replace(/^"|"$/g,"").replace(/'/g,"\\'").replace(/\\"/g,'"')+"'";return e.stylize(n,"string")}return y(t)?e.stylize(""+t,"number"):g(t)?e.stylize(""+t,"boolean"):d(t)?e.stylize("null","null"):void 0}function c(e){return"["+Error.prototype.toString.call(e)+"]"}function l(e,t,n,r,o){for(var i=[],a=0,s=t.length;s>a;++a)i.push(k(t,String(a))?p(e,t,n,r,String(a),!0):"");return S.forEach(o,function(o){o.match(/^\d+$/)||i.push(p(e,t,n,r,o,!0))}),i}function p(e,t,n,r,o,i){var a,u,c;if(c=S.getOwnPropertyDescriptor(t,o)||{value:t[o]},c.get?u=c.set?e.stylize("[Getter/Setter]","special"):e.stylize("[Getter]","special"):c.set&&(u=e.stylize("[Setter]","special")),k(r,o)||(a="["+o+"]"),u||(S.indexOf(e.seen,c.value)<0?(u=d(n)?s(e,c.value,null):s(e,c.value,n-1),u.indexOf("\n")>-1&&(u=i?u.split("\n").map(function(e){return"  "+e}).join("\n").substr(2):"\n"+u.split("\n").map(function(e){return"   "+e}).join("\n"))):u=e.stylize("[Circular]","special")),O(a)){if(i&&o.match(/^\d+$/))return u;a=JSON.stringify(""+o),a.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)?(a=a.substr(1,a.length-2),a=e.stylize(a,"name")):(a=a.replace(/'/g,"\\'").replace(/\\"/g,'"').replace(/(^"|"$)/g,"'"),a=e.stylize(a,"string"))}return a+": "+u}function f(e,t,n){var r=0,o=S.reduce(e,function(e,t){return r++,t.indexOf("\n")>=0&&r++,e+t.replace(/\u001b\[\d\d?m/g,"").length+1},0);return o>60?n[0]+(""===t?"":t+"\n ")+" "+e.join(",\n  ")+" "+n[1]:n[0]+t+" "+e.join(", ")+" "+n[1]}function h(e){return S.isArray(e)}function g(e){return"boolean"==typeof e}function d(e){return null===e}function m(e){return null==e}function y(e){return"number"==typeof e}function v(e){return"string"==typeof e}function w(e){return"symbol"==typeof e}function O(e){return void 0===e}function E(e){return x(e)&&"[object RegExp]"===R(e)}function x(e){return"object"==typeof e&&e}function b(e){return x(e)&&"[object Date]"===R(e)}function A(e){return x(e)&&"[object Error]"===R(e)}function T(e){return"function"==typeof e}function C(e){return null===e||"boolean"==typeof e||"number"==typeof e||"string"==typeof e||"symbol"==typeof e||"undefined"==typeof e}function N(e){return e&&"object"==typeof e&&"function"==typeof e.copy&&"function"==typeof e.fill&&"function"==typeof e.binarySlice}function R(e){return Object.prototype.toString.call(e)}function _(e){return 10>e?"0"+e.toString(10):e.toString(10)}function P(){var e=new Date,t=[_(e.getHours()),_(e.getMinutes()),_(e.getSeconds())].join(":");return[e.getDate(),U[e.getMonth()],t].join(" ")}function k(e,t){return Object.prototype.hasOwnProperty.call(e,t)}var S=e("_shims"),I=/%[sdj%]/g;n.format=function(e){if(!v(e)){for(var t=[],n=0;n<arguments.length;n++)t.push(r(arguments[n]));return t.join(" ")}for(var n=1,o=arguments,i=o.length,a=String(e).replace(I,function(e){if("%%"===e)return"%";if(n>=i)return e;switch(e){case"%s":return String(o[n++]);case"%d":return Number(o[n++]);case"%j":try{return JSON.stringify(o[n++])}catch(t){return"[Circular]"}default:return e}}),s=o[n];i>n;s=o[++n])a+=d(s)||!x(s)?" "+s:" "+r(s);return a},n.inspect=r,r.colors={bold:[1,22],italic:[3,23],underline:[4,24],inverse:[7,27],white:[37,39],grey:[90,39],black:[30,39],blue:[34,39],cyan:[36,39],green:[32,39],magenta:[35,39],red:[31,39],yellow:[33,39]},r.styles={special:"cyan",number:"yellow","boolean":"yellow",undefined:"grey","null":"bold",string:"green",date:"magenta",regexp:"red"},n.isArray=h,n.isBoolean=g,n.isNull=d,n.isNullOrUndefined=m,n.isNumber=y,n.isString=v,n.isSymbol=w,n.isUndefined=O,n.isRegExp=E,n.isObject=x,n.isDate=b,n.isError=A,n.isFunction=T,n.isPrimitive=C,n.isBuffer=N;var U=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];n.log=function(){console.log("%s - %s",P(),n.format.apply(n,arguments))},n.inherits=function(e,t){e.super_=t,e.prototype=S.create(t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}})},n._extend=function(e,t){if(!t||!x(t))return e;for(var n=S.keys(t),r=n.length;r--;)e[n[r]]=t[n[r]];return e}},{_shims:27}],31:[function(e,t){var n=t.exports={};n.nextTick=function(){var e="undefined"!=typeof window&&window.setImmediate,t="undefined"!=typeof window&&window.postMessage&&window.addEventListener;if(e)return function(e){return window.setImmediate(e)};if(t){var n=[];return window.addEventListener("message",function(e){var t=e.source;if((t===window||null===t)&&"process-tick"===e.data&&(e.stopPropagation(),n.length>0)){var r=n.shift();r()}},!0),function(e){n.push(e),window.postMessage("process-tick","*")}}return function(e){setTimeout(e,0)}}(),n.title="browser",n.browser=!0,n.env={},n.argv=[],n.binding=function(){throw new Error("process.binding is not supported")},n.cwd=function(){return"/"},n.chdir=function(){throw new Error("process.chdir is not supported")}},{}]},{},[1]);
;/*!/src/static/lib/js/self/jsmod-extend.js*/
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
;/*!/src/page/layout/base.js*/
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