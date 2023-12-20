// This script provides utility functions for zlib and DEFLATE compression

import { open } from 'node:fs/promises';

import { nextBitsGenerator } from './bitmath.js';

const CL_ORDER =
    [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

// Takes a list of a ordered values and another list of their respective
// bit lengths, and generates a tree of codes that navigate to their values
//
// Algorithm adapted from the RFC 1951 specification document
// https://www.rfc-editor.org/rfc/rfc1951
export const generateHuffmanCodes = (vals, lens) => {
    let tree = [[], []];
    let codes = {};

    const maxBits = lens.reduce((a, b) => Math.max(a, b), -1);

    // 1. Count codes for each code length
    let lenCounts = [0];
    for (let i = 1; i <= maxBits; i++) {
        let count = lens.reduce((acc, val) => val == i ? acc + 1 : acc, 0);
        lenCounts.push(count);
    }

    // 2. Get smallest codes for each code length
    let minCodes = [0];
    let code = 0; 
    for (let bits = 1; bits <= maxBits; bits++) {
        code = (code + lenCounts[bits - 1]) * 2;
        minCodes.push(code);
    }

    // 3. Generate tree of codes
    
    // Util function for converting an integer into a binary code in array form
    const parseCode = (num, len) => {
        let code = [];
        for (let i = 0; i < len; i++) {
            code.push((num >>> i) & 1);
        }
        return code.reverse();
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
                codes[vals[i]] = nav.reduce(
                    (acc, cur) => acc + JSON.stringify(cur),
                    "");
                setValue(nav, vals[i]);
                code++;
            }
        }
    }

    return {tree, codes};
};


// Parse a code from a stream of bits.
// next() is expected to return 0 or 1
// Returns the associated value of the code according to the codes tree
export const parseCode = (codes, next) => {
    let code = codes;
    while (Array.isArray(code)) code = code[next()];
    return code;
};

// Parse dynamically generated Huffman codes.
// next() is expected to return 0 or 1
// Returns an object containing trees for the length codes,
// length/literal alphabet, and the distance alphabet.
export const generateDynamicHuffmanCodes = (next) => {
    // Convenience function to retrieve machine integer from next n bits
    const nextBits = nextBitsGenerator(next);
    let obj = {
        HLIT: nextBits(5),
        HDIST: nextBits(5),
        HCLEN: nextBits(4)
    };

    // Code lengths
    obj.cl = {
        lengths: []
    };
    let cl = [];
    for (let i = 0; i < 19; i++) {
        obj.cl.lengths.push(0);
        cl.push(i);
    }
    for (let i = 0; i < obj.HCLEN + 4; i++) {
        obj.cl.lengths[CL_ORDER[i]] = nextBits(3);
    }
    let clCodes = generateHuffmanCodes(cl, obj.cl.lengths);
    obj.cl.codes = clCodes.tree;
    obj.cl.alphabet = clCodes.codes;

    // Utility function to read a number of distance codes and generate
    // an alphabet + Huffman codes
    const genAlphabet = (n) => {
        let keys = [];
        for (let i = 0; i < n; i++) keys.push(i);
        let newAlphabet = {
            lengths: readLengthCodes(n, obj.cl.codes, next)
        };
        let codes = generateHuffmanCodes(keys, newAlphabet.lengths);
        newAlphabet.codes = codes.tree;
        newAlphabet.alphabet = codes.codes;
        return newAlphabet;
    }

    // Use code lengths to read literal/length alphabet
    obj.literals = genAlphabet(obj.HLIT + 257);
    obj.distances = genAlphabet(obj.HDIST + 1);

    return obj;
}

// Read a number of Huffman code lengths using the provided length codes
// next() is expected to return 0 or 1
export const readLengthCodes = (n, codes, next) => {
    const nextBits = nextBitsGenerator(next);
    let lengths = [];
    while (lengths.length < n) {
        let code = parseCode(codes, next);

        if (code < 16) lengths.push(code);
        else if (code == 16) {
            let repeat = nextBits(2);
            let lastLitLength = lengths[lengths.length - 1];
            for (let i = 0; i < repeat + 3; i++)
                lengths.push(lastLitLength);
        } else if (code == 17) {
            let repeat = nextBits(3);
            for (let i = 0; i < repeat + 3; i++)
                lengths.push(0);
        } else {
            let repeat = nextBits(7);
            for (let i = 0; i < repeat + 11; i++)
                lengths.push(0);
        }
    }
    return lengths;
};
