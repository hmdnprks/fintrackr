/* eslint-disable @typescript-eslint/no-explicit-any */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

// =========================
// Helpers
// =========================

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// =========================
// Key Derivation
// =========================

async function deriveKey(password: string, saltBuffer: ArrayBuffer) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 150_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  )
}

// =========================
// Encrypt
// =========================

export async function encryptData(data: any, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const key = await deriveKey(password, salt.buffer)

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer,
    },
    key,
    encoder.encode(JSON.stringify(data))
  )

  return {
    salt: toBase64(salt.buffer),
    iv: toBase64(iv.buffer),
    data: toBase64(encryptedBuffer),
  }
}

// =========================
// Decrypt
// =========================

export async function decryptData(
  encryptedPayload: any,
  password: string
) {
  const saltBuffer = fromBase64(encryptedPayload.salt)
  const ivBuffer = fromBase64(encryptedPayload.iv)
  const dataBuffer = fromBase64(encryptedPayload.data)

  const key = await deriveKey(password, saltBuffer)

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer,
    },
    key,
    dataBuffer
  )

  const decryptedText = decoder.decode(decryptedBuffer)

  return JSON.parse(decryptedText)
}
