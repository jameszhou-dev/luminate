import { Asset } from "expo-asset";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/auth";

const editAssetUri = Asset.fromModule(require("@/assets/edit.svg")).uri;

const SHEET_HEIGHT = Dimensions.get("window").height * 0.9;
const DISMISS_THRESHOLD = 100;
const DISMISS_VELOCITY = 500;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function EditProfileSheet({ visible, onClose }: Props) {
  const { user, updatePhoto, updateProfile, verifyPassword, updatePassword } =
    useAuth();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  const translateY = useSharedValue(SHEET_HEIGHT);

  useEffect(() => {
    translateY.value = visible
      ? withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) })
      : withTiming(SHEET_HEIGHT, {
          duration: 300,
          easing: Easing.in(Easing.cubic),
        });
  }, [visible]);

  // Sync fields when sheet opens
  useEffect(() => {
    if (visible) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setCurrentPassword("");
      setPasswordVerified(false);
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [visible]);

  // Reset after close animation
  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
        setSaving(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          translateY.value = Math.max(0, e.translationY);
        })
        .onEnd((e) => {
          if (
            e.translationY > DISMISS_THRESHOLD ||
            e.velocityY > DISMISS_VELOCITY
          ) {
            translateY.value = withTiming(
              SHEET_HEIGHT,
              { duration: 260, easing: Easing.in(Easing.cubic) },
              () => runOnJS(onClose)(),
            );
          } else {
            translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
          }
        }),
    [onClose],
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));


  const isEmailProvider = user?.provider === "email";

  async function handlePickPhoto() {
    if (pickingPhoto) return;
    setPickingPhoto(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") return;
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: "photo",
        first: 1,
      });
      if (assets.length === 0) return;
      const asset = await MediaLibrary.getAssetInfoAsync(assets[0]);
      await updatePhoto(asset.localUri ?? asset.uri);
    } finally {
      setPickingPhoto(false);
    }
  }

  async function handleVerify() {
    if (verifying || !currentPassword) return;
    setError(null);
    setVerifying(true);
    try {
      const valid = await verifyPassword(currentPassword);
      if (valid) {
        setPasswordVerified(true);
      } else {
        setError("Incorrect password.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    setError(null);

    const trimmedName = name.trim() || null;
    const trimmedEmail = email.trim().toLowerCase() || null;

    if (passwordVerified) {
      if (!newPassword) {
        setError("Enter a new password.");
        return;
      }
      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setSaving(true);
    try {
      await updateProfile({ name: trimmedName, email: trimmedEmail });
      if (passwordVerified && newPassword) {
        await updatePassword(currentPassword, newPassword);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {visible && (
        <Pressable style={styles.backdrop} onPress={onClose} />
      )}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.background },
          animStyle,
        ]}
      >
        <GestureDetector gesture={panGesture}>
          <View>
            <View style={styles.dragHandleRow}>
              <View
                style={[
                  styles.dragHandle,
                  { backgroundColor: colors.backgroundSelected },
                ]}
              />
            </View>
            <View style={styles.header}>
              <View style={styles.headerSide} />
              <ThemedText type="default" style={styles.headerTitle}>
                Edit profile
              </ThemedText>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={styles.headerSide}
              >
                <Text style={[styles.closeIcon, { color: colors.text }]}>
                  ✕
                </Text>
              </Pressable>
            </View>
          </View>
        </GestureDetector>

        <SafeAreaView edges={["bottom"]} style={styles.flex}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Avatar */}
              <Pressable onPress={handlePickPhoto} style={styles.avatarWrapper}>
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
                {pickingPhoto ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#ffffff" />
                  </View>
                ) : (
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
                      width={12}
                      height={12}
                      color={colors.text}
                      uri={editAssetUri}
                    />
                  </View>
                )}
              </Pressable>

              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.sectionLabel}
              >
                PROFILE
              </ThemedText>

              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                placeholder="Name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                textContentType="name"
                autoCorrect={false}
                value={name}
                onChangeText={setName}
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                  !isEmailProvider && styles.inputDisabled,
                ]}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCorrect={false}
                editable={isEmailProvider}
                value={email}
                onChangeText={setEmail}
              />

              {isEmailProvider && (
                <>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.sectionLabel}
                  >
                    PASSWORD
                  </ThemedText>

                  {!passwordVerified ? (
                    <View style={styles.verifyRow}>
                      <TextInput
                        style={[
                          styles.input,
                          styles.verifyInput,
                          {
                            color: colors.text,
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.backgroundSelected,
                          },
                        ]}
                        placeholder="Current password"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry
                        textContentType="password"
                        value={currentPassword}
                        onChangeText={(v) => {
                          setCurrentPassword(v);
                          setError(null);
                        }}
                      />
                      <Pressable
                        style={[
                          styles.verifyButton,
                          {
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.backgroundSelected,
                          },
                          (!currentPassword || verifying) &&
                            styles.verifyButtonDisabled,
                        ]}
                        onPress={handleVerify}
                        disabled={!currentPassword || verifying}
                      >
                        {verifying ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.textSecondary}
                          />
                        ) : (
                          <Text
                            style={[
                              styles.verifyButtonText,
                              { color: colors.text },
                            ]}
                          >
                            Verify
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            color: colors.text,
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.backgroundSelected,
                          },
                        ]}
                        placeholder="New password"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry
                        textContentType="newPassword"
                        autoFocus
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          {
                            color: colors.text,
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.backgroundSelected,
                          },
                        ]}
                        placeholder="Confirm new password"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry
                        textContentType="newPassword"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                      />
                    </>
                  )}
                </>
              )}

              {error && (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.error}
                >
                  {error}
                </ThemedText>
              )}

              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.text },
                  saving && styles.saveDisabled,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={[styles.saveText, { color: colors.background }]}>
                    Save
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  dragHandleRow: {
    alignItems: "center",
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  headerSide: {
    width: 36,
    height: 36,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: "500",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
  },
  form: {
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: Spacing.one,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: "600",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
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
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    alignSelf: "flex-start",
    letterSpacing: 0.8,
    fontSize: 11,
    marginBottom: -Spacing.one,
  },
  input: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  inputDisabled: {
    opacity: 0.45,
  },
  verifyRow: {
    width: "100%",
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "center",
  },
  verifyInput: {
    flex: 1,
  },
  verifyButton: {
    height: 50,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  verifyButtonDisabled: {
    opacity: 0.45,
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  verifiedLabel: {
    alignSelf: "flex-start",
    fontSize: 13,
  },
  error: {
    width: "100%",
    textAlign: "center",
  },
  saveButton: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.one,
  },
  saveDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
