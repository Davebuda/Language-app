// Local fingerprint persistence using IndexedDB (via idb library).
// The fingerprint lives on the device — it never leaves without user consent.

import { openDB, type IDBPDatabase } from 'idb';
import type { MistakeFingerprint } from '@/types/fingerprint';

const DB_NAME = 'norsk-coach';
const DB_VERSION = 1;
const FINGERPRINT_STORE = 'fingerprints';

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(FINGERPRINT_STORE)) {
        db.createObjectStore(FINGERPRINT_STORE, { keyPath: 'userId' });
      }
    },
  });
}

export async function saveFingerprint(fingerprint: MistakeFingerprint): Promise<void> {
  const db = await getDB();
  await db.put(FINGERPRINT_STORE, fingerprint);
}

export async function loadFingerprint(userId: string): Promise<MistakeFingerprint | null> {
  const db = await getDB();
  const result = await db.get(FINGERPRINT_STORE, userId);
  return result ?? null;
}

export async function deleteFingerprint(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete(FINGERPRINT_STORE, userId);
}

export async function getAllFingerprints(): Promise<MistakeFingerprint[]> {
  const db = await getDB();
  return db.getAll(FINGERPRINT_STORE);
}
