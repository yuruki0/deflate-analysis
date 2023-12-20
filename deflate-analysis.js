// import { open } from 'node:fs/promises';

import { createBitReader } from './util/read.js';
import { generateDynamicHuffmanCodes } from './util/zlib.js';

const FILESTART = 19;
const FILENAME = process.argv.length > 2 ?
    process.argv[2] :
    './raw-deflate';

(async () => {
    let bits = await createBitReader(FILENAME);
    bits.read(FILESTART);
    let codes = generateDynamicHuffmanCodes(bits.next);
    console.log(codes);
})();


