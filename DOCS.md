# OpenAPI Client Axios documentation

<!-- toc -->

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Class OpenAPIClientAxios](#class-openapiclientaxios)
  - [new OpenAPIClientAxios(opts)](#new-openapiclientaxiosopts)
    - [Parameter: opts](#parameter-opts)
    - [Parameter: opts.definition](#parameter-optsdefinition)
    - [Parameter: opts.strict](#parameter-optsstrict)
    - [Parameter: opts.validate](#parameter-optsvalidate)
    - [Parameter: opts.withServer](#parameter-optswithserver)
    - [Parameter: opts.axiosConfigDefaults](#parameter-optsaxiosconfigdefaults)
  - [.init()](#init)
  - [.initSync()](#initsync)
  - [.getClient()](#getclient)
  - [.withServer(server)](#withserverserver)
    - [Parameter: server](#parameter-server)
  - [.getBaseURL(operation?)](#getbaseurloperation)
    - [Parameter: operation](#parameter-operation)
  - [.getRequestConfigForOperation(operation, args)](#getrequestconfigforoperationoperation-args)
    - [Parameter: operation](#parameter-operation)
    - [Parameter: args](#parameter-args)
  - [.getAxiosInstance()](#getaxiosinstance)
  - [.getAxiosConfigForOperation(operation, args)](#getaxiosconfigforoperationoperation-args)
    - [Parameter: operation](#parameter-operation)
    - [Parameter: args](#parameter-args)
- [Axios Client Instance](#axios-client-instance)
- [Operation Method](#operation-method)
- [Operation Method Arguments](#operation-method-arguments)
  - [Parameters](#parameters)
  - [Data](#data)
  - [Config](#config)
- [Request Config Object](#request-config-object)
- [Paths Dictionary](#paths-dictionary)
- [Typegen](#typegen)

<!-- tocstop -->

## Installation

```
npm install --save openapi-client-axios
```

ES6 import syntax:
```javascript
import OpenAPIClientAxios from 'openapi-client-axios';
```

CommonJS require syntax:
```javascript
const OpenAPIClientAxios = require('openapi-client-axios').default;
```

The main `OpenAPIClientAxios` class is exported as the default export for the `'openapi-client-axios'` module.

## Getting Started

OpenAPI Client Axios uses [operationIds](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#operation-object)
in OpenAPIv3 definitions to call API operations.

Below is a simple example of how you would call an operation called `getPets()` with `openapi-client-axios`.

```javascript
const api = new OpenAPIClientAxios({ definition: './petstore.yml' });
const client = await api.init();
const res = await api.getPets(); // res.data will contain the result of the API call
```

## Authentication

OpenAPI Client Axios can be used both in the browser or in the backend on Node.js.

In the browser, you generally want let the browser handle authentication for you, so make sure to initalise your
`OpenAPIClientAxios` with `withCredentials: true` so axios knows automatically to send cookies to the API.

```javascript
// in the browser
const api = new OpenAPIClientAxios({
  definition,
  axiosConfigDefaults: {
    withCredentials: true,
  },
});
```

With Node.js, you will need to handle authentication yourself. Make sure to send the appropriate headers alongside your
requests. Here is an example of simple API key authentication:

```javascript
// on Node.js
const api = new OpenAPIClientAxios({
  definition,
  axiosConfigDefaults: {
    headers: {
      'x-api-key': 'secret',
    },
  },
});
```

## Class OpenAPIClientAxios

OpenAPIClientAxios is the main class of this module. However, it's entire purpose is to create an axios client instance
configured to consume an API described by the OpenAPI definition.

### new OpenAPIClientAxios(opts)

Creates an instance of OpenAPIClientAxios and returns it.

Example:
```javascript
const api = new OpenAPIClientAxios({
  definition: './openapi.yml',
  strict: true,
  validate: true,
  withServer: 0,
  axiosConfigDefaults: {
    withCredentials: true,
    headers: {
      'Cache-Control': 'no-cache',
    },
  },
});
```

#### Parameter: opts

Constructor options

#### Parameter: opts.definition

The OpenAPI definition as a file path or [Document object](#document-object).

Type: `Document | string`

#### Parameter: opts.strict

Optional. Strict mode, throw errors or warn on OpenAPI spec validation errors (default: false)

Type: `boolean`

#### Parameter: opts.validate

Optional. Whether to validate the input document (default: true)

Type: `boolean`

#### Parameter: opts.withServer

The default server to use. Either by index, description or a full server object to override with.

Type: `number`, `string` or [Server Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#serverObject

#### Parameter: opts.axiosConfigDefaults

Optional. Default axios config for the instance. Applied when instance is created.

Type: [`AxiosRequestConfig`](https://github.com/axios/axios#request-config)

### .init()

Initalizes OpenAPIClientAxios

Returns a promise of the created member axios instance.

1. Parses the input definition into a JS object. If the input definition is a URL, it will be resolved
2. (optional) Validates the definition object
3. Dereferences the definition for use. Will resolve any remote $refs
4. Creates the member axios instance
5. Sets `api.initialised = true` and returns the created axios instance

Example:
```javascript
await api.init();
```

### .initSync()

Synchronous version of [`.init()`](#init)

Initalizes OpenAPIClientAxios and creates the axios client instance.

Note: Only works when the input definition is a valid OpenAPI v3 object and doesn't contain any remote $refs.

Example:
```javascript
api.initSync();
```

### .getClient()

Returns a promise of the member axios instance. Will run .init() if API is not initalised yet.

Example:
```javascript
const client = await api.getClient();
```

### .withServer(server)

Set the default server base url to use for client.


#### Parameter: server

The default server to use. Either an index, description or a full server object to override with.

Example:
```javascript
// by index
api.withServer(1);
// by description property
api.withServer('EU server');
// by server object (override)
api.withServer({ url: 'https://example.com/api/', description: 'Eu Server' });
```

Type: `number`, `string` or [Server Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#serverObject)

### .getBaseURL(operation?)

Gets the API baseurl defined in the servers property

Example:
```javascript
const baseURL = api.getBaseUrl();
const baseURLForOperation = api.getBaseUrl('operationId');
```

#### Parameter: operation

Optional. The Operation object or operationId that may override the baseURL with its own or path object's servers
property.

Type: `Operation` or `string` (operationId)

### .getRequestConfigForOperation(operation, args)

Creates a generic request config object for operation + arguments top be used for calling the API.

This function contains the logic that handles operation method parameters.

Example:
```javascript
const request = api.getRequestConfigForOperation('updatePet', [1, { name: 'Odie' }])
```

#### Parameter: operation

The operation to call. Either as an operation object or string (operationId).

Type: `Operation` or `string` (operationId)

#### Parameter: args

The operation method arguments.

Type: `OperationMethodArguments`

### .getAxiosInstance()

Creates a new axios instance, extends it and returns it.

While initalising with [`.init()`](#init) or [.initSync()](#initsync) OpenAPIClientAxios calls this function to create the member client.

Note: Requires the API to be initalised first if run outside of .init() methods.

### .getAxiosConfigForOperation(operation, args)

Creates an axios config for operation + arguments to be used for calling the API.

This function calls `.getRequestConfigForOperation()` internally and maps the values to be suitable for axios.

Returns an [AxiosRequestConfig](https://github.com/axios/axios#request-config) object

Example:
```javascript
const request = api.getAxiosConfigForOperation('getPets', [{ petId: 1 }])
```

#### Parameter: operation

The operation to call. Either as an operation object or string (operationId).

Type: `Operation` or `string` (operationId)

#### Parameter: args

The operation method arguments.

Type: `OperationMethodArguments`

## Axios Client Instance

When OpenAPIClientAxios is initalised, a member
[axios client instance](https://github.com/axios/axios#creating-an-instance) is created.

The client instance can be accessed either directly via `api.client` getter, or `api.getClient()`.

The member axios client instance is a regular instance of axios with [Operation Methods](#operation-method) created to
provide an easy JavaScript API to call API operations.

In addition to operation methods, the Axios client instance baseURL is pre-configured to match the first OpenAPI
definition [servers](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#serverObject) property.

The parent OpenAPIClientAxios instance can also be accessed from the client via `client.api`.

## Operation Method

Operation methods are the main API used to call OpenAPI operations.

Each method is generated during [`.init()`](#init) and is attached as a property to the axios client instance.

## Operation Method Arguments

Each operation method takes three arguments:
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

### Config

The last argument is the config object.

The config object is an [`AxiosRequestConfig`](https://github.com/axios/axios#request-config) object. You can use it to
override axios request config parameters, such as `headers`, `timeout`, `withCredentials` and many more.

```javascript
// POST /user - createUser
client.createUser(null, { user: 'admin', pass: '123' }, { headers: { 'x-api-key': 'secret' } });
```

## Request Config Object

A `RequestConfig` object gets created as part of every operation method call.

It represents a generic HTTP request to be executed.

A request config object can be created without calling an operation method using
[`.getRequestConfigForOperation()`](#getrequestconfigforoperationoperation-args)

```javascript
import { RequestConfig } from 'openapi-client-axios';
```

Example object
```javascript
const requestConfig = {
  method: 'put', // HTTP method
  url: 'http://localhost:8000/pets/1?return=id,name', // full URL including protocol, host, path and query string
  path: '/pets/1', // path for the operation (relative to server base URL)
  pathParams: { petId: 1 }, // path parameters
  query: { return: ['id', 'name'] }, // query parameters
  queryString: 'return=id,name', // query string
  headers: {
    'content-type': 'application/json;charset=UTF-8',
    'accept': 'application/json' ,
    'cookie': 'x-api-key=secret',
  }, // HTTP headers, including cookie
  cookies: { 'x-api-key': 'secret' }, // cookies
  payload: {
    name: 'Garfield',
    age: 35,
  }, // the request payload passed as-is
}
```

## Paths Dictionary

In addition to operationIds, OpenAPIClient also allows calling operation
methods, using the operations' path and HTTP method.

The paths dictionary contains each path found in the OAS definition as keys,
and an object with each registered operation method as the value.

Example:

```javascript
client.paths['/pets'].get(); // GET /pets, same as calling client.getPets()
client.paths['/pets'].post(); // POST /pets
client.paths['/pets/{petId}'].put(1); // PUT /pets/1
client.paths['/pets/{petId}/owner/{ownerId}'].get({ petId: 1, ownerId: 2 }) ; // GET /pets/1/owner/2
```

This allows calling operation methods without using their operationIds, which
may be sometimes preferred.

## Typegen

`openapi-client-axios` comes with a tool called `typegen` to generate typescript type files (.d.ts) for
OpenAPIClient instances using an OpenAPI definition file.

```
$ npm install -g openapi-client-axios-typegen
```

```
$ typegen

Usage: typegen [file]

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]

Examples:
  typegen ./openapi.yml > client.d.ts  - generate a type definition file
```

The output of `typegen` exports a type called `Client`, which can be used for [client instances](#axios-client-instance).

Both the [`.getClient()`](#getclient) and [`api.init()`](#init) methods support passing in a Client type.

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
