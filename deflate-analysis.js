// This script is made with the sole purpose of analyzing the dynamic Huffman
// code of a DEFLATE-compressed file.

const { open } = require('node:fs/promises');

const FILESTART = 19;


// Util functions
// Reverse a string
const rev = (s) => { return s.split('').reverse().join(''); };
// Reverse and parse a binary number string
const revParse = (s) => { return parseInt(rev(s), 2) };
// Announce values being set
let vals = {};
const get = (i) => { return vals[i] };
const set = (i, val) => {
    console.log(i + ": " + JSON.stringify(val));
    vals[i] = val;
};

// Takes a list of a ordered values and another list of their respective
// bit lengths, and generates a tree of codes that navigate to their values
//
// Algorithm adapted from the RFC 1951 specification document
// https://www.rfc-editor.org/rfc/rfc1951
const generateHuffmanCodes = (vals, lens) => {
    let tree = [[], []];

    const maxBits = lens.reduce((a, b) => Math.max(a, b), -1);

    // 1. Count codes for each code length
    let lenCounts = [0];
    for (let i = 1; i <= maxBits; i++) {
        let count = lens.reduce((acc, val) => val == i ? acc + 1 : acc, 0);
        lenCounts.push(count);
    }

    // 2. Get smallest codes for each code length
    let minCodes = [0];
    code = 0; 
    for (let bits = 1; bits <= maxBits; bits++) {
        code = (code + lenCounts[bits - 1]) * 2;
        minCodes.push(code);
    }

    // 3. Generate tree of codes
    
    // Util function for converting an integer into a binary code in array form
    const parseCode = (num, len) => {
        let code = [];
        let tmp = num;
        for (let bit = len; bit > 0; bit--) {
            let magnitude = 2**(bit - 1);
            code.push(tmp >= magnitude ? 1 : 0);
            tmp -= tmp >= magnitude ? magnitude : 0;
        }
        return code;
    }

    // Util function for navigating the tree and setting a code to a value
    const setValue = (nav, val) => {
        let current = tree;
        let bit = 0;
        while (bit < nav.length - 1) {
            while (current[nav[bit]].length < 2) current[nav[bit]].push([]);
            current = current[nav[bit]];
            bit++;
        }
        current[nav[bit]] = val;
    }

    for (let len = 1; len < lenCounts.length; len++) {
        let code = minCodes[len];
        for (let i = 0; i < vals.length; i++) {
            if (lens[i] == len) {
                let nav = parseCode(code, len);
                setValue(nav, vals[i]);
                code++;
            }
        }
    }

    return tree;

};


(async () => {
    const bitsFile = await open('./raw-deflate.reversebits.xxd');
    const bits = bitsFile.createReadStream({'encoding': 'utf8', 'start': FILESTART});

    await new Promise(res => bits.once('readable', () => res() ));

    const parseBits = (i) => { return revParse(bits.read(i)); };
    
    set('HLIT', parseBits(5));
    set('HDIST', parseBits(5));
    set('HCLEN', parseBits(4));

    const clOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

    // Index is code length code in alphabet, value is that code length's code length T_T
    vals.clLengths = [];
    vals.cl = [];

    for (let i = 0; i < 19; i++) {
        get('clLengths').push(0);
        get('cl').push(i);
    }

    for (let i = 0; i < get('HCLEN') + 4; i++) {
        get('clLengths')[clOrder[i]] = parseBits(3);
    }

    set('clLengths', get('clLengths'));
    set('cl', get('cl'));
    set('clCodes', generateHuffmanCodes(get('cl'), get('clLengths')));

    // Read literal lengths
    let litLengths = [];
    let lit = [];
    while (litLengths.length < 285) {
        let code = get('clCodes');
        while (Array.isArray(code)) {
            code = code[parseBits(1)];
        }
        if (code < 16) {
            litLengths.push(code);
        } else if (code == 16) {
            let repeat = parseBits(2);
            let lastLitLength = litLengths[litLengths.length - 1];
            for (let i = 0; i < repeat + 3; i++)
                litLengths.push(lastLitLength);
        } else if (code == 17) {
            let repeat = parseBits(3);
            for (let i = 0; i < repeat + 3; i++) {
                litLengths.push(lastLit
            }
        }
    }
    console.log("Generated " + litLengths.length + "literal/length code lengths");

})();
