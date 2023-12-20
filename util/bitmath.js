// This script provides utility functions for dealing with bit math

// Parses an array of bits into an integer, with lower-order bits first
export const parseReverseBits = (bits) => {
    if (!Array.isArray(bits)) throw new Error('Calls to parseReverseBits ' +
        'must be an array of integers either 0 or 1');
    let num = 0;
    for (let i = 0; i < bits.length; i++) {
        if (bits[i] !== 0 && bits[i] !== 1) throw new Error('Invalid bit ' +
            JSON.stringify(bits[i]));
        num += bits[i] << i
    }
    return num;
};

// Creates a function that will parse a number of bits from a next() function
export const nextBitsGenerator = (next) => {
    return (n) => {
        let bits = [];
        for (; n > 0; n--) bits.push(next());
        return parseReverseBits(bits);
    };
}
