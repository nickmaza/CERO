import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_KEY en el archivo .env');
}

/**
 * Keeps the session on the phone, encrypted. The session is too large for SecureStore,
 * so it is encrypted with a random AES key and stored in AsyncStorage, and only the key
 * goes into SecureStore (the iOS Keychain / Android Keystore). This follows Supabase's
 * Expo guide, using expo-crypto for the random key so the app runs in Expo Go.
 */
class LargeSecureStore {
  private async encrypt(storageKey: string, value: string) {
    const encryptionKey = Crypto.getRandomBytes(256 / 8);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(storageKey, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encrypted);
  }

  private async decrypt(storageKey: string, value: string) {
    const encryptionKeyHex = await SecureStore.getItemAsync(storageKey);
    if (!encryptionKeyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(encryptionKeyHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
  }

  async getItem(storageKey: string) {
    const encrypted = await AsyncStorage.getItem(storageKey);
    if (!encrypted) return null;
    return this.decrypt(storageKey, encrypted);
  }

  async setItem(storageKey: string, value: string) {
    await AsyncStorage.setItem(storageKey, await this.encrypt(storageKey, value));
  }

  async removeItem(storageKey: string) {
    await AsyncStorage.removeItem(storageKey);
    await SecureStore.deleteItemAsync(storageKey);
  }
}

// SecureStore doesn't exist in the browser, so the web build keeps the session in localStorage.
const storage = Platform.OS === 'web' ? AsyncStorage : new LargeSecureStore();

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the session only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Turns a Supabase or network error into a short Spanish message. */
export function friendlyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : String(error);
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirma tu correo con el enlace que te enviamos y vuelve a entrar.';
  if (/User already registered/i.test(msg)) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  if (/Password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/Network request failed|Failed to fetch/i.test(msg)) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  return msg;
}
