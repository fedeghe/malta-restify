
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
    return ret
}


const put_post = (fname, payload) => {
    const data = requireUncached(fname)
    data.push(payload)
    console.log(data)
    return fs.writeFileSync(fname, JSON.stringify(data))
}

const mutate = {
    del: (fname, id) => {
        try{
            const data = requireUncached(fname)
            console.log("data", data, id)
            const newData = data.filter(d => {
                console.log(d)
                return d.id != id
            })
            console.log("newData", newData)
            fs.writeFileSync(fname, JSON.stringify(newData))
            return true;
        } catch(e) {
            console.log(e)
            return false;
        }
    },
    put:put_post,
    post:put_post
}

const getResponder = (verb, filePath, fname) => (req, res , next) => {
    console.log("verb", verb)
    console.log("filePath", filePath)
    res.setHeader('Access-Control-Allow-Origin','*');
    switch(verb) {
        case 'del': 
            if ('id' in req.params) {
                mutate.del(filePath, req.params.id) && res.send(204);
            }
            break;
        case 'get': 
            try {
                res.send(200, requireUncached(fname));
            }catch(e) {
                console.log(e)
            }
            break;
        case 'head':
            res.send(200);
            break;
        case 'post': 
        case 'put':
            console.log(req)
            if (!req.is('application/json')) {
                return next(
                    new errors.InvalidContentError("Expects 'application/json'"),
                );
            }
            try {
                console.log(req.params)
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
}

const start = (port, host, folder, endpoints) => {
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
                        server[verb]({path : ep.ep} , getResponder(verb, fpath, ep.file));
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
    
}

const getServer = () => {
    console.log('getting server')
    server = restify.createServer();
    server.use(plugins.queryParser());
    server.use(restifyBodyParser());
    server.pre(cors.preflight);
    server.use(cors.actual);
    return {
        start: (server !== null)
        ? start
        : () => {
            throw 'Server not created'
        }
    }
}

module.exports = {
    getServer
}