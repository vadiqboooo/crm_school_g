/**
 * E2E encryption for the chat messenger.
 * Uses only `tweetnacl` + native browser Web Crypto API (no tweetnacl-util).
 *
 * Direct (1:1):  nacl.box  — X25519 ECDH shared secret + XSalsa20-Poly1305
 * Group:         nacl.secretbox — XSalsa20-Poly1305 with shared room key
 * Key derivation: PBKDF2-SHA256 (password + userId → 32-byte private key)
 */

import nacl from "tweetnacl";

// ── Native base64 helpers (no tweetnacl-util needed) ──────────────────────

function b64encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ── Key derivation ─────────────────────────────────────────────────────────

/**
 * Derive deterministic 32-byte private key from password + userId via PBKDF2-SHA256.
 * Same inputs → same key on any device.
 */
async function derivePrivateKeyBytes(password: string, userId: string): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(userId), iterations: 200_000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

export interface KeyPair {
  publicKey: string;  // base64
  privateKey: string; // base64 — keep in memory only
}

/** Call after login. Derives keypair from password. Hold privateKey in memory. */
export async function initCryptoKeys(password: string, userId: string): Promise<KeyPair> {
  const secretKey = await derivePrivateKeyBytes(password, userId);
  const kp = nacl.box.keyPair.fromSecretKey(secretKey);
  return { publicKey: b64encode(kp.publicKey), privateKey: b64encode(kp.secretKey) };
}

// ── Direct (1:1) encryption ────────────────────────────────────────────────

/**
 * Encrypt with ECDH shared secret. Both parties can decrypt using each other's public key.
 * Alice encrypts: encryptDirect(msg, Bob_pub, Alice_priv)
 * Bob decrypts:   decryptDirect(cipher, Alice_pub, Bob_priv)  ← same shared secret
 * Alice reads:    decryptDirect(cipher, Bob_pub, Alice_priv)  ← also works
 */
export function encryptDirect(text: string, recipientPublicKey: string, myPrivateKey: string): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const ciphertext = nacl.box(
    encoder.encode(text),
    nonce,
    b64decode(recipientPublicKey),
    b64decode(myPrivateKey)
  );
  const packed = new Uint8Array(nonce.length + ciphertext.length);
  packed.set(nonce);
  packed.set(ciphertext, nonce.length);
  return b64encode(packed);
}

export function decryptDirect(
  encryptedBase64: string,
  senderOrRecipientPublicKey: string,
  myPrivateKey: string
): string | null {
  try {
    const data = b64decode(encryptedBase64);
    const nonce = data.slice(0, nacl.box.nonceLength);
    const ciphertext = data.slice(nacl.box.nonceLength);
    const plaintext = nacl.box.open(
      ciphertext,
      nonce,
      b64decode(senderOrRecipientPublicKey),
      b64decode(myPrivateKey)
    );
    if (!plaintext) return null;
    return decoder.decode(plaintext);
  } catch {
    return null;
  }
}

// ── Group (symmetric room key) encryption ────────────────────────────────

/** Generate a random 32-byte room key. */
export function generateRoomKey(): string {
  return b64encode(nacl.randomBytes(nacl.secretbox.keyLength));
}

/** Encrypt room key for a specific member using their public key. */
export function encryptRoomKeyForMember(
  roomKeyBase64: string,
  memberPublicKey: string,
  myPrivateKey: string
): string {
  return encryptDirect(roomKeyBase64, memberPublicKey, myPrivateKey);
}

/** Decrypt room key using your private key. */
export function decryptRoomKey(
  encryptedRoomKey: string,
  otherPublicKey: string,
  myPrivateKey: string
): string | null {
  return decryptDirect(encryptedRoomKey, otherPublicKey, myPrivateKey);
}

/** Encrypt a message with the group symmetric room key. */
export function encryptGroup(text: string, roomKeyBase64: string): string {
  const key = b64decode(roomKeyBase64);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(encoder.encode(text), nonce, key);
  const packed = new Uint8Array(nonce.length + ciphertext.length);
  packed.set(nonce);
  packed.set(ciphertext, nonce.length);
  return b64encode(packed);
}

export function decryptGroup(encryptedBase64: string, roomKeyBase64: string): string | null {
  try {
    const key = b64decode(roomKeyBase64);
    const data = b64decode(encryptedBase64);
    const nonce = data.slice(0, nacl.secretbox.nonceLength);
    const ciphertext = data.slice(nacl.secretbox.nonceLength);
    const plaintext = nacl.secretbox.open(ciphertext, nonce, key);
    if (!plaintext) return null;
    return decoder.decode(plaintext);
  } catch {
    return null;
  }
}
