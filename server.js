const restify = require('restify'),
    corsMiddleware = require('restify-cors-middleware'),
    plugins = require('restify-plugins'),
    consts = require('./consts.json'),
    ip_addr = consts.IP,
    port = consts.PORT,
    server = restify.createServer(),
    PATHS = consts.PATHS,
    cors = corsMiddleware({
        preflightMaxAge: 5,
        origins: ['*']
    }),
    sources = {
        movies: require('./movies.json'),
        actors: require('./actors.json'),
        directors: require('./directors.json'),
        characters: require('./characters.json'),
    }

server.use(plugins.queryParser());
server.pre(cors.preflight);
server.use(cors.actual);
server.get({path : PATHS.movies} , getMovies);
server.get({path : PATHS.actors} , getActors);
server.get({path : PATHS.characters} , getCharacters);
server.get({path : PATHS.directors} , getDirectors);

function getMovies(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.send(200, {
        data: sources.movies
    });
}
function getActors(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.send(200, {
        data: sources.actors
    });
}
function getDirectors(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.send(200, {
        data: sources.directors
    });
}
function getCharacters(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.send(200, {
        data: sources.characters
    });
}

server.listen(port, ip_addr, function () {
    console.log('%s listening at %s ', server.name, server.url);
});