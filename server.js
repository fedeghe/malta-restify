const fs = require('fs'),
    path = require('path'),
    restify = require('restify'),
    errors = require('restify-errors'),
    corsMiddleware = require('restify-cors-middleware'),
    plugins = restify.plugins,
    restifyBodyParser = plugins.bodyParser,
    cors = corsMiddleware({
        preflightMaxAge: 5,
        origins: ['*']
    });

let srv,
    uniqTpl = 'ID_<uniq>';

const verbMap = {
        DELETE: 'del',
        GET: 'get',
        PATCH: 'patch',
        PUT: 'put',
        POST: 'post',
        HEAD: 'head',
    },
    codes = {
        ok: 200,
        created: 201,
        noContent: 204,
        badReq: 400,
        unAuth: 401,
        notFound: 404,
        notAllowedMethod: 405,
        error: 500
    },
    uniqueID = new function() {
        let count = +new Date;
        this.toString = function() {
            count += 1;
            return uniqTpl.match(/\<uniq\>/) ?
                uniqTpl.replace(/\<uniq\>/, count) :
                `${uniqTpl}-${count}`
        };
    },
    sslPort = 443;

const requireUncached = requiredModule => {
        const mod = require.resolve(path.resolve(requiredModule))
        if (mod && mod in require.cache) {
            delete require.cache[mod]
        }
        const ret = require(path.resolve(requiredModule))
        return ret || []
    },
    beautifyJson = json => JSON.stringify(json, null, 2),

    action = {
        // updateas it is  can be used for PUT and PATCH
        put: ({
            filePath,
            req,
            key
        }) => {
            const payload = req.body;

            try {
                const prev = requireUncached(filePath)
                const next = prev.filter(el => req.params[key] !== el[key])
                if (prev.length !== next.length){
                    next.push({...payload,
                        [key]: `${uniqueID}`
                    });
                    fs.writeFileSync(filePath, beautifyJson(next))
                }
                return codes.noContent;
            } catch (e) {
                console.log({Error: e})
                return codes.notFound;
            }
        },
        patch: ({
            filePath,
            req,
            key
        }) => {
            const payload = req.body;
            try {
                const data = requireUncached(filePath)
                    .reduce((acc, el) => {
                        if (el[key] == req.params[key]) {
                            // do not reset others with
                            // el = {[k]: el[k]}
                            // could be an idea to make it optional with req.params.clean
                            for (let f in payload) {
                                //but not override the key
                                if (f !== key) {
                                    el[f] = payload[f];
                                }
                            }
                        }
                        acc.push(el)
                        return acc
                    }, [])
                fs.writeFileSync(filePath, beautifyJson(data))
                return codes.noContent;
            } catch (e) {
                console.log({Error: e})
                return codes.notFound;
            }
        },
        del: ({
            filePath,
            req,
            key
        }) => {
            try {
                const data = requireUncached(filePath)
                    .filter(d => d[key] != req.params[key])
                fs.writeFileSync(filePath, beautifyJson(data))
                return codes.noContent;
            } catch (e) {
                console.log({Error: e})
                return codes.error;
            }
        },
        
        // create
        post: ({
            filePath,
            req,
            key
        }) => {
            const payload = req.body;
            try {
                let data = requireUncached(filePath)
                if (payload instanceof Array) {
                    data = data.concat(payload.map(record => ({...record,
                        [key]: `${uniqueID}`
                    })))
                } else {
                    data.push({...payload,
                        [key]: `${uniqueID}`
                    })
                }
                fs.writeFileSync(filePath, beautifyJson(data))
                return codes.created;
            } catch (e) {
                console.log({Error: e})
                return codes.error;
            }
        },
        head: ({
            filePath,
            res,
            key,
            req
        }) => {
            const content = requireUncached(filePath),
                cnt = key ? content.filter(row => row[key] == req.params[key]) : content;
            res.setHeader('content-length', cnt.toString().length);
            res.setHeader('content-type', 'application/json');
            return codes.ok
        },
        get: ({
            req,
            filePath,
            ep
        }) => {
            try {
                const r = requireUncached(filePath);

                let k = ep.key || 'id',
                    set = r;

                if (k in req.params) {
                    set = r.filter(e => e[k] == req.params[k]);
                    return {code: codes.ok, res: set[0] || []};
                }
                return {code: codes.ok, res: r || []};
            } catch(e) {
                return {code: codes.error, res: []}
            }
        }
    },
    getConsumer = ({
        verb,
        ep,
        authorization,
        handlers
    }) => (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Server', 'malta-restify');
        if (authorization) {
            if (!('authorization' in req.headers) || req.headers.authorization !== authorization) {
                res.send(401);
                return next();
            }
        }

        if (ep.handler in handlers) {
            handlers[ep.handler]({
                req,
                res,
                verb,
                ep,
            });
        }
        return next();
    },
    getResponder = ({
        verb,
        filePath,
        ep,
        authorization
    }) => (req, res, next) => {
        const key = ep.key || 'id',
            responder = action[verb];


        if (authorization) {
            if (!('authorization' in req.headers) || req.headers.authorization !== authorization) {
                res.send(401);
                return next();
            }
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Server', 'malta-restify');
        if (responder) {
            switch (verb) {
                case 'del':
                    key in req.params &&
                        res.send(responder({
                            filePath,
                            req,
                            key
                        }))
                    break;
                case 'get':
                    const r = responder({
                        filePath,
                        req,
                        ep
                    });
                    res.send(r.code, r.res); 
                    break;
                case 'head':
                    res.send(responder({
                        filePath,
                        res,
                        req,
                        key
                    }));
                    break;
                case 'post': // create
                case 'put': // update
                case 'patch': // update
                    if (!req.is('application/json')) {
                        return next(
                            new errors.InvalidContentError("Expects 'application/json'")
                        );
                    }
                    res.send(
                        responder({
                            filePath,
                            req,
                            key
                        })
                    );
                    break;
                default:
                    break;
            }
        }
        return next();
    };

class Server {
    constructor(sslOpts = {}) {
        this.srv = null;
        this.dir = null;
        this.name = path.basename(path.dirname(__filename));
        this.started = false;
        this.malta = null;
        this.handlers = {};
        this.sslOpts = sslOpts
    }
    init({
        port,
        host,
        folder,
        authorization,
        handlers,
        delay
    }) {
        this.started = true;
        this.authorization = authorization;
        this.malta.log_info(`> ${this.name.blue()} started on port # ${port} (http://${host}:${port})`);
        authorization && this.malta.log_info(`  with authorization token \`${authorization}\``);
        handlers && this.malta.log_info(`  with extra handlers \`${handlers}\``);
        this.malta.log_info(`> webroot is ${folder}`.blue());
        this.dir = process.cwd();

        if (this.sslOpts.ssl) {
            this.srv = restify.createServer({
                name: 'malta-restify-ssl',
                key: fs.readFileSync(this.sslOpts.sslKeyPath),
                certificate: fs.readFileSync(this.sslOpts.sslCrtPath)
            });
        } else {
            this.srv = restify.createServer({
                name: 'malta-restify'
            });
        }

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
                    `(took ${+new Date - req.time() - delay}ms + ${delay}ms delay)`
                ].join(' '));
            }
        });

        return this;
    }
    start({
        port,
        host,
        folder,
        endpoints,
        authorization,
        handlers,
        delay,
        idTpl,
        malta
    }) {
        const self = this;
        if (this.started) return;
        this.malta = malta;
        this.init({
            port,
            host,
            folder,
            authorization,
            handlers,
            delay
        });
        if (handlers) {
            this.handlers = requireUncached(handlers)
        }
        try {

            fs.readFile(path.resolve(folder, endpoints), 'utf8', (err, data) => {
                if (err) this.malta.log_err('Error reading endpoint file');
                const endpoints = JSON.parse(data);

                if (idTpl) uniqTpl = idTpl;

                Object.keys(endpoints).forEach(verb =>
                    endpoints[verb].forEach(ep => {
                        const mappedVerb = verbMap[verb];
                        try {
                            const base = {
                                    verb: mappedVerb,
                                    ep,
                                    authorization,
                                },
                                reqHandler = ('handler' in ep && ep.handler in this.handlers)
                                    ? getConsumer({
                                        handlers: this.handlers,
                                        ...base,
                                    })
                                    : getResponder({
                                        filePath: path.join(folder, ep.source),
                                        ...base
                                    });
                            self.srv[mappedVerb]({
                                    path: ep.path.replace(/\:id/, `:${ep.key}`)
                                },
                                // first delay
                                (req, res, next) => new Promise(
                                    solve => setTimeout(solve, delay)
                                ).then(() => reqHandler(req, res, next))
                            );

                        } catch (e) {
                            this.malta.log_err('Error', e);
                        }
                    })
                )
                this.srv.listen(port, host, () => {
                    this.malta.log_info(`- ${this.srv.name} listening at ${this.srv.url}`);
                });
                this.malta.log_info('- start server');
            });
        } catch (e) {
            malta.log_err(e);
        }
    }
}
module.exports = {
    getServer: (sslOpts) => {
        if (!srv) {
            srv = new Server(sslOpts);
        }
        return srv;
    }
};