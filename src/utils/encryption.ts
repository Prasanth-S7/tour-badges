/**
 * Encryption utilities for securely storing bearer tokens
 * Uses Web Crypto API for AES-GCM encryption
 */

export interface EncryptedData {
  iv: string;
  encryptedData: string;
  tag: string;
}

/**
 * Generate a cryptographic key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(data: string, password: string): Promise<string> {
  try {
    // Generate a random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      new TextEncoder().encode(data)
    );

    // Combine salt, IV, and encrypted data
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(encryptedArray, salt.length + iv.length);

    // Return as base64 string
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(encryptedString: string, password: string): Promise<string> {
  try {
    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedString).split('').map(char => char.charCodeAt(0))
    );

    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedData = combined.slice(28);

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure encryption key for the application
 */
export function generateEncryptionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Validate if a string is a valid base64 encoded encrypted data
 */
export function isValidEncryptedData(data: string): boolean {
  try {
    if (!data || typeof data !== 'string') return false;
    
    // Try to decode base64
    const decoded = atob(data);
    const array = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      array[i] = decoded.charCodeAt(i);
    }
    
    // Check minimum length (salt + iv + some encrypted data)
    return array.length >= 44; // 16 + 12 + 16 minimum
  } catch {
    return false;
  }
} 