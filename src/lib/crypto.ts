export interface EncryptedData {
  salt: string
  iv: string
  data: string
}

export function generateSalt(length = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12))
}

function base64Encode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
}

function base64Decode(str: string): Uint8Array {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(
  plaintext: string,
  password: string
): Promise<EncryptedData> {
  const salt = generateSalt()
  const iv = generateIV()
  const key = await deriveKey(password, salt)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  )

  return {
    salt: base64Encode(salt),
    iv: base64Encode(iv),
    data: base64Encode(new Uint8Array(encrypted)),
  }
}

export async function decrypt(
  encrypted: EncryptedData,
  password: string
): Promise<string> {
  const salt = base64Decode(encrypted.salt)
  const iv = base64Decode(encrypted.iv)
  const data = base64Decode(encrypted.data)
  const key = await deriveKey(password, salt)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return new TextDecoder().decode(decrypted)
}

export async function hashPassword(
  password: string,
  salt: Uint8Array
): Promise<string> {
  const key = await deriveKey(password, salt)
  const exported = await crypto.subtle.exportKey('raw', key)
  const hash = await crypto.subtle.digest('SHA-256', exported)
  return base64Encode(new Uint8Array(hash))
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: Uint8Array
): Promise<boolean> {
  const computedHash = await hashPassword(password, salt)
  return computedHash === storedHash
}

export function obfuscate(str: string): string {
  const encoded = new TextEncoder().encode(str)
  const reversed = encoded.reverse()
  return base64Encode(reversed)
}

export function deobfuscate(str: string): string {
  const decoded = base64Decode(str)
  const reversed = decoded.reverse()
  return new TextDecoder().decode(reversed)
}
