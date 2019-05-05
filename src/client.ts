import _ from 'lodash';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import bath from 'bath-es5';
import { validate as validateOpenAPI } from 'openapi-schema-validation';
import SwaggerParser from 'swagger-parser';
import QueryString from 'query-string';
import {
  OpenAPIV3,
  Document,
  Operation,
  UnknownOperationMethod,
  OperationMethodArguments,
  UnknownOperationMethods,
  RequestConfig,
  ParamsArray,
  ParamType,
  HttpMethod,
} from './types/client';

/**
 * OpenAPIClient is an AxiosInstance extended with operation methods
 */
export type OpenAPIClient<OperationMethods> = AxiosInstance &
  OperationMethods & {
    api: OpenAPIClientAxios;
  };

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

  public strict: boolean;
  public validate: boolean;

  public initalized: boolean;
  public instance: any;

  public operations: UnknownOperationMethods;
  public axiosConfigDefaults: AxiosRequestConfig;

  /**
   * Creates an instance of OpenAPIClientAxios.
   *
   * @param opts - constructor options
   * @param {Document | string} opts.definition - the OpenAPI definition, file path or Document object
   * @param {boolean} opts.strict - strict mode, throw errors or warn on OpenAPI spec validation errors (default: false)
   * @param {boolean} opts.validate - whether to validate the input document document (default: true)
   * @param {boolean} opts.axiosConfigDefaults - default axios config for the instance
   * @memberof OpenAPIClientAxios
   */
  constructor(opts: {
    definition: Document | string;
    strict?: boolean;
    validate?: boolean;
    axiosConfigDefaults?: AxiosRequestConfig;
  }) {
    const optsWithDefaults = {
      validate: true,
      strict: false,
      axiosConfigDefaults: {},
      ...opts,
    };
    this.inputDocument = optsWithDefaults.definition;
    this.strict = optsWithDefaults.strict;
    this.validate = optsWithDefaults.validate;
    this.axiosConfigDefaults = optsWithDefaults.axiosConfigDefaults;
    this.operations = {};
  }

  /**
   * Returns the instance of OpenAPIClient
   *
   * @readonly
   * @type {OpenAPIClient<UnknownOperationMethods>}
   * @memberof OpenAPIClientAxios
   */
  get client(): OpenAPIClient<UnknownOperationMethods> {
    return this.instance;
  }

  /**
   * Returns the instance of OpenAPIClient
   *
   * @returns
   * @memberof OpenAPIClientAxios
   */
  public getClient = async <Client = OpenAPIClient<UnknownOperationMethods>>() => {
    if (!this.initalized) {
      return this.init<Client>();
    }
    return this.instance as Client;
  };

  /**
   * Initalizes OpenAPIClientAxios and creates the axios client instance
   *
   * The init() method should be called right after creating a new instance of OpenAPIClientAxios
   *
   * @returns AxiosInstance
   * @memberof OpenAPIClientAxios
   */
  public init = async <Client = OpenAPIClient<UnknownOperationMethods>>() => {
    try {
      // parse the document
      this.document = await SwaggerParser.parse(this.inputDocument);

      if (this.validate) {
        // validate the document
        this.validateDefinition();
      }

      // dereference the document into definition
      this.definition = await SwaggerParser.dereference(_.cloneDeep(this.document));
    } catch (err) {
      if (this.strict) {
        // in strict-mode, fail hard and re-throw the error
        throw err;
      } else {
        // just emit a warning about the validation errors
        console.warn(err);
      }
    }

    // return the created axios instance
    const instance = axios.create(this.axiosConfigDefaults);

    // set baseURL to the one found in the definition servers (if not set in axios defaults)
    const baseURL = this.getBaseURL();
    if (baseURL && !this.axiosConfigDefaults.baseURL) {
      instance.defaults.baseURL = baseURL;
    }

    // from here on, we want to handle the client as an extended axios client instance
    this.instance = instance;

    // create methods for operationIds
    const operations = this.getOperations();
    for (const operation of operations) {
      const { operationId } = operation;
      if (operationId) {
        this.operations[operationId] = this.createOperationMethod(operation);
        // also add the method to the axios client for syntactic sugar
        this.instance[operationId] = this.operations[operationId];
      }
    }

    // add reference to parent class instance
    this.instance.api = this;

    // we are now initalized
    this.initalized = true;
    return this.instance as Client;
  };

  /**
   * Validates this.document, which is the parsed OpenAPI document. Throws an error if validation fails.
   *
   * @returns {Document} parsed document
   * @memberof OpenAPIClientAxios
   */
  public validateDefinition = () => {
    const { valid, errors } = validateOpenAPI(this.document, 3);
    if (!valid) {
      const prettyErrors = JSON.stringify(errors, null, 2);
      throw new Error(`Document is not valid OpenAPI. ${errors.length} validation errors:\n${prettyErrors}`);
    }
    return this.document;
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
    if (this.definition.servers && this.definition.servers[0]) {
      return this.definition.servers[0].url;
    }
    return undefined;
  };

  /**
   * Creates an axios config object for operation + arguments
   * @memberof OpenAPIClientAxios
   */
  public getAxiosConfigForOperation = (operation: Operation | string, args: OperationMethodArguments) => {
    if (typeof operation === 'string') {
      operation = this.getOperation(operation);
    }
    const request = this.getRequestConfigForOperation(operation, args);

    // construct axios request config
    const axiosConfig: AxiosRequestConfig = {
      method: request.method,
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
    const [parameters, data, config] = args;
    return config ? _.merge(axiosConfig, config) : axiosConfig;
  };

  /**
   * Creates a generic request config object for operation + arguments
   * @memberof OpenAPIClientAxios
   */
  public getRequestConfigForOperation = (operation: Operation | string, args: OperationMethodArguments) => {
    if (typeof operation === 'string') {
      operation = this.getOperation(operation);
    }

    const pathParams = {} as RequestConfig['pathParams'];
    const query = {} as RequestConfig['query'];
    const headers = {} as RequestConfig['headers'];
    const cookies = {} as RequestConfig['cookies'];

    const setRequestParam = (name: string, value: any, type: ParamType | string) => {
      switch (type) {
        case ParamType.Path:
          pathParams[name] = value;
          break;
        case ParamType.Query:
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
      const param = _.find((operation as Operation).parameters, { name: paramName }) as OpenAPIV3.ParameterObject;
      if (param) {
        return param.in as ParamType;
      }
      // default all params to query if operation doesn't specify param
      return ParamType.Query;
    };

    const getFirstOperationParam = () => {
      const firstRequiredParam = _.find((operation as Operation).parameters, {
        required: true,
      }) as OpenAPIV3.ParameterObject;
      if (firstRequiredParam) {
        return firstRequiredParam;
      }
      const firstParam = _.first((operation as Operation).parameters) as OpenAPIV3.ParameterObject;
      if (firstParam) {
        return firstParam;
      }
    };

    const [paramsArg, payload] = args;
    if (_.isArray(paramsArg)) {
      // ParamsArray
      for (const param of paramsArg as ParamsArray) {
        setRequestParam(param.name, param.value, param.in || getParamType(param.name));
      }
    } else if (typeof paramsArg === 'object') {
      // ParamsObject
      for (const name in paramsArg) {
        if (paramsArg[name]) {
          setRequestParam(name, paramsArg[name], getParamType(name));
        }
      }
    } else if (!_.isNil(paramsArg)) {
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

    // query parameters
    const queryString = QueryString.stringify(query);

    // full url with query string
    const url = `${this.getBaseURL(operation)}${path}${queryString ? `?${queryString}` : ''}`;

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
    const paths = _.get(this.definition, 'paths', {});
    return _.chain(paths)
      .entries()
      .flatMap(([path, pathObject]) => {
        const methods = _.pick(pathObject, _.values(HttpMethod));
        return _.map(_.entries(methods), ([method, operation]) => {
          const op: Operation = {
            ...(operation as OpenAPIV3.OperationObject),
            path,
            method: method as HttpMethod,
          };
          if (pathObject.parameters) {
            op.parameters = [...(op.parameters || []), ...pathObject.parameters];
          }
          if (pathObject.servers) {
            op.servers = [...(op.servers || []), ...pathObject.servers];
          }
          return op;
        });
      })
      .value();
  };

  /**
   * Gets a single operation based on operationId
   *
   * @param {string} operationId
   * @returns {Operation}
   * @memberof OpenAPIBackend
   */
  public getOperation = (operationId: string): Operation | undefined => {
    return _.find(this.getOperations(), { operationId });
  };

  /**
   * Creates an axios method for an operation
   * (...pathParams, data?, config?) => Promise<AxiosResponse>
   *
   * @param {Operation} operation
   * @memberof OpenAPIClientAxios
   */
  private createOperationMethod = (operation: Operation): UnknownOperationMethod => {
    return async (...args: OperationMethodArguments) => {
      const axiosConfig = this.getAxiosConfigForOperation(operation, args);
      // do the axios request
      return this.client.request(axiosConfig);
    };
  };
}
