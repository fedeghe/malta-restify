
const fs = require('fs'),
    path = require('path'),
    restify = require('restify'),
    errors = require('restify-errors'),
    corsMiddleware = require('restify-cors-middleware'),
    plugins = require('restify-plugins'),
    restifyBodyParser = plugins.bodyParser,
    cors = corsMiddleware({
        preflightMaxAge: 5,
        origins: ['*']
    });

let server = null;

const requireUncached = module => {
        const mod = require.resolve(path.resolve(module))
        if (mod && mod in require.cache) {
            delete require.cache[mod]
        }
        const ret = require(path.resolve(module))
        return ret || []
    },
    put_post = (fname, payload) => {
        let data = requireUncached(fname)
        if (payload instanceof Array) {
            data = data.concat(payload)
        } else {
            data.push(payload)
        }
        return fs.writeFileSync(fname, JSON.stringify(data))
    },
    mutate = {
        del: (fname, id, k) => {
            try{
                const data = requireUncached(fname),
                    newData = data.filter(d => d[k] != id)
                fs.writeFileSync(fname, JSON.stringify(newData))
                return true;
            } catch(e) {
                console.log(e)
                return false;
            }
        },
        put:put_post,
        post:put_post
    },
    head = (fname, res) => {
        const content = requireUncached(fname);
        res.setHeader('content-length', content.toString().length);
        res.setHeader('content-type', 'application/json');
    },
    getResponder = (verb, filePath, ep) => (req, res , next) => {
        const fname = ep.file;
        res.setHeader('Access-Control-Allow-Origin','*');
        res.setHeader('Server','malta-restify');
        const k = ep.key || 'id'
        switch(verb) {
            case 'del': 
                if (k in req.params) {
                    mutate.del(filePath, req.params.id, k) && res.send(204);
                }
                break;
            case 'get': 
                try {
                    
                    if (k in req.params) {
                        let r = requireUncached(fname)
                        res.send(200, r.filter(e => e[k] == req.params[k]));
                    } else {
                        res.send(200, requireUncached(fname));
                    }
                }catch(e) {
                    console.log(e)
                }
                break;
            case 'head':
                head(fname, res);
                res.send(200);
                break;
            case 'post': 
            case 'put':
                if (!req.is('application/json')) {
                    return next(
                        new errors.InvalidContentError("Expects 'application/json'"),
                    );
                }
                try {
                    mutate[verb](filePath, req.body)
                    && res.send(204);
                } catch(e) {
                    console.log(e)
                }
                res.send(404);
                break;
            default: break;
        }
        return next();
    },
    start = (port, host, folder, endpoints) => {
        try{
            fs.readFile(path.resolve(folder, endpoints), 'utf8', (err, data) => {
                const eps = JSON.parse(data)
                if (err) throw 'Error reading endpoint file'
                Object.keys(eps).forEach(verb => {
                    /**
                     * 
                     * Verbs here are 
                     * del, get, head, opts, post, put, and patch
                     * 
                     */
                    eps[verb].forEach(ep => {
                        const fpath = path.resolve(folder, ep.file)
                        try {
                            server[verb]({path : ep.key ? ep.ep.replace(/\:id/, `:${ep.key}`) : ep.ep} , getResponder(verb, fpath, ep));
                        } catch(e) {
                            console.log('Error' ,e)
                        }
                    })
                })
                server.listen(port, host, () => {
                    console.log('%s listening at %s ', server.name, server.url);
                });
                console.log('start server')
            });
        }catch(e) {
            console.log(e)
        }    
    },
    getServer = () => {
        console.log('- getting server')
        server = restify.createServer();
        server.use(plugins.queryParser());
        server.use(restifyBodyParser());
        server.pre(cors.preflight);
        server.use(cors.actual);
        return {
            start: (server !== null)
            ? start
            : () => {
                throw ':[] server not created'
            }
        }
    };

module.exports = {
    getServer
}