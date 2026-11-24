import crypto from "crypto";
import "../config/env.js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 256 bits (32 bytes)
const IV_LENGTH = 16; // For AES, this is always 16

if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
  console.error("CRITICAL: Invalid ENCRYPTION_KEY. Must be 64 characters hex string.");
  // process.exit(1);
}

const keyBuffer = ENCRYPTION_KEY ? Buffer.from(ENCRYPTION_KEY, 'hex') : Buffer.alloc(32);

export function encrypt(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Format: iv:encryptedData
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    console.error("Encryption error", err);
    return text;
  }
}

export function decrypt(text) {
  if (!text) return text;
  if (!text.includes(':')) return text; // If it doesn't contain IV separator, it might be unencrypted 
  
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text;
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("Decryption error", err);
    // If decryption fails, it probably wasn't encrypted with this key, return original or empty
    return text;
  }
}
