import path from 'path';
import { OpenAPIClientAxios } from './client';

import { OpenAPIV3 } from 'openapi-types';
import MockAdapter from 'axios-mock-adapter';

const testsDir = path.join(__dirname, '..', '__tests__');

const examplePetAPIJSON = path.join(testsDir, 'resources', 'example-pet-api.openapi.json');
const examplePetAPIYAML = path.join(testsDir, 'resources', 'example-pet-api.openapi.yml');

const baseURL = 'http://localhost:8080';
const baseURLV2 = 'http://localhost:8080/v2';

const responses: OpenAPIV3.ResponsesObject = {
  200: { description: 'ok' },
};

const petId: OpenAPIV3.ParameterObject = {
  name: 'petId',
  in: 'path',
  required: true,
  schema: {
    type: 'integer',
  },
};

const ownerId: OpenAPIV3.ParameterObject = {
  name: 'ownerId',
  in: 'path',
  required: true,
  schema: {
    type: 'integer',
  },
};

const examplePet = {
  id: 1,
  name: 'Garfield',
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
        responses: {
          200: {
            $ref: '#/components/responses/PetsListRes',
          },
        },
        parameters: [
          {
            name: 'q',
            in: 'query',
            schema: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        ],
      },
      post: {
        operationId: 'createPet',
        responses: {
          201: {
            $ref: '#/components/responses/PetRes',
          },
        },
      },
    },
    '/pets/{petId}': {
      get: {
        operationId: 'getPetById',
        responses: {
          200: {
            $ref: '#/components/responses/PetRes',
          },
        },
      },
      put: {
        operationId: 'replacePetById',
        responses: {
          200: {
            $ref: '#/components/responses/PetRes',
          },
        },
      },
      patch: {
        operationId: 'updatePetById',
        responses: {
          200: {
            $ref: '#/components/responses/PetRes',
          },
        },
      },
      delete: {
        operationId: 'deletePetById',
        responses: {
          200: {
            $ref: '#/components/responses/PetRes',
          },
        },
      },
      parameters: [petId],
    },
    '/pets/{petId}/owner': {
      get: {
        operationId: 'getOwnerByPetId',
        responses,
      },
      parameters: [petId],
    },
    '/pets/{petId}/owner/{ownerId}': {
      get: {
        operationId: 'getPetOwner',
        responses,
      },
      parameters: [petId, ownerId],
    },
    '/pets/meta': {
      get: {
        operationId: 'getPetsMeta',
        responses,
      },
    },
    '/pets/relative': {
      servers: [{ url: baseURLV2 }],
      get: {
        operationId: 'getPetsRelative',
        responses,
      },
    },
  },
  components: {
    schemas: {
      PetWithName: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            minimum: 1,
          },
          name: {
            type: 'string',
            example: 'Garfield',
          },
        },
      },
    },
    responses: {
      PetRes: {
        description: 'ok',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/PetWithName',
            },
          },
        },
      },
      PetsListRes: {
        description: 'ok',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PetWithName',
              },
            },
          },
        },
      },
    },
  },
};

