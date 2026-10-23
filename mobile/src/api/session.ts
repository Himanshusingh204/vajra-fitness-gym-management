import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createApiClient } from './client';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://vajra-fitness-gym-management.vercel.app/api';
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://vajra-fitness-gym-management.vercel.app';

const REFRESH_KEY = 'vf.refreshToken';

// The access token only ever lives in memory. The refresh token goes to the
// keychain/keystore. SecureStore has no web implementation, so the web build
// keeps it in memory too and simply asks for a sign in after a reload.
let accessToken: string | null = null;
let webRefreshToken: string | null = null;

const tokens = {
  getAccess: () => accessToken,
  setAccess: (token: string | null) => {
    accessToken = token;
  },
  getRefresh: async () => {
    if (Platform.OS === 'web') return webRefreshToken;
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  setRefresh: async (token: string | null) => {
    if (Platform.OS === 'web') {
      webRefreshToken = token;
      return;
    }
    if (token) await SecureStore.setItemAsync(REFRESH_KEY, token);
    else await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

let sessionEndedListener: (() => void) | null = null;
export const onSessionEnded = (listener: (() => void) | null) => {
  sessionEndedListener = listener;
};

export const api = createApiClient({
  baseUrl: API_URL,
  tokens,
  onSessionEnded: () => sessionEndedListener?.(),
});

export const saveSession = async (token: string, refreshToken: string) => {
  tokens.setAccess(token);
  await tokens.setRefresh(refreshToken);
};

export const clearSession = async () => {
  tokens.setAccess(null);
  await tokens.setRefresh(null);
};

export const getRefreshToken = tokens.getRefresh;
export const hasAccessToken = () => accessToken !== null;
