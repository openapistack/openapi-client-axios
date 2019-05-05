import _ from 'lodash';
import yargs from 'yargs';
import Consumer from '.';
import indent from 'indent-string';
import DtsGenerator from '@anttiviljami/dtsgenerator/dist/core/dtsGenerator';
import { parseSchema } from '@anttiviljami/dtsgenerator/dist/core/jsonSchema';
import ReferenceResolver from '@anttiviljami/dtsgenerator/dist/core/referenceResolver';
import SchemaConvertor, { ExportedType } from '@anttiviljami/dtsgenerator/dist/core/schemaConvertor';
import WriteProcessor from '@anttiviljami/dtsgenerator/dist/core/writeProcessor';
import { Document } from './types/client';

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
  const api = new Consumer({ definition });
  await api.init();

  const processor = new WriteProcessor({ indentSize: 2, indentChar: ' ' });
  const resolver = new ReferenceResolver();
  const convertor = new SchemaConvertor(processor);
  resolver.registerSchema(parseSchema(api.document));

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

export function generateOperationMethodTypings(api: Consumer, exportTypes: ExportedType[]) {
  const operations = api.getOperations();

  const operationTypings = operations.map(({ operationId, summary, description }) => {
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
      .map('path')
      .value();
    const responseType = !_.isEmpty(responseTypePaths) ? responseTypePaths.join(' | ') : 'any';
    const returnType = `OperationResponse<${responseType}>`;

    const operationArgs = [parametersArg, dataArg, 'config?: AxiosRequestConfig'];
    const operationMethod = `${operationId}(\n${operationArgs
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
