/**
 * Client-side AES-GCM (256-bit) Encryption & Decryption module using the Web Crypto API
 * with PBKDF2 key derivation from user PIN / Password.
 */

// Helper to convert ArrayBuffer or Uint8Array to Base64 string
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 string to Uint8Array
function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Get the native SubtleCrypto object in modern browser or Node environment
function getSubtleCrypto() {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  // Node.js fallback if available
  try {
    const nodeCrypto = require("crypto").webcrypto;
    return nodeCrypto.subtle;
  } catch (e) {
    throw new Error("Web Crypto API (crypto.subtle) is not supported in this environment.");
  }
}

// Get the native crypto.getRandomValues function
function getRandomValues(array) {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    return window.crypto.getRandomValues(array);
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.getRandomValues) {
    return globalThis.crypto.getRandomValues(array);
  }
  try {
    const nodeCrypto = require("crypto");
    return nodeCrypto.randomFillSync(array);
  } catch (e) {
    throw new Error("crypto.getRandomValues is not available.");
  }
}

/**
 * Derives a 256-bit AES-GCM key from a user PIN and salt using PBKDF2 (100,000 iterations, SHA-256).
 */
async function deriveKey(pin, saltBuffer) {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const pinBuffer = encoder.encode(String(pin));

  // Import raw PIN as key material
  const keyMaterial = await subtle.importKey(
    "raw",
    pinBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive AES-GCM 256-bit key
  const key = await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return key;
}

/**
 * Encrypts plaintext string using user PIN with AES-GCM (256-bit) and PBKDF2.
 * @param {string} text - Plain text to encrypt
 * @param {string} pin - User's Vault PIN or password
 * @returns {Promise<{ ciphertext: string, iv: string, salt: string }>} Base64-encoded crypto package
 */
export async function encrypt(text, pin) {
  if (typeof text !== "string") {
    text = JSON.stringify(text || "");
  }
  if (!pin) {
    throw new Error("PIN is required for encryption.");
  }

  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const textBuffer = encoder.encode(text);

  // Generate 16-byte random salt and 12-byte random IV
  const salt = getRandomValues(new Uint8Array(16));
  const iv = getRandomValues(new Uint8Array(12));

  // Derive key from PIN + Salt
  const key = await deriveKey(pin, salt);

  // Encrypt with AES-GCM
  const ciphertextBuffer = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    textBuffer
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
  };
}

/**
 * Decrypts an encrypted package ({ ciphertext, iv, salt }) using user PIN.
 * @param {{ ciphertext: string, iv: string, salt: string }|string} data - Encrypted payload
 * @param {string} pin - User's Vault PIN or password
 * @returns {Promise<string>} Decrypted plain text
 */
export async function decrypt(data, pin) {
  if (!data) return "";
  if (!pin) {
    throw new Error("PIN is required for decryption.");
  }

  // Handle if data is passed as a serialized string
  let pkg = data;
  if (typeof data === "string") {
    try {
      pkg = JSON.parse(data);
    } catch {
      return data;
    }
  }

  const { ciphertext, iv, salt } = pkg || {};
  if (!ciphertext || !iv || !salt) {
    return typeof data === "string" ? data : JSON.stringify(data);
  }

  const subtle = getSubtleCrypto();
  const ciphertextBuffer = base64ToBuffer(ciphertext);
  const ivBuffer = base64ToBuffer(iv);
  const saltBuffer = base64ToBuffer(salt);

  // Derive key from PIN + Salt
  const key = await deriveKey(pin, saltBuffer);

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuffer,
      },
      key,
      ciphertextBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    throw new Error("Failed to decrypt data. Invalid PIN or corrupted data.");
  }
}

/**
 * Encrypts a full memory object (title, content, checklist) for private vault storage.
 */
export async function encryptMemory(memoryData, pin) {
  if (!pin) {
    throw new Error("Vault PIN required to encrypt memory.");
  }

  const payloadToEncrypt = {
    title: memoryData.title || "",
    content: memoryData.content || "",
    checklist: memoryData.checklist || undefined,
    mediaName: memoryData.mediaName || undefined,
  };

  const encryptedPackage = await encrypt(JSON.stringify(payloadToEncrypt), pin);

  return {
    ...memoryData,
    isEncrypted: true,
    encryptedData: encryptedPackage,
    // Store obfuscated placeholders in raw fields for zero-knowledge backend storage
    title: "[Encrypted Vault Memory]",
    content: "[Protected with AES-GCM Encryption]",
    checklist: undefined,
  };
}

/**
 * Decrypts an encrypted memory object if encryptedData is present.
 */
export async function decryptMemory(memory, pin) {
  if (!memory || !memory.isEncrypted || !memory.encryptedData || !pin) {
    return memory;
  }

  try {
    const decryptedText = await decrypt(memory.encryptedData, pin);
    const parsed = JSON.parse(decryptedText);

    return {
      ...memory,
      title: parsed.title !== undefined ? parsed.title : memory.title,
      content: parsed.content !== undefined ? parsed.content : memory.content,
      checklist: parsed.checklist !== undefined ? parsed.checklist : memory.checklist,
      mediaName: parsed.mediaName !== undefined ? parsed.mediaName : memory.mediaName,
      isEncrypted: false,
      isDecrypted: true,
    };
  } catch (err) {
    console.warn(`[Crypto] Failed to decrypt memory ${memory.id}:`, err.message);
    return {
      ...memory,
      decryptionFailed: true,
    };
  }
}

export default {
  encrypt,
  decrypt,
  encryptMemory,
  decryptMemory,
};
