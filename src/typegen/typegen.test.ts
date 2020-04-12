import path from 'path';
import ts from 'typescript';
import { generateTypesForDocument } from './typegen';

const rootDir = path.join(__dirname, '..', '..');
const testsDir = path.join(rootDir, '__tests__');

const examplePetAPIYAML = path.join(testsDir, 'resources', 'example-pet-api.openapi.yml');

describe('typegen', () => {
  let imports: string;
  let schemaTypes: string;
  let operationTypings: string;

  beforeAll(async () => {
    const types = await generateTypesForDocument(examplePetAPIYAML);
    imports = types[0];
    schemaTypes = types[1];
    operationTypings = types[2];
  });

  test('generates type files from valid v3 specification', async () => {
    expect(imports).not.toBeFalsy();
    expect(schemaTypes).not.toBeFalsy();
    expect(operationTypings).not.toBeFalsy();
  });

  test('exports OperationMethods', async () => {
    expect(operationTypings).toMatch('export interface OperationMethods');
    expect(operationTypings).toMatch('getPets');
    expect(operationTypings).toMatch('createPet');
    expect(operationTypings).toMatch('getPetById');
    expect(operationTypings).toMatch('replacePetById');
    expect(operationTypings).toMatch('updatePetById');
    expect(operationTypings).toMatch('deletePetById');
    expect(operationTypings).toMatch('getOwnerByPetId');
    expect(operationTypings).toMatch('getPetOwner');
    expect(operationTypings).toMatch('getPetsMeta');
    expect(operationTypings).toMatch('getPetsRelative');
  });

  test('exports PathsDictionary', async () => {
    expect(operationTypings).toMatch('export interface PathsDictionary');
    expect(operationTypings).toMatch(`['/pets']`);
    expect(operationTypings).toMatch(`['/pets/{id}']`);
    expect(operationTypings).toMatch(`['/pets/{id}/owner']`);
    expect(operationTypings).toMatch(`['/pets/{petId}/owner/{ownerId}']`);
    expect(operationTypings).toMatch(`['/pets/meta']`);
    expect(operationTypings).toMatch(`['/pets/relative']`);
  });

  test('exports a Client', async () => {
    expect(operationTypings).toMatch('export type Client =');
  });
});
