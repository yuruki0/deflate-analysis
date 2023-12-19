const { open } = require('node:fs/promises');

(async () => {
    const file = await open('./raw-deflate.xxd');
    const out = await open('./raw-deflate.reversebits.xxd', 'w');
    const outStream = out.createWriteStream();
    let buf;
    let min;
    let i;
    for await (const line of file.readLines()) {
        console.log(line);
        buf = line;
        const bytes = buf.split(' ');
        min = bytes.length >= 18 ? 17 : bytes.length - 1
        for (i = 1; i < min; i++) {
            outStream.write(bytes[i].split('').reverse().join(''));
        }
    }
})();
