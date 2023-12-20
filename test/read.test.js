import { open } from 'node:fs/promises';
import { createBitReader } from '../util/read.js';

const testString = "Hello world.";
const file = await open('read.test.txt', 'w');
file.write(testString);
await file.close();

const br = await createBitReader('./read.test.txt');

let bytesRead = "";
for (let i = 0; i < testString.length; i++) {
    let x = br.parseNumber(8);
    let char = String.fromCharCode(x);
    console.log(x + ': ' + char);
    bytesRead += char;
}

console.log('Finished copying and reading bytes.');
console.log('Read ' + br.getBitsReadCount() / 8 + ' bytes.');
if (bytesRead == testString)
    console.log('Test completed successfully.');
else {
    console.log('Test failed!');
    console.log('Test string \"' + testString + '\" was not equal to ' +
        'the string from the bytes read: \"' + bytesRead + '\"');
}

br.close();
