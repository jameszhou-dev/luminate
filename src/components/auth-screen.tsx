import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

import { EmailAuthSheet } from "@/components/email-auth-sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WaveBackground } from "@/components/wave-background";
import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/auth";

type Provider = "google" | "apple" | "microsoft";
type EmailMode = "signup" | "login";

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

function MicrosoftLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21">
      <Rect x="0" y="0" width="9" height="9" fill="#F25022" />
      <Rect x="12" y="0" width="9" height="9" fill="#7FBA00" />
      <Rect x="0" y="12" width="9" height="9" fill="#00A4EF" />
      <Rect x="12" y="12" width="9" height="9" fill="#FFB900" />
    </Svg>
  );
}

export function SignInScreen() {
  const { signInWithGoogle, signInWithApple, signInWithMicrosoft } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSheetMode, setEmailSheetMode] = useState<EmailMode | null>(null);
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  async function handleSignIn(provider: Provider) {
    if (loadingProvider) return;
    setError(null);
    setLoadingProvider(provider);
    try {
      if (provider === "apple") await signInWithApple();
      else if (provider === "microsoft") await signInWithMicrosoft();
      else await signInWithGoogle();
    } catch (e) {
      const code = (e as any)?.code as string | undefined;
      if (
        (e instanceof Error && e.message === "canceled") ||
        code === "ERR_REQUEST_CANCELED"
      )
        return;
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Sign in failed. Please try again.");
      }
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <WaveBackground color={colors.wave} />
      <SafeAreaView style={styles.inner}>
        <View style={styles.hero}>
          <ThemedText type="title" style={styles.title}>
            luminate
          </ThemedText>
          <ThemedText
            type="default"
            themeColor="textSecondary"
            style={styles.subtitle}
          >
            Your personal AI assistant
          </ThemedText>
        </View>

        <View style={styles.actions}>
          {appleAvailable && (
            <View
              style={[
                styles.providerButton,
                loadingProvider && loadingProvider !== "apple"
                  ? styles.idle
                  : undefined,
              ]}
            >
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                }
                buttonStyle={
                  scheme === "dark"
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={12}
                style={styles.providerButton}
                onPress={() => handleSignIn("apple")}
              />
            </View>
          )}
          <Pressable
            disabled={!!loadingProvider}
            style={[
              styles.providerButton,
              styles.googleButton,
              scheme === "dark"
                ? styles.googleButtonDark
                : styles.googleButtonLight,
              loadingProvider && loadingProvider !== "google"
                ? styles.idle
                : undefined,
            ]}
            onPress={() => handleSignIn("google")}
          >
            {loadingProvider === "google" ? (
              <ActivityIndicator
                size="small"
                color={scheme === "dark" ? "#E3E3E3" : "#3c4043"}
              />
            ) : (
              <>
                <GoogleLogo size={20} />
                <Text
                  style={[
                    styles.providerText,
                    scheme === "dark"
                      ? styles.googleTextDark
                      : styles.googleTextLight,
                  ]}
                >
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>
          <Pressable
            disabled={!!loadingProvider}
            style={[
              styles.providerButton,
              styles.microsoftButton,
              scheme === "dark"
                ? styles.microsoftButtonDark
                : styles.microsoftButtonLight,
              loadingProvider && loadingProvider !== "microsoft"
                ? styles.idle
                : undefined,
            ]}
            onPress={() => handleSignIn("microsoft")}
          >
            {loadingProvider === "microsoft" ? (
              <ActivityIndicator
                size="small"
                color={scheme === "dark" ? "#ffffff" : "#5E5E5E"}
              />
            ) : (
              <>
                <MicrosoftLogo size={20} />
                <Text
                  style={[
                    styles.providerText,
                    scheme === "dark"
                      ? styles.microsoftTextDark
                      : styles.microsoftTextLight,
                  ]}
                >
                  Continue with Microsoft
                </Text>
              </>
            )}
          </Pressable>
          {error && (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.error}
            >
              {error}
            </ThemedText>
          )}

          {/* Email auth separator */}
          <View style={styles.separator}>
            <View
              style={[
                styles.separatorLine,
                { backgroundColor: colors.backgroundSelected },
              ]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              or
            </ThemedText>
            <View
              style={[
                styles.separatorLine,
                { backgroundColor: colors.backgroundSelected },
              ]}
            />
          </View>

          {/* Email buttons */}
          <Pressable
            disabled={!!loadingProvider}
            style={[
              styles.providerButton,
              styles.emailButton,
              scheme === "dark"
                ? styles.emailButtonDark
                : styles.emailButtonLight,
            ]}
            onPress={() => setEmailSheetMode("signup")}
          >
            <Text
              style={[
                styles.providerText,
                scheme === "dark"
                  ? styles.emailTextDark
                  : styles.emailTextLight,
              ]}
            >
              Sign up with email
            </Text>
          </Pressable>
          <Pressable
            disabled={!!loadingProvider}
            style={[
              styles.providerButton,
              styles.emailButton,
              scheme === "dark"
                ? styles.emailButtonDark
                : styles.emailButtonLight,
            ]}
            onPress={() => setEmailSheetMode("login")}
          >
            <Text
              style={[
                styles.providerText,
                scheme === "dark"
                  ? styles.emailTextDark
                  : styles.emailTextLight,
              ]}
            >
              Log in with email
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <EmailAuthSheet
        mode={emailSheetMode ?? "signup"}
        visible={emailSheetMode !== null}
        onClose={() => setEmailSheetMode(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    justifyContent: "space-between",
    paddingBottom: Spacing.six,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  actions: {
    alignItems: "center",
    gap: Spacing.two,
  },
  providerButton: {
    width: 220,
    height: 50,
  },
  providerText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // Google
  googleButton: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleButtonLight: {
    backgroundColor: "#ffffff",
    borderColor: "#dadce0",
  },
  googleButtonDark: {
    backgroundColor: "#131314",
    borderColor: "#8E918F",
  },
  googleTextLight: {
    color: "#3c4043",
  },
  googleTextDark: {
    color: "#E3E3E3",
  },
  // Microsoft
  microsoftButton: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  microsoftButtonLight: {
    backgroundColor: "#ffffff",
    borderColor: "#dadce0",
  },
  microsoftButtonDark: {
    backgroundColor: "#2F2F2F",
    borderColor: "#8E918F",
  },
  microsoftTextLight: {
    color: "#5E5E5E",
  },
  microsoftTextDark: {
    color: "#ffffff",
  },
  idle: {
    opacity: 0.4,
  },
  error: {
    textAlign: "center",
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    width: 220,
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  emailButton: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emailButtonLight: {
    backgroundColor: "#ffffff",
    borderColor: "#dadce0",
  },
  emailButtonDark: {
    backgroundColor: "#131314",
    borderColor: "#8E918F",
  },
  emailTextLight: {
    color: "#3c4043",
  },
  emailTextDark: {
    color: "#E3E3E3",
  },
});
