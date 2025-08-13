import axios, { AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse, Method } from 'axios';
import bath from 'bath-es5';
import { dereferenceSync } from 'dereference-json-schema';

import {
  Document,
  Operation,
  UnknownOperationMethod,
  OperationMethodArguments,
  UnknownOperationMethods,
  RequestConfig,
  ParamType,
  HttpMethod,
  UnknownPathsDictionary,
  Server,
  ParameterObject,
} from './types/client';

/**
 * OpenAPIClient is an AxiosInstance extended with operation methods
 */
export type OpenAPIClient<
  OperationMethods = UnknownOperationMethods,
  PathsDictionary = UnknownPathsDictionary,
> = AxiosInstance &
  OperationMethods & {
    api: OpenAPIClientAxios;
    paths: PathsDictionary;
  };

/**
 * By default OpenAPIClient will use axios as request runner. You can register a different runner,
 * in case you want to switch over from axios.
 */
export declare type Runner = {
  runRequest: RunRequestFunc;
  context?: UnknownContext;
};

/**
 * Context to be injected into Runner.runRequest
 */
export declare type UnknownContext = Record<string, unknown>;

/**
 * Type for runRequest function. It allows extending/switching from axios to another method of running http requests.
 */
export declare type RunRequestFunc = (
  axiosConfig: AxiosRequestConfig,
  operation: Operation,
  context?: UnknownContext,
) => Promise<AxiosResponse>;

const DefaultRunnerKey = 'default';

export type OpenAPIClientAxiosOptions = {
  definition: Document | string;
  quick?: boolean;
  withServer?: number | string | Server;
  baseURLVariables?: { [key: string]: string | number };
  applyMethodCommonHeaders?: boolean;
  transformOperationName?: (operation: string) => string;
  transformOperationMethod?: (
    operationMethod: UnknownOperationMethod,
    operationToTransform: Operation,
  ) => UnknownOperationMethod;
  axiosRunner?: (axiosConfig: AxiosRequestConfig) => Promise<AxiosResponse>;
  axiosConfigDefaults?: AxiosRequestConfig;
} & ({
  axiosConfigDefaults?: AxiosRequestConfig;
  axiosInstance?: never;
} | {
  axiosConfigDefaults?: never;
  axiosInstance?: AxiosInstance;
});

/**
 * Main class and the default export of the 'openapi-client-axios' module
 *
 * @export
 * @class OpenAPIClientAxios
 */
export class OpenAPIClientAxios {
  public document: Document;
  public inputDocument: Document | string;
  public definition: Document;

  public quick: boolean;

  public initialized: boolean;
  public instance: any;

  public axiosConfigDefaults: AxiosRequestConfig;

  private defaultServer: number | string | Server;
  private baseURLVariables: { [key: string]: string | number };
  private applyMethodCommonHeaders: boolean;

  private transformOperationName: (operation: string) => string;
  private transformOperationMethod: (
    operationMethod: UnknownOperationMethod,
    operationToTransform: Operation,
  ) => UnknownOperationMethod;

  // maps operationId to Runner
  private runners: Record<string, Runner>;

  /**
   * Creates an instance of OpenAPIClientAxios.
   *
   * @param opts - constructor options
   * @param {Document | string} opts.definition - the OpenAPI definition, file path or Document object
   * @param {boolean} opts.quick - quick mode, skips validation and doesn't guarantee document is unchanged
   * @param {boolean} opts.applyMethodCommonHeaders Should method (patch / post / put / etc.) specific default headers (from axios.defaults.headers.{method}) be applied to operation methods?
   * @param {boolean} opts.axiosConfigDefaults - default axios config for the instance
   * @param {boolean} opts.axiosInstance - axios instance to use
   * @memberof OpenAPIClientAxios
   */
  constructor(opts: OpenAPIClientAxiosOptions) {
    this.inputDocument = opts.definition;
    this.quick = opts.quick ?? false;
    this.axiosConfigDefaults = opts.axiosConfigDefaults ?? {};
    this.instance = opts.axiosInstance;
    this.defaultServer = opts.withServer ?? 0;
    this.baseURLVariables = opts.baseURLVariables ?? {};
    this.applyMethodCommonHeaders = opts.applyMethodCommonHeaders ?? false;
    this.transformOperationName = opts.transformOperationName ?? ((operationId: string) => operationId);
    this.transformOperationMethod =
      opts.transformOperationMethod ?? ((operationMethod: UnknownOperationMethod) => operationMethod);
    this.runners = {
      [DefaultRunnerKey]: {
        runRequest: opts.axiosRunner ?? ((axiosConfig: AxiosRequestConfig) => this.client.request(axiosConfig)),
      },
    };
  }

