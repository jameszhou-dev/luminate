import { SignInScreen } from "@/components/auth-screen";
import { AuthProvider, useAuth } from "@/context/auth";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function RootContent() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <SignInScreen />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <RootContent />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
