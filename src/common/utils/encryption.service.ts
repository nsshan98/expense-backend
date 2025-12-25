import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-ctr';
    private readonly key: Buffer;

    constructor(private configService: ConfigService) {
        const keyHex = this.configService.get<string>('DATA_ENCRYPTION_KEY');
        if (!keyHex) {
            throw new Error('DATA_ENCRYPTION_KEY is not defined');
        }
        this.key = Buffer.from(keyHex, 'hex');
    }

    async encrypt(text: string): Promise<string> {
        const iv = randomBytes(16);
        const cipher = createCipheriv(this.algorithm, this.key, iv);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

        // Return IV + Encrypted data as hex string
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    }

    async decrypt(hash: string): Promise<string> {
        const [ivHex, encryptedHex] = hash.split(':');
        if (!ivHex || !encryptedHex) {
            throw new Error('Invalid hash format');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');

        const decipher = createDecipheriv(this.algorithm, this.key, iv);
        const decrypted = Buffer.concat([
            decipher.update(encryptedText),
            decipher.final(),
        ]);

        return decrypted.toString();
    }
}
