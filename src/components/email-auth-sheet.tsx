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

import { ThemedText } from "@/components/themed-text";
import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/auth";

const SHEET_HEIGHT = Dimensions.get("window").height * 0.9;
const DISMISS_THRESHOLD = 100;
const DISMISS_VELOCITY = 500;

type Mode = "signup" | "login";

type Props = {
  mode: Mode;
  visible: boolean;
  onClose: () => void;
};

export function EmailAuthSheet({ mode: initialMode, visible, onClose }: Props) {
  const { signUpWithEmail, signInWithEmail } = useAuth();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const translateY = useSharedValue(SHEET_HEIGHT);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Reset form after close animation completes
  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setError(null);
        setIsSubmitting(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onClose],
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  function switchMode() {
    setMode((m) => (m === "signup" ? "login" : "signup"));
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setError(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Animated.View
      style={[styles.sheet, { backgroundColor: colors.background }, animStyle]}
    >
      {/* Drag handle + header — these are the gesture target */}
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
            <View style={styles.closeButton} />
            <ThemedText type="default" style={styles.headerTitle}>
              {mode === "signup" ? "Create account" : "Log in"}
            </ThemedText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeButton}
            >
              <Text style={[styles.closeIcon, { color: colors.text }]}>✕</Text>
            </Pressable>
          </View>
        </View>
      </GestureDetector>

      {/* Scrollable form — not part of the pan gesture */}
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
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                },
              ]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
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
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              textContentType={mode === "signup" ? "newPassword" : "password"}
              value={password}
              onChangeText={setPassword}
            />
            {mode === "signup" && (
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                placeholder="Confirm password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                textContentType="newPassword"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
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
                styles.submitButton,
                { backgroundColor: colors.text },
                isSubmitting && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={[styles.submitText, { color: colors.background }]}>
                  {mode === "signup" ? "Create account" : "Log in"}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={switchMode} style={styles.switchModeButton}>
              <ThemedText type="small" themeColor="textSecondary">
                {mode === "signup"
                  ? "Already have an account? Log in"
                  : "Don't have an account? Sign up"}
              </ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  flex: {
    flex: 1,
  },
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
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  input: {
    width: 280,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  error: {
    width: 280,
    textAlign: "center",
  },
  submitButton: {
    width: 280,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.one,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
  },
  switchModeButton: {
    paddingVertical: Spacing.two,
  },
});
