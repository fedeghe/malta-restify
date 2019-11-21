var srv = require('./server'),
    path = require('path'),
    fs = require('fs');

server = srv.getServer();
// console.log(server)
function malta_restify(obj, options = {}) {
    const self = this,
        start = new Date(),
        endpoints = options.endpoints,
        folder = path.resolve(process.cwd(), options.folder || './'),
        host = options.host || '127.0.0.1',
        port = options.port || 3001;
    let msg;
    server.start({port, host, folder, endpoints, malta: self});
    // fs.existsSync(endpoints) && self.listen(endpoints)
    return function (solve, reject) {
        solve(obj);
        self.notifyAndUnlock(start, msg);
    }
}

malta_restify.ext = '*';

module.exports = malta_restify;