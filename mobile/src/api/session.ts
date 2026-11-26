import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createApiClient } from './client';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://vajra-fitness-gym-management.vercel.app/api';
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://vajra-fitness-gym-management.vercel.app';

const REFRESH_KEY = 'vf.refreshToken';
const GYM_KEY = 'vf.memberGymId';

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

// The member's chosen gym. It is kept in the keychain so the choice survives a restart (memory only on web).
let memberGymId: string | null = null;
export const setMemberGymId = (gymId: string | null) => {
  memberGymId = gymId;
  if (Platform.OS === 'web') return;
  const saved = gymId ? SecureStore.setItemAsync(GYM_KEY, gymId) : SecureStore.deleteItemAsync(GYM_KEY);
  saved.catch(() => {});
};

export const getMemberGymId = () => memberGymId;

export const loadMemberGymId = async () => {
  if (Platform.OS === 'web') return;
  memberGymId = await SecureStore.getItemAsync(GYM_KEY).catch(() => null);
};

export const api = createApiClient({
  baseUrl: API_URL,
  tokens,
  getGymId: () => memberGymId,
  onSessionEnded: () => {
    setMemberGymId(null);
    sessionEndedListener?.();
  },
});

export const saveSession = async (token: string, refreshToken: string) => {
  tokens.setAccess(token);
  await tokens.setRefresh(refreshToken);
};

export const clearSession = async () => {
  setMemberGymId(null);
  tokens.setAccess(null);
  await tokens.setRefresh(null);
};

export const getRefreshToken = tokens.getRefresh;
export const hasAccessToken = () => accessToken !== null;
