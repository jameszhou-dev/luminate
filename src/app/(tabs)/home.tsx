import { Asset } from "expo-asset";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  Colors,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { useAuth } from "@/context/auth";

const profileAssetUri = Asset.fromModule(require("@/assets/profile.svg")).uri;

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  function ProfileIcon({ size = 20 }: { size?: number }) {
    return (
      <SvgUri
        width={size}
        height={size}
        color={colors.backgroundElement}
        uri={profileAssetUri}
      />
    );
  }
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Pressable
            onPress={() => router.push("/profile-screen")}
            hitSlop={12}
            style={styles.profileButton}
          >
            <ProfileIcon />
          </Pressable>
        </View>

        <Pressable onPress={signOut} style={styles.signOut}>
          <ThemedText type="small" themeColor="textSecondary">
            Sign out
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    width: "100%",
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Spacing.two,
  },
  headerSpacer: {
    flex: 1,
  },
  profileButton: {
    padding: Spacing.one,
  },
  signOut: {
    marginTop: Spacing.three,
  },
});
