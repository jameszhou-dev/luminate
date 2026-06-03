// This file exists only to satisfy Expo Router's file-system scanner.
// The actual component lives in src/components/auth-screen.tsx.
export { SignInScreen } from "@/components/auth-screen";

import { Redirect } from "expo-router";
export default function AuthScreenRoute() {
  return <Redirect href="/" />;
}
