import * as AppleAuthentication from "expo-apple-authentication";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect, SvgUri } from "react-native-svg";
import { EditProfileSheet } from "../components/edit-profile-sheet";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/auth";
import { Asset } from "expo-asset";
const linkAssetUri = Asset.fromModule(require("@/assets/link.svg")).uri;
const editAssetUri = Asset.fromModule(require("@/assets/edit.svg")).uri;
function GoogleLogo({ size = 18 }: { size?: number }) {
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

function LinkIcon({ size = 18 }: { size?: number }) {
  return (
    <SvgUri width={size} height={size} color="#2E3135" uri={linkAssetUri} />
  );
}

function editIcon({ size = 18 }: { size?: number }) {
  return (
    <SvgUri width={size} height={size} color="#2E3135" uri={editAssetUri} />
  );
}

function MicrosoftLogo({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21">
      <Rect x="0" y="0" width="9" height="9" fill="#F25022" />
      <Rect x="12" y="0" width="9" height="9" fill="#7FBA00" />
      <Rect x="0" y="12" width="9" height="9" fill="#00A4EF" />
      <Rect x="12" y="12" width="9" height="9" fill="#FFB900" />
    </Svg>
  );
}

type LinkProvider = "google" | "apple" | "microsoft";


export default function ProfileScreen() {
  const {
    user,
    linkedProviders,
    linkWithGoogle,
    linkWithApple,
    linkWithMicrosoft,
    signOut,
  } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [linking, setLinking] = useState<LinkProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [refPersonalInfo, setRefPersonalInfo] = useState(true);
  const [refChatHistory, setRefChatHistory] = useState(true);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  async function handleLink(provider: LinkProvider) {
    if (linking) return;
    setError(null);
    setLinking(provider);
    try {
      if (provider === "google") await linkWithGoogle();
      else if (provider === "apple") await linkWithApple();
      else await linkWithMicrosoft();
    } catch (e) {
      const code = (e as any)?.code as string | undefined;
      if (
        (e instanceof Error && e.message === "canceled") ||
        code === "ERR_REQUEST_CANCELED"
      )
        return;
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLinking(null);
    }
  }

  const isLinked = (provider: string) => linkedProviders.includes(provider);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.back}
        >
          <ThemedText type="small" themeColor="textSecondary">
            ← Back
          </ThemedText>
        </Pressable>

        <View style={styles.userInfo}>
          <Pressable
            onPress={() => setEditSheetOpen(true)}
            style={styles.avatarWrapper}
          >
            {user?.photo ? (
              <Image
                source={{ uri: user.photo }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { backgroundColor: colors.backgroundSelected },
                ]}
              >
                <ThemedText type="default" style={styles.avatarInitial}>
                  {user?.name?.[0]?.toUpperCase() ?? "?"}
                </ThemedText>
              </View>
            )}
            <View
              style={[
                styles.editBadge,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                },
              ]}
            >
              <SvgUri
                width={14}
                height={14}
                color={colors.text}
                uri={editAssetUri}
              />
            </View>
          </Pressable>

          {user?.name && (
            <ThemedText type="default" style={styles.userName}>
              {user.name}
            </ThemedText>
          )}
        </View>

        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.sectionLabel}
        >
          LINKED ACCOUNTS
        </ThemedText>

        <View style={styles.providerList}>
          {/* Google */}
          <Pressable
            style={[
              styles.providerRow,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundSelected,
              },
            ]}
            onPress={() => handleLink("google")}
            disabled={!!linking || isLinked("google")}
          >
            <GoogleLogo />
            <Text style={[styles.providerLabel, { color: colors.text }]}>
              Google
            </Text>
            <View style={styles.providerStatus}>
              {linking === "google" ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : isLinked("google") ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Linked
                </ThemedText>
              ) : (
                <LinkIcon />
              )}
            </View>
          </Pressable>

          {/* Microsoft */}
          <Pressable
            style={[
              styles.providerRow,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundSelected,
              },
            ]}
            onPress={() => handleLink("microsoft")}
            disabled={!!linking || isLinked("microsoft")}
          >
            <MicrosoftLogo />
            <Text style={[styles.providerLabel, { color: colors.text }]}>
              Microsoft
            </Text>
            <View style={styles.providerStatus}>
              {linking === "microsoft" ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : isLinked("microsoft") ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Linked
                </ThemedText>
              ) : (
                <LinkIcon />
              )}
            </View>
          </Pressable>

          {/* Apple — iOS only */}
          {appleAvailable && (
            <Pressable
              style={[
                styles.providerRow,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                },
              ]}
              onPress={() => handleLink("apple")}
              disabled={!!linking || isLinked("apple")}
            >
              <SymbolView name="apple.logo" size={18} tintColor={colors.text} />
              <Text style={[styles.providerLabel, { color: colors.text }]}>
                Apple
              </Text>
              <View style={styles.providerStatus}>
                {linking === "apple" ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.textSecondary}
                  />
                ) : isLinked("apple") ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Linked
                  </ThemedText>
                ) : (
                  <LinkIcon />
                )}
              </View>
            </Pressable>
          )}
        </View>

        {error && (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.error}
          >
            {error}
          </ThemedText>
        )}

        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.sectionLabel}
        >
          MEMORY
        </ThemedText>

        <View style={styles.memoryList}>
          <View
            style={[
              styles.memoryCard,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundSelected,
              },
            ]}
          >
            <View style={styles.memoryRow}>
              <Text style={[styles.memoryOptionLabel, { color: colors.text }]}>
                Reference personal information
              </Text>
              <Switch
                value={refPersonalInfo}
                onValueChange={setRefPersonalInfo}
                trackColor={{
                  false: colors.backgroundSelected,
                  true: colors.wave,
                }}
                thumbColor={colors.background}
              />
            </View>
          </View>

          <View
            style={[
              styles.memoryCard,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundSelected,
              },
            ]}
          >
            <View style={styles.memoryRow}>
              <Text style={[styles.memoryOptionLabel, { color: colors.text }]}>
                Reference chat history
              </Text>
              <Switch
                value={refChatHistory}
                onValueChange={setRefChatHistory}
                trackColor={{
                  false: colors.backgroundSelected,
                  true: colors.wave,
                }}
                thumbColor={colors.background}
              />
            </View>
          </View>
        </View>

        <Pressable onPress={signOut} style={styles.signOut}>
          <ThemedText type="small" themeColor="textSecondary">
            Sign out
          </ThemedText>
        </Pressable>
      </SafeAreaView>

      <EditProfileSheet
        visible={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  back: {
    paddingTop: Spacing.two,
  },
  userInfo: {
    marginTop: Spacing.four,
    alignItems: "center",
    gap: Spacing.two,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: "600",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontWeight: "600",
    fontSize: 18,
  },
  sectionLabel: {
    marginTop: Spacing.five,
    marginBottom: Spacing.two,
    letterSpacing: 0.8,
    fontSize: 11,
  },
  providerList: {
    gap: Spacing.two,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  providerLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  providerStatus: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  error: {
    marginTop: Spacing.three,
    textAlign: "center",
  },
  memoryList: {
    gap: Spacing.two,
  },
  memoryCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  memoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  memoryOptionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
  },
  signOut: {
    marginTop: "auto",
    paddingBottom: Spacing.four,
  },
});
