import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Secure storage for sensitive values (JWT tokens).
 * Falls back to AsyncStorage on platforms where SecureStore is unavailable (web dev).
 */

const secureAvailable =
  typeof SecureStore.getItemAsync === "function" && typeof SecureStore.setItemAsync === "function";

export async function secureGet(key: string): Promise<string | null> {
  try {
    if (secureAvailable) return await SecureStore.getItemAsync(key);
  } catch {
    /* ignore */
  }
  return AsyncStorage.getItem(key);
}

export async function secureSet(key: string, value: string): Promise<void> {
  try {
    if (secureAvailable) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
  } catch {
    /* fallthrough */
  }
  await AsyncStorage.setItem(key, value);
}

export async function secureDelete(key: string): Promise<void> {
  try {
    if (secureAvailable) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    /* ignore */
  }
  await AsyncStorage.removeItem(key);
}

export const storage = AsyncStorage;
