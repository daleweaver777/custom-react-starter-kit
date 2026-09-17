import { createHmac } from 'node:crypto';

// RFC 6238 SHA-1, six digits, 30-second step. The secret comes only from the UI.
export function authenticationCode(secret: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits = secret
        .toUpperCase()
        .replace(/=+$/, '')
        .split('')
        .map((character) => {
            const value = alphabet.indexOf(character);
            if (value < 0) throw new Error('Invalid authenticator setup key.');
            return value.toString(2).padStart(5, '0');
        })
        .join('');
    const key = Buffer.from(
        Array.from({ length: Math.floor(bits.length / 8) }, (_, index) =>
            Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2),
        ),
    );
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
    const digest = createHmac('sha1', key).update(counter).digest();
    const offset = digest[digest.length - 1] & 15;
    return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000)
        .toString()
        .padStart(6, '0');
}
