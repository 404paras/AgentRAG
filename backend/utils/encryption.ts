import crypto from 'crypto';

// Use a secret key for encryption - should be in .env
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_SECRET || 'default-encryption-key-32-chars!';
const IV_LENGTH = 16; // For AES, this is always 16
const ALGORITHM = 'aes-256-cbc';

// Ensure key is exactly 32 bytes for AES-256
const getKey = (): Buffer => {
    const key = ENCRYPTION_KEY;
    if (key.length < 32) {
        return Buffer.from(key.padEnd(32, '0'));
    }
    return Buffer.from(key.slice(0, 32));
};

/**
 * Encrypts a plain text string
 * @param text - The plain text to encrypt
 * @returns Encrypted string in format: iv:encrypted
 */
export const encrypt = (text: string): string => {
    if (!text) return '';
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return iv and encrypted data combined
    return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts an encrypted string
 * @param encryptedText - The encrypted string in format: iv:encrypted
 * @returns Decrypted plain text
 */
export const decrypt = (encryptedText: string): string => {
    if (!encryptedText) return '';
    
    try {
        const [ivHex, encrypted] = encryptedText.split(':');
        
        if (!ivHex || !encrypted) {
            throw new Error('Invalid encrypted format');
        }
        
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return '';
    }
};

/**
 * Masks an API key for display (shows only last 4 characters)
 * @param key - The full API key
 * @returns Masked key like "****...abcd"
 */
export const maskApiKey = (key: string): string => {
    if (!key || key.length < 8) return '••••••••';
    return `••••••••${key.slice(-4)}`;
};