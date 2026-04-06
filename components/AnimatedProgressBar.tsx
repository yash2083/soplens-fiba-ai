import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

interface Props {
  progress: number;
  message: string;
}

export function AnimatedProgressBar({ progress, message }: Props) {
  const colors = useColors();
  const animatedProgress = useSharedValue(0);
  const s = styles(colors);

  useEffect(() => {
    animatedProgress.value = withSpring(progress / 100, {
      damping: 20,
      stiffness: 80,
    });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: animatedProgress.value > 0.05 ? withTiming(0.6, { duration: 800 }) : 0,
  }));

  return (
    <View style={s.container}>
      <View style={s.labelRow}>
        <Text style={s.message} numberOfLines={1}>{message}</Text>
        <Text style={s.percent}>{Math.round(progress)}%</Text>
      </View>
      <View style={s.track}>
        <Animated.View style={[s.fill, barStyle]}>
          <Animated.View style={[s.glow, glowStyle]} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      gap: 8,
      paddingHorizontal: 0,
    },
    labelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    message: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      flex: 1,
      marginRight: 8,
    },
    percent: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    track: {
      height: 8,
      backgroundColor: colors.muted,
      borderRadius: 4,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 4,
      position: "relative",
      overflow: "hidden",
    },
    glow: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 30,
      backgroundColor: "#ffffff",
      borderRadius: 4,
    },
  });
