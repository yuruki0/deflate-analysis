import { open } from 'node:fs/promises';

const FILESTART = 19;


// Util functions

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
                console.log("Code " + vals[i] + " = " + JSON.stringify(nav));
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

    let bitsReadCount = FILESTART;
    const read = (i) => { bitsReadCount += i; return bits.read(i); };
    const parseBits = (i) => { return revParse(read(i)); };
    
    let HLIT = announce('HLIT', parseBits(5));
    let HDIST = announce('HDIST', parseBits(5));
    let HCLEN = announce('HCLEN', parseBits(4));

    const clOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

    // Index is code length code in alphabet, value is that code length's code length T_T
    let clLengths = [];
    let cl = [];

    for (let i = 0; i < 19; i++) {
        clLengths.push(0);
        cl.push(i);
    }

    for (let i = 0; i < HCLEN + 4; i++) {
        clLengths[clOrder[i]] = parseBits(3);
    }

    announce('clLengths', clLengths);
    announce('cl', cl);
    let clCodes = announce('clCodes', generateHuffmanCodes(cl, clLengths));

    // Utility function for reading lengths using length codes
    const readLengths = (count) => {
        let litLengths = [];
        let lit = [-1];
        while (litLengths.length < count) {
            let code = clCodes;
            while (Array.isArray(code)) {
                code = code[parseBits(1)];
            }
            if (code < 16) {
                litLengths.push(code);
                lit.push(lit[lit.length - 1] + 1);
            } else if (code == 16) {
                let repeat = parseBits(2);
                let lastLitLength = litLengths[litLengths.length - 1];
                for (let i = 0; i < repeat + 3; i++) {
                    litLengths.push(lastLitLength);
                    lit.push(lit[lit.length - 1] + 1);
                }
            } else if (code == 17) {
                let repeat = parseBits(3);
                for (let i = 0; i < repeat + 3; i++) {
                    litLengths.push(0);
                    lit.push(lit[lit.length - 1] + 1);
                }
            } else {
                let repeat = parseBits(7);
                for (let i = 0; i < repeat + 11; i++) {
                    litLengths.push(0);
                    lit.push(lit[lit.length - 1] + 1);
                }
            }
        }
        lit.shift();
        return {lit, litLengths};
    };

    console.log();
    let litRead = readLengths(HLIT + 257);
    let litLengths = announce('litLengths', litRead.litLengths);
    let lit = announce('lit', litRead.lit);
    let litCodes = announce('litCodes', generateHuffmanCodes(lit, litLengths));
    console.log("\nExpected " + JSON.stringify(HLIT + 257) + " literal/length code lengths");
    console.log("Generated " + litLengths.length + " literal/length code lengths\n");

    let distRead = readLengths(HDIST + 1);
    let distLengths = announce('distLengths', distRead.litLengths);
    let dist = announce('dist', distRead.lit);
    let distCodes = announce('distCodes', generateHuffmanCodes(dist, distLengths));
    console.log("Expected " + JSON.stringify(HDIST + 1) + " distance code lengths");
    console.log("Generated " + distLengths.length + " distance code lengths\n");

    console.log("Now reading codes until a non-literal code is found.");

    let code = 0;
    let bitsRead = "";
    while (code < 256) {
        let currentCode = litCodes;
        while (Array.isArray(currentCode)) {
            let bit = read(1);
            currentCode = currentCode[revParse(bit)];
            bitsRead += bit;
        }
        console.log("Code " + currentCode);
        code = currentCode;
    }
    console.log("Stopped: found non-literal code.");
    console.log("Currently at hex address " + Math.floor(bitsReadCount / 8).toString(16) +
        " (+ " + bitsReadCount%8 + " bits) (bit address " + bitsReadCount + ")");
    console.log("Printing read bytes.");
    console.log(bitsRead);

    const printNextBits = (i) => {
        console.log("Printing next " + JSON.stringify(i) + " bits.");
        console.log("Currently at hex address " + Math.floor(bitsReadCount / 8).toString(16) +
            " (+ " + bitsReadCount%8 + " bits) (bit address " + bitsReadCount + ")");
        console.log(read(i));
    }
    printNextBits(64 - 9 + 8);
    printNextBits(80);
    printNextBits(80);
    printNextBits(80);
    if (code == 285) {
    }

})();
