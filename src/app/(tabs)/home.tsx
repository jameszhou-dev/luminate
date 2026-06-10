import { Asset } from "expo-asset";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SiriAnimation } from "@/components/voice-animation";
import {
  BottomTabInset,
  Colors,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { useAuth } from "@/context/auth";
import { sendMessage } from "@/services/chat";

const profileAssetUri = Asset.fromModule(require("@/assets/profile.svg")).uri;

type Message = { role: "user" | "assistant"; text: string };

function ProfileIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <SvgUri width={size} height={size} color={color} uri={profileAssetUri} />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const sessionId = useRef<string | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setText("");
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setSending(true);

    try {
      const result = await sendMessage(trimmed, sessionId.current);
      sessionId.current = result.sessionId;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.response },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.root}>
      <ThemedView style={styles.container} />
      <SiriAnimation />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Pressable
            onPress={() => router.push("/profile-screen")}
            hitSlop={12}
            style={styles.profileButton}
          >
            <ProfileIcon color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                msg.role === "user"
                  ? styles.bubbleUser
                  : styles.bubbleAssistant,
                {
                  backgroundColor:
                    msg.role === "user"
                      ? colors.backgroundSelected + "60"
                      : colors.backgroundElement + "60",
                },
              ]}
            >
              <ThemedText type="default">{msg.text}</ThemedText>
            </View>
          ))}
          {sending && (
            <View
              style={[
                styles.bubble,
                styles.bubbleAssistant,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: colors.backgroundSelected,
            },
          ]}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[styles.input, { color: colors.text }]}
          />
          <Pressable
            hitSlop={8}
            style={[
              styles.micButton,
              { backgroundColor: colors.backgroundSelected },
            ]}
          >
            <SymbolView
              name="microphone.fill"
              size={14}
              tintColor={colors.text}
            />
          </Pressable>
          <Pressable
            onPress={handleSend}
            hitSlop={8}
            style={[styles.sendButton, { backgroundColor: colors.text }]}
          >
            <SymbolView
              name="arrow.up"
              size={14}
              tintColor={colors.background}
              weight="semibold"
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    ...StyleSheet.absoluteFill,
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
  messageList: {
    flex: 1,
  },
  messageListContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bubbleUser: {
    alignSelf: "flex-end",
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
  },
  inputRow: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    maxHeight: 130,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
  },
  micButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.one,
    marginBottom: 2,
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.one,
    marginBottom: 2,
  },
});
