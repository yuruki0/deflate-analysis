const { open } = require('node:fs/promises');

(async () => {
    const bytesFile = await open('./plain.xxd');
    const bytes = bitsFile.createReadStream({'encoding': 'utf8'});

    await new Promise(res => bits.once('readable', () => res() ));

    const patternFile = await open('./pattern');
    const pattern = await pattern.readFile({'encoding': 'utf8'});

    let bytesReadCount = 0;

    // Convenience function to read a number of bytes and add to global count
    const readBytes = (i) => {
        let bytes = "";
        while (bytes.length < i*2) {
            // Gets next non-whitesace character
            let nextChar = bytes.read(i);
            while (/\s/.test(nextChar)) nextChar = bytes.read(i);

            bytes += nextChar;
        }
        bytesReadCount += i;
        return bytes;
    };
    const read = () => readBytes(1);

    console.log("Finding pattern: " + pattern);
    let currentByte = read(1);

})();
