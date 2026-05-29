import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  GoogleSignin,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';

// iOS client ID from GoogleService-Info.plist.
// For Android idToken support, add your web client ID from Google Cloud Console:
//   webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
const IOS_CLIENT_ID =
  '504146003620-c2kvemq9rdgm55e31k1ik2ih82g0polj.apps.googleusercontent.com';

const AUTH_USER_KEY = 'auth_user';

export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
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
        // Contacts
        'https://www.googleapis.com/auth/contacts',
        // Gmail
        'https://www.googleapis.com/auth/gmail.modify',
        // Google Calendar (includes Meet links embedded in events)
        'https://www.googleapis.com/auth/calendar',
        // Google Meet REST API
        'https://www.googleapis.com/auth/meetings.space.created',
        // Google Tasks
        'https://www.googleapis.com/auth/tasks',
      ],
    });
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      // Immediately restore from cache so the UI is not blocked.
      const stored = await SecureStore.getItemAsync(AUTH_USER_KEY);
      if (stored) {
        setUser(JSON.parse(stored) as AuthUser);
      }

      // Then attempt a silent refresh to get fresh tokens.
      if (GoogleSignin.hasPreviousSignIn()) {
        const response = await GoogleSignin.signInSilently();
        if (isSuccessResponse(response)) {
          const refreshed: AuthUser = {
            id: response.data.user.id,
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
    } catch {
      // Silent sign-in failure is not fatal; user can sign in manually.
    } finally {
      setIsLoading(false);
    }
  }

  const signIn = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const signedIn: AuthUser = {
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          photo: response.data.user.photo,
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

  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } finally {
      setUser(null);
      await SecureStore.deleteItemAsync(AUTH_USER_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
