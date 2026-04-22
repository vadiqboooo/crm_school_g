/**
 * E2E encryption for the chat messenger — React Native adaptation.
 *
 * Differences from web version:
 *   - base64 via `react-native-quick-base64` (no btoa/atob in RN)
 *   - PBKDF2 via `@noble/hashes` (pure JS, no Node stdlib deps — unlike `pbkdf2` npm package)
 *   - TextEncoder/Decoder are available globally in Hermes (RN ≥ 0.74)
 *   - nacl.randomBytes relies on `react-native-get-random-values` imported in index.ts
 */

import nacl from "tweetnacl";
import { pbkdf2 as noblePbkdf2 } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";
import { toByteArray, fromByteArray } from "react-native-quick-base64";

function b64encode(bytes: Uint8Array): string {
  return fromByteArray(bytes);
}

function b64decode(base64: string): Uint8Array {
  return toByteArray(base64);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function derivePrivateKeyBytes(password: string, userId: string): Promise<Uint8Array> {
  const pwd = encoder.encode(password);
  const salt = encoder.encode(userId);
  return noblePbkdf2(sha256, pwd, salt, { c: 200_000, dkLen: 32 });
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export async function initCryptoKeys(password: string, userId: string): Promise<KeyPair> {
  const secretKey = await derivePrivateKeyBytes(password, userId);
  const kp = nacl.box.keyPair.fromSecretKey(secretKey);
  return { publicKey: b64encode(kp.publicKey), privateKey: b64encode(kp.secretKey) };
}

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

export function generateRoomKey(): string {
  return b64encode(nacl.randomBytes(nacl.secretbox.keyLength));
}

export function encryptRoomKeyForMember(
  roomKeyBase64: string,
  memberPublicKey: string,
  myPrivateKey: string
): string {
  return encryptDirect(roomKeyBase64, memberPublicKey, myPrivateKey);
}

export function decryptRoomKey(
  encryptedRoomKey: string,
  otherPublicKey: string,
  myPrivateKey: string
): string | null {
  return decryptDirect(encryptedRoomKey, otherPublicKey, myPrivateKey);
}

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
