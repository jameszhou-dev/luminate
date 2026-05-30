import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Provider = 'google' | 'apple' | 'microsoft';

export function SignInScreen() {
  const { signInWithGoogle, signInWithApple, signInWithMicrosoft } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  async function handleSignIn(provider: Provider) {
    setError(null);
    setIsSigningIn(true);
    try {
      if (provider === 'apple') await signInWithApple();
      else if (provider === 'microsoft') await signInWithMicrosoft();
      else await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <View style={styles.hero}>
          <ThemedText type="title" style={styles.title}>
            luminate
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            Sign in to continue
          </ThemedText>
        </View>

        <View style={styles.actions}>
          {isSigningIn ? (
            <ActivityIndicator size="large" />
          ) : (
            <>
              {appleAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={4}
                  style={styles.appleButton}
                  onPress={() => handleSignIn('apple')}
                />
              )}
              <GoogleSigninButton
                size={GoogleSigninButton.Size.Wide}
                color={GoogleSigninButton.Color.Dark}
                onPress={() => handleSignIn('google')}
              />
              <Pressable
                style={({ pressed }) => [styles.microsoftButton, pressed && styles.microsoftButtonPressed]}
                onPress={() => handleSignIn('microsoft')}
              >
                <ThemedText style={styles.microsoftButtonText}>
                  Sign in with Microsoft
                </ThemedText>
              </Pressable>
            </>
          )}
          {error && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.error}>
              {error}
            </ThemedText>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
    paddingBottom: Spacing.six,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  appleButton: {
    width: 192,
    height: 44,
  },
  microsoftButton: {
    width: 192,
    height: 44,
    backgroundColor: '#0078d4',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microsoftButtonPressed: {
    backgroundColor: '#006cbf',
  },
  microsoftButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    textAlign: 'center',
  },
});
