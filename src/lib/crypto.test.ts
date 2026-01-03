import { describe, it, expect } from 'vitest'
import {
  generateSalt,
  deriveKey,
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  obfuscate,
  deobfuscate,
} from './crypto'

describe('crypto utilities', () => {
  describe('generateSalt', () => {
    it('generates a 16-byte Uint8Array', () => {
      const salt = generateSalt()
      expect(salt).toBeInstanceOf(Uint8Array)
      expect(salt.length).toBe(16)
    })

    it('generates unique salts', () => {
      const salt1 = generateSalt()
      const salt2 = generateSalt()
      expect(salt1).not.toEqual(salt2)
    })
  })

  describe('deriveKey', () => {
    it('derives a CryptoKey from password and salt', async () => {
      const salt = generateSalt()
      const key = await deriveKey('testpassword', salt)
      expect(key).toBeDefined()
      expect(key.type).toBe('secret')
      expect(key.algorithm.name).toBe('AES-GCM')
    })

    it('derives same key for same password and salt', async () => {
      const salt = generateSalt()
      const key1 = await deriveKey('testpassword', salt)
      const key2 = await deriveKey('testpassword', salt)
      
      // Export keys to compare
      const exported1 = await crypto.subtle.exportKey('raw', key1)
      const exported2 = await crypto.subtle.exportKey('raw', key2)
      expect(new Uint8Array(exported1)).toEqual(new Uint8Array(exported2))
    })

    it('derives different keys for different passwords', async () => {
      const salt = generateSalt()
      const key1 = await deriveKey('password1', salt)
      const key2 = await deriveKey('password2', salt)
      
      const exported1 = await crypto.subtle.exportKey('raw', key1)
      const exported2 = await crypto.subtle.exportKey('raw', key2)
      expect(new Uint8Array(exported1)).not.toEqual(new Uint8Array(exported2))
    })
  })

  describe('encrypt and decrypt', () => {
    it('encrypts and decrypts text successfully', async () => {
      const plaintext = 'Hello, this is a secret message!'
      const password = 'mySecretPassword123'
      
      const encrypted = await encrypt(plaintext, password)
      expect(encrypted.salt).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.data).toBeDefined()
      
      const decrypted = await decrypt(encrypted, password)
      expect(decrypted).toBe(plaintext)
    })

    it('encrypts empty string', async () => {
      const encrypted = await encrypt('', 'password')
      const decrypted = await decrypt(encrypted, 'password')
      expect(decrypted).toBe('')
    })

    it('encrypts unicode text', async () => {
      const plaintext = 'Hello 世界! 🔥 Ñoño'
      const encrypted = await encrypt(plaintext, 'password')
      const decrypted = await decrypt(encrypted, 'password')
      expect(decrypted).toBe(plaintext)
    })

    it('encrypts long text', async () => {
      const plaintext = 'x'.repeat(10000)
      const encrypted = await encrypt(plaintext, 'password')
      const decrypted = await decrypt(encrypted, 'password')
      expect(decrypted).toBe(plaintext)
    })

    it('produces different ciphertext each time (unique IV)', async () => {
      const plaintext = 'Same message'
      const password = 'samePassword'
      
      const encrypted1 = await encrypt(plaintext, password)
      const encrypted2 = await encrypt(plaintext, password)
      
      expect(encrypted1.data).not.toBe(encrypted2.data)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
    })

    it('fails to decrypt with wrong password', async () => {
      const encrypted = await encrypt('secret', 'correctPassword')
      
      await expect(decrypt(encrypted, 'wrongPassword')).rejects.toThrow()
    })
  })

  describe('hashPassword and verifyPassword', () => {
    it('hashes password and verifies correctly', async () => {
      const password = 'myPassword123'
      const salt = generateSalt()
      
      const hash = await hashPassword(password, salt)
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      
      const isValid = await verifyPassword(password, hash, salt)
      expect(isValid).toBe(true)
    })

    it('rejects wrong password', async () => {
      const salt = generateSalt()
      const hash = await hashPassword('correctPassword', salt)
      
      const isValid = await verifyPassword('wrongPassword', hash, salt)
      expect(isValid).toBe(false)
    })

    it('produces consistent hash for same password and salt', async () => {
      const password = 'testPassword'
      const salt = generateSalt()
      
      const hash1 = await hashPassword(password, salt)
      const hash2 = await hashPassword(password, salt)
      
      expect(hash1).toBe(hash2)
    })
  })

  describe('obfuscate and deobfuscate', () => {
    it('obfuscates and deobfuscates string', () => {
      const original = 'test-api-key-example'
      const obfuscated = obfuscate(original)
      
      expect(obfuscated).not.toBe(original)
      expect(deobfuscate(obfuscated)).toBe(original)
    })

    it('handles empty string', () => {
      expect(deobfuscate(obfuscate(''))).toBe('')
    })

    it('handles unicode', () => {
      const original = 'key-🔑-秘密'
      expect(deobfuscate(obfuscate(original))).toBe(original)
    })
  })
})
