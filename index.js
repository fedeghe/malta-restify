const srv = require('./server'),
    path = require('path');

function malta_restify(obj, options = {}) {
    const self = this,
        start = new Date(),
        cwd = process.cwd(),
        folder = path.resolve(cwd, options.folder || './'),
        host = options.host || '127.0.0.1',
        port = options.port || 3001,
        idTpl = options.idTpl || 'ID_<uniq>',
        delay = ~~options.delay || 0,
        authorization = options.authorization || false,
        handlers = options.handlers ? path.resolve(cwd, options.handlers) : false,
        endpoints = options.endpoints;

    let msg;

    const serverHttp = srv.getServer();
    serverHttp.start({
        port,
        host,
        folder,
        endpoints,
        authorization,
        handlers,
        delay,
        idTpl,
        malta: self
    });
   

    return (solve, reject) => {
        solve(obj);
        self.notifyAndUnlock(start, msg);
    }
}

malta_restify.ext = '*';

module.exports = malta_restify;