declare module '@apidevtools/json-schema-ref-parser/lib/dereference' {
  import $RefParserOptions from '@apidevtools/json-schema-ref-parser/lib/options';
  import RefParser from '@apidevtools/json-schema-ref-parser';

  export default function dereference(api: RefParser, options: $RefParserOptions): string;
}

declare module '@apidevtools/json-schema-ref-parser/lib/options' {
  import { Options } from '@apidevtools/json-schema-ref-parser/lib';

  type OptionsRequired = { [K in keyof Options]-?: Options[K] };

  interface $RefParserOptions extends OptionsRequired {}
  class $RefParserOptions {
    constructor(options: object | Options);
  }

  export = $RefParserOptions;
}
