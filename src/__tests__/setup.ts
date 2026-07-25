import MockAdapter from 'axios-mock-adapter';
import type { AxiosRequestConfig } from 'axios';

/**
 * axios >= 0.33 hardened its internal config/header merge to build null-prototype objects.
 * axios-mock-adapter reads `config.headers.constructor.name` to detect AxiosHeaders, which
 * throws on such objects. Hand the mock adapter a normal-prototype copy of the headers.
 *
 * @see https://github.com/ctimmerm/axios-mock-adapter/blob/master/src/handle_request.js
 */
const originalAdapter = MockAdapter.prototype.adapter;
MockAdapter.prototype.adapter = function patchedAdapter(this: MockAdapter) {
  const handleRequest = originalAdapter.call(this) as (config: AxiosRequestConfig) => Promise<unknown>;
  return ((config: AxiosRequestConfig) =>
    config.headers && Object.getPrototypeOf(config.headers) === null
      ? handleRequest({ ...config, headers: { ...config.headers } })
      : handleRequest(config)) as ReturnType<typeof originalAdapter>;
};
