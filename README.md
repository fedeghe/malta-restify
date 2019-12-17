---
[![npm version](https://badge.fury.io/js/malta-restify.svg)](http://badge.fury.io/js/malta-restify)
[![Dependencies](https://david-dm.org/fedeghe/malta-restify.svg)](https://david-dm.org/fedeghe/malta-restify)
[![npm downloads](https://img.shields.io/npm/dt/malta-restify.svg)](https://npmjs.org/package/malta-restify)
[![npm downloads](https://img.shields.io/npm/dm/malta-restify.svg)](https://npmjs.org/package/malta-restify)  
---  

This plugin can be started on any file


`> yarn add malta-restify`  

It starts a really raw simple http server, parameters:
- entrypoints (mandatory)  
- port [3001]
- host [127.0.0.1]
- folder [execution one, if givern must be relative to it]



So for example if we want to start it automatically at (first) build, using _public_ as webRoot, with a specific ip on a specific port:  
```
> malta source/index.js public -plugins=malta-restify[endpoints:\"source/restify.json\"]
```
or in the .json file :
```
{
    ...,
    "source/index.js": ". -plugins=malta-restify[endpoints:'source/restify.json']"
    ...
}
```



the entrypoints have the following structure (in the example _source/restify.json_):

``` json
{
    "del": [
        {
            "ep": "/person/:id",
            "source": "./source/data/persons.json",
            "id": "id"
        }
    ],
    "post": [
        {
            "ep": "/persons",
            "source": "./source/data/persons.json"
        }
    ],
    "get": [
        {
            "ep": "/persons",
            "source": "source/data/persons.json"
        },
        {
            "ep": "/person/:id",
            "source": "source/data/persons.json"
        }   
    ]
}
``` 

where the `source` referenced file has to be relative to the current folder.

The only thing one needs to take care of is for example in the case of the `GET /person/:id` 
here the `id` key must be present inside the _persons.json_ file since will be used for retriving
the specific object (or to delete it, check the first DEL rule)