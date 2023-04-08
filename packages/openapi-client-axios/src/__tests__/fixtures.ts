import { OpenAPIV3 } from 'openapi-types';

export const baseURL = 'http://localhost:8080';
export const baseURLAlternative = 'http://localhost:9090/';
export const baseURLWithVariable = 'http://{foo1}.localhost:9090/{foo2}/{foo3}/';
export const baseURLWithVariableResolved = 'http://bar1.localhost:9090/bar2a/bar3b/';
export const baseURLV2 = 'http://localhost:8080/v2';

export const responses: OpenAPIV3.ResponsesObject = {
  200: { description: 'ok' },
};

export const petId: OpenAPIV3.ParameterObject = {
  name: 'petId',
  in: 'path',
  required: true,
  schema: {
    type: 'integer',
  },
};

export const petShopId: OpenAPIV3.ParameterObject = {
  name: 'x-petshop-id',
  in: 'header',
  schema: {
    type: 'string',
  },
};

export const ownerId: OpenAPIV3.ParameterObject = {
  name: 'ownerId',
  in: 'path',
  required: true,
  schema: {
    type: 'integer',
  },
};

export const definition: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'api',
    version: '1.0.0',
  },
  servers: [
    { url: baseURL },
    {
      url: baseURLAlternative,
      description: 'Alternative server',
    },
    {
      url: baseURLWithVariable,
      description: 'server with variable baseURL',
      variables: {
        foo1: {
          default: 'bar1',
          enum: ['bar1', 'bar1a'],
        },
        foo2: {
          default: 'bar2b',
          enum: ['bar2a', 'bar2b'],
        },
        foo3: {
          default: 'bar3a',
          enum: ['bar3a', 'bar3b'],
        },
      },
    },
  ],
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
        parameters: [petShopId],
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
