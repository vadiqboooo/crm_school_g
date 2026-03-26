/**
 * E2E encryption for CRM chat messenger (teacher/employee side).
 * Reuses the same nacl primitives as the student client.
 *
 * Key management for employees:
 *  - A random keypair is generated once and stored in localStorage.
 *  - Public key is uploaded to the server after generation.
 *
 * Group chat encryption:
 *  - Teacher generates a random 32-byte room key.
 *  - Room key is encrypted (via ECDH box) for each member (students + self).
 *  - All messages use secretbox with the room key.
 */

import nacl from "tweetnacl";

// ── base64 helpers ─────────────────────────────────────────────────────────

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

const decoder = new TextDecoder();
const encoder = new TextEncoder();

// ── Keypair storage ─────────────────────────────────────────────────────────

const LS_KEY = "crm_chat_keypair";

export interface KeyPair {
  publicKey: string;   // base64
  privateKey: string;  // base64 — kept in memory / localStorage
}

/** Get or create a persistent keypair for this employee (stored in localStorage). */
export function getOrCreateKeyPair(): KeyPair {
  const stored = localStorage.getItem(LS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as KeyPair;
      if (parsed.publicKey && parsed.privateKey) return parsed;
    } catch {
      // fall through to generate
    }
  }
  const kp = nacl.box.keyPair();
  const result: KeyPair = {
    publicKey: b64encode(kp.publicKey),
    privateKey: b64encode(kp.secretKey),
  };
  localStorage.setItem(LS_KEY, JSON.stringify(result));
  return result;
}

// ── Direct (ECDH box) ───────────────────────────────────────────────────────

/** Encrypt `text` so that `recipientPublicKey` holder can decrypt it. */
export function encryptDirect(
  text: string,
  recipientPublicKey: string,
  myPrivateKey: string
): string {
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
  senderPublicKey: string,
  myPrivateKey: string
): string | null {
  try {
    const data = b64decode(encryptedBase64);
    const nonce = data.slice(0, nacl.box.nonceLength);
    const ciphertext = data.slice(nacl.box.nonceLength);
    const plaintext = nacl.box.open(
      ciphertext,
      nonce,
      b64decode(senderPublicKey),
      b64decode(myPrivateKey)
    );
    if (!plaintext) return null;
    return decoder.decode(plaintext);
  } catch {
    return null;
  }
}

// ── Group (symmetric room key) ─────────────────────────────────────────────

/** Generate a random 32-byte symmetric room key. */
export function generateRoomKey(): string {
  return b64encode(nacl.randomBytes(nacl.secretbox.keyLength));
}

/** Encrypt the room key for a specific member using their public key. */
export function encryptRoomKeyForMember(
  roomKeyBase64: string,
  memberPublicKey: string,
  myPrivateKey: string
): string {
  return encryptDirect(roomKeyBase64, memberPublicKey, myPrivateKey);
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
