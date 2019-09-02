var srv = require('./server'),
    path = require('path'),
    fs = require('fs');

server = srv.getServer();

function malta_restify(obj, options) {
    var self = this,
        start = new Date(),
        msg,
        port = null,
        folder = './',
        host = 'localhost';

    options = options || {};
    port = options.port || 3001;
    host = options.host || host;
    folder = path.resolve(process.cwd(), options.folder || folder);

    if (options.staticEp) {
        server.staticStart(port, host, folder, options.staticEp, options.staticFree);
    } else {
        server.start(port, host, folder);
    }

    return function (solve, reject) {
        solve(obj);
        self.notifyAndUnlock(start, msg);
    }
}

malta_restify.ext = '*';

module.exports = malta_restify;