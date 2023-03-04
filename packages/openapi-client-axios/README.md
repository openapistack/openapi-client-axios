<h1 align="center"><img alt="openapi-client-axios" src="https://github.com/anttiviljami/openapi-client-axios/raw/master/header.png?raw=true" style="max-width:50rem"></h1>

[![CI](https://github.com/anttiviljami/openapi-client-axios/workflows/CI/badge.svg)](https://github.com/anttiviljami/openapi-client-axios/actions?query=workflow%3ACI)
[![npm version](https://img.shields.io/npm/v/openapi-client-axios.svg)](https://www.npmjs.com/package/openapi-client-axios)
[![npm downloads](https://img.shields.io/npm/dw/openapi-client-axios)](https://www.npmjs.com/package/openapi-client-axios)
[![bundle size](https://img.shields.io/bundlephobia/minzip/openapi-client-axios?label=gzip%20bundle)](https://bundlephobia.com/package/openapi-client-axios)
[![License](http://img.shields.io/:license-mit-blue.svg)](https://github.com/anttiviljami/openapi-client-axios/blob/master/LICENSE)
[![Buy me a coffee](https://img.shields.io/badge/donate-buy%20me%20a%20coffee-orange)](https://buymeacoff.ee/anttiviljami)

<p align="center">JavaScript client library for consuming OpenAPI-enabled APIs with <a href="https://github.com/axios/axios" target="_blank">axios</a>. Types included.</p>

## Features

- [x] Create API clients from [OpenAPI v3 definitions](https://github.com/OAI/OpenAPI-Specification)
- [x] Client is configured in runtime. **No generated code!**
- [x] Generate TypeScript definitions (.d.ts) for your APIs with full IntelliSense support
- [x] Easy to use API to call API operations using JavaScript methods
  - `client.getPet(1)`
  - `client.searchPets()`
  - `client.searchPets({ ids: [1, 2, 3] })`
  - `client.updatePet(1, payload)`
- [x] Built on top of the robust [axios](https://github.com/axios/axios) JavaScript library
- [x] Isomorphic, works both in browser and Node.js

## Documentation

**New!** OpenAPI Client Axios documentation is now found on [openapistack.co](https://openapistack.co)

https://openapistack.co/docs/openapi-client-axios/intro

## Quick Start

```
npm install --save axios openapi-client-axios
```

```
yarn add axios openapi-client-axios
```

With promises / CommonJS syntax:

```javascript
const OpenAPIClientAxios = require('openapi-client-axios').default;

const api = new OpenAPIClientAxios({ definition: 'https://example.com/api/openapi.json' });
api.init()
  .then(client => client.getPetById(1))
  .then(res => console.log('Here is pet id:1 from the api', res.data));
```

With async-await / ES6 syntax:

```javascript
import OpenAPIClientAxios from 'openapi-client-axios';

const api = new OpenAPIClientAxios({ definition: 'https://example.com/api/openapi.json' });
api.init();

async function createPet() {
  const client = await api.getClient();
  const res = await client.createPet(null, { name: 'Garfield' });
  console.log('Pet created', res.data);
}
```

## Client

OpenAPI Client Axios uses [operationIds](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#operation-object)
in OpenAPIv3 definitions to call API operations.

After initializing `OpenAPIClientAxios`, an axios client instance extended with OpenAPI capabilities is exposed.

Example:
```javascript
const api = new OpenAPIClientAxios({ definition: 'https://example.com/api/openapi.json' });
api.init().then((client) => {
  client.updatePet(1, { age: 12 });
});
```

`client` is an [axios instance](https://github.com/axios/axios#creating-an-instance) initialized with
baseURL from OpenAPI definitions and extended with extra operation methods for calling API operations.

It also has a reference to OpenAPIClientAxios at `client.api`

## Operation methods

OpenAPIClientAxios operation methods take 3 arguments:

```javascript
client.operationId(parameters?, data?, config?)
```

### Parameters

The first argument is used to pass parameters available for the operation.

```javascript
// GET /pets/{petId}
client.getPet({ petId: 1 })
```

For syntactic sugar purposes, you can also specify a single implicit parameter value, in which case OpenAPIClientAxios
will look for the first required parameter for the operation. Usually this is will be a path parameter.

```javascript
// GET /pets/{petId} - getPet
client.getPet(1)
```

Alternatively, you can explicitly specify parameters in array form. This method allows you to set custom parameters not defined
in the OpenAPI spec.

```javascript
// GET /pets?search=Garfield - searchPets
client.searchPets([{ name: 'search', value: 'Garfield', in: 'query' }])
```

The type of the parameters can be any of:
- query
- header
- path
- cookie

### Data

The second argument is used to pass the requestPayload

```javascript
// PUT /pets/1 - updatePet
client.updatePet(1, { name: 'Odie' })
```

More complex payloads, such as Node.js streams or FormData supported by Axios can be used.

The first argument can be set to null if there are no parameters required for the operation.

```javascript
// POST /pets - createPet
client.updatePet(null, { name: 'Garfield' })
```

### Config object

The last argument is the config object.

The config object is an [`AxiosRequestConfig`](https://github.com/axios/axios#request-config) object. You can use it to
override axios request config parameters, such as `headers`, `timeout`, `withCredentials` and many more.

```javascript
// POST /user - createUser
client.createUser(null, { user: 'admin', pass: '123' }, { headers: { 'x-api-key': 'secret' } });
```

## Paths Dictionary

OpenAPI Client Axios also allows calling API operations via their path and HTTP
method, using the paths dictionary.

Example:

```javascript
client.paths['/pets'].get(); // GET /pets, same as calling client.getPets()
client.paths['/pets'].post(); // POST /pets
client.paths['/pets/{petId}'].put(1); // PUT /pets/1
client.paths['/pets/{petId}/owner/{ownerId}'].get({ petId: 1, ownerId: 2 }) ; // GET /pets/1/owner/2
```

This allows calling operation methods without using their operationIds, which
may be sometimes preferred.

## Generating type files (.d.ts)

![TypeScript IntelliSense](https://github.com/anttiviljami/openapi-client-axios/blob/master/packages/typegen/intellisense.gif)

`openapi-client-axios` comes with a tool called `typegen` to generate typescript type files (.d.ts) for
OpenAPIClient instances using an OpenAPI definition file.

```
$ npm install -g openapi-client-axios-typegen
```

```
Usage: typegen [file]

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]

Examples:
  typegen ./openapi.yml > client.d.ts  - generate a type definition file
```

The output of `typegen` exports a type called `Client`, which can be used for instances created with `OpenAPIClientAxios`.

Both the `api.getClient()` and `api.init()` methods support passing in a Client type.

```typescript
import { Client as PetStoreClient } from './client.d.ts';

const client = await api.init<PetStoreClient>();
const client = await api.getClient<PetStoreClient>();
```

`typegen` supports using both local and remote URLs for OpenAPI definition files.

```
$ typegen ./petstore.yaml
$ typegen https://raw.githubusercontent.com/OAI/OpenAPI-Specification/master/examples/v3.0/petstore.yaml
```

## Contributing

OpenAPI Client Axios is Free and Open Source Software. Issues and pull requests are more than welcome!
