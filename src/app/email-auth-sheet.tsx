// This file exists only to satisfy Expo Router's file-system scanner.
// The actual component lives in src/components/email-auth-sheet.tsx.
export { EmailAuthSheet } from "@/components/email-auth-sheet";

import { Redirect } from "expo-router";
export default function EmailAuthSheetRoute() {
  return <Redirect href="/" />;
}
