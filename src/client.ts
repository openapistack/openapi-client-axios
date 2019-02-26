import _ from 'lodash';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import bath from 'bath-es5';
import { validate as validateOpenAPI } from 'openapi-schema-validation';
import SwaggerParser from 'swagger-parser';
import { OpenAPIV3 } from 'openapi-types';
import { Parameters } from 'bath/_/types';

export type Document = OpenAPIV3.Document;
export type OperationId = Exclude<string, ['query']>;

export type PathParamValue = string | number;
export type OperationMethodPathParametersArgument =
  | PathParamValue
  | PathParamValue[]
  | { [param: string]: PathParamValue };
export type OperationMethodDataArgument = any;
export type OperationMethodArguments =
  | [OperationMethodPathParametersArgument?, OperationMethodDataArgument?, AxiosRequestConfig?]
  | [OperationMethodDataArgument?, AxiosRequestConfig?]
  | [AxiosRequestConfig?];

export type OperationMethodAll<Response = any> = (
  pathParams?: OperationMethodPathParametersArgument,
  data?: OperationMethodDataArgument,
  config?: AxiosRequestConfig,
) => Promise<AxiosResponse<Response>>;

export type OperationMethodNoPathParams<Response = any> = (
  data?: OperationMethodDataArgument,
  config?: AxiosRequestConfig,
) => Promise<AxiosResponse<Response>>;

export type OperationMethodNoParams<Response = any> = (config?: AxiosRequestConfig) => Promise<AxiosResponse<Response>>;

export type OperationMethod = OperationMethodAll | OperationMethodNoPathParams | OperationMethodNoParams;
export interface OpenAPIClientAxiosOperations {
  [operationId: string]: OperationMethod;
}

export type QueryMethod<Response = any> = (
  operationId: string,
  ...args: OperationMethodArguments
) => Promise<AxiosResponse<Response>>;
export interface OpenAPIClientAxiosQuery {
  query: QueryMethod;
}

export type OpenAPIClient = AxiosInstance & OpenAPIClientAxiosQuery & OpenAPIClientAxiosOperations;

/**
 * OAS Operation Object containing the path and method so it can be placed in a flat array of operations
 *
 * @export
 * @interface Operation
 * @extends {OpenAPIV3.OperationObject}
 */
export interface Operation extends OpenAPIV3.OperationObject {
  path: string;
  method: string;
}

