import path from 'path';
import { generateTypesForDocument } from './typegen';

const examplePetAPIYAML = path.join(__dirname, '__tests__', 'resources', 'example-pet-api.openapi.yml');

describe('typegen', () => {
  let banner: string;
  let imports: string;
  let schemaTypes: string;
  let operationTypings: string;
  let aliases: string;

  beforeAll(async () => {
    const types = await generateTypesForDocument(examplePetAPIYAML, {
      transformOperationName: (operationId: string) => operationId,
      banner: '/* eslint-disable */',
      disableOptionalPathParameters: true,
    });
    imports = types[0];
    schemaTypes = types[1];
    operationTypings = types[2];
    banner = types[3];
    aliases = types[4];
  });

  test('generates type files from valid v3 specification', async () => {
    expect(imports).not.toBeFalsy();
    expect(schemaTypes).not.toBeFalsy();
    expect(operationTypings).not.toBeFalsy();
    expect(aliases).not.toBeFalsy();
  });

  describe('OperationsMethods', () => {
    test('exports methods named after the operationId', async () => {
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

    test('types parameters', () => {
      expect(operationTypings).toMatch(`parameters: Parameters<Paths.GetPetById.PathParameters>`);
      expect(operationTypings).toMatch(`parameters: Parameters<Paths.ReplacePetById.PathParameters>`);
      expect(operationTypings).toMatch(`parameters: Parameters<Paths.UpdatePetById.PathParameters>`);
      expect(operationTypings).toMatch(`parameters: Parameters<Paths.DeletePetById.PathParameters>`);
      expect(operationTypings).toMatch(`parameters: Parameters<Paths.GetOwnerByPetId.PathParameters>`);
      expect(operationTypings).toMatch(`parameters: Parameters<Paths.GetPetOwner.PathParameters>`);
    });

    test('types responses', () => {
      expect(operationTypings).toMatch(`OperationResponse<Paths.GetPets.Responses.$200>`);
      expect(operationTypings).toMatch('OperationResponse<Paths.CreatePet.Responses.$201>');
      expect(operationTypings).toMatch('OperationResponse<Paths.GetPetById.Responses.$200>');
      expect(operationTypings).toMatch('OperationResponse<Paths.ReplacePetById.Responses.$200>');
      expect(operationTypings).toMatch('OperationResponse<Paths.UpdatePetById.Responses.$200>');
      expect(operationTypings).toMatch('OperationResponse<Paths.DeletePetById.Responses.$200>');
      expect(operationTypings).toMatch('OperationResponse<Paths.GetPetOwner.Responses.$200>');
      expect(operationTypings).toMatch('OperationResponse<Paths.GetPetsMeta.Responses.$200>');
      expect(operationTypings).toMatch('OperationResponse<Paths.GetPetsRelative.Responses.$200>');
    });
  });

  describe('root level aliases', () => {
    test('exports type aliases for components defined in spec', async () => {
      expect(aliases).toMatch('export type PetId = Components.Schemas.PetId;');
      expect(aliases).toMatch('export type PetPayload = Components.Schemas.PetPayload;');
      expect(aliases).toMatch('export type QueryLimit = Components.Schemas.QueryLimit;');
      expect(aliases).toMatch('export type QueryOffset = Components.Schemas.QueryOffset;');
    });
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
