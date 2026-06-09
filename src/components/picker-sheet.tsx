import { useEffect, useMemo } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
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

const SHEET_HEIGHT = Dimensions.get("window").height * 0.45;
const DISMISS_THRESHOLD = 80;
const DISMISS_VELOCITY = 500;

export type PickerOption = {
  value: string;
  label: string;
  description?: string;
};

type Props = {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

export function PickerSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: Props) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const translateY = useSharedValue(SHEET_HEIGHT);

  useEffect(() => {
    translateY.value = visible
      ? withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) })
      : withTiming(SHEET_HEIGHT, {
          duration: 300,
          easing: Easing.in(Easing.cubic),
        });
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

  function handleSelect(value: string) {
    onSelect(value);
    onClose();
  }

  return (
    <>
      {visible && (
        <Pressable style={styles.backdrop} onPress={onClose} />
      )}
      <Animated.View
        style={[styles.sheet, { backgroundColor: colors.background }, animStyle]}
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
                {title}
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
          <View style={styles.optionList}>
            {options.map((opt, i) => {
              const isSelected = opt.value === selected;
              const isLast = i === options.length - 1;
              return (
                <View key={opt.value}>
                  <Pressable
                    style={styles.optionRow}
                    onPress={() => handleSelect(opt.value)}
                  >
                    <View style={styles.optionText}>
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: isSelected ? colors.wave : colors.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {opt.description && (
                        <ThemedText type="small" themeColor="textSecondary">
                          {opt.description}
                        </ThemedText>
                      )}
                    </View>
                    {isSelected && (
                      <Text style={[styles.checkmark, { color: colors.wave }]}>
                        ✓
                      </Text>
                    )}
                  </Pressable>
                  {!isLast && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.backgroundSelected },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
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
  optionList: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    borderRadius: 12,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  optionText: {
    flex: 1,
    gap: Spacing.half,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  checkmark: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: Spacing.two,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.three,
  },
});
