"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParamType = exports.HttpMethod = void 0;
__exportStar(require("openapi-types"), exports);
/**
 * OpenAPI allowed HTTP methods
 */
var HttpMethod;
(function (HttpMethod) {
    HttpMethod["Get"] = "get";
    HttpMethod["Put"] = "put";
    HttpMethod["Post"] = "post";
    HttpMethod["Patch"] = "patch";
    HttpMethod["Delete"] = "delete";
    HttpMethod["Options"] = "options";
    HttpMethod["Head"] = "head";
    HttpMethod["Trace"] = "trace";
})(HttpMethod = exports.HttpMethod || (exports.HttpMethod = {}));
/**
 * OpenAPI parameters "in"
 */
var ParamType;
(function (ParamType) {
    ParamType["Query"] = "query";
    ParamType["Header"] = "header";
    ParamType["Path"] = "path";
    ParamType["Cookie"] = "cookie";
})(ParamType = exports.ParamType || (exports.ParamType = {}));
//# sourceMappingURL=client.js.map