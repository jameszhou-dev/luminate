import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  GoogleSignin,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';

const IOS_CLIENT_ID =
  '504146003620-c2kvemq9rdgm55e31k1ik2ih82g0polj.apps.googleusercontent.com';

const AUTH_USER_KEY = 'auth_user';

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  photo: string | null;
  provider: 'google' | 'apple';
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    GoogleSignin.configure({
      iosClientId: IOS_CLIENT_ID,
      scopes: [
        'https://www.googleapis.com/auth/contacts',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/meetings.space.created',
        'https://www.googleapis.com/auth/tasks',
      ],
    });
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const stored = await SecureStore.getItemAsync(AUTH_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        setUser(parsed);

        // For Google accounts, attempt a silent token refresh.
        // Apple has no equivalent — the stored profile is sufficient.
        if (parsed.provider === 'google' && GoogleSignin.hasPreviousSignIn()) {
          const response = await GoogleSignin.signInSilently();
          if (isSuccessResponse(response)) {
            const refreshed: AuthUser = {
              ...parsed,
              name: response.data.user.name,
              email: response.data.user.email,
              photo: response.data.user.photo,
            };
            setUser(refreshed);
            await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(refreshed));
          } else if (isNoSavedCredentialFoundResponse(response)) {
            setUser(null);
            await SecureStore.deleteItemAsync(AUTH_USER_KEY);
          }
        }
      }
    } catch {
      // Non-fatal — user can sign in manually.
    } finally {
      setIsLoading(false);
    }
  }

  const signInWithGoogle = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const signedIn: AuthUser = {
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          photo: response.data.user.photo,
          provider: 'google',
        };
        setUser(signedIn);
        await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(signedIn));
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
          case statusCodes.IN_PROGRESS:
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error('Google Play Services is not available on this device.');
          default:
            throw error;
        }
      } else {
        throw error;
      }
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Apple only provides name and email on the very first sign-in.
    // On subsequent sign-ins both are null, so we fall back to whatever
    // was stored from the first sign-in.
    const existing = await SecureStore.getItemAsync(AUTH_USER_KEY);
    const prev: AuthUser | null = existing ? JSON.parse(existing) : null;

    const signedIn: AuthUser = {
      id: credential.user,
      name:
        credential.fullName?.givenName
          ? [credential.fullName.givenName, credential.fullName.familyName]
              .filter(Boolean)
              .join(' ')
          : prev?.id === credential.user
            ? prev.name
            : null,
      email: credential.email ?? (prev?.id === credential.user ? prev.email : null),
      photo: null, // Apple does not provide a profile photo
      provider: 'apple',
    };

    setUser(signedIn);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(signedIn));
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (user?.provider === 'google') {
        await GoogleSignin.signOut();
      }
      // Apple has no programmatic sign-out API.
    } finally {
      setUser(null);
      await SecureStore.deleteItemAsync(AUTH_USER_KEY);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
