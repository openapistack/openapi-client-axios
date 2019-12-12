import path from 'path';

import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import replace from '@rollup/plugin-replace';
import analyze from 'rollup-plugin-analyzer';
import ignore from 'rollup-plugin-ignore-import';

import clientBundleFlavors from './rollup.flavors.json';


const TSC_ROOT = path.resolve('./dist_tsc');

// Should a package be included into bundle?
const isExternal = id => !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/');

// Plugins config factory for each output bundle
const plugins = (babelConfig, features) => [
    replace({          
        // Required to replace pieces of code properly
        delimiters: ['', ''],
        
        // Avoid code duplication         
        'lodash.get': 'lodash-es/get',
        'lodash.isequal': 'lodash-es/isEqual',
        'lodash.sortby': 'lodash-es/sortBy',
        
        // Patching node_modules/json-schema-deref-sync
        "const _ = require('lodash')": `
            const _get = require('lodash-es/get');
            const _isNull = require('lodash-es/isNull');
            const _some = require('lodash-es/some');
            const _find = require('lodash-es/find');
            const _isUndefined = require('lodash-es/isUndefined');
            const _defaults = require('lodash-es/defaults');
            const _merge = require('lodash-es/merge');
        `,
        '_.get': '_get',
        '_.isNull': '_isNull',
        '_.some': '_some',
        '_.find': '_find',
        '_.isUndefined': '_isUndefined',
        '_.defaults': '_defaults',
        '_.merge': '_merge',
        
        // Add missing null/undef checks cause app crash when starting `node ./typegen.js`:
        //
        // node_modules\openapi-schemas\lib\index.js
        // node_modules\ono\esm\index.js
        // node_modules\ono\cjs\index.js
        'if (typeof module === "object" && typeof module.exports === "object")':
        'if (typeof module === "object" && typeof module.exports === "object" && module.exports && module.exports.default)',
        
        // Fix import node_modules\Z-Schema
        'core-js/es6/symbol': 'core-js/es/symbol',         
    }),
    babel({
        exclude: /node_modules/,
        babelrc: false,
        ...babelConfig
    }),
    resolve({
        // when the final bundle used in browser, all these built-ins are properly
        // polyfilled by Webpack, so we ignore warnings '(!) Unresolved dependencies'
        preferBuiltins: true,
        
        browser: features.browser,
    }),
    commonjs(),
    json({
        preferConst: true,
        compact: true,
    }),
    ...features.formats ? [ignore({
        exclude: [],  // [] = process node_modules as well
        include: [
            // include here means actually to exclude files from bundle
            
            // Leave out synchronous tools if not needed. node_modules/json-schema-deref-sync             
            // Client.initSync() won't work
            ...features.sync ? [] : ['**/json-schema-deref-sync/**/*.*'],             
            
            ...features.formats.yaml ? [] : ['**/json-schema-ref-parser/lib/parsers/yaml.js'],
            ...features.formats.yaml ? [] : ['**/json-schema-ref-parser/lib/util/yaml.js'],
            ...features.formats.json ? [] : ['**/json-schema-ref-parser/lib/parsers/json.js'],
            
            // Leave out unused schemas             
            ...features.schemas.oapi3 ? [] : ['node_modules/openapi-schema-validation/schema/openapi-3.0.json'],
            ...features.schemas.oapi2 ? [] : [],             
            ...features.schemas.oapi1 ? [] : [],             
            ...features.schemas.swagger ? [] : [],
            
            // JSON files which bloat bundle but seem to do not affect anything.
            // If something breaks wrap it into a feature flag.
            'node_modules/openapi-schemas/schemas/v3.0/schema.json',
            'node_modules/openapi-schemas/schemas/v2.0/schema.json',
            'node_modules/openapi-schemas/schemas/v1.2/*.*',
            'node_modules/swagger-schema-official/schema.json',
            'node_modules/swagger-parser/lib/validators/spec.js',
            
            // Files which bloat bundle
            '**/json-schema-ref-parser/lib/resolvers/file.js',
            '**/json-schema-ref-parser/lib/parsers/binary.js',
            '**/json-schema-ref-parser/lib/parsers/text.js',
            
            // Optional cleanups             
            ... (!features.ignoreValidators)
                ? []
                : features.ignoreValidators.map(name => `node_modules/validator/lib/${name}.js`),
        ],
        
        // body = the replacement for ignored files listed above
        body: 'export default undefined; export const __moduleExports = undefined;'
    })] : [],
    analyze({
        limit: 25,
        summaryOnly: true,
    }),
];
    
const output = (cjsName, esName) => [
    ...(cjsName ? [{
        file: cjsName,
        format: 'cjs',
        sourcemap: true,
    }] : []),
    ...(esName ? [{
        file: esName,
        format: 'es',
        sourcemap: true,
        preferConst: true,
        externalLiveBindings: false,
        freeze: false,
    }] : [])
];

const filterExternalPackages = (id, from) => {
    // console.log('TESTING', id, from);
    const probeId = /lodash-es|^axios$/i;
    const probeFr = /node_modules(\/|\\)(lodash-es|axios)/i;
    const e = isExternal(id) && (probeId.test(id) || probeFr.test(from));
    if (e) {
        console.log('EXTERNAL', id, 'FROM', from);
    }
    return e;
}

export default [
    ...Object.entries(clientBundleFlavors).map(([flavor, features]) => {
        return {
            input: path.join(TSC_ROOT, 'index.js'),
            treeshake: {
                moduleSideEffects: false,
                pureExternalModules: true,  // may slow down compile time x10
                propertyReadSideEffects: false,
                tryCatchDeoptimization: false,
                unknownGlobalSideEffects: false,
            },
            output: output(
                features.cjs ? `dist/client.${flavor}.js`    : null,
                features.es  ? `dist/client.${flavor}.es.js` : null
            ),
            plugins: plugins({ configFile: './.babelrc.browser.js' }, features),
            external: (id, from) => features.externals && filterExternalPackages(id, from),
        }
    }),
    {
        input: path.join(TSC_ROOT, 'typegen', 'typegen.js'),
        treeshake: true,
        output: output('dist/typegen.js'),
        external: (id, from) => {
          // bundle lodash-es so we can run on node
          const e = isExternal(id) && (!(/(lodash-es)/i).test(id) &&
            !/node_modules\/(?!:lodash-es)/.test(from));
          if (e) {
              console.log('EXTERNAL', id, 'FROM', from);
          }
          return e;
        },
        plugins: plugins({ configFile: './.babelrc.node.js' }, {browser: false}),
    },
];
