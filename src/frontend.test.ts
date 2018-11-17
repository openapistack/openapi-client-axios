import path from 'path';
import { OpenAPIFrontend } from './frontend';
import { OpenAPIV3 } from 'openapi-types';
import MockAdapter from 'axios-mock-adapter';

const testsDir = path.join(__dirname, '..', '__tests__');

const examplePetAPIJSON = path.join(testsDir, 'resources', 'example-pet-api.openapi.json');
const examplePetAPIYAML = path.join(testsDir, 'resources', 'example-pet-api.openapi.yml');

const baseURL = 'http://localhost:8080';

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
  servers: [{ url: baseURL }],
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
  describe('init', () => {
    test('can be initalised with a valid OpenAPI document as JS Object', async () => {
      // @TODO: read a complex document with as many features as possible here
      const api = new OpenAPIFrontend({ definition, strict: true });
      await api.init();
      expect(api.initalized).toEqual(true);
    });

    test('can be initalised using a valid YAML file', async () => {
      const api = new OpenAPIFrontend({ definition: examplePetAPIYAML, strict: true });
      await api.init();
      expect(api.initalized).toEqual(true);
    });

    test('can be initalised using a valid JSON file', async () => {
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

  describe('client', () => {
    test('has created operation methods for each operationId', async () => {
      const api = new OpenAPIFrontend({ definition, strict: true });
      const client = await api.init();
      expect(client).toHaveProperty('getPets');
      expect(client).toHaveProperty('createPet');
      expect(client).toHaveProperty('getPetById');
      expect(client).toHaveProperty('replacePetById');
      expect(client).toHaveProperty('updatePetById');
      expect(client).toHaveProperty('deletePetById');
      expect(client).toHaveProperty('getOwnerByPetId');
      expect(client).toHaveProperty('getPetsMeta');
    });

    test('has set default baseURL to the first server in config', async () => {
      const api = new OpenAPIFrontend({ definition, strict: true });
      const client = await api.init();
      expect(client.defaults.baseURL).toBe(baseURL);
    });

    test('getPets() calls GET /pets', async () => {
      const api = new OpenAPIFrontend({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = [{ id: 1, name: 'Garfield' }];
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets').reply((config) => mockHandler(config));

      const res = await client.getPets();
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('getPetById(1) calls GET /pets/1', async () => {
      const api = new OpenAPIFrontend({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn(() => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.getPetById(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('deletePetById(1) calls DELETE /pets/1', async () => {
      const api = new OpenAPIFrontend({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn(() => [200, mockResponse]);
      mock.onDelete('/pets/1').reply((config) => mockHandler(config));

      const res = await client.deletePetById(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('createPet(pet) calls POST /pets with JSON payload', async () => {
      const api = new OpenAPIFrontend({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const pet = { name: 'Garfield' };
      const mockResponse = { id: 1, ...pet };
      const mockHandler = jest.fn(() => [201, mockResponse]);
      mock.onPost('/pets').reply((config) => mockHandler(config));

      const res = await client.createPet(pet);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
      const mockContext = mockHandler.mock.calls[mockHandler.mock.calls.length - 1][0];
      expect(mockContext.data).toEqual(JSON.stringify(pet));
    });

    test('replacePetById(1, pet) calls PUT /pets/1 with JSON payload', async () => {
      const api = new OpenAPIFrontend({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const pet = { id: 1, name: 'Garfield' };
      const mockResponse = pet;
      const mockHandler = jest.fn(() => [200, mockResponse]);
      mock.onPut('/pets/1').reply((config) => mockHandler(config));

      const res = await client.replacePetById(1, pet);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
      const mockContext = mockHandler.mock.calls[mockHandler.mock.calls.length - 1][0];
      expect(mockContext.data).toEqual(JSON.stringify(pet));
    });

    test('getOwnerByPetId(1) calls GET /pets/1/owner', async () => {
      const api = new OpenAPIFrontend({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { name: 'Jon' };
      const mockHandler = jest.fn(() => [200, mockResponse]);
      mock.onGet('/pets/1/owner').reply((config) => mockHandler(config));

      const res = await client.getOwnerByPetId(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('getPetsMeta() calls GET /pets/meta', async () => {
      const api = new OpenAPIFrontend({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { totalPets: 10 };
      const mockHandler = jest.fn(() => [200, mockResponse]);
      mock.onGet('/pets/meta').reply((config) => mockHandler(config));

      const res = await client.getPetsMeta();
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });
  });
});
