import _ from 'lodash';
import yargs from 'yargs';
import indent from 'indent-string';
import OpenAPIClientAxios, { Document, HttpMethod, Operation } from 'openapi-client-axios';
import DtsGenerator, { ExportedType } from '@anttiviljami/dtsgenerator/dist/core/dtsGenerator';
import RefParser from '@apidevtools/json-schema-ref-parser';
import { parseSchema } from '@anttiviljami/dtsgenerator/dist/core/type';

interface TypegenOptions {
  transformOperationName?: (operation: string) => string;
}

// rule from 'dts-generator' jsonSchema.ts
function convertKeyToTypeName(key: string): string {
  key = key.replace(/\/(.)/g, (_match: string, p1: string) => {
    return p1.toUpperCase();
  });
  return key
    .replace(/}/g, '')
    .replace(/{/g, '$')
    .replace(/^\//, '')
    .replace(/[^0-9A-Za-z_$]+/g, '_');
}

export async function main() {
  const argv = await yargs
    .option('transformOperationName', {
      alias: 't',
      type: 'string',
    })
    .usage('Usage: $0 [file]')
    .example('$0 ./openapi.yml > client.d.ts', '- generate a type definition file')
    .demandCommand(1).argv;

  const opts: TypegenOptions = {
    transformOperationName: (operation: string) => operation,
  };

  if (argv.transformOperationName) {
    const [modulePath, func] = argv.transformOperationName.split(/\.(?=[^\.]+$)/);

    if (!modulePath || !func) {
      throw new Error('transformOperationName must be provided in {path-to-module}.{exported-function} format');
    }

    const module = await import(modulePath);

    if (!module[func]) {
      throw new Error(`Could not find transform function ${func} in ${modulePath}`);
    }

    opts.transformOperationName = module[func];
  }

  const [imports, schemaTypes, operationTypings] = await generateTypesForDocument(argv._[0] as string, opts);
  console.log(imports, '\n');
  console.log(schemaTypes);
  console.log(operationTypings);
}

const schemaParserOptions = { resolve: { http: { headers: { "User-Agent": 'Typegen' } } } };

export async function generateTypesForDocument(definition: Document | string, opts: TypegenOptions) {
  const rootSchema = await RefParser.bundle(definition, schemaParserOptions);
  const schema = parseSchema(rootSchema as any);

  const generator = new DtsGenerator([schema]);
  const schemaTypes = await generator.generate();
  const exportedTypes = generator.getExports();
  const api = new OpenAPIClientAxios({ definition, swaggerParserOpts: schemaParserOptions });
  await api.init();
  const operationTypings = generateOperationMethodTypings(api, exportedTypes, opts);

  const imports = [
    'import type {',
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
  const normalizedOperationId = convertKeyToTypeName(operationId);
  const parameterTypePaths = _.chain([
    _.find(exportTypes, { schemaRef: `#/paths/${normalizedOperationId}/pathParameters` }),
    _.find(exportTypes, { schemaRef: `#/paths/${normalizedOperationId}/queryParameters` }),
    _.find(exportTypes, { schemaRef: `#/paths/${normalizedOperationId}/headerParameters` }),
    _.find(exportTypes, { schemaRef: `#/paths/${normalizedOperationId}/cookieParameters` }),
  ])
    .filter()
    .map('path')
    .value();

  const parametersType = !_.isEmpty(parameterTypePaths) ? parameterTypePaths.join(' & ') : 'UnknownParamsObject';
  const parametersArg = `parameters?: Parameters<${parametersType}> | null`;

  // payload arg
  const requestBodyType = _.find(exportTypes, { schemaRef: `#/paths/${normalizedOperationId}/requestBody` });
  const dataArg = `data?: ${requestBodyType ? requestBodyType.path : 'any'}`;

  // return type
  const responseTypePaths = _.chain(exportTypes)
    .filter(({ schemaRef }) => schemaRef.startsWith(`#/paths/${normalizedOperationId}/responses/2`))
    .map(({ path }) => path)
    .value();
  const responseType = !_.isEmpty(responseTypePaths) ? responseTypePaths.join(' | ') : 'any';
  const returnType = `OperationResponse<${responseType}>`;

  const operationArgs = [parametersArg, dataArg, 'config?: AxiosRequestConfig'];
  const operationMethod = `'${methodName}'(\n${operationArgs
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

export function generateOperationMethodTypings(
  api: OpenAPIClientAxios,
  exportTypes: ExportedType[],
  opts: TypegenOptions,
) {
  const operations = api.getOperations();

  const operationTypings = operations.map((op) => {
    return generateMethodForOperation(opts.transformOperationName(op.operationId), op, exportTypes);
  });

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