  /**
   * Returns the instance of OpenAPIClient
   *
   * @readonly
   * @type {OpenAPIClient}
   * @memberof OpenAPIClientAxios
   */
  get client() {
    return this.instance as OpenAPIClient;
  }

  /**
   * Returns the instance of OpenAPIClient
   *
   * @returns
   * @memberof OpenAPIClientAxios
   */
  public getClient = async <Client = OpenAPIClient>(): Promise<Client> => {
    if (!this.initialized) {
      return this.init<Client>();
    }
    return this.instance as Client;
  };

  public withServer(server: number | string | Server, variables: { [key: string]: string | number } = {}) {
    this.defaultServer = server;
    this.baseURLVariables = variables;
  }

  /**
   * Initializes OpenAPIClientAxios and creates a member axios client instance
   *
   * The init() method should be called right after creating a new instance of OpenAPIClientAxios
   *
   * @returns AxiosInstance
   * @memberof OpenAPIClientAxios
   */
  public init = async <Client = OpenAPIClient>(): Promise<Client> => {
    await this.loadDocument();

    // dereference the document into definition
    this.definition = dereferenceSync(this.document) as Document;

    // create axios instance
    this.instance = this.createAxiosInstance();

    // we are now initialized
    this.initialized = true;
    return this.instance as Client;
  };

  /**
   * Loads document from inputDocument
   *
   * Supports loading from a string (url) or an object (json)
   *
   * @memberof OpenAPIClientAxios
   */
  public async loadDocument() {
    if (typeof this.inputDocument === 'object') {
      this.document = this.inputDocument;
    } else {
      // create temporary instance to get the document
      const client = this.getAxiosInstance();

      // load the document
      const documentRes = await client.get(this.inputDocument);

      // set document
      if (typeof documentRes.data === 'object') {
        // json response
        this.document = documentRes.data;
      } else if (typeof documentRes.data === 'string' && documentRes.headers['content-type']?.match(/ya?ml/)) {
        // yaml response
        const yaml = await import('js-yaml');
        this.document = yaml.load(documentRes.data) as Document;
      } else {
        const err = new Error(`Invalid response fetching OpenAPI definition: ${documentRes}`) as any;
        err.response = documentRes;
        throw err;
      }
    }

    return this.document;
  }

  /**
   * Synchronous version of .init()
   *
   * Note: Only works when the input definition is a valid OpenAPI v3 object (URLs are not supported)
   *
   * @memberof OpenAPIClientAxios
   */
  public initSync = <Client = OpenAPIClient>(): Client => {
    if (typeof this.inputDocument !== 'object') {
      throw new Error(`.initSync() can't be called with a non-object definition. Please use .init()`);
    }

    // set document
    this.document = this.inputDocument;

    // dereference the document into definition
    this.definition = dereferenceSync(this.document) as Document;

    // create axios instance
    this.instance = this.createAxiosInstance();

    // we are now initialized
    this.initialized = true;
    return this.instance as Client;
  };

  /**
   * Creates a new axios instance, if necessary, and returns it
   */
  public getAxiosInstance = (): AxiosInstance => {
    let instance = this.instance;
    if (!instance) {
      instance = axios.create(this.axiosConfigDefaults) as OpenAPIClient;
    }
    return instance;
  };

