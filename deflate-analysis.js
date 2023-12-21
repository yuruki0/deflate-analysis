// import { open } from 'node:fs/promises';

import { createBitReader, readJSONFromFile } from './util/read.js';
import { generateDynamicHuffmanCodes } from './util/zlib.js';
import { parseDataCode } from './util/data_analysis.js';

const FILESTART = 19;
const FILENAME = process.argv.length > 2 ?
    process.argv[2] :
    './raw-deflate';
const DEFLATE_CODES_FILENAME = './util/deflate-codes.json';
const WIDTH = 2448;
const HEIGHT = 1240;

(async () => {
    let bits = await createBitReader(FILENAME);
    bits.read(FILESTART);
    let codes = generateDynamicHuffmanCodes(bits.next);
    console.log(codes);
    let lenDistKey = await (readJSONFromFile(DEFLATE_CODES_FILENAME));

    const expectedBytes = HEIGHT * ((WIDTH * 3) + 1);
    let i = 0;
    let bytesCreated = 0;
    let code;
    do {
        let addressLog = "At address " +
            Math.floor(bits.getBitsReadCount() / 8).toString(16).toUpperCase() +
            " (+ " +
            JSON.stringify(bits.getBitsReadCount() % 8) +
            " bits)";
        code = parseDataCode(codes, bits.next, lenDistKey);
        if (code.type == 'literal') bytesCreated++;
        else if (code.type == 'repeat') bytesCreated += code.length;

        if (code.type == 'literal') {
            console.log(addressLog);
            console.log(code);
        }

        i++;
    } while (code.type !== 'end');
    // } while (i < 20);

    console.log('Deflate will create ' + bytesCreated + ' bytes.');
    console.log('(' +
        (bytesCreated / ((WIDTH * 3) + 1) * 3).toString() +
        ' pixels)'
    );
    console.log('Expected ' + expectedBytes + ' bytes.');
    console.log('(' + WIDTH*HEIGHT + ' pixels)');

    bits.close();
})();


