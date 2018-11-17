import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { validate as validateOpenAPI } from 'openapi-schema-validation';
import SwaggerParser from 'swagger-parser';
import { OpenAPIV3 } from 'openapi-types';

export type Document = OpenAPIV3.Document;

export interface OpenAPIFrontendExtensions {
  [operationId: string]: (data?: any, config?: AxiosRequestConfig) => Promise<AxiosResponse<any>>;
}

export type OpenAPIClient = AxiosInstance & OpenAPIFrontendExtensions;

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
    const client = axios.create();

    // set baseURL to the one found in the definition servers
    const baseURL = this.getBaseURL();
    if (baseURL) {
      client.defaults.baseURL = baseURL;
    }

    // TODO: add methods for operationIds

    // set client
    this.client = client as OpenAPIClient;

    // set initialized = true
    this.initalized = true;

    return client;
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
  public getBaseURL() {
    if (!this.definition) {
      return;
    }

    if (!this.definition.servers || this.definition.servers.length < 1) {
      return;
    }

    return this.definition.servers[0].url;
  }
}
