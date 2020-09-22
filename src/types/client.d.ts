import { AxiosResponse, AxiosRequestConfig } from 'axios';
import { OpenAPIV3 } from 'openapi-types';
export * from 'openapi-types';
/**
 * Type alias for OpenAPI document. We only support v3
 */
export declare type Document = OpenAPIV3.Document;
export declare type Server = OpenAPIV3.ServerObject;
/**
 * OpenAPI allowed HTTP methods
 */
export declare enum HttpMethod {
    Get = "get",
    Put = "put",
    Post = "post",
    Patch = "patch",
    Delete = "delete",
    Options = "options",
    Head = "head",
    Trace = "trace"
}
/**
 * OpenAPI parameters "in"
 */
export declare enum ParamType {
    Query = "query",
    Header = "header",
    Path = "path",
    Cookie = "cookie"
}
/**
 * Operation method spec
 */
export declare type ImplicitParamValue = string | number;
export interface ExplicitParamValue {
    value: string | number;
    name: string;
    in?: ParamType | string;
}
export interface UnknownParamsObject {
    [parameter: string]: ImplicitParamValue | ImplicitParamValue[];
}
export declare type ParamsArray = ExplicitParamValue[];
export declare type SingleParam = ImplicitParamValue;
export declare type Parameters<ParamsObject = UnknownParamsObject> = ParamsObject | ParamsArray | SingleParam;
export declare type RequestPayload = any;
export declare type OperationMethodArguments = [Parameters?, RequestPayload?, AxiosRequestConfig?];
export declare type OperationResponse<Response> = Promise<AxiosResponse<Response>>;
export declare type UnknownOperationMethod = (parameters?: Parameters, data?: RequestPayload, config?: AxiosRequestConfig) => OperationResponse<any>;
export interface UnknownOperationMethods {
    [operationId: string]: UnknownOperationMethod;
}
/**
 * Generic request config object
 */
export interface RequestConfig {
    method: HttpMethod;
    url: string;
    path: string;
    pathParams: {
        [key: string]: string;
    };
    query: {
        [key: string]: string | string[];
    };
    queryString: string;
    headers: {
        [header: string]: string | string[];
    };
    cookies: {
        [cookie: string]: string;
    };
    payload?: RequestPayload;
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
    [path: string]: {
        [method in HttpMethod]?: UnknownOperationMethod;
    };
}
