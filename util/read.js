// This script provides a class with functions for reading raw bits from a file

import { open } from 'node:fs/promises';

import { parseReverseBits } from './bitmath.js';

export class BitReader {
    #bytes;
    #readable = false;
    #currentByte = [];
    #readCount = 0;
    constructor(bytes) {
        this.#bytes = bytes;
        this.#readable = true;

        this.read = this.#read;
        this.parseNumber = this.#parseNumber;
        this.getBitsReadCount = () => this.#readCount;
        this.next = () => this.read()[0];

        bytes.once('end', () => {
            this.#readable = false;
        });
    }
    #getByte() {
        if (!this.#readable) throw new Error('No more bytes to be read from' +
            this.#bytes.path);
        let byteInt = this.#bytes.read(1).readUInt8();
        let newBitArray = [];
        while (newBitArray.length < 8) {
            newBitArray.push(byteInt & 0b01);
            byteInt = byteInt >>> 1;
        }
        this.#currentByte = newBitArray;
    }
    #read(n) {
        if (n !== undefined) {
            if (!Number.isInteger(n)) throw new Error('Cannot read \'' +
                JSON.stringify(n) + '\' bits: not an integer');
            let bits = [];
            while (bits.length < n) bits.push(this.read()[0]);
            return bits;
        }
        if (this.#currentByte.length == 0) this.#getByte();
        this.#readCount++;
        return [this.#currentByte.shift()];
    }
    #parseNumber(len) {
        if (!Number.isInteger(len) || len < 1) throw new Error(
            'Cannot parse \'' + JSON.stringify(n) + '\' bits: must be an ' +
            'integer greater than 0');
        let bits = this.read(len);
        return parseReverseBits(bits);
    }
}

export const createBitReader = async (file) => {
    let fileHandler = await open(file);   
    let rs = fileHandler.createReadStream();
    await new Promise(res => rs.once('readable', () => res() ));

    let br = new BitReader(rs);

    br.close = () => {
        rs.destroy();
        fileHandler.close();
    }

    return br;
}

