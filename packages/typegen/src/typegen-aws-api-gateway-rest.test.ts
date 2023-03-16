import path from 'path';
import { generateTypesForDocument } from './typegen';

const examplePetAPIYAML = path.join(__dirname, '__tests__', 'resources', 'example-aws-api-gateway-rest.openapi.json');

describe('typegen for openapi spec with missing operation IDs', () => {
  let imports: string;
  let schemaTypes: string;
  let operationTypings: string;

  beforeAll(async () => {
    const types = await generateTypesForDocument(examplePetAPIYAML, {
      transformOperationName: (operationId: string) => operationId,
    });
    imports = types[0];
    schemaTypes = types[1];
    operationTypings = types[2];
  });

  test('generates type files from valid v3 specification', async () => {
    expect(imports).not.toBeFalsy();
    expect(schemaTypes).not.toBeFalsy();
    expect(operationTypings).not.toBeFalsy();
  });

  describe('OperationsMethods', () => {
    test('exports methods named after the operationId', async () => {
      expect(operationTypings).toMatch('export interface OperationMethods');
      expect(operationTypings).toMatch('getPets');
    });

    test('types responses', () => {
      expect(operationTypings).toMatch(`OperationResponse<Paths.GetPets.Responses.$200>`);
    });
  });

  test('exports PathsDictionary', async () => {
    expect(operationTypings).toMatch('export interface PathsDictionary');
    expect(operationTypings).toMatch(`['/pets']`);
  });

  test('exports a Client', async () => {
    expect(operationTypings).toMatch('export type Client =');
  });
});
