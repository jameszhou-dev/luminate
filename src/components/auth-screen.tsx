import { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmailAuthSheet } from "@/components/email-auth-sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WaveBackground } from "@/components/wave-background";
import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";

type EmailMode = "signup" | "login";

export function SignInScreen() {
  const [emailSheetMode, setEmailSheetMode] = useState<EmailMode | null>(null);
  const lastEmailMode = useRef<EmailMode>("signup");
  if (emailSheetMode !== null) lastEmailMode.current = emailSheetMode;
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

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
          <Pressable
            style={[
              styles.button,
              scheme === "dark" ? styles.buttonDark : styles.buttonLight,
            ]}
            onPress={() => setEmailSheetMode("signup")}
          >
            <Text
              style={[
                styles.buttonText,
                scheme === "dark"
                  ? styles.buttonTextDark
                  : styles.buttonTextLight,
              ]}
            >
              Sign up
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.button,
              scheme === "dark" ? styles.buttonDark : styles.buttonLight,
            ]}
            onPress={() => setEmailSheetMode("login")}
          >
            <Text
              style={[
                styles.buttonText,
                scheme === "dark"
                  ? styles.buttonTextDark
                  : styles.buttonTextLight,
              ]}
            >
              Log in
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <EmailAuthSheet
        mode={lastEmailMode.current}
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
    paddingBottom: Spacing.seven,
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
  button: {
    width: 220,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLight: {
    backgroundColor: "#ffffff",
    borderColor: "#dadce0",
  },
  buttonDark: {
    backgroundColor: "#131314",
    borderColor: "#8E918F",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  buttonTextLight: {
    color: "#3c4043",
  },
  buttonTextDark: {
    color: "#E3E3E3",
  },
});
