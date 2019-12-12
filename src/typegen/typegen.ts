import _filter from 'lodash-es/filter';
import _map from 'lodash-es/map';
import _find from 'lodash-es/find';
import _isEmpty from 'lodash-es/isEmpty';
import _mapValues from 'lodash-es/mapValues';

const chainableFunctions = {
  _filter,
  _map,
};

const _chain = (input: any) => {
 let value = input;
 const wrapper = {
   ..._mapValues(
     chainableFunctions,
     (f: any) => (...args: any[]) => {
       // lodash always puts input as the first argument
       value = f(value, ...args);
       return wrapper;
     },
   ),
   value: () => value,
 };
 return wrapper;
};

import yargs from 'yargs';
import indent from 'indent-string';
import OpenAPIClientAxios, { Document } from '../';
import DtsGenerator from '@anttiviljami/dtsgenerator/dist/core/dtsGenerator';
import { parseSchema } from '@anttiviljami/dtsgenerator/dist/core/jsonSchema';
import ReferenceResolver from '@anttiviljami/dtsgenerator/dist/core/referenceResolver';
import SchemaConvertor, { ExportedType } from '@anttiviljami/dtsgenerator/dist/core/schemaConvertor';
import WriteProcessor from '@anttiviljami/dtsgenerator/dist/core/writeProcessor';
import SwaggerParser from 'swagger-parser';

export async function main() {
  const argv = yargs
    .usage('Usage: $0 [file]')
    .example('$0 ./openapi.yml > client.d.ts', '- generate a type definition file')
    .demandCommand(1).argv;
  const [imports, schemaTypes, operationTypings] = await generateTypesForDocument(argv._[0]);
  console.log(imports, '\n');
  console.log(schemaTypes);
  console.log(operationTypings);
}

export async function generateTypesForDocument(definition: Document | string) {
  const api = new OpenAPIClientAxios({ definition });
  await api.init();

  const processor = new WriteProcessor({ indentSize: 2, indentChar: ' ' });
  const resolver = new ReferenceResolver();
  const convertor = new SchemaConvertor(processor);

  const rootSchema = await SwaggerParser.bundle(definition);
  resolver.registerSchema(parseSchema(rootSchema));

  const generator = new DtsGenerator(resolver, convertor);
  const schemaTypes = await generator.generate();
  const exportedTypes = convertor.getExports();
  const operationTypings = generateOperationMethodTypings(api, exportedTypes);

  const imports = [
    'import {',
    '  OpenAPIClient,',
    '  Parameters,',
    '  UnknownParamsObject,',
    '  OperationResponse,',
    '  AxiosRequestConfig,',
    `} from 'openapi-client-axios';`,
  ].join('\n');

  return [imports, schemaTypes, operationTypings];
}

export function generateOperationMethodTypings(api: OpenAPIClientAxios, exportTypes: ExportedType[]) {
  const operations = api.getOperations();

  const operationTypings = operations.map(({ operationId, summary, description }) => {
    // parameters arg
    const parameterTypePaths = (_chain([
      _find(exportTypes, { schemaRef: `#/paths/${operationId}/pathParameters` }),
      _find(exportTypes, { schemaRef: `#/paths/${operationId}/queryParameters` }),
      _find(exportTypes, { schemaRef: `#/paths/${operationId}/headerParameters` }),
      _find(exportTypes, { schemaRef: `#/paths/${operationId}/cookieParameters` }),
    ]) as any)
      ._filter()
      ._map('path')
      .value();
    const parametersType = !_isEmpty(parameterTypePaths) ? parameterTypePaths.join(' & ') : 'UnknownParamsObject';
    const parametersArg = `parameters?: Parameters<${parametersType}>`;

    // payload arg
    const requestBodyType = _find(exportTypes, { schemaRef: `#/paths/${operationId}/requestBody` });
    const dataArg = `data?: ${requestBodyType ? requestBodyType.path : 'any'}`;

    // return type
    const responseTypePaths = (_chain(exportTypes) as any)
      ._filter(({ schemaRef }: any) => schemaRef.startsWith(`#/paths/${operationId}/responses`))
      ._map('path')
      .value();
    const responseType = !_isEmpty(responseTypePaths) ? responseTypePaths.join(' | ') : 'any';
    const returnType = `OperationResponse<${responseType}>`;

    const operationArgs = [parametersArg, dataArg, 'config?: AxiosRequestConfig'];
    const operationMethod = `${operationId}(\n${operationArgs
      .map((arg) => indent(arg, 2))
      .join(',\n')}  \n): ${returnType}`;

    // comment for type
    const content = _filter([summary, description]).join('\n\n');
    const comment =
      '/**\n' +
      indent(content === '' ? operationId : `${operationId} - ${content}`, 1, {
        indent: ' * ',
        includeEmptyLines: true,
      }) +
      '\n */';

    return [comment, operationMethod].join('\n');
  });

  return [
    'export interface OperationMethods {',
    ...operationTypings.map((op) => indent(op, 2)),
    '}',
    '',
    'export type Client = OpenAPIClient<OperationMethods>',
  ].join('\n');
}

if (require.main === module) {
  main();
}
