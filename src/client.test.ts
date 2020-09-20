import { OpenAPIClientAxios, OpenAPIClient } from './client';

import { OpenAPIV3 } from 'openapi-types';
import MockAdapter from 'axios-mock-adapter';

const examplePetAPIJSON =
  'https://raw.githubusercontent.com/ccakes/openapi-client-axios-lite/lighten-client/__tests__/resources/example-pet-api.openapi.json';

const baseURL = 'http://localhost:8080';
const baseURLAlternative = 'http://localhost:9090';
const baseURLWithVariable = 'http://{foo1}.localhost:9090/{foo2}/{foo3}/';
const baseURLWithVariableResolved = 'http://bar1.localhost:9090/bar2a/bar3b/';
const baseURLV2 = 'http://localhost:8080/v2';

const responses: OpenAPIV3.ResponsesObject = {
  200: { description: 'ok' },
};

describe('OpenAPIClientAxios', () => {
  const checkHasOperationMethods = (client: OpenAPIClient) => {
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
  };

  describe('init', () => {
    test('can be initalised with a valid URL', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      await api.init();
      expect(api.initalized).toEqual(true);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('can be initalised using alternative server using index', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, withServer: 1 });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURLAlternative);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('can be initalised using alternative server using object', async () => {
      const url = 'http://examplde.com/v5';
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, withServer: { url } });
      await api.init();
      expect(api.getBaseURL()).toEqual(url);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('can be initalised using default baseUrl resolver', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURL);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('throws an error when initalised with an invalid document in strict mode', async () => {
      const api = new OpenAPIClientAxios({ url: 'http://example.com/api.json', strict: true });
      await expect(api.init()).rejects.toThrowError();
    });
  });

  describe('withServer', () => {
    test('can set default server as object', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURL);
      const newServer = {
        url: 'http://example.com/apiv4',
        description: 'example api v4',
      };
      api.withServer(newServer);
      expect(api.getBaseURL()).toEqual(newServer.url);
    });

    test('can set default server by using description', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURL);
      const newServer = 'Alternative server';
      api.withServer(newServer);
      expect(api.getBaseURL()).toEqual(baseURLAlternative);
    });

    test('can set default server by index', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURL);
      const newServer = 1;
      api.withServer(newServer);
      expect(api.getBaseURL()).toEqual(baseURLAlternative);
    });
  });

  describe('client', () => {
    test('has set default baseURL to the first server in config', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();
      expect(client.defaults.baseURL).toBe(baseURL);
    });

    test('can override axios default config', async () => {
      const api = new OpenAPIClientAxios({
        url: examplePetAPIJSON,
        strict: true,
        axiosConfigDefaults: { maxRedirects: 1, withCredentials: true },
      });
      const client = await api.init();
      expect(client.defaults.maxRedirects).toBe(1);
      expect(client.defaults.withCredentials).toBe(true);
    });
  });

  describe('operation methods', () => {
    test('getPets() calls GET /pets', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = [{ id: 1, name: 'Garfield' }];
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets').reply((config) => mockHandler(config));

      const res = await client.getPets();
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test("getPets({ q: 'cats' }) calls GET /pets?q=cats", async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
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

    test("getPets({ q: ['cats', 'dogs'] }) calls GET /pets?q=cats&q=dogs", async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
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

    test('getPetById({ id: 1 }) calls GET /pets/1', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.getPetById({ id: 1 });
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('getPetById(1) calls GET /pets/1', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.getPetById(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('getPetById([{ name: "id", value: "1", in: "path" }]) calls GET /pets/1', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.getPetById([{ name: 'id', value: '1', in: 'path' }]);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    // tslint:disable-next-line
    test('getPetById([{ name: "id", value: "1", in: "path" }, { name: "new", value: "2", in: "query" }]) calls GET /pets/1?new=2', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.getPetById([{ name: 'id', value: '1', in: 'path' }]);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('createPet(pet) calls POST /pets with JSON payload', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
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
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
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
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
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
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
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
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
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
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
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
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
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
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockHandler = jest.fn((config) => {
        return [200, config.baseURL]
      });
      mock.onGet('/pets/relative').reply((config) => mockHandler(config));

      const res = await client.getPetsRelative();
      expect(res.data).toEqual(baseURLV2);
      expect(mockHandler).toBeCalled();
    });
  });

  describe('paths dictionary', () => {
    test(`paths['/pets'].get() calls GET /pets`, async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = [{ id: 1, name: 'Garfield' }];
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets').reply((config) => mockHandler(config));

      const res = await client.paths['/pets'].get();
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test(`paths['/pets/{id}'].get(1) calls GET /pets/1`, async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.paths['/pets/{id}'].get(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test(`paths['/pets'].post() calls POST /pets`, async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const pet = { name: 'Garfield' };
      const mockResponse = { id: 1, ...pet };
      const mockHandler = jest.fn((config) => [201, mockResponse]);
      mock.onPost('/pets').reply((config) => mockHandler(config));

      const res = await client.paths['/pets'].post(null, pet);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
      const mockContext = mockHandler.mock.calls[mockHandler.mock.calls.length - 1][0];
      expect(mockContext.data).toEqual(JSON.stringify(pet));
    });

    test(`paths['/pets/{id}'].put(1) calls PUT /pets/1`, async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const pet = { id: 1, name: 'Garfield' };
      const mockResponse = pet;
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onPut('/pets/1').reply((config) => mockHandler(config));

      const res = await client.paths['/pets/{id}'].put(1, pet);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
      const mockContext = mockHandler.mock.calls[mockHandler.mock.calls.length - 1][0];
      expect(mockContext.data).toEqual(JSON.stringify(pet));
    });

    test(`paths['/pets/{id}'].delete(1) calls DELETE /pets/1`, async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onDelete('/pets/1').reply((config) => mockHandler(config));

      const res = await client.paths['/pets/{id}'].delete(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test(`paths['/pets/{petId}/owner/{ownerId}'].get({ petId: 1, ownerId: 2 }) calls GET /pets/1/owner/2`, async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { name: 'Jon' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1/owner/2').reply((config) => mockHandler(config));

      const res = await client.paths['/pets/{petId}/owner/{ownerId}'].get({ petId: 1, ownerId: 2 });
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });
  });

  describe('getRequestConfigForOperation()', () => {
    test('getPets() calls GET /pets', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPets', []);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets');
    });

    test('getPets({ q: "cat" }) calls GET /pets?q=cat', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPets', [{ q: 'cat' }]);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets');
      expect(config.url).toMatch('/pets?q=cat');
      expect(config.query).toEqual({ q: 'cat' });
      expect(config.queryString).toEqual('q=cat');
    });

    test('getPetById({ id: 1 }) calls GET /pets/1', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPetById', [{ id: 1 }]);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets/1');
      expect(config.pathParams).toEqual({ id: '1' });
    });

    test('getPetById(1) calls GET /pets/1', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPetById', [1]);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets/1');
      expect(config.pathParams).toEqual({ id: '1' });
    });

    test('createPet(null, pet) calls POST /pets with JSON payload', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();
      const pet = { name: 'Garfield' };
      const config = api.getRequestConfigForOperation('createPet', [null, pet]);

      expect(config.method).toEqual('post');
      expect(config.path).toEqual('/pets');
      expect(config.payload).toEqual(pet);
    });

    test('replacePetById(1, pet) calls PUT /pets/1 with JSON payload', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();
      const pet = { id: 1, name: 'Garfield' };
      const config = api.getRequestConfigForOperation('replacePetById', [1, pet]);

      expect(config.method).toEqual('put');
      expect(config.path).toEqual('/pets/1');
      expect(config.pathParams).toEqual({ id: '1' });
      expect(config.payload).toEqual(pet);
    });

    test('deletePetById(1) calls DELETE /pets/1', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('deletePetById', [1]);

      expect(config.method).toEqual('delete');
      expect(config.path).toEqual('/pets/1');
      expect(config.pathParams).toEqual({ id: '1' });
    });

    test('getOwnerByPetId(1) calls GET /pets/1/owner', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getOwnerByPetId', [1]);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets/1/owner');
      expect(config.pathParams).toEqual({ id: '1' });
    });

    test('getPetOwner({ petId: 1, ownerId: 2 }) calls GET /pets/1/owner/2', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPetOwner', [{ petId: 1, ownerId: 2 }]);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets/1/owner/2');
      expect(config.pathParams).toEqual({ petId: '1', ownerId: '2' });
    });

    test('getPetsMeta() calls GET /pets/meta', async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPetsMeta', []);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets/meta');
    });
  });

  describe('axios methods', () => {
    test("get('/pets') calls GET /pets", async () => {
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
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
      const api = new OpenAPIClientAxios({ url: examplePetAPIJSON, strict: true });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = [{ id: 1, name: 'Garfield' }];
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets').reply((config) => mockHandler(config));

      const res = await client({ method: 'get', url: '/pets' });
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });
  });
});
