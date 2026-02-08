import * as nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const DATA_DIR = path.join(os.homedir(), '.opencode-dashboard');
const KEY_FILE = path.join(DATA_DIR, 'key');

let cachedKey: Uint8Array | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

function generateKey(): Uint8Array {
  return nacl.randomBytes(nacl.secretbox.keyLength);
}

function loadOrCreateKey(): Uint8Array {
  if (cachedKey) {
    return cachedKey;
  }

  ensureDataDir();

  if (fs.existsSync(KEY_FILE)) {
    const keyData = fs.readFileSync(KEY_FILE, 'utf-8');
    cachedKey = decodeBase64(keyData);
    return cachedKey;
  }

  const newKey = generateKey();
  fs.writeFileSync(KEY_FILE, encodeBase64(newKey), { mode: 0o600 });
  cachedKey = newKey;
  return newKey;
}

export function encrypt(plaintext: string): string {
  const key = loadOrCreateKey();
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const message = new TextEncoder().encode(plaintext);

  const encrypted = nacl.secretbox(message, nonce, key);
  if (!encrypted) {
    throw new Error('Encryption failed');
  }

  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);

  return encodeBase64(combined);
}

export function decrypt(ciphertext: string): string {
  const key = loadOrCreateKey();
  const combined = decodeBase64(ciphertext);

  const nonce = combined.slice(0, nacl.secretbox.nonceLength);
  const encrypted = combined.slice(nacl.secretbox.nonceLength);

  const decrypted = nacl.secretbox.open(encrypted, nonce, key);
  if (!decrypted) {
    throw new Error('Decryption failed - invalid ciphertext or key');
  }

  return new TextDecoder().decode(decrypted);
}

export function getDataDir(): string {
  ensureDataDir();
  return DATA_DIR;
}
