import * as zlib from 'zlib';
import * as fs from 'fs';
import * as recursive from 'recursive-readdir';
import * as crypto from 'crypto';


require('yargs')
    .command('encrypt', 'Encrypt Directory', (yargs) => {
        yargs
            .usage('Usage: $0 encrypt [options] <path-to-directory>')
            .alias('p', 'password')
            .describe('p', 'password')
            .demandOption('password')
            .help();
    }, (argv) => {
        encrypt(argv);
    })
    .command('decrypt', 'Decrypt Directory', (yargs) => {
        yargs
            .usage('Usage: $0 decrypt [options] <path-to-directory>')
            .alias('p', 'password')
            .describe('p', 'password')
            .demandOption('password')
            .help();
    }, (argv) => {
        decrypt(argv);
    })
    .help()
    .argv;


async function encrypt(args) {

    const path = args._[1];

    const filenames: string[] = await getFilenames(path);

    for (const filename of filenames) {
        await compressAndEncryptFile(filename, args.password);
        fs.unlinkSync(filename);
    }
}

async function decrypt(args) {
    const path = args._[1];

    const filenames: string[] = await getFilenames(path);

    for (const filename of filenames) {
        await decryptAndUncompressFile(filename, args.password);
        fs.unlinkSync(filename);
    }
}

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

        const algorithm = 'aes-256-cbc';
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

        const algorithm = 'aes-256-cbc';
        const decrypt = crypto.createDecipher(algorithm, password);

        if (!filename.endsWith(`.gz.${algorithm}`)) {
            resolve(false);
            return;
        }

        const inp = fs.createReadStream(filename);
        const out = fs.createWriteStream(`${filename.substring(0, filename.length - `.gz.${algorithm}`.length)}`);

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
