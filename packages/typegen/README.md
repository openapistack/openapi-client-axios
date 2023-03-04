# OpenAPI Client Axios Typegen
[![CI](https://github.com/anttiviljami/openapi-client-axios/workflows/CI/badge.svg)](https://github.com/anttiviljami/openapi-client-axios/actions?query=workflow%3ACI)
[![npm version](https://img.shields.io/npm/v/openapi-client-axios-typegen.svg)](https://www.npmjs.com/package/openapi-client-axios-typegen)
[![License](http://img.shields.io/:license-mit-blue.svg)](https://github.com/anttiviljami/openapi-client-axios/blob/master/LICENSE)

Type generator for [openapi-client-axios](https://github.com/anttiviljami/openapi-client-axios)

## Documentation

**New!** OpenAPI Client Axios documentation is now found on [openapistack.co](https://openapistack.co)

https://openapistack.co/docs/openapi-client-axios/intro

## Generating type files (.d.ts)

![TypeScript IntelliSense](intellisense.gif)

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

OpenAPI Client Axios Typegen is Free and Open Source Software. Issues and pull requests are more than welcome!
