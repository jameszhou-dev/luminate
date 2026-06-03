import { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// PATH_W is double the screen so we can translate left by SCREEN_W for a seamless loop.
// The wave has 2 full cycles across PATH_W, meaning 1 cycle per SCREEN_W — so the
// value at x=0 exactly matches the value at x=SCREEN_W.
const PATH_W = SCREEN_W * 2;

function buildWavePath(
  centerY: number,
  amplitude: number,
  phaseOffset: number,
): string {
  const steps = 120;
  const parts: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * PATH_W;
    const y =
      centerY + amplitude * Math.sin((i / steps) * Math.PI * 4 + phaseOffset);
    parts.push(
      i === 0
        ? `M ${x.toFixed(1)} ${y.toFixed(1)}`
        : `L ${x.toFixed(1)} ${y.toFixed(1)}`,
    );
  }

  // Close the shape down to the bottom of the screen to create the filled area.
  parts.push(`L ${PATH_W} ${SCREEN_H} L 0 ${SCREEN_H} Z`);
  return parts.join(" ");
}

type Props = { color: string };

export function WaveBackground({ color }: Props) {
  const centerY = SCREEN_H * 0.55;

  // Two wave layers — different amplitudes, speeds, and phase offsets for depth.
  const path1 = useMemo(() => buildWavePath(centerY, 24, 0), [centerY]);
  const path2 = useMemo(
    () => buildWavePath(centerY + 20, 16, Math.PI * 0.65),
    [centerY],
  );

  const tx1 = useSharedValue(0);
  const tx2 = useSharedValue(0);

  useEffect(() => {
    tx1.value = withRepeat(
      withTiming(-SCREEN_W, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );
    tx2.value = withRepeat(
      withTiming(-SCREEN_W, { duration: 5500, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const animStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateX: tx1.value }],
  }));

  const animStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateX: tx2.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.layer, animStyle1]}>
        <Svg width={PATH_W} height={SCREEN_H}>
          <Path d={path1} fill={color} fillOpacity={0.1} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.layer, animStyle2]}>
        <Svg width={PATH_W} height={SCREEN_H}>
          <Path d={path2} fill={color} fillOpacity={0.06} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PATH_W,
    height: SCREEN_H,
  },
});
