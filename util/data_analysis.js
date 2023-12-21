// This script provides a function to parse a code as a compression instruction

import { parseCode } from './zlib.js';
import { parseNextBits } from './bitmath.js';

const DEFLATE_CODES_PATH = './deflate-codes.json';

// Parse a single code from a bit stream
// next() should return 0 or 1, and should be the next bit in the stream
export const parseDataCode = (codes, next, keys) => {
    let code = parseCode(codes.literals.codes, next);
    if (code < 256)
        return {
            type: "literal",
            value: code,
            code: codes.literals.alphabet[code]
        };
    else if (code == 256)
        return {
            type: "end",
            value: code,
            code: codes.literals.alphabet[code]
        };
    else {
        let lengthKey = keys.lengths[code];
        let length = parseNextBits(lengthKey[0], next) + lengthKey[1];
        let distanceCode = parseCode(codes.distances.codes, next);
        let distKey = keys.distances[distanceCode];
        let distance = parseNextBits(distKey[0], next) + distKey[1];
        return {
            type: "repeat",
            value: code,
            code: codes.literals.alphabet[code],
            length,
            distance,
            distanceCode: codes.distances.alphabet[distanceCode],
            distanceCodeValue: distanceCode
            
        };
    }
}
