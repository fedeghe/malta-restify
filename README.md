---
[![npm version](https://badge.fury.io/js/malta-restify.svg)](http://badge.fury.io/js/malta-restify)
[![npm downloads](https://img.shields.io/npm/dt/malta-restify.svg)](https://npmjs.org/package/malta-restify)
[![npm downloads](https://img.shields.io/npm/dm/malta-restify.svg)](https://npmjs.org/package/malta-restify)  
---  

This plugin can be started on any file


`> yarn add malta-restify`  

It starts a really raw simple http server, parameters:
- **endpoints**  
    grouped per HTTP verb the list of endpoints, the minimum setting for one endpoint follows:
    ``` json
    {
        "GET": [{
            "ep": "/users", 
            "source": ".data/users.json"
        }]
    }
    ```
    when for GET, DELETE, PATCH or PUT a parameter is required it becomes: 
    ``` json
    {
        "DELETE": [{
            "ep": "/users/:id", 
            "source": ".data/users.json",
            "key": "id"
        }]
    }
    ```
    Notice: `CONNECT`, `OPTIONS` and `TRACE` are not supported
- _port_: default is 3001 (u need to use root to start on ports < 1024)
- _host_: default IP is 127.0.0.1
- _folder_: the path relative to execution where files targeted in `endpoints` are reachable; default is _malta_execution folder.  
- _delay_: in millisecond to delay the response [default 0]
- _handlers_: the path (relative to execution) where one or more named handlers are exported; default is _malta_execution folder
- _idTpl_: a string that contains `<uniq>` that will be used to create the _id_ value of new elements created using POST; default is `ID_<uniq>`  
- authorization: string - when specified will require every request to send this in an _authorization_ header.


So for example if we want to start it automatically at (first) build, using _public_ as webRoot, with a specific ip on a specific port;
the _entrypoints_ folder must be relative to _folder_, which if not specified is the execution one; all paths must be relative to th default or specified _folder_
``` sh
> malta source/index.js public -plugins=malta-restify[endpoints:\"source/restify.json\",port:3452,delay:1e3]
```
or in the .json file :
``` json
{
    "source/index.js": ". -plugins=malta-restify[endpoints:'source/restify.json']"
}
```



the entrypoints have the following structure (in the example _source/restify.json_):

``` json
{
    "DELETE": [
        {
            "ep": "/person/:id",
            "source": "./source/data/persons.json",
            "key": "id"
        }
    ],
    "POST": [
        {
            "ep": "/persons",
            "source": "./source/data/persons.json"
        }
    ],
    "GET": [
        {
            "ep": "/persons",
            "source": "source/data/persons.json"
        },
        {
            "ep": "/person/:id",
            "source": "source/data/persons.json",
            "key": "id"
        }   
    ]
}
```
and `persons.json` could be something like: 
``` json
[
    {
        "id": 1,
        "name": "Federico"
    },
    {
        "id": 2,
        "name": "Gabriele"
    }
]
``` 

where the `source` referenced file has to be relative to the current execution folder.

The only thing one needs to take care of when referencing a specific element for example in the case of the `GET /person/:id` is that 
here the `key` value must be present inside the _persons.json_ file since will be used for retriving
the specific object (or to delete it, check the first DEL rule)

---
### Another small example

an additional option is available from version **1.0.6**
- authorization 

when specified, every request must include a header surprisingly named _authorization_ with the exact value passed to the plugin; in case it does not match will receive back a 401 http code (unauthorized).

---
### Your handlers ( from v 1.1.3 )
Could be useful to be able to setup simple handlers to fulfill some requests; to do that, first create a file fo the special handlers, for example: 
``` js
const users = require('./users.json')
const checkCredentials = ({
    req, res, verb, ep
}) => {
    res.send(202, users);
}

module.exports = {
    checkCredentials
}
```
then save ti and pass the **path** as the `handlers` parameter to Malta.

Now the only missin thing is to add the indicatioj   in the `restify.json` file, for example:
``` json
"GET": [
    {
        "ep": "/checkcredentials",
        "handler": "checkCredentials", // the name must match
        "any": "other",
        "parameter": "here"
    },
```
`ep` and `handler` are mandatory, while all others are optionals and will be passed to to the handler within the `ep` parameter.