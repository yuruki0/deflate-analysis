import { open } from 'node:fs/promises';

if (process.argv.length <= 2) {
    console.log('Please specify a file.');
    exit();
}

(async () => {
    const FILENAME = process.argv[2];
    
    let input = await open(FILENAME);
    let output = await open(FILENAME + ".bs", 'w');

    while (input.isReadable()) {
        await output.write(input.read()[0].toString(), 'utf8');
    }

    input.close();
    output.close();
})();
