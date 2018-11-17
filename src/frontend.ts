import _ from 'lodash';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import bath from 'bath';
import { validate as validateOpenAPI } from 'openapi-schema-validation';
import SwaggerParser from 'swagger-parser';
import { OpenAPIV3 } from 'openapi-types';

export type Document = OpenAPIV3.Document;
export type OperationMethodPathParameterArgument = string | number;
export type OperationMethodDataArgument = any;
export type OperationMethod = (
  ...args: Array<OperationMethodPathParameterArgument | OperationMethodDataArgument | AxiosRequestConfig>
) => Promise<AxiosResponse<any>>;
export interface OpenAPIFrontendExtensions {
  [operationId: string]: OperationMethod;
}
export type OpenAPIClient = AxiosInstance & OpenAPIFrontendExtensions;

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

/**
 * Main class and the default export of the 'openapi-frontend' module
 *
 * @export
 * @class OpenAPIFrontend
 */
export class OpenAPIFrontend {
  public document: Document;
  public inputDocument: Document | string;
  public definition: Document;

  public strict: boolean;
  public validate: boolean;

  public initalized: boolean;
  public client: OpenAPIClient;

  /**
   * Creates an instance of OpenAPIFrontend.
   *
   * @param opts - constructor options
   * @param {Document | string} opts.definition - the OpenAPI definition, file path or Document object
   * @param {boolean} opts.strict - strict mode, throw errors or warn on OpenAPI spec validation errors (default: false)
   * @param {boolean} opts.validate - whether to validate requests with Ajv (default: true)
   * @memberof OpenAPIFrontend
   */
  constructor(opts: { definition: Document | string; strict?: boolean; validate?: boolean }) {
    const optsWithDefaults = {
      validate: true,
      strict: false,
      handlers: {},
      ...opts,
    };
    this.inputDocument = optsWithDefaults.definition;
    this.strict = optsWithDefaults.strict;
    this.validate = optsWithDefaults.validate;
  }

  /**
   * Initalizes OpenAPIFrontend.
   *
   * The init() method should be called right after creating a new instance of OpenAPIFrontend
   *
   * @returns AxiosInstance
   * @memberof OpenAPIFrontend
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
    const instance = axios.create();

    // set baseURL to the one found in the definition servers
    const baseURL = this.getBaseURL();
    if (baseURL) {
      instance.defaults.baseURL = baseURL;
    }

    // from here on, we want to handle the client as an extended axios client instance
    this.client = instance as OpenAPIClient;

    // add methods for operationIds
    const operations = this.getOperations();
    for (const operation of operations) {
      const { operationId } = operation;
      if (operationId) {
        this.client[operationId] = this.createOperationMethod(operation);
      }
    }

    // we are now initalized
    this.initalized = true;
    return this.client;
  }

  /**
   * Returns an instance of OpenAPIClient
   *
   * @returns
   * @memberof OpenAPIFrontend
   */
  public async getClient(): Promise<OpenAPIClient> {
    if (!this.initalized) {
      return this.init();
    }
    return this.client;
  }

  /**
   * Validates this.document, which is the parsed OpenAPI document. Throws an error if validation fails.
   *
   * @returns {Document} parsed document
   * @memberof OpenAPIFrontend
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
   * @memberof OpenAPIFrontend
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
   *
   * (...pathParams, data?: any, config?)
   * => Promise<AxiosResponse>
   *
   * @param {Operation} operation
   * @memberof OpenAPIFrontend
   */
  public createOperationMethod(operation: Operation): OperationMethod {
    const { method, path } = operation;

    return (...args) => {
      let axiosConfig: AxiosRequestConfig = { method };

      // parse path template
      const pathParams = bath(path);

      // handle operation method arguments
      const paramArgs: string[] = [];
      for (const argument of args) {
        switch (typeof argument) {
          // the first arguments are always path parameters for operation
          // the last argument, if of type object is the opts object
          case 'string':
            // this is a path param argument
            paramArgs.push(argument);
            break;
          case 'number':
            // this is a path param argument
            paramArgs.push(`${argument}`);
            break;
          default:
            if (axiosConfig.data === undefined) {
              // this is a data argument
              // you can pass null as the first non param argument if you want to override axios config
              axiosConfig.data = argument;
            } else {
              // this is an axios config override argument
              axiosConfig = { ...axiosConfig, ...argument };
            }
            break;
        }
      }

      // construct a map of path param names and values
      const params = _.zipObject(pathParams.names, paramArgs);

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

      // construct URL from path
      axiosConfig.url = pathParams.path(params);

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
}