export type MockHandler = (config: AxiosRequestConfig) => any[] | Promise<any[]>;

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
  public mockDelay: number;
  public mockHandler: MockHandler;

  public initalized: boolean;
  public client: OpenAPIClient;

  public operations: { [operationId: string]: OperationMethod };
  public mockAdapter: MockAdapter;
  public axiosConfigDefaults: AxiosRequestConfig;

  /**
   * Creates an instance of OpenAPIClientAxios.
   *
   * @param opts - constructor options
   * @param {Document | string} opts.definition - the OpenAPI definition, file path or Document object
   * @param {boolean} opts.strict - strict mode, throw errors or warn on OpenAPI spec validation errors (default: false)
   * @param {boolean} opts.validate - whether to validate requests with Ajv (default: true)
   * @memberof OpenAPIClientAxios
   */
  constructor(opts: {
    definition: Document | string;
    strict?: boolean;
    validate?: boolean;
    mockHandler?: MockHandler;
    mockDelay?: number;
    axiosConfigDefaults?: AxiosRequestConfig;
  }) {
    const optsWithDefaults = {
      validate: true,
      strict: false,
      mockDelay: 0,
      axiosConfigDefaults: {},
      ...opts,
    };
    this.inputDocument = optsWithDefaults.definition;
    this.strict = optsWithDefaults.strict;
    this.validate = optsWithDefaults.validate;
    this.mockDelay = optsWithDefaults.mockDelay;
    this.mockHandler = optsWithDefaults.mockHandler;
    this.axiosConfigDefaults = optsWithDefaults.axiosConfigDefaults;
    this.operations = {};
  }

  /**
   * Initalizes OpenAPIClientAxios.
   *
   * The init() method should be called right after creating a new instance of OpenAPIClientAxios
   *
   * @returns AxiosInstance
   * @memberof OpenAPIClientAxios
   */
  public async init() {
    try {
      // parse the document
      this.document = await SwaggerParser.parse(this.inputDocument);

      // validate the document
      this.validateDefinition();

      // dereference the document into definition
      this.definition = await SwaggerParser.dereference(this.document);
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
    this.client = instance as OpenAPIClient;

    // create methods for operationIds
    const operations = this.getOperations();
    for (const operation of operations) {
      const { operationId } = operation;
      if (operationId) {
        this.operations[operationId] = this.createOperationMethod(operation);
        // also add the method to the axios client for syntactic sugar
        this.client[operationId] = this.operations[operationId];
      }
    }

    // mock the api using the given handler
    if (this.mockHandler) {
      this.mock(this.mockHandler, { mockDelay: this.mockDelay });
    }

    // add the query method
    this.client.query = (operationId, ...args) => this.operations[operationId](...args);

    // we are now initalized
    this.initalized = true;
    return this.client;
  }

  /**
   * Returns an instance of OpenAPIClient
   *
   * @returns
   * @memberof OpenAPIClientAxios
   */
  public async getClient(): Promise<OpenAPIClient> {
    if (!this.initalized) {
      return this.init();
    }
    return this.client;
  }

  /**
   * Sets an axios mock adapter with given handler. Meant to be used with openapi-backend
   *
   * @param {MockHandler} mockHandler
   * @memberof OpenAPIClientAxios
   */
  public mock(mockHandler: MockHandler, opts?: { mockDelay: number }) {
    this.mockHandler = mockHandler;
    if (opts && opts.mockDelay !== undefined) {
      this.mockDelay = opts.mockDelay;
    }
    this.mockAdapter = new MockAdapter(this.client, { delayResponse: this.mockDelay });
    this.mockAdapter.onAny().reply(this.mockHandler);
  }

  /**
   * Validates this.document, which is the parsed OpenAPI document. Throws an error if validation fails.
   *
   * @returns {Document} parsed document
   * @memberof OpenAPIClientAxios
   */
  public validateDefinition() {
    const { valid, errors } = validateOpenAPI(this.document, 3);
    if (!valid) {
      const prettyErrors = JSON.stringify(errors, null, 2);
      throw new Error(`Document is not valid OpenAPI. ${errors.length} validation errors:\n${prettyErrors}`);
    }
    return this.document;
  }

  /**
   * Gets the API baseurl defined in the first OpenAPI specification servers property
   *
   * @returns string
   * @memberof OpenAPIClientAxios
   */
  public getBaseURL(): string {
    if (!this.definition) {
      return;
    }

    if (!this.definition.servers || this.definition.servers.length < 1) {
      return;
    }

    return this.definition.servers[0].url;
  }

  /**
   * Creates an axios method for an operation
   * (...pathParams, data?, config?) => Promise<AxiosResponse>
   *
   * @param {Operation} operation
   * @memberof OpenAPIClientAxios
   */
  public createOperationMethod(operation: Operation): OperationMethod {
    const { method, path, operationId } = operation;

    return async (...args: OperationMethodArguments) => {
      // handle operation method arguments
      let i = 0;

      // parse path template
      const pathParams = bath(path);

      // check for path param args
      // (depends on whether operation takes in path params)
      let params: Parameters = {};
      if (pathParams.names.length && args[i] !== undefined) {
        if (Array.isArray(args[0])) {
          // array
          params = _.zipObject(pathParams.names, _.map(args[0], (param) => `${param}`));
        } else if (typeof args[0] === 'object') {
          // object
          params = _.mapValues(args[0], (param) => `${param}`);
        } else {
          // singular path param
          const param = `${args[0]}`;
          params = _.zipObject(pathParams.names, [param]);
        }
        i++;
      }

      // check for data argument
      // (depends on operation method)
      let data: any;
      const shouldHaveRequestBody = ['post', 'put', 'patch'].includes(operation.method);
      if (shouldHaveRequestBody && args[i] !== undefined) {
        data = args[i];
        i++;
      }

      // check for config argument
      let config: AxiosRequestConfig;
      if (args[i] !== undefined) {
        config = args[i];
        i++;
      }

      // too many arguments
      if (args[i]) {
        throw new Error(`Expected a maximum of ${i} arguments for ${operationId} operation method`);
      }

      // make sure all path parameters are set
      _.map(_.values(params), (value, index) => {
        if (value === undefined) {
          const paramName = pathParams.names[index];
          if (this.strict) {
            throw new Error(`Missing argument #${index} for path parameter ${paramName}`);
          }
          // set the value to "undefined"
          params[paramName] = 'undefined';
        }
      });

      // construct URL from path params
      const url = pathParams.path(params);

      // construct axios request config
      const axiosConfig: AxiosRequestConfig = {
        method,
        url,
        data,
        ...config,
      };

      // do the axios request
      return this.client.request(axiosConfig);
    };
  }

  /**
   * Flattens operations into a simple array of Operation objects easy to work with
   *
   * @returns {Operation[]}
   * @memberof OpenAPIBackend
   */
  public getOperations(): Operation[] {
    const paths = _.get(this.definition, 'paths', {});
    return _.chain(paths)
      .entries()
      .flatMap(([path, pathBaseObject]) => {
        const methods = _.pick(pathBaseObject, ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
        return _.map(_.entries(methods), ([method, operation]) => ({
          ...(operation as OpenAPIV3.OperationObject),
          path,
          method,
          // add the path base object's operations to the operation's parameters
          parameters: [
            ...((operation.parameters as OpenAPIV3.ParameterObject[]) || []),
            ...((pathBaseObject.parameters as OpenAPIV3.ParameterObject[]) || []),
          ],
        }));
      })
      .value();
  }

  /**
   * Gets a single operation based on operationId
   *
   * @param {string} operationId
   * @returns {Operation}
   * @memberof OpenAPIBackend
   */
  public getOperation(operationId: string): Operation {
    return _.find(this.getOperations(), { operationId });
  }
}
