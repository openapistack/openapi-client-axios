import { ParameterObject } from './types/client';

/**
 * Serializes a query parameter according to OpenAPI 3.0 specification
 *
 * @param param - The parameter definition from OpenAPI spec
 * @param name - The parameter name
 * @param value - The parameter value (can be primitive, array, or object)
 * @returns Array of query string parts (key=value pairs)
 */
export const serializeQueryParameter = (
  param: ParameterObject | undefined,
  name: string,
  value: any,
): string[] => {
  // Get style and explode from parameter definition with defaults
  // Per OpenAPI spec: default style for query is 'form', default explode is true
  const style = param?.style || 'form';
  const explode = param?.explode !== undefined ? param.explode : true;

  // Handle null/undefined values
  if (value === null || value === undefined) {
    return [];
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return serializeArrayParameter(name, value, style, explode);
  }

  // Handle objects
  if (typeof value === 'object') {
    return serializeObjectParameter(name, value, style, explode);
  }

  // Handle primitive values
  return [`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`];
};

/**
 * Serializes an array query parameter
 */
const serializeArrayParameter = (
  name: string,
  value: any[],
  style: string,
  explode: boolean,
): string[] => {
  if (value.length === 0) {
    return [];
  }

  switch (style) {
    case 'form':
      if (explode) {
        // form explode=true: id=3&id=4&id=5
        return value.map((item) => `${encodeURIComponent(name)}=${encodeURIComponent(String(item))}`);
      } else {
        // form explode=false: id=3,4,5
        const encodedValues = value.map((item) => encodeURIComponent(String(item))).join(',');
        return [`${encodeURIComponent(name)}=${encodedValues}`];
      }

    case 'spaceDelimited':
      if (explode) {
        // spaceDelimited with explode=true is not valid per spec, but fallback to form explode=true
        return value.map((item) => `${encodeURIComponent(name)}=${encodeURIComponent(String(item))}`);
      } else {
        // spaceDelimited explode=false: id=3%204%205
        const encodedValues = value.map((item) => encodeURIComponent(String(item))).join('%20');
        return [`${encodeURIComponent(name)}=${encodedValues}`];
      }

    case 'pipeDelimited':
      if (explode) {
        // pipeDelimited with explode=true is not valid per spec, but fallback to form explode=true
        return value.map((item) => `${encodeURIComponent(name)}=${encodeURIComponent(String(item))}`);
      } else {
        // pipeDelimited explode=false: id=3%7C4%7C5
        const encodedValues = value.map((item) => encodeURIComponent(String(item))).join('%7C');
        return [`${encodeURIComponent(name)}=${encodedValues}`];
      }

    default:
      // Default to form explode=true
      return value.map((item) => `${encodeURIComponent(name)}=${encodeURIComponent(String(item))}`);
  }
};

/**
 * Serializes an object query parameter
 */
const serializeObjectParameter = (
  name: string,
  value: Record<string, any>,
  style: string,
  explode: boolean,
): string[] => {
  const keys = Object.keys(value);

  if (keys.length === 0) {
    return [];
  }

  switch (style) {
    case 'deepObject':
      if (explode) {
        // deepObject explode=true: filter[role]=admin&filter[firstName]=Alex
        return keys.map((key) =>
          `${encodeURIComponent(name)}[${encodeURIComponent(key)}]=${encodeURIComponent(String(value[key]))}`
        );
      } else {
        // deepObject with explode=false is not valid per spec, but fallback to form
        const pairs: string[] = [];
        for (const key of keys) {
          pairs.push(encodeURIComponent(key));
          pairs.push(encodeURIComponent(String(value[key])));
        }
        return [`${encodeURIComponent(name)}=${pairs.join(',')}`];
      }

    case 'form':
      if (explode) {
        // form explode=true: role=admin&firstName=Alex (flattened)
        return keys.map((key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value[key]))}`
        );
      } else {
        // form explode=false: filter=role,admin,firstName,Alex
        const pairs: string[] = [];
        for (const key of keys) {
          pairs.push(encodeURIComponent(key));
          pairs.push(encodeURIComponent(String(value[key])));
        }
        return [`${encodeURIComponent(name)}=${pairs.join(',')}`];
      }

    default:
      // Default to form explode=true
      return keys.map((key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value[key]))}`
      );
  }
};
