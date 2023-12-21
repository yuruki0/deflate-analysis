import { open } from 'node:fs/promises';

if (process.argv.length <= 2) {
    console.log('Please specify a file.');
    exit();
}

(async () => {
    const FILENAME = process.argv[2];
    
    let inputFile = await open(FILENAME);
    let output = await open(FILENAME + ".xxd", 'w');
    
    let input = inputFile.createReadStream({ encoding: 'utf8' });
    
    console.log('created');
    
    await new Promise(res => input.once('readable', () => res() ));
    
    console.log('ready');
    
    let byte = input.read(8);
    let nextByte;
    let byteHex = Buffer.alloc(1);
    for (nextByte = input.read(8);
            nextByte !== null;
            nextByte = input.read(8)) {
        byteHex.writeUInt8(parseInt(byte, 2));
        process.stdout.write(byteHex.readUInt8().toString(16));
        await output.write(byteHex);
        byte = nextByte;
    }
    byteHex.writeUInt8(parseInt(byte, 2));
    process.stdout.write(byteHex);

    await output.write(byteHex)

    input.close();
    output.close();
})();