  /**
   * Creates a new axios instance, extends it and returns it
   *
   * @memberof OpenAPIClientAxios
   */
  public createAxiosInstance = <Client = OpenAPIClient>(): Client => {
    // create axios instance
    const instance = this.getAxiosInstance() as OpenAPIClient;

    // set baseURL to the one found in the definition servers (if not set in axios defaults)
    const baseURL = this.getBaseURL();
    if (baseURL && !instance.defaults.baseURL) {
      instance.defaults.baseURL = baseURL;
    }

    // create methods for operationIds
    const operations = this.getOperations();
    for (const operation of operations) {
      const { operationId } = operation;
      if (operationId) {
        instance[this.transformOperationName(operationId)] = this.createOperationMethod(operation);
      }
    }

    // create paths dictionary
    // Example: api.paths['/pets/{id}'].get({ id: 1 });
    instance.paths = {};
    for (const path in this.definition.paths) {
      if (this.definition.paths[path]) {
        if (!instance.paths[path]) {
          instance.paths[path] = {};
        }
        const methods = this.definition.paths[path];
        for (const m in methods) {
          if (methods[m as HttpMethod] && Object.values(HttpMethod).includes(m as HttpMethod)) {
            const method = m as HttpMethod;
            const operation = this.getOperations().find((op) => op.method === method && op.path === path);
            instance.paths[path][method] = this.createOperationMethod(operation);
          }
        }
      }
    }

    // add reference to parent class instance
    instance.api = this;
    return instance as any as Client;
  };

  /**
   * Gets the API baseurl defined in the first OpenAPI specification servers property
   *
   * @returns string
   * @memberof OpenAPIClientAxios
   */
  public getBaseURL = (operation?: Operation): string | undefined => {
    if (!this.definition) {
      return undefined;
    }
    if (operation) {
      if (typeof operation === 'string') {
        operation = this.getOperation(operation);
      }
      if (operation.servers && operation.servers[0]) {
        return operation.servers[0].url;
      }
    }

    // get the target server from this.defaultServer
    let targetServer;
    if (typeof this.defaultServer === 'number') {
      if (this.definition.servers && this.definition.servers[this.defaultServer]) {
        targetServer = this.definition.servers[this.defaultServer];
      }
    } else if (typeof this.defaultServer === 'string') {
      for (const server of this.definition.servers) {
        if (server.description === this.defaultServer) {
          targetServer = server;
          break;
        }
      }
    } else if (this.defaultServer.url) {
      targetServer = this.defaultServer;
    }

    // if no targetServer is found, return undefined
    if (!targetServer) {
      return undefined;
    }

    const baseURL = targetServer.url;
    const baseURLVariableSet = targetServer.variables;

    // get baseURL var names
    const baseURLBuilder = bath(baseURL);

    // if there are no variables to resolve: return baseURL as is
    if (!baseURLBuilder.names.length) {
      return baseURL;
    }

    // object to place variables resolved from this.baseURLVariables
    const baseURLVariablesResolved: { [key: string]: string } = {};

    // step through names and assign value from this.baseURLVariables or the default value
    // note: any variables defined in baseURLVariables but not actually variables in baseURL are ignored
    for (const name of baseURLBuilder.names) {
      const varValue = this.baseURLVariables[name];

      if (varValue !== undefined && baseURLVariableSet[name].enum) {
        // if varValue exists assign to baseURLVariablesResolved object
        if (typeof varValue === 'number') {
          // if number, get value from enum array

          const enumVal = baseURLVariableSet[name].enum[varValue];

          if (enumVal) {
            baseURLVariablesResolved[name] = enumVal;
          } else {
            // if supplied value out of range: throw error

            throw new Error(
              `index ${varValue} out of range for enum of baseURL variable: ${name}; \
              enum max index is ${baseURLVariableSet[name].enum.length - 1}`,
            );
          }
        } else if (typeof varValue === 'string') {
          // if string, validate against enum array

          if (baseURLVariableSet[name].enum.includes(varValue)) {
            baseURLVariablesResolved[name] = varValue;
          } else {
            // if supplied value doesn't exist on enum: throw error

            throw new Error(
              `${varValue} is not a valid entry for baseURL variable ${name}; \
                variable must be of the following: ${baseURLVariableSet[name].enum.join(', ')}`,
            );
          }
        }
      } else {
        // if varValue doesn't exist: get default

        baseURLVariablesResolved[name] = baseURLVariableSet[name].default;
      }
    }

    // return resolved baseURL
    return baseURLBuilder.path(baseURLVariablesResolved);
  };

