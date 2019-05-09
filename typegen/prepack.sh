#!/bin/sh

sed -i -e 's/require("..\/")/require("openapi-client-axios")/g' ./typegen.js
sed -i -e "s/from '..\/'/from 'openapi-client-axios'/g" ./typegen.d.ts
