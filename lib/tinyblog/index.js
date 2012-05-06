var app = require('express').createServer()
  , connect = require('connect')
  , util = require('util')
  , fs = require('fs')
  , path = require('path')
  , Buffer = require('buffer').Buffer
  , crypto = require('crypto')
  , config
  , dirname

exports.version = '0.0.2'
exports.setup = function(conf) {
    config = conf
    dirname = config.dirname

    app.configure(function() {
        app.use(connect.static(dirname + '/public'))
        app.use(connect.logger())
        //app.use(connect.errorHandler())
        //development
        app.use(connect.errorHandler({ dumpExceptions: true, showStack: true }))
        app.use(app.router)
    })
    app.set('views', dirname + '/views')
    return app
}

app.run = function() {
    app.error(function(err, req, res, next) {
        getEntries(config.recentCount, function(recents) {
            var data = { recents: recents }
            if (err instanceof NotFound) {
                data['msg'] = '404 Page Not Found.'
                data['metaTitle'] = data.msg + ' - ' + config.blogName
                res.send('Sorry, this page is not found.', 404)
            }
            //render(res, 'error.ejs', data)
        })
    })

    app.get('/json/entries', function(req, res) {
        getEntries(config.rssCount, function(recents) {
            res.contentType('json')
            res.send(recents)
        })
    })

    app.get('/rss', function(req, res) {
        getEntries(config.rssCount, function(recents) {
            var data = { recents: recents
                       , lastBuildDate: '2010-08-12'
                       , layout: false
                       }
            renderRss(res, data)
        })
    })

    app.get('/:entry', function(req, res, next) {
        var code = req.params.entry
          , file = code + '.txt'
        getEntries(config.recentCount, function(recents) {
            readEntry(file, function(entry) {
                if (!entry) {
                    next()
                    return
                }
                var naviState = getNaviState(entry.code, recents)
                  , data = { entry: entry
                           , recents: recents
                           , metaTitle: entry.title + ' - ' + config.blogName
                           , naviState: naviState
                           }
                render(res, 'entry.ejs', data)
            })
        })
    })

    app.get('/', function(req, res) {
        getEntries(config.recentCount, function(recents) {
            res.redirect('/'+recents[0].code)
        })
    })

    app.get('/*', function(req, res) {
        throw new NotFound
    })

    app.listen(config.port)

    function render(res, template, data) {
        data['config'] = config
        data['gravatar'] = getGravatarImage(config.useGravatar)
        res.render(template, { locals: data
                             , layout: data.layout === undefined ? true : data.layout
                             })
    }

    function renderRss(res, data) {
        var xml = [ '<?xml version="1.0" encoding="utf-8" ?>'
                  , '<rss version="2.0"><channel>'
                  , '<title><![CDATA[', _e(config.blogName), ']]></title>'
                  , '<link>http://', config.hostName, '</link>'
                  , '<description><![CDATA[', _e(config.description), ']]></description>'
                  , '<docs>http://www.rssboard.org/rss-specification</docs>'
                  , '<copyright>', config.copyright, '</copyright>'
                  , '<webMaster>', config.email, '</webMaster>'
                  ]
          , item
          , recents = data.recents

        for (var i=0, sz=recents.length; i<sz; i++) {
            item = [ '<item>'
                   , '<author><![CDATA[', _e(config.authorName), ']]></author>'
                   , '<title><![CDATA[', _e(recents[i].title), ']]></title>'
                   , '<link>', recents[i].url, '</link>'
                   , '<guid isPermaLink="true">', recents[i].url, '</guid>'
                   , '<description><![CDATA[', _e(recents[i].body), ']]></description>'
                   , '<pubDate>', recents[i].mtime, '</pubDate>'
                   , '</item>'
                   ]
            xml.push(item.join(''))
        }
        xml.push('</channel></rss>')
        res.send(xml.join(''), {'Content-Type': 'application/xml; charset=utf-8'})

        function _e(str) {
            return str.replace(/&nbsp;/g, '&#160;')
                      .replace(/]]>/g, ']]&gt;')
        }
    }

    function NotFound() {
        this.name = 'NotFound'
        Error.call(this, '404 Page Not Found')
        //Error.captureStackTrace(this, arguments.callee)
    }

    function getFiles() {
        var files = fs.readdirSync(dirname + '/data')
        return files
    }

    function getEntries(count, callback) {
        var files = getFiles().sort(function(a, b) {
                    return a.substr(0, 12) < b.substr(0, 12)
                })
          , entries = []
          , completed = 0

        files.forEach(function(file) {
            readEntry(file, function(entry) {
                if (entry) entries.push(entry)
                completed++
                if (completed == files.length || completed == count) {
                    callback(entries)
                }
            })
        })
    }

    function readEntry(file, callback) {
        var f = dirname + '/data/' + file
        path.exists(f, function(exists) {
            if (exists) {
                fs.readFile(f, 'utf8', function(err, data) {
                    var lines = data.split("\n")
                      , code = path.basename(f, '.txt')
                      , entry = { code: code
                                , title: lines.shift()
                                , body: lines.join('')
                                , mtime: fs.statSync(f).mtime
                                , url: 'http://' + config.hostName + '/' + code + '/'
                                }
                    callback(entry)
                })
            }
            else {
                callback(null)
            }
        })
    }

    function getNaviState(currentCode, entries) {
        var i, sz, current, prev, next

        for (i=0, sz=entries.length; i<sz; ++i) {
            if (entries[i].code === currentCode) {
                current = i
                break
            }
        }
        prev = current+1
        next = current-1

        if (current == sz-1) prev = -1
        if (current == 0) next = -1
        return {prev: entries[prev], next: entries[next]}
    }

    function getGravatarImage(useGravatar) {
        return useGravatar ? 'http://www.gravatar.com/avatar/'+toHash(config.email)+'.png'
                           : ''
    }
    function toHash(str) {
        return crypto.createHash("md5")
                .update(str.toLowerCase())
                .digest("hex")
    }
    function toBase64(str) {
        return (new Buffer(str || "", "ascii")).toString("base64")
    }
}