describe('OpenAPIClientAxios', () => {
  describe('init', () => {
    test('can be initalised with a valid OpenAPI document as JS Object', async () => {
      // @TODO: read a complex document with as many features as possible here
      const api = new OpenAPIClientAxios({ definition, strict: true });
      await api.init();
      expect(api.initalized).toEqual(true);
    });

    test('can be initalised using a valid YAML file', async () => {
      const api = new OpenAPIClientAxios({ definition: examplePetAPIYAML, strict: true });
      await api.init();
      expect(api.initalized).toEqual(true);
    });

    test('can be initalised using a valid JSON file', async () => {
      const api = new OpenAPIClientAxios({ definition: examplePetAPIJSON, strict: true });
      await api.init();
      expect(api.initalized).toEqual(true);
    });

    test('throws an error when initalised with an invalid document in strict mode', async () => {
      const invalid: any = { invalid: 'not openapi' };
      const api = new OpenAPIClientAxios({ definition: invalid, strict: true });
      await expect(api.init()).rejects.toThrowError();
    });

    test('emits a warning when initalised with an invalid OpenAPI document not in strict mode', async () => {
      const invalid: any = { invalid: 'not openapi' };
      const warn = console.warn;
      console.warn = jest.fn();
      const api = new OpenAPIClientAxios({ definition: invalid, strict: false });
      await api.init();
      expect(console.warn).toBeCalledTimes(1);
      console.warn = warn; // reset console.warn
    });
  });

  describe('client', () => {
    test('has created operation methods for each operationId', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();
      expect(client).toHaveProperty('getPets');
      expect(client).toHaveProperty('createPet');
      expect(client).toHaveProperty('getPetById');
      expect(client).toHaveProperty('replacePetById');
      expect(client).toHaveProperty('updatePetById');
      expect(client).toHaveProperty('deletePetById');
      expect(client).toHaveProperty('getOwnerByPetId');
      expect(client).toHaveProperty('getPetOwner');
      expect(client).toHaveProperty('getPetsMeta');
      expect(client).toHaveProperty('getPetsRelative');
    });

    test('has set default baseURL to the first server in config', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();
      expect(client.defaults.baseURL).toBe(baseURL);
    });

    test('getPets() calls GET /pets', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = [{ id: 1, name: 'Garfield' }];
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets').reply((config) => mockHandler(config));

      const res = await client.getPets();
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test("getPets({ params: { q: 'cats' } }) calls GET /pets?q=cats", async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = [{ id: 1, name: 'Garfield' }];
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets').reply((config) => mockHandler(config));

      const params = { q: 'cats ' };
      const res = await client.getPets(params);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
      const mockContext = mockHandler.mock.calls[mockHandler.mock.calls.length - 1][0];
      expect(mockContext.params).toEqual(params);
    });

    test("getPets({ params: { q: ['cats', 'dogs'] } }) calls GET /pets?q=cats&q=dogs", async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = [{ id: 1, name: 'Garfield' }];
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets').reply((config) => mockHandler(config));

      const params = { q: ['cats', 'dogs'] };
      const res = await client.getPets(params);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
      const mockContext = mockHandler.mock.calls[mockHandler.mock.calls.length - 1][0];
      expect(mockContext.params).toEqual(params);
    });

    test("get('/pets') calls GET /pets", async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = [{ id: 1, name: 'Garfield' }];
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets').reply((config) => mockHandler(config));

      const res = await client.get('/pets');
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test("({ method: 'get', url: '/pets' }) calls GET /pets", async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = [{ id: 1, name: 'Garfield' }];
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets').reply((config) => mockHandler(config));

      const res = await client({ method: 'get', url: '/pets' });
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('getPetById(1) calls GET /pets/1', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.getPetById(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('createPet(pet) calls POST /pets with JSON payload', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const pet = { name: 'Garfield' };
      const mockResponse = { id: 1, ...pet };
      const mockHandler = jest.fn((config) => [201, mockResponse]);
      mock.onPost('/pets').reply((config) => mockHandler(config));

      const res = await client.createPet(null, pet);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
      const mockContext = mockHandler.mock.calls[mockHandler.mock.calls.length - 1][0];
      expect(mockContext.data).toEqual(JSON.stringify(pet));
    });

    test('replacePetById(1, pet) calls PUT /pets/1 with JSON payload', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const pet = { id: 1, name: 'Garfield' };
      const mockResponse = pet;
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onPut('/pets/1').reply((config) => mockHandler(config));

      const res = await client.replacePetById(1, pet);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
      const mockContext = mockHandler.mock.calls[mockHandler.mock.calls.length - 1][0];
      expect(mockContext.data).toEqual(JSON.stringify(pet));
    });

    test('deletePetById(1) calls DELETE /pets/1', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onDelete('/pets/1').reply((config) => mockHandler(config));

      const res = await client.deletePetById(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });
    test('getOwnerByPetId(1) calls GET /pets/1/owner', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { name: 'Jon' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1/owner').reply((config) => mockHandler(config));

      const res = await client.getOwnerByPetId(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('getPetOwner([1, 2]) calls GET /pets/1/owner/2', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { name: 'Jon' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1/owner/2').reply((config) => mockHandler(config));

      const res = await client.getPetOwner({ petId: 1, ownerId: 2 });
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('getPetOwner({ petId: 1, ownerId: 2 }) calls GET /pets/1/owner/2', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { name: 'Jon' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1/owner/2').reply((config) => mockHandler(config));

      const res = await client.getPetOwner({ petId: 1, ownerId: 2 });
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('getPetsMeta() calls GET /pets/meta', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { totalPets: 10 };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/meta').reply((config) => mockHandler(config));

      const res = await client.getPetsMeta();
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('getPetsRelative() calls GET /v2/pets/relative', async () => {
      const api = new OpenAPIClientAxios({ definition, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockHandler = jest.fn((config) => [200, config.baseURL]);
      mock.onGet('/pets/relative').reply((config) => mockHandler(config));

      const res = await client.getPetsRelative();
      expect(res.data).toEqual(baseURLV2);
      expect(mockHandler).toBeCalled();
    });
  });
});