  /**
   * Creates an axios config object for operation + arguments
   * @memberof OpenAPIClientAxios
   */
  public getAxiosConfigForOperation = (
    operation: Operation | string,
    args: OperationMethodArguments,
  ): AxiosRequestConfig => {
    if (typeof operation === 'string') {
      operation = this.getOperation(operation);
    }
    const request = this.getRequestConfigForOperation(operation, args);

    // construct axios request config
    const axiosConfig: AxiosRequestConfig = {
      method: request.method as Method,
      url: request.path,
      data: request.payload,
      params: request.query,
      headers: request.headers,
    };

    // allow overriding baseURL with operation / path specific servers
    const { servers } = operation;
    if (servers && servers[0]) {
      axiosConfig.baseURL = servers[0].url;
    }

    // allow overriding any parameters in AxiosRequestConfig
    const [, , config] = args;
    return {
      ...axiosConfig,
      ...config,
      params: {
        ...axiosConfig?.params,
        ...config?.params,
      },
      headers: {
        ...axiosConfig?.headers,
        ...config?.headers,
      },
    };
  };

  /**
   * Creates a generic request config object for operation + arguments.
   *
   * This function contains the logic that handles operation method parameters.
   *
   * @memberof OpenAPIClientAxios
   */
  public getRequestConfigForOperation = (operation: Operation | string, args: OperationMethodArguments) => {
    if (typeof operation === 'string') {
      operation = this.getOperation(operation);
    }

    const pathParams = {} as RequestConfig['pathParams'];
    const searchParams = new URLSearchParams();
    const query = {} as RequestConfig['query'];
    const headers = {} as RequestConfig['headers'];
    const cookies = {} as RequestConfig['cookies'];
    const parameters = (operation.parameters || []) as ParameterObject[];

    const setRequestParam = (name: string, value: any, type: ParamType | string) => {
      switch (type) {
        case ParamType.Path:
          pathParams[name] = value;
          break;
        case ParamType.Query:
          if (Array.isArray(value)) {
            for (const valueItem of value) {
              searchParams.append(name, valueItem);
            }
          } else {
            searchParams.append(name, value);
          }
          query[name] = value;
          break;
        case ParamType.Header:
          headers[name] = value;
          break;
        case ParamType.Cookie:
          cookies[name] = value;
          break;
      }
    };

    const getParamType = (paramName: string): ParamType => {
      const param = parameters.find(({ name }) => name === paramName);
      if (param) {
        return param.in as ParamType;
      }
      // default all params to query if operation doesn't specify param
      return ParamType.Query;
    };

    const getFirstOperationParam = () => {
      const firstRequiredParam = parameters.find(({ required }) => required === true);
      if (firstRequiredParam) {
        return firstRequiredParam;
      }
      const firstParam = parameters[0];
      if (firstParam) {
        return firstParam;
      }
    };

    const [paramsArg, payload] = args;
    if (Array.isArray(paramsArg)) {
      // ParamsArray
      for (const param of paramsArg) {
        setRequestParam(param.name, param.value, param.in || getParamType(param.name));
      }
    } else if (typeof paramsArg === 'object') {
      // ParamsObject
      for (const name in paramsArg) {
        if (paramsArg[name] !== undefined) {
          setRequestParam(name, paramsArg[name], getParamType(name));
        }
      }
    } else if (paramsArg) {
      const firstParam = getFirstOperationParam();
      if (!firstParam) {
        throw new Error(`No parameters found for operation ${operation.operationId}`);
      }
      setRequestParam(firstParam.name, paramsArg, firstParam.in as ParamType);
    }

    // path parameters
    const pathBuilder = bath(operation.path);
    // make sure all path parameters are set
    for (const name of pathBuilder.names) {
      const value = pathParams[name];
      pathParams[name] = `${value}`;
    }
    const path = pathBuilder.path(pathParams);

    // queryString parameter
    const queryString = searchParams.toString();

    // full url with query string
    const url = `${this.getBaseURL(operation)}${path}${queryString ? `?${queryString}` : ''}`;

    // add default common headers
    const defaultHeaders = this.client.defaults.headers;
    for (const [key, val] of Object.entries(defaultHeaders.common ?? {})) {
      headers[key] = val;
    }

    // add method specific default headers
    if (this.applyMethodCommonHeaders) {
      const methodHeaders: AxiosRequestHeaders = (defaultHeaders as any)[operation.method] ?? {};
      for (const [key, val] of Object.entries(methodHeaders)) {
        headers[key] = val;
      }
    }

    // construct request config
    const config: RequestConfig = {
      method: operation.method,
      url,
      path,
      pathParams,
      query,
      queryString,
      headers,
      cookies,
      payload,
    };
    return config;
  };

