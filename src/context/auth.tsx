import {
  GoogleSignin,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Required for expo-auth-session redirect handling on iOS/Android.
WebBrowser.maybeCompleteAuthSession();

// ─── Config ───────────────────────────────────────────────────────────────────

const IOS_CLIENT_ID =
  "504146003620-c2kvemq9rdgm55e31k1ik2ih82g0polj.apps.googleusercontent.com";

const MS_CLIENT_ID = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID ?? "";
const MS_DISCOVERY = {
  authorizationEndpoint:
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
};

// ─── Types ────────────────────────────────────────────────────────────────────

const AUTH_USER_KEY = "auth_user";
const MS_REFRESH_TOKEN_KEY = "ms_refresh_token";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  photo: string | null;
  provider: "google" | "apple" | "microsoft";
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    GoogleSignin.configure({
      iosClientId: IOS_CLIENT_ID,
      scopes: [
        "https://www.googleapis.com/auth/contacts",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/meetings.space.created",
        "https://www.googleapis.com/auth/tasks",
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

        if (parsed.provider === "google" && GoogleSignin.hasPreviousSignIn()) {
          const response = await GoogleSignin.signInSilently();
          if (isSuccessResponse(response)) {
            const refreshed: AuthUser = {
              ...parsed,
              name: response.data.user.name,
              email: response.data.user.email,
              photo: response.data.user.photo,
            };
            setUser(refreshed);
            await SecureStore.setItemAsync(
              AUTH_USER_KEY,
              JSON.stringify(refreshed),
            );
          } else if (isNoSavedCredentialFoundResponse(response)) {
            setUser(null);
            await SecureStore.deleteItemAsync(AUTH_USER_KEY);
          }
        }

        if (parsed.provider === "microsoft") {
          const refreshToken =
            await SecureStore.getItemAsync(MS_REFRESH_TOKEN_KEY);
          if (refreshToken) {
            try {
              const refreshRes = await fetch(MS_DISCOVERY.tokenEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  client_id: MS_CLIENT_ID,
                  grant_type: "refresh_token",
                  refresh_token: refreshToken,
                }).toString(),
              });
              if (!refreshRes.ok) throw new Error("refresh failed");
              const refreshData = await refreshRes.json();
              if (refreshData.refresh_token) {
                await SecureStore.setItemAsync(
                  MS_REFRESH_TOKEN_KEY,
                  refreshData.refresh_token,
                );
              }
            } catch {
              // Refresh token expired — require manual sign-in.
              setUser(null);
              await SecureStore.deleteItemAsync(AUTH_USER_KEY);
              await SecureStore.deleteItemAsync(MS_REFRESH_TOKEN_KEY);
            }
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
          provider: "google",
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
            throw new Error(
              "Google Play Services is not available on this device.",
            );
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
    const existing = await SecureStore.getItemAsync(AUTH_USER_KEY);
    const prev: AuthUser | null = existing ? JSON.parse(existing) : null;

    const signedIn: AuthUser = {
      id: credential.user,
      name: credential.fullName?.givenName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(" ")
        : prev?.id === credential.user
          ? prev.name
          : null,
      email:
        credential.email ?? (prev?.id === credential.user ? prev.email : null),
      photo: null,
      provider: "apple",
    };

    setUser(signedIn);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(signedIn));
  }, []);

  const signInWithMicrosoft = useCallback(async () => {
    // makeRedirectUri must be called inside the component, not at module level.
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: "luminate",
      path: "auth",
    });

    const request = new AuthSession.AuthRequest({
      clientId: MS_CLIENT_ID,
      scopes: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "Mail.Read",
        "Mail.Send",
        "Calendars.Read",
        "Calendars.ReadWrite",
        "Chat.Read",
        "User.Read",
      ],
      redirectUri,
      usePKCE: true,
      prompt: AuthSession.Prompt.SelectAccount,
    });

    const result = await request.promptAsync(MS_DISCOVERY);
    if (result.type !== "success") return;

    const tokenRes = await fetch(MS_DISCOVERY.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID,
        grant_type: "authorization_code",
        code: result.params.code,
        redirect_uri: redirectUri,
        code_verifier: request.codeVerifier!,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      throw new Error(err.error_description ?? "Microsoft token exchange failed");
    }

    const tokenData = await tokenRes.json();

    const userInfo = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }).then((r) => r.json());

    const signedIn: AuthUser = {
      id: userInfo.id,
      name: userInfo.displayName ?? null,
      email: userInfo.mail ?? userInfo.userPrincipalName ?? null,
      photo: null,
      provider: "microsoft",
    };

    setUser(signedIn);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(signedIn));
    if (tokenData.refresh_token) {
      await SecureStore.setItemAsync(
        MS_REFRESH_TOKEN_KEY,
        tokenData.refresh_token,
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (user?.provider === "google") {
        await GoogleSignin.signOut();
      }
      if (user?.provider === "microsoft") {
        await SecureStore.deleteItemAsync(MS_REFRESH_TOKEN_KEY);
      }
      // Apple has no programmatic sign-out API.
    } finally {
      setUser(null);
      await SecureStore.deleteItemAsync(AUTH_USER_KEY);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signInWithGoogle,
        signInWithApple,
        signInWithMicrosoft,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
