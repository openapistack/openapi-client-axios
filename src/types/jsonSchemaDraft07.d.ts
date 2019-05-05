declare namespace JsonSchemaOrg {
  namespace Draft07 {
    export type SchemaObject = {
      $id?: string; // uri-reference
      $schema?: string; // uri
      $ref?: string; // uri-reference
      $comment?: string;
      title?: string;
      description?: string;
      default?: any;
      nullable?: boolean;
      readOnly?: boolean;
      examples?: any[];
      multipleOf?: number;
      maximum?: number;
      exclusiveMaximum?: number;
      minimum?: number;
      exclusiveMinimum?: number;
      maxLength?: Schema.Definitions.NonNegativeInteger;
      minLength?: Schema.Definitions.NonNegativeIntegerDefault0;
      pattern?: string; // regex
      additionalItems?: Schema;
      items?: Schema | Schema.Definitions.SchemaArray;
      maxItems?: Schema.Definitions.NonNegativeInteger;
      minItems?: Schema.Definitions.NonNegativeIntegerDefault0;
      uniqueItems?: boolean;
      contains?: Schema;
      maxProperties?: Schema.Definitions.NonNegativeInteger;
      minProperties?: Schema.Definitions.NonNegativeIntegerDefault0;
      required?: Schema.Definitions.StringArray;
      additionalProperties?: Schema;
      definitions?: {
        [name: string]: Schema;
      };
      properties?: {
        [name: string]: Schema;
      };
      patternProperties?: {
        [name: string]: Schema;
      };
      dependencies?: {
        [name: string]: Schema | Schema.Definitions.StringArray;
      };
      propertyNames?: Schema;
      const?: any;
      enum?: any[];
      type?: Schema.Definitions.SimpleTypes | Schema.Definitions.SimpleTypes[];
      format?: string;
      contentMediaType?: string;
      contentEncoding?: string;
      if?: Schema;
      then?: Schema;
      else?: Schema;
      allOf?: Schema.Definitions.SchemaArray;
      anyOf?: Schema.Definitions.SchemaArray;
      oneOf?: Schema.Definitions.SchemaArray;
      not?: Schema;
    };
    export type Schema = SchemaObject | boolean;
    namespace Schema {
      namespace Definitions {
        export type NonNegativeInteger = number;
        export type NonNegativeIntegerDefault0 = number;
        export type SchemaArray = Schema[];
        export type SimpleTypes =
          | 'array'
          | 'boolean'
          | 'integer'
          | 'null'
          | 'number'
          | 'object'
          | 'string'
          | 'any'
          | 'undefined';
        export type StringArray = string[];
      }
    }
  }
}
