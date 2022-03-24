import path from 'path';
import MockAdapter from 'axios-mock-adapter';
import { definition, baseURL, baseURLV2, baseURLAlternative, baseURLWithVariableResolved } from './__tests__/fixtures';
import { OpenAPIClientAxios, OpenAPIClient } from './client';

const testsDir = path.join(__dirname, '.', '__tests__');
const examplePetAPIJSON = path.join(testsDir, 'resources', 'example-pet-api.openapi.json');
const examplePetAPIYAML = path.join(testsDir, 'resources', 'example-pet-api.openapi.yml');

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
    test('can be initalised with a valid OpenAPI document as JS Object', async () => {
      const api = new OpenAPIClientAxios({ definition });
      await api.init();
      expect(api.initialized).toEqual(true);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('operation method names are configurable', async () => {
      const api = new OpenAPIClientAxios({
        definition,
        transformOperationName: (operation) => operation.toUpperCase(),
      });
      await api.init();

      expect(api.client).toHaveProperty('GETPETS');
      expect(api.client).toHaveProperty('CREATEPET');
      expect(api.client).toHaveProperty('GETPETBYID');
    });

    test('dereferences the input document', async () => {
      const api = new OpenAPIClientAxios({ definition });
      await api.init();
      expect(JSON.stringify(api.inputDocument)).toMatch('$ref');
      expect(JSON.stringify(api.definition)).not.toMatch('$ref');
    });

    test('can be initialized using a valid YAML file', async () => {
      const api = new OpenAPIClientAxios({ definition: examplePetAPIYAML });
      await api.init();
      expect(api.initialized).toEqual(true);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('can be initialized using a valid JSON file', async () => {
      const api = new OpenAPIClientAxios({ definition: examplePetAPIJSON });
      await api.init();
      expect(api.initialized).toEqual(true);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('can be initialized using alternative server using index', async () => {
      const api = new OpenAPIClientAxios({ definition, withServer: 1 });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURLAlternative);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('can be initialized using alternative server using description', async () => {
      const api = new OpenAPIClientAxios({ definition, withServer: 'Alternative server' });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURLAlternative);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('can be initialized using alternative server with variable in baseURL', async () => {
      const api = new OpenAPIClientAxios({
        definition,
        withServer: 2,
        baseURLVariables: { foo2: 'bar2a', foo3: 1 },
      });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURLWithVariableResolved);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('can be initialized using alternative server using object', async () => {
      const url = 'http://examplde.com/v5';
      const api = new OpenAPIClientAxios({ definition, withServer: { url } });
      await api.init();
      expect(api.getBaseURL()).toEqual(url);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('can be initialized using default baseUrl resolver', async () => {
      const api = new OpenAPIClientAxios({ definition });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURL);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });
  });

  describe('withServer', () => {
    test('can set default server as object', async () => {
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURL);
      const newServer = 'Alternative server';
      api.withServer(newServer);
      expect(api.getBaseURL()).toEqual(baseURLAlternative);
    });

    test('can set default server by index', async () => {
      const api = new OpenAPIClientAxios({ definition });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURL);
      const newServer = 1;
      api.withServer(newServer);
      expect(api.getBaseURL()).toEqual(baseURLAlternative);
    });

    test('can set default server with variables', async () => {
      const api = new OpenAPIClientAxios({ definition });
      await api.init();
      expect(api.getBaseURL()).toEqual(baseURL);
      const newServer = 2;
      const newServerVars = { foo2: 'bar2a', foo3: 1 };
      api.withServer(newServer, newServerVars);
      expect(api.getBaseURL()).toEqual(baseURLWithVariableResolved);
    });
  });

  describe('initSync', () => {
    test('can be initialized synchronously with a valid OpenAPI document as JS Object', () => {
      const api = new OpenAPIClientAxios({ definition });
      api.initSync();
      expect(api.initialized).toEqual(true);
      expect(api.client.api).toBe(api);
      checkHasOperationMethods(api.client);
    });

    test('dereferences the input document', () => {
      const api = new OpenAPIClientAxios({ definition });
      api.initSync();
      expect(JSON.stringify(api.inputDocument)).toMatch('$ref');
      expect(JSON.stringify(api.definition)).not.toMatch('$ref');
    });

    test('throws an error when initialized using a file URL', () => {
      const api = new OpenAPIClientAxios({ definition: examplePetAPIYAML });
      expect(api.initSync).toThrowError();
    });
  });

  describe('client', () => {
    test('has set default baseURL to the first server in config', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      expect(client.defaults.baseURL).toBe(baseURL);
    });

    test('can override axios default config', async () => {
      const api = new OpenAPIClientAxios({
        definition,
        axiosConfigDefaults: { maxRedirects: 1, withCredentials: true },
      });
      const client = await api.init();
      expect(client.defaults.maxRedirects).toBe(1);
      expect(client.defaults.withCredentials).toBe(true);
    });
  });

  describe('operation methods', () => {
    test('getPets() calls GET /pets', async () => {
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
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

    test('getPetById({ petId: 1 }) calls GET /pets/1', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.getPetById({ petId: 1 });
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('getPetById(1) calls GET /pets/1', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.getPetById(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('getPetById([{ name: "petId", value: "1", in: "path" }]) calls GET /pets/1', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.getPetById([{ name: 'petId', value: '1', in: 'path' }]);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    // tslint:disable-next-line
    test('getPetById([{ name: "petId", value: "1", in: "path" }, { name: "new", value: "2", in: "query" }]) calls GET /pets/1?new=2', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.getPetById([{ name: 'petId', value: '1', in: 'path' }]);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test('createPet(pet) calls POST /pets with JSON payload', async () => {
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockHandler = jest.fn((config) => [200, config.baseURL]);
      mock.onGet('/pets/relative').reply((config) => mockHandler(config));

      const res = await client.getPetsRelative();
      expect(res.data).toEqual(baseURLV2);
      expect(mockHandler).toBeCalled();
    });
  });

  describe('paths dictionary', () => {
    test(`paths['/pets'].get() calls GET /pets`, async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = [{ id: 1, name: 'Garfield' }];
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets').reply((config) => mockHandler(config));

      const res = await client.paths['/pets'].get();
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test(`paths['/pets/{petId}'].get(1) calls GET /pets/1`, async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1').reply((config) => mockHandler(config));

      const res = await client.paths['/pets/{petId}'].get(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test(`paths['/pets'].post() calls POST /pets`, async () => {
      const api = new OpenAPIClientAxios({ definition });
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

    test(`paths['/pets/{petId}'].put(1) calls PUT /pets/1`, async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const pet = { id: 1, name: 'Garfield' };
      const mockResponse = pet;
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onPut('/pets/1').reply((config) => mockHandler(config));

      const res = await client.paths['/pets/{petId}'].put(1, pet);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
      const mockContext = mockHandler.mock.calls[mockHandler.mock.calls.length - 1][0];
      expect(mockContext.data).toEqual(JSON.stringify(pet));
    });

    test(`paths['/pets/{petId}'].delete(1) calls DELETE /pets/1`, async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { id: 1, name: 'Garfield' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onDelete('/pets/1').reply((config) => mockHandler(config));

      const res = await client.paths['/pets/{petId}'].delete(1);
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });

    test(`paths['/pets/{petId}/owner/{ownerId}'].get({ petId: 1, ownerId: 2 }) calls GET /pets/1/owner/2`, async () => {
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPets', []);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets');
    });

    test('getPets({ q: "cat" }) calls GET /pets?q=cat', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPets', [{ q: 'cat' }]);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets');
      expect(config.url).toMatch('/pets?q=cat');
      expect(config.query).toEqual({ q: 'cat' });
      expect(config.queryString).toEqual('q=cat');
    });

    test('getPets({ q: ["cat"] }) calls GET /pets?q=cat', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPets', [{ q: ['cat'] }]);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets');
      expect(config.url).toMatch('/pets?q=cat');
      expect(config.query).toEqual({ q: ['cat'] });
      expect(config.queryString).toEqual('q=cat');
    });

    test('getPetById({ petId: 1 }) calls GET /pets/1', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPetById', [{ petId: 1 }]);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets/1');
      expect(config.pathParams).toEqual({ petId: '1' });
    });

    test('getPetById(1) calls GET /pets/1', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPetById', [1]);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets/1');
      expect(config.pathParams).toEqual({ petId: '1' });
    });

    test('createPet(null, pet) calls POST /pets with JSON payload', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      const pet = { name: 'Garfield' };
      const config = api.getRequestConfigForOperation('createPet', [null, pet]);

      expect(config.method).toEqual('post');
      expect(config.path).toEqual('/pets');
      expect(config.payload).toEqual(pet);
    });

    test('replacePetById(1, pet) calls PUT /pets/1 with JSON payload', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      const pet = { id: 1, name: 'Garfield' };
      const config = api.getRequestConfigForOperation('replacePetById', [1, pet]);

      expect(config.method).toEqual('put');
      expect(config.path).toEqual('/pets/1');
      expect(config.pathParams).toEqual({ petId: '1' });
      expect(config.payload).toEqual(pet);
    });

    test('deletePetById(1) calls DELETE /pets/1', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('deletePetById', [1]);

      expect(config.method).toEqual('delete');
      expect(config.path).toEqual('/pets/1');
      expect(config.pathParams).toEqual({ petId: '1' });
    });

    test('getOwnerByPetId(1) calls GET /pets/1/owner', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getOwnerByPetId', [1]);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets/1/owner');
      expect(config.pathParams).toEqual({ petId: '1' });
    });

    test('getPetOwner({ petId: 1, ownerId: 2 }) calls GET /pets/1/owner/2', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPetOwner', [{ petId: 1, ownerId: 2 }]);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets/1/owner/2');
      expect(config.pathParams).toEqual({ petId: '1', ownerId: '2' });
    });

    test('getPetsMeta() calls GET /pets/meta', async () => {
      const api = new OpenAPIClientAxios({ definition });
      const client = await api.init();
      const config = api.getRequestConfigForOperation('getPetsMeta', []);

      expect(config.method).toEqual('get');
      expect(config.path).toEqual('/pets/meta');
    });
  });

  describe('axios methods', () => {
    test("get('/pets') calls GET /pets", async () => {
      const api = new OpenAPIClientAxios({ definition });
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
      const api = new OpenAPIClientAxios({ definition });
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

  describe('transforms', () => {
    test('transformOperationName', async () => {
      const api = new OpenAPIClientAxios({
        definition,
        transformOperationName: (operationName) => `${operationName}V1`,
      });
      const client = await api.init();

      const mock = new MockAdapter(api.client);
      const mockResponse = { name: 'Jon' };
      const mockHandler = jest.fn((config) => [200, mockResponse]);
      mock.onGet('/pets/1/owner/2').reply((config) => mockHandler(config));

      const res = await client.getPetOwnerV1({ petId: 1, ownerId: 2 });
      expect(res.data).toEqual(mockResponse);
      expect(mockHandler).toBeCalled();
    });
  });

  test('transformOperationMethod', async () => {
    const api = new OpenAPIClientAxios({
      definition,
      transformOperationMethod: (operationMethod) => {
        return (params: any, body, config) => {
          params['petId'] = 1;
          params['ownerId'] = 2;
          return operationMethod(params, body, config);
        };
      },
    });
    const client = await api.init();

    const mock = new MockAdapter(api.client);
    const mockResponse = { name: 'Jon' };
    const mockHandler = jest.fn((config) => [200, mockResponse]);
    mock.onGet('/pets/1/owner/2').reply((config) => mockHandler(config));

    const res = await client.getPetOwner({});
    expect(res.data).toEqual(mockResponse);
    expect(mockHandler).toBeCalled();
  });

  test('transformOperationMethod based on operation', async () => {
    const api = new OpenAPIClientAxios({
      definition,
      transformOperationMethod: (operationMethod, operation) => {
        return (params: any, body, config) => {
          if (operation.operationId === 'getPetOwner') {
            params['petId'] = 1;
            params['ownerId'] = 2;
          }
          return operationMethod(params, body, config);
        };
      },
    });
    const client = await api.init();

    const mock = new MockAdapter(api.client);
    const mockResponse = { name: 'Jon' };
    const mockHandler = jest.fn((config) => [200, mockResponse]);
    mock.onGet('/pets/1/owner/2').reply((config) => mockHandler(config));

    const res = await client.getPetOwner({});
    expect(res.data).toEqual(mockResponse);
    expect(mockHandler).toBeCalled();
  });
});
