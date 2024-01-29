import { OpenAPIClientAxios } from './client';
export default OpenAPIClientAxios;
export * from './client';
export * from './types/client';

// re-export axios types
export type { Axios, AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
