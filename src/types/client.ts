import { AxiosResponse, AxiosRequestConfig } from 'axios';
import { OpenAPIV3 } from 'openapi-types';
export * from 'openapi-types';

/**
 * Type alias for OpenAPI document. We only support v3
 */
export type Document = OpenAPIV3.Document;

export type Server = OpenAPIV3.ServerObject;

/**
 * OpenAPI allowed HTTP methods
 */
export enum HttpMethod {
  Get = 'get',
  Put = 'put',
  Post = 'post',
  Patch = 'patch',
  Delete = 'delete',
  Options = 'options',
  Head = 'head',
  Trace = 'trace',
}

/**
 * OpenAPI parameters "in"
 */
export enum ParamType {
  Query = 'query',
  Header = 'header',
  Path = 'path',
  Cookie = 'cookie',
}

/**
 * Operation method spec
 */
export type ImplicitParamValue = string | number;
export interface ExplicitParamValue {
  value: string | number;
  name: string;
  in?: ParamType | string;
}
export interface UnknownParamsObject {
  [parameter: string]: ImplicitParamValue | ImplicitParamValue[];
}
export type ParamsArray = ExplicitParamValue[];
export type SingleParam = ImplicitParamValue;
export type Parameters<ParamsObject = UnknownParamsObject> = ParamsObject | ParamsArray | SingleParam;
export type RequestPayload = any; // should we type this?
export type OperationMethodArguments = [Parameters?, RequestPayload?, AxiosRequestConfig?];
export type OperationResponse<Response> = Promise<AxiosResponse<Response>>;
export type UnknownOperationMethod = (
  parameters?: Parameters,
  data?: RequestPayload,
  config?: AxiosRequestConfig,
) => OperationResponse<any>;
export interface UnknownOperationMethods {
  [operationId: string]: UnknownOperationMethod;
}

/**
 * Generic request config object
 */
export interface RequestConfig {
  method: HttpMethod; // HTTP method
  url: string; // full URL including protocol, host, path and query string
  path: string; // path for the operation (relative to server base URL)
  pathParams: { [key: string]: string }; // path parameters
  query: { [key: string]: string | string[] }; // query parameters
  queryString: string; // query string
  headers: { [header: string]: string | string[] }; // HTTP headers, including cookie
  cookies: { [cookie: string]: string }; // cookies
  payload?: RequestPayload; // the request payload passed as-is
}

/**
 * Operation object extended with path and method for easy looping
 */
export interface Operation extends OpenAPIV3.OperationObject {
  path: string;
  method: HttpMethod;
}

/**
 * A dictionary of paths and their methods
 */
export interface UnknownPathsDictionary {
  [path: string]: { [method in HttpMethod]?: UnknownOperationMethod };
}
