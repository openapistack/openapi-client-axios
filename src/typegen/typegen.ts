import _ from 'lodash';
import yargs from 'yargs';
import indent from 'indent-string';
import OpenAPIClientAxios, { Document, HttpMethod, Operation } from '../';
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

function generateMethodForOperation(methodName: string, operation: Operation, exportTypes: ExportedType[]) {
  const { operationId, summary, description } = operation;

  // parameters arg
  const parameterTypePaths = _.chain([
    _.find(exportTypes, { schemaRef: `#/paths/${operationId}/pathParameters` }),
    _.find(exportTypes, { schemaRef: `#/paths/${operationId}/queryParameters` }),
    _.find(exportTypes, { schemaRef: `#/paths/${operationId}/headerParameters` }),
    _.find(exportTypes, { schemaRef: `#/paths/${operationId}/cookieParameters` }),
  ])
    .filter()
    .map('path')
    .value();
  const parametersType = !_.isEmpty(parameterTypePaths) ? parameterTypePaths.join(' & ') : 'UnknownParamsObject';
  const parametersArg = `parameters?: Parameters<${parametersType}>`;

  // payload arg
  const requestBodyType = _.find(exportTypes, { schemaRef: `#/paths/${operationId}/requestBody` });
  const dataArg = `data?: ${requestBodyType ? requestBodyType.path : 'any'}`;

  // return type
  const responseTypePaths = _.chain(exportTypes)
    .filter(({ schemaRef }) => schemaRef.startsWith(`#/paths/${operationId}/responses`))
    .map(({ path }) =>
      path
        .split('.')
        // Operation.Responses.200 => Operation.Responses.$200
        .map((key, i) => (i === path.split('.').length - 1 ? `$${key}` : key))
        .join('.'),
    )
    .value();
  const responseType = !_.isEmpty(responseTypePaths) ? responseTypePaths.join(' | ') : 'any';
  const returnType = `OperationResponse<${responseType}>`;

  const operationArgs = [parametersArg, dataArg, 'config?: AxiosRequestConfig'];
  const operationMethod = `${methodName}(\n${operationArgs
    .map((arg) => indent(arg, 2))
    .join(',\n')}  \n): ${returnType}`;

  // comment for type
  const content = _.filter([summary, description]).join('\n\n');
  const comment =
    '/**\n' +
    indent(content === '' ? operationId : `${operationId} - ${content}`, 1, {
      indent: ' * ',
      includeEmptyLines: true,
    }) +
    '\n */';

  return [comment, operationMethod].join('\n');
}

export function generateOperationMethodTypings(api: OpenAPIClientAxios, exportTypes: ExportedType[]) {
  const operations = api.getOperations();

  const operationTypings = operations.map((op) => generateMethodForOperation(op.operationId, op, exportTypes));

  const pathOperationTypes = _.entries(api.definition.paths).map(([path, pathItem]) => {
    const methodTypings: string[] = [];
    for (const m in pathItem) {
      if (pathItem[m as HttpMethod] && _.includes(Object.values(HttpMethod), m)) {
        const method = m as HttpMethod;
        const operation = _.find(operations, { path, method });
        methodTypings.push(generateMethodForOperation(method, operation, exportTypes));
      }
    }
    return [`['${path}']: {`, ...methodTypings.map((m) => indent(m, 2)), '}'].join('\n');
  });

  return [
    'export interface OperationMethods {',
    ...operationTypings.map((op) => indent(op, 2)),
    '}',
    '',
    'export interface PathsDictionary {',
    ...pathOperationTypes.map((p) => indent(p, 2)),
    '}',
    '',
    'export type Client = OpenAPIClient<OperationMethods, PathsDictionary>',
  ].join('\n');
}

if (require.main === module) {
  main();
}
