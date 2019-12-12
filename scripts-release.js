const fs = require('fs');
const path = require('path');

const copy = ([srcChunks, dstChunks]) => {     
    const [src, dst] = [srcChunks, dstChunks].map(c => path.resolve(...c));
    process.stdout.write(`${src} -> ${dst} ... `);
    fs.copyFileSync(path.join(src), path.join(dst));
    process.stdout.write('ok.\n');
};

const install = [
    [ ['dist', 'typegen.min.js'], ['typegen', 'typegen.min.js'] ],
    [ ['dist', 'typegen.js'], ['typegen', 'typegen.js'] ],
    [ ['dist', 'typegen.js.map'], ['typegen', 'typegen.js.map'] ],
    [ ['dist_tsc', 'typegen', 'typegen.d.ts'], ['typegen', 'typegen.d.ts'] ],
];

install.forEach(copy);