  /**
   * Flattens operations into a simple array of Operation objects easy to work with
   *
   * @returns {Operation[]}
   * @memberof OpenAPIBackend
   */
  public getOperations = (): Operation[] => {
    const paths = this.definition?.paths || {};
    return Object.entries(paths).flatMap(([path, pathObject]) => {
      return Object.values(HttpMethod)
        .map((method) => ({ path, method, operation: pathObject[method] }))
        .filter(({ operation }) => operation)
        .map(({ operation, method }) => {
          const op: Partial<Operation> = {
            ...(typeof operation === 'object' ? operation : {}),
            path,
            method: method as HttpMethod,
          };
          if (pathObject.parameters) {
            op.parameters = [...(op.parameters || []), ...pathObject.parameters];
          }
          if (pathObject.servers) {
            op.servers = [...(op.servers || []), ...pathObject.servers];
          }
          op.security = op.security ?? this.definition.security;
          return op as Operation;
        });
    });
  };

  /**
   * Gets a single operation based on operationId
   *
   * @param {string} operationId
   * @returns {Operation}
   * @memberof OpenAPIBackend
   */
  public getOperation = (operationId: string): Operation | undefined => {
    return this.getOperations().find((op) => op.operationId === operationId);
  };

  /**
   * By default OpenAPIClient will use axios as request runner. You can register a different runner,
   * in case you want to switch over from axios. This allows transitioning from axios to your library of choice.
   * @param runner - request runner to be registered, either for all operations, or just one operation.
   * @param operationId - optional parameter. If provided, runner will be registered for a single operation. Else, it will be registered for all operations.
   */
  public registerRunner(runner: Runner, operationId?: string) {
    this.runners[operationId ?? DefaultRunnerKey] = runner;
  }

  private getRunner(operationId: string) {
    return this.runners[operationId] ?? this.runners[DefaultRunnerKey];
  }

  /**
   * Creates an axios method for an operation
   * (...pathParams, data?, config?) => Promise<AxiosResponse>
   *
   * @param {Operation} operation
   * @memberof OpenAPIClientAxios
   */
  private createOperationMethod = (operation: Operation): UnknownOperationMethod => {
    const originalOperationMethod = async (...args: OperationMethodArguments) => {
      const axiosConfig = this.getAxiosConfigForOperation(operation, args);
      // run the axios request with the registered runner
      // by default: axios runner
      const runner = this.getRunner(operation.operationId);
      return runner.runRequest(axiosConfig, operation, runner.context);
    };

    return this.transformOperationMethod(originalOperationMethod, operation);
  };
}
