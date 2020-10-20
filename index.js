const srv = require('./server'),
    path = require('path'),
    fs = require('fs');

function malta_restify(obj, options = {}) {
    const server = srv.getServer(),
        self = this,
        start = new Date(),
        folder = path.resolve(process.cwd(), options.folder || './'),
        host = options.host || '127.0.0.1',
        port = options.port || 3001,
        authorization = options.authorization || false,
        endpoints = options.endpoints;
    let msg;

    server.start({port, host, folder, endpoints, authorization, malta: self});
    return (solve, reject) => {
        solve(obj);
        self.notifyAndUnlock(start, msg);
    }
}

malta_restify.ext = '*';

module.exports = malta_restify;