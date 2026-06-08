import {
  GoogleSignin,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
// MS access token key — stored alongside the refresh token so the voice agent can use it.
const MS_ACCESS_TOKEN_KEY = "ms_access_token";
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
import { syncUser, updateUserPhoto, updateUserProfile, updateUserPassword, verifyUserPassword } from "@/services/user";
import { generateAvatarUrl } from "@/utils/avatar";

// Required for expo-auth-session redirect handling on iOS/Android.
WebBrowser.maybeCompleteAuthSession();

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

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
const EMAIL_TOKEN_KEY = "email_token";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  photo: string | null;
  provider: "google" | "apple" | "microsoft" | "email";
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  linkedProviders: string[];
  /** Returns the current OAuth access token for Google or Microsoft, or null for Apple/iOS. */
  getAccessToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  linkWithGoogle: () => Promise<void>;
  linkWithApple: () => Promise<void>;
  linkWithMicrosoft: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string | null) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  updatePhoto: (photoUrl: string | null) => Promise<void>;
  updateProfile: (data: { name?: string | null; email?: string | null }) => Promise<void>;
  verifyPassword: (password: string) => Promise<boolean>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);

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
        setLinkedProviders([parsed.provider]);

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
        setLinkedProviders(["google"]);
        await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(signedIn));

        const tokens = await GoogleSignin.getTokens();
        syncUser({
          userId: signedIn.id,
          provider: "google",
          name: signedIn.name,
          email: signedIn.email,
          photo: signedIn.photo,
          accessToken: tokens.accessToken,
          idToken: tokens.idToken ?? undefined,
        }).catch(() => {});
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

    const resolvedName = credential.fullName?.givenName
      ? [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(" ")
      : prev?.id === credential.user
        ? prev.name
        : null;

    const signedIn: AuthUser = {
      id: credential.user,
      name: resolvedName,
      email:
        credential.email ?? (prev?.id === credential.user ? prev.email : null),
      photo: prev?.id === credential.user ? prev.photo : generateAvatarUrl(resolvedName),
      provider: "apple",
    };

    setUser(signedIn);
    setLinkedProviders(["apple"]);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(signedIn));

    syncUser({
      userId: signedIn.id,
      provider: "apple",
      name: signedIn.name,
      email: signedIn.email,
    }).catch(() => {});
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

    const msName = userInfo.displayName ?? null;
    const signedIn: AuthUser = {
      id: userInfo.id,
      name: msName,
      email: userInfo.mail ?? userInfo.userPrincipalName ?? null,
      photo: generateAvatarUrl(msName),
      provider: "microsoft",
    };

    setUser(signedIn);
    setLinkedProviders(["microsoft"]);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(signedIn));
    if (tokenData.refresh_token) {
      await SecureStore.setItemAsync(MS_REFRESH_TOKEN_KEY, tokenData.refresh_token);
    }
    if (tokenData.access_token) {
      await SecureStore.setItemAsync(MS_ACCESS_TOKEN_KEY, tokenData.access_token);
    }

    if (tokenData.access_token && tokenData.refresh_token) {
      syncUser({
        userId: signedIn.id,
        provider: "microsoft",
        name: signedIn.name,
        email: signedIn.email,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      }).catch(() => {});
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string | null) => {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Sign up failed. Please try again.");

    const signedIn: AuthUser = {
      id: data.userId,
      name: name?.trim() || null,
      email: email.toLowerCase().trim(),
      photo: generateAvatarUrl(name),
      provider: "email",
    };
    setUser(signedIn);
    setLinkedProviders(["email"]);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(signedIn));
    await SecureStore.setItemAsync(EMAIL_TOKEN_KEY, data.token);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Sign in failed. Please try again.");

    const signedIn: AuthUser = {
      id: data.userId,
      name: data.name ?? null,
      email: email.toLowerCase().trim(),
      photo: data.photo ?? generateAvatarUrl(data.name ?? null),
      provider: "email",
    };
    setUser(signedIn);
    setLinkedProviders(["email"]);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(signedIn));
    await SecureStore.setItemAsync(EMAIL_TOKEN_KEY, data.token);
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    if (user.provider === 'google') {
      const tokens = await GoogleSignin.getTokens();
      return tokens.accessToken ?? null;
    }
    if (user.provider === 'microsoft') {
      return SecureStore.getItemAsync(MS_ACCESS_TOKEN_KEY);
    }
    return null;
  }, [user]);

  const linkWithGoogle = useCallback(async () => {
    if (!user) return;
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const tokens = await GoogleSignin.getTokens();
        await syncUser({
          userId: user.id,
          provider: "google",
          name: response.data.user.name,
          email: response.data.user.email,
          photo: response.data.user.photo,
          accessToken: tokens.accessToken,
          idToken: tokens.idToken ?? undefined,
        });
        setLinkedProviders((prev) => [...new Set([...prev, "google"])]);
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (
          error.code === statusCodes.SIGN_IN_CANCELLED ||
          error.code === statusCodes.IN_PROGRESS
        ) return;
      }
      throw error;
    }
  }, [user]);

  const linkWithApple = useCallback(async () => {
    if (!user) return;
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    await syncUser({
      userId: user.id,
      provider: "apple",
      name: credential.fullName?.givenName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(" ")
        : null,
      email: credential.email ?? null,
    });
    setLinkedProviders((prev) => [...new Set([...prev, "apple"])]);
  }, [user]);

  const linkWithMicrosoft = useCallback(async () => {
    if (!user) return;
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: "luminate",
      path: "auth",
    });
    const request = new AuthSession.AuthRequest({
      clientId: MS_CLIENT_ID,
      scopes: [
        "openid", "profile", "email", "offline_access",
        "Mail.Read", "Mail.Send", "Calendars.Read", "Calendars.ReadWrite",
        "Chat.Read", "User.Read",
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

    if (tokenData.refresh_token) {
      await SecureStore.setItemAsync(MS_REFRESH_TOKEN_KEY, tokenData.refresh_token);
    }
    if (tokenData.access_token) {
      await SecureStore.setItemAsync(MS_ACCESS_TOKEN_KEY, tokenData.access_token);
    }
    await syncUser({
      userId: user.id,
      provider: "microsoft",
      name: userInfo.displayName ?? null,
      email: userInfo.mail ?? userInfo.userPrincipalName ?? null,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    });
    setLinkedProviders((prev) => [...new Set([...prev, "microsoft"])]);
  }, [user]);

  const updatePhoto = useCallback(async (photoUrl: string | null) => {
    if (!user) return;
    const updated: AuthUser = { ...user, photo: photoUrl };
    setUser(updated);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(updated));
    await updateUserPhoto(user.id, photoUrl).catch(() => {});
  }, [user]);

  const updateProfile = useCallback(async (data: { name?: string | null; email?: string | null }) => {
    if (!user) return;
    const updated: AuthUser = {
      ...user,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
    };
    setUser(updated);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(updated));
    await updateUserProfile(user.id, data).catch(() => {});
  }, [user]);

  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    if (!user) return false;
    return verifyUserPassword(user.id, password);
  }, [user]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) return;
    await updateUserPassword(user.id, currentPassword, newPassword);
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      if (user?.provider === "google") {
        await GoogleSignin.signOut();
      }
      if (user?.provider === "microsoft") {
        await SecureStore.deleteItemAsync(MS_REFRESH_TOKEN_KEY);
      }
      if (user?.provider === "email") {
        await SecureStore.deleteItemAsync(EMAIL_TOKEN_KEY);
      }
      // Apple has no programmatic sign-out API.
    } finally {
      setUser(null);
      setLinkedProviders([]);
      await SecureStore.deleteItemAsync(AUTH_USER_KEY);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        linkedProviders,
        getAccessToken,
        signInWithGoogle,
        signInWithApple,
        signInWithMicrosoft,
        linkWithGoogle,
        linkWithApple,
        linkWithMicrosoft,
        signUpWithEmail,
        signInWithEmail,
        updatePhoto,
        updateProfile,
        verifyPassword,
        updatePassword,
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
