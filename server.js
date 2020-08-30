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

let srv;

const requireUncached = requiredModule => {
        const mod = require.resolve(path.resolve(requiredModule))
        if (mod && mod in require.cache) {
            delete require.cache[mod]
        }
        const ret = require(path.resolve(requiredModule))
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
    action = {
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
        post:put_post,
        head: (fname, res) => {
            const content = requireUncached(fname);
            res.setHeader('content-length', content.toString().length);
            res.setHeader('content-type', 'application/json');
        }
    },
    getResponder = (verb, filePath, ep) =>
        (req, res , next) => {
            const fname = ep.source,
                k = ep.key || 'id'
            res.setHeader('Access-Control-Allow-Origin','*');
            res.setHeader('Server','malta-restify');
            switch(verb) {
                case 'del': 
                    k in req.params
                    && action.del(filePath, req.params.id, k)
                    && res.send(204);
                    break;
                case 'get': 
                    try {
                        if (k in req.params) {
                            let r = requireUncached(fname),
                                set = r.filter(e => e[k] == req.params[k]);
                            res.send(200, set.length > 1 ? set : set[0] || []);
                        } else {
                            res.send(200, requireUncached(fname));
                        }
                    }catch(e) {
                        console.log(e)
                    }
                    break;
                case 'head':
                    action.head(fname, res);
                    res.send(200);
                    break;
                case 'post': 
                case 'put':
                    if (!req.is('application/json')) {
                        return next(
                            new errors.InvalidContentError("Expects 'application/json'")
                        );
                    }
                    try {
                        action[verb](filePath, req.body)
                        && res.send(204);
                    } catch(e) {
                        console.log(e);
                    }
                    res.send(404);
                    break;
                default: break;
            }
            return next();
        };



class Server {
    constructor () {
        this.srv = null;
        this.dir = null;
        this.name = path.basename(path.dirname(__filename));
        this.started = false;
        this.malta = null;
    }
    init (port, host, folder) {
        this.started = true;
        this.malta.log_info(`> ${this.name.blue()} started on port # ${port} (http://${host}:${port})`);
        this.malta.log_info(`> webroot is ${folder}`.blue());
        this.dir = process.cwd();

        this.srv = restify.createServer({name: 'malta-restify'});
        
        this.srv.pre(cors.preflight);
        this.srv.pre(restify.plugins.pre.dedupeSlashes());

        this.srv.use(plugins.queryParser());
        this.srv.use(restifyBodyParser());
        this.srv.use(cors.actual);
        
        this.srv.on('after', (req, res, route, error) => {
            if (!error) {
                this.malta.log_info([
                    route.spec.method,
                    route.spec.path.replace(/\:([A-Za-z]*)/, ($1, $2) => 
                        $2 in req.params ? req.params[$2] : $2
                    ),
                    `(took ${+new Date - req.time()}ms)`
                ].join(' '));
            }
        });

        return this;
    }

    start ({port, host, folder, endpoints, malta}) {
        if (this.started) return;
        this.malta = malta;
        this.init(port, host, folder);

        try{
            fs.readFile(path.resolve(folder, endpoints), 'utf8', (err, data) => {
                if (err) this.malta.log_err('Error reading endpoint file');
                const eps = JSON.parse(data);
                Object.keys(eps).forEach(verb => {
                    /**
                     * 
                     * Verbs here are 
                     * del, get, head, opts, post, put, and patch
                     * 
                     */
                    eps[verb].forEach(ep => {
                        const fpath = path.resolve(folder, ep.source);
                        try {
                            this.srv[verb]({path : ep.key ? ep.ep.replace(/\:id/, `:${ep.key}`) : ep.ep} , getResponder(verb, fpath, ep));
                        } catch(e) {
                            this.malta.log_err('Error' ,e);
                        }
                    })
                })
                this.srv.listen(port, host, () => {
                    this.malta.log_info(`- ${this.srv.name} listening at ${this.srv.url}`);
                });
                this.malta.log_info('- start server');
            });
        }catch(e) {
            malta.log_err(e);
        }    
    }
}
module.exports = {
    getServer: () => {
        if (!srv) {
            srv = new Server();
        }
        return srv;
    }
};