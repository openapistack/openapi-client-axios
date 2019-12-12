const fs = require('fs');
const path = require('path');

const copy = ([srcChunks, dstChunks]) => {     
    const [src, dst] = [srcChunks, dstChunks].map(c => path.resolve(...c));
    process.stdout.write(`${src} -> ${dst} ... `);
    fs.copyFile(path.join(src), path.join(dst), (err) => {
        if (err) throw err;
        console.info('done.');
    });
};

const install = [
    [ ['dist', 'typegen.min.js'], ['typegen', 'typegen.js'] ],
];

install.forEach(copy);
