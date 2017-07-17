import * as zlib from 'zlib';
import * as co from 'co';
import * as fs from 'fs';
import * as recursive from 'recursive-readdir';
import * as crypto from 'crypto';

const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .alias('p', 'path')
    .describe('path', 'path to directory')
    .demandOption('path')
    .alias('a', 'password')
    .describe('a', 'password')
    .demandOption('password')
    .alias('t', 'type')
    .describe('t', 'encrypt or decrypt')
    .demandOption('type')
    .argv;


co(function* () {

    const path = argv.path;

    const filenames: string[] = yield getFilenames(path);

    for (const filename of filenames) {
        console.log(filename);

        if (argv.type === 'encrypt') {
            yield compressAndEncryptFile(filename, argv.password);
        }else if (argv.type === 'decrypt') {
            yield decryptAndUncompressFile(filename, argv.password);
        }else {
            throw new Error('Invalid type');
        }
    }
});

function getFilenames(path: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        recursive(path, (err: Error, files: string[]) => {
            resolve(files);
        });
    });
}

function compressAndEncryptFile(filename: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {

        const gzip = zlib.createGzip();

        const algorithm = 'aes-256-ctr';
        const encrypt = crypto.createCipher(algorithm, password);

        const inp = fs.createReadStream(filename);
        const out = fs.createWriteStream(`${filename}.gz.${algorithm}`);

        inp.pipe(gzip).pipe(encrypt).pipe(out);

        out.on('finish', () => {
            inp.close();
            inp.destroy();
            out.close();
            out.destroy();
            resolve(true);
        });
    });
}

function decryptAndUncompressFile(filename: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {

        const gunzip = zlib.createGunzip();

        const algorithm = 'aes-256-ctr';
        const decrypt = crypto.createDecipher(algorithm, password);

        const inp = fs.createReadStream(filename);
        const out = fs.createWriteStream(`${filename.replace(`.gz.${algorithm}`, '')}`);
        
        inp.pipe(decrypt).pipe(gunzip).pipe(out);

        out.on('finish', () => {
            inp.close();
            inp.destroy();
            out.close();
            out.destroy();
            resolve(true);
        });
    });
}
