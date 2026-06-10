import { BlurView } from "expo-blur";
import { memo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const CX = width / 2;
const CY = height * 0.42;

const RADIUS = 150;
const DIAMETER = RADIUS * 2;

const hz = (period: number) => {
  "worklet";
  return (Math.PI * 2) / period;
};

type CloudConfig = {
  px: number;
  py: number;
  ox: number;
  oy: number;
  ax: number;
  ay: number;
  color: string;
};

const CLOUDS: CloudConfig[] = [
  {
    px: 9.0,
    py: 12.5,
    ox: 0.0,
    oy: 0.0,
    ax: 120,
    ay: 115,
    color: "rgba(255,80,120,0.55)",
  },
  {
    px: 7.3,
    py: 6.8,
    ox: 1.0,
    oy: 2.1,
    ax: 130,
    ay: 120,
    color: "rgba(255,160,40,0.55)",
  },
  {
    px: 11.5,
    py: 15.2,
    ox: 3.0,
    oy: 0.8,
    ax: 115,
    ay: 130,
    color: "rgba(180,60,255,0.55)",
  },
  {
    px: 5.8,
    py: 10.3,
    ox: 2.2,
    oy: 1.5,
    ax: 125,
    ay: 110,
    color: "rgba(255, 116, 148, 0.76)",
  },
  {
    px: 13.1,
    py: 8.7,
    ox: 0.5,
    oy: 3.2,
    ax: 110,
    ay: 125,
    color: "rgba(255, 158, 40, 0.64)",
  },
  {
    px: 8.4,
    py: 14.6,
    ox: 1.8,
    oy: 0.3,
    ax: 120,
    ay: 120,
    color: "rgba(180, 60, 255, 0.64)",
  },
  {
    px: 6.2,
    py: 11.9,
    ox: 3.5,
    oy: 2.7,
    ax: 130,
    ay: 115,
    color: "rgba(255, 100, 80, 0.62)",
  },
  {
    px: 10.7,
    py: 7.4,
    ox: 0.9,
    oy: 1.1,
    ax: 115,
    ay: 130,
    color: "rgba(155, 125, 255, 0.69)",
  },
  {
    px: 14.3,
    py: 9.8,
    ox: 2.6,
    oy: 0.6,
    ax: 125,
    ay: 110,
    color: "rgba(255,200,60,0.40)",
  },
  {
    px: 7.9,
    py: 13.5,
    ox: 1.3,
    oy: 3.8,
    ax: 110,
    ay: 125,
    color: "rgba(235, 61, 192, 0.4)",
  },
];

function Cloud({ t, c }: { t: SharedValue<number>; c: CloudConfig }) {
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          RADIUS + Math.sin(t.value * hz(c.px) + c.ox) * c.ax - RADIUS,
      },
      {
        translateY:
          RADIUS + Math.cos(t.value * hz(c.py) + c.oy) * c.ay - RADIUS,
      },
    ],
  }));

  return (
    <Animated.View
      style={[styles.cloud, { backgroundColor: c.color }, style]}
    />
  );
}

export const SiriAnimation = memo(function SiriAnimation() {
  const t = useSharedValue(0);

  useFrameCallback((info) => {
    t.value = info.timeSinceFirstFrame / 300;
  });

  return (
    <View style={styles.fill} pointerEvents="none">
      {/* orb clips the clouds to a circle */}
      <View style={styles.orb}>
        {CLOUDS.map((c, i) => (
          <Cloud key={i} t={t} c={c} />
        ))}
      </View>
      {/* BlurView is a SIBLING of the orb, not a child — avoids UIVisualEffectView + masksToBounds conflict */}
      <BlurView intensity={80} tint="light" style={styles.blurOrb} />
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
  orb: {
    position: "absolute",
    width: DIAMETER,
    height: DIAMETER,
    borderRadius: RADIUS,
    overflow: "hidden",
    left: CX - RADIUS,
    top: CY - RADIUS,
    backgroundColor: "rgb(255, 255, 255)",
    shadowColor: "#208AEF",
    shadowRadius: 24,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
  },
  blurOrb: {
    position: "absolute",
    width: DIAMETER,
    height: DIAMETER,
    borderRadius: RADIUS,
    overflow: "hidden",
    left: CX - RADIUS,
    top: CY - RADIUS,
  },
  cloud: {
    position: "absolute",
    width: DIAMETER,
    height: DIAMETER,
    borderRadius: RADIUS,
  },
});
