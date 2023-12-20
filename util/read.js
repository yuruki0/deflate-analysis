// This script provides a class with functions for reading raw bits from a file

import { open } from 'node:fs/promises';

export class BitReader {
    #bytes;
    #readable = false;
    #currentByte = [];
    constructor(bytes) {
        this.#bytes = bytes;
        this.#readable = true;

        this.read = this.#read;
        this.parseNumber = this.#parseNumber;

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
            while (bits.length < n) bits.push(this.read());
            return bits;
        }
        if (this.#currentByte.length == 0) this.#getByte();
        return [this.#currentByte.shift()];
    }
    #parseNumber(len) {
        if (!Number.isInteger(len) || len < 1) throw new Error(
            'Cannot parse \'' + JSON.stringify(n) + '\' bits: must be an ' +
            'integer greater than 0');
        let bits = this.read(len);
        let num = 0;
        for (let i = 0; i < len; i++) {
            num += bits[i] << i
        }
        return num;
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

