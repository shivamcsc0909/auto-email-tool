import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../src/utils/encryption.js';

describe('AES-256-GCM Token Encryption', () => {
  it('should encrypt and decrypt tokens correctly', () => {
    const originalToken = 'ya29.a0AfH6SMB_secret_oauth_refresh_token_1234567890';
    const encrypted = encryptToken(originalToken);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(originalToken);
    expect(encrypted?.split(':').length).toBe(3); // iv:authTag:ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it('should handle null and undefined cleanly', () => {
    expect(encryptToken(null)).toBeNull();
    expect(encryptToken(undefined)).toBeNull();
    expect(decryptToken(null)).toBeNull();
    expect(decryptToken(undefined)).toBeNull();
  });

  it('should fail when ciphertext or auth tag has been tampered with', () => {
    const originalToken = 'secret-token-value';
    const encrypted = encryptToken(originalToken)!;
    const parts = encrypted.split(':');
    
    // Invert first character of auth tag to guarantee invalid MAC
    const tamperedAuthTag = (parts[1][0] === 'a' ? 'b' : 'a') + parts[1].substring(1);
    const tamperedEncrypted = `${parts[0]}:${tamperedAuthTag}:${parts[2]}`;

    expect(() => decryptToken(tamperedEncrypted)).toThrow();
  });
});
