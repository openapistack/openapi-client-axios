declare namespace JsonSchemaOrg {
    namespace Draft04 {
        /**
         * Core schema meta-schema
         */
        export interface Schema {
            id?: string; // uri
            $schema?: string; // uri
            $ref?: string; // uri
            title?: string;
            description?: string;
            example?: string;
            default?: any;
            nullable?: boolean;
            multipleOf?: number;
            maximum?: number;
            exclusiveMaximum?: boolean;
            minimum?: number;
            exclusiveMinimum?: boolean;
            maxLength?: Schema.Definitions.PositiveInteger;
            minLength?: Schema.Definitions.PositiveIntegerDefault0;
            pattern?: string; // regex
            additionalItems?: boolean | Schema;
            items?: Schema | Schema.Definitions.SchemaArray;
            maxItems?: Schema.Definitions.PositiveInteger;
            minItems?: Schema.Definitions.PositiveIntegerDefault0;
            uniqueItems?: boolean;
            maxProperties?: Schema.Definitions.PositiveInteger;
            minProperties?: Schema.Definitions.PositiveIntegerDefault0;
            required?: Schema.Definitions.StringArray;
            additionalProperties?: boolean | Schema;
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
            enum?: any[];
            type?: Schema.Definitions.SimpleTypes | Schema.Definitions.SimpleTypes[];
            format?: string;
            allOf?: Schema.Definitions.SchemaArray;
            anyOf?: Schema.Definitions.SchemaArray;
            oneOf?: Schema.Definitions.SchemaArray;
            not?: Schema;
        }
        namespace Schema {
            namespace Definitions {
                export type PositiveInteger = number;
                export type PositiveIntegerDefault0 = number;
                export type SchemaArray = Schema[];
                export type SimpleTypes = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string" | "any" | "undefined";
                export type StringArray = string[];
            }
            namespace Properties {
                export type Default = any;
                export type Description = string;
                export type Enum = any[];
                export type ExclusiveMaximum = boolean;
                export type ExclusiveMinimum = boolean;
                export type MaxItems = Definitions.PositiveInteger;
                export type MaxLength = Definitions.PositiveInteger;
                export type MaxProperties = Definitions.PositiveInteger;
                export type Maximum = number;
                export type MinItems = Definitions.PositiveIntegerDefault0;
                export type MinLength = Definitions.PositiveIntegerDefault0;
                export type MinProperties = Definitions.PositiveIntegerDefault0;
                export type Minimum = number;
                export type MultipleOf = number;
                export type Pattern = string; // regex
                export type Required = Definitions.StringArray;
                export type Title = string;
                export type Type = Definitions.SimpleTypes | Definitions.SimpleTypes[];
                export type UniqueItems = boolean;
            }
        }
    }
}
