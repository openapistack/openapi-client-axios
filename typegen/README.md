# OpenAPI Client Axios Typegen
[![CI](https://github.com/anttiviljami/openapi-client-axios/workflows/CI/badge.svg)](https://github.com/anttiviljami/openapi-client-axios/actions?query=workflow%3ACI)
[![npm version](https://img.shields.io/npm/v/openapi-client-axios-typegen.svg)](https://www.npmjs.com/package/openapi-client-axios-typegen)
[![License](http://img.shields.io/:license-mit-blue.svg)](https://github.com/anttiviljami/openapi-client-axios/blob/master/typegen/LICENSE)
[![Sponsored](https://img.shields.io/badge/chilicorn-sponsored-brightgreen.svg?logo=data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAAA4AAAAPCAMAAADjyg5GAAABqlBMVEUAAAAzmTM3pEn%2FSTGhVSY4ZD43STdOXk5lSGAyhz41iz8xkz2HUCWFFhTFFRUzZDvbIB00Zzoyfj9zlHY0ZzmMfY0ydT0zjj92l3qjeR3dNSkoZp4ykEAzjT8ylUBlgj0yiT0ymECkwKjWqAyjuqcghpUykD%2BUQCKoQyAHb%2BgylkAyl0EynkEzmkA0mUA3mj86oUg7oUo8n0k%2FS%2Bw%2Fo0xBnE5BpU9Br0ZKo1ZLmFZOjEhesGljuzllqW50tH14aS14qm17mX9%2Bx4GAgUCEx02JySqOvpSXvI%2BYvp2orqmpzeGrQh%2Bsr6yssa2ttK6v0bKxMBy01bm4zLu5yry7yb29x77BzMPCxsLEzMXFxsXGx8fI3PLJ08vKysrKy8rL2s3MzczOH8LR0dHW19bX19fZ2dna2trc3Nzd3d3d3t3f39%2FgtZTg4ODi4uLj4%2BPlGxLl5eXm5ubnRzPn5%2Bfo6Ojp6enqfmzq6urr6%2Bvt7e3t7u3uDwvugwbu7u7v6Obv8fDz8%2FP09PT2igP29vb4%2BPj6y376%2Bu%2F7%2Bfv9%2Ff39%2Fv3%2BkAH%2FAwf%2FtwD%2F9wCyh1KfAAAAKXRSTlMABQ4VGykqLjVCTVNgdXuHj5Kaq62vt77ExNPX2%2Bju8vX6%2Bvr7%2FP7%2B%2FiiUMfUAAADTSURBVAjXBcFRTsIwHAfgX%2FtvOyjdYDUsRkFjTIwkPvjiOTyX9%2FAIJt7BF570BopEdHOOstHS%2BX0s439RGwnfuB5gSFOZAgDqjQOBivtGkCc7j%2B2e8XNzefWSu%2BsZUD1QfoTq0y6mZsUSvIkRoGYnHu6Yc63pDCjiSNE2kYLdCUAWVmK4zsxzO%2BQQFxNs5b479NHXopkbWX9U3PAwWAVSY%2FpZf1udQ7rfUpQ1CzurDPpwo16Ff2cMWjuFHX9qCV0Y0Ok4Jvh63IABUNnktl%2B6sgP%2BARIxSrT%2FMhLlAAAAAElFTkSuQmCC)](http://spiceprogram.org/oss-sponsorship)

Type generator for [openapi-client-axios](https://github.com/anttiviljami/openapi-client-axios)

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

[<img alt="The Chilicorn" src="http://spiceprogram.org/assets/img/chilicorn_sticker.svg" width="250" height="250">](https://spiceprogram.org/oss-sponsorship)

