import { Pressable, StyleSheet, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";

type Props = { onSignUp: () => void };

export function SignInScreen({ onSignUp }: Props) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <View style={styles.hero}>
          <ThemedText type="title" style={styles.title}>
            iluminate
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
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.text, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={onSignUp}
          >
            <ThemedText style={[styles.buttonText, { color: colors.background }]}>
              Sign up
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.buttonOutline,
              { borderColor: colors.text, opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => {}}
          >
            <ThemedText style={styles.buttonText}>Log in</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
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
    gap: Spacing.two,
  },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
