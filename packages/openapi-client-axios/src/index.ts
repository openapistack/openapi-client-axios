import { OpenAPIClientAxios } from './client';
export default OpenAPIClientAxios;
export * from './client';
export * from './types/client';

// re-export axios types and utilities
export type { Axios, AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
