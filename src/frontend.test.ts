import path from 'path';
import { OpenAPIFrontend } from './frontend';
import { OpenAPIV3 } from 'openapi-types';

const testsDir = path.join(__dirname, '..', '__tests__');

const examplePetAPIJSON = path.join(testsDir, 'resources', 'example-pet-api.openapi.json');
const examplePetAPIYAML = path.join(testsDir, 'resources', 'example-pet-api.openapi.yml');

const responses: OpenAPIV3.ResponsesObject = {
  200: { description: 'ok' },
};

const pathId: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: {
    type: 'integer',
  },
};

const definition: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'api',
    version: '1.0.0',
  },
  paths: {
    '/pets': {
      get: {
        operationId: 'getPets',
        responses,
      },
      post: {
        operationId: 'createPet',
        responses,
      },
    },
    '/pets/{id}': {
      get: {
        operationId: 'getPetById',
        responses,
      },
      put: {
        operationId: 'replacePetById',
        responses,
      },
      patch: {
        operationId: 'updatePetById',
        responses,
      },
      delete: {
        operationId: 'deletePetById',
        responses,
      },
      parameters: [pathId],
    },
    '/pets/{id}/owner': {
      get: {
        operationId: 'getOwnerByPetId',
        responses,
      },
      parameters: [pathId],
    },
    '/pets/meta': {
      get: {
        operationId: 'getPetsMeta',
        responses,
      },
    },
  },
};

describe('OpenAPIFrontend', () => {
  test('can be initalised with a valid OpenAPI document as JS Object', async () => {
    // @TODO: read a complex document with as many features as possible here
    const api = new OpenAPIFrontend({ definition, strict: true });
    await api.init();
    expect(api.initalized).toEqual(true);
  });

  test('can be initalised using a valid YAML file', async () => {
    // @TODO: read a complex document with as many features as possible here
    const api = new OpenAPIFrontend({ definition: examplePetAPIYAML, strict: true });
    await api.init();
    expect(api.initalized).toEqual(true);
  });

  test('can be initalised using a valid JSON file', async () => {
    // @TODO: read a complex document with as many features as possible here
    const api = new OpenAPIFrontend({ definition: examplePetAPIJSON, strict: true });
    await api.init();
    expect(api.initalized).toEqual(true);
  });

  test('throws an error when initalised with an invalid document in strict mode', async () => {
    const invalid: any = { invalid: 'not openapi' };
    const api = new OpenAPIFrontend({ definition: invalid, strict: true });
    await expect(api.init()).rejects.toThrowError();
  });

  test('emits a warning when initalised with an invalid OpenAPI document not in strict mode', async () => {
    const invalid: any = { invalid: 'not openapi' };
    const warn = console.warn;
    console.warn = jest.fn();
    const api = new OpenAPIFrontend({ definition: invalid, strict: false });
    await api.init();
    expect(console.warn).toBeCalledTimes(1);
    console.warn = warn; // reset console.warn
  });
});
