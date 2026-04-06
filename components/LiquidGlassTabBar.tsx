import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const TAB_HEIGHT = 58;
const N_TABS = 3;
const BLOB_H = 36;

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export function LiquidGlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { width: screenWidth } = useWindowDimensions();
  const tabWidth = screenWidth / N_TABS;

  const totalHeight = TAB_HEIGHT + insets.bottom;

  // ─── Blob slide ─────────────────────────────────────────────────────────────
  const blobX = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(blobX, {
      toValue: state.index,
      damping: 18,
      stiffness: 200,
      mass: 0.8,
      useNativeDriver: false,
    }).start();
  }, [state.index]);

  // ─── Shimmer sweep ──────────────────────────────────────────────────────────
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // ─── Per-tab press scale animations ────────────────────────────────────────
  const scaleAnims = useRef(
    Array.from({ length: N_TABS }, () => new Animated.Value(1))
  ).current;

  // ─── Per-tab hover glow ──────────────────────────────────────────────────────
  const hoverAnims = useRef(
    Array.from({ length: N_TABS }, () => new Animated.Value(0))
  ).current;

  function pressTab(index: number, route: any, isFocused: boolean) {
    // Bounce
    Animated.sequence([
      Animated.spring(scaleAnims[index], {
        toValue: 0.84,
        damping: 10,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        damping: 12,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  }

  // Glass background colors
  const glassBg = isDark ? "rgba(12,12,12,0.82)" : "rgba(250,250,250,0.82)";
  const blobColor = isDark ? "rgba(255,255,255,0.11)" : "rgba(0,0,0,0.07)";
  const borderTop = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)";
  const highlightColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.9)";
  const shimmerColors = isDark
    ? (["transparent", "rgba(255,255,255,0.06)", "transparent"] as const)
    : (["transparent", "rgba(255,255,255,0.72)", "transparent"] as const);

  return (
    <View style={[s.container, { height: totalHeight }]}>

      {/* ── Glass background ──────────────────────────────────────────────── */}
      {isIOS ? (
        <BlurView
          intensity={90}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: glassBg },
            isWeb && (s.webBlur as any),
          ]}
        />
      )}

      {/* ── Top hairline border ────────────────────────────────────────────── */}
      <View style={[s.topBorder, { backgroundColor: borderTop }]} />

      {/* ── Inner specular highlight ──────────────────────────────────────── */}
      <View
        style={[s.innerHighlight, { backgroundColor: highlightColor }]}
        pointerEvents="none"
      />

      {/* ── Shimmer sweep (light reflection across glass surface) ──────────── */}
      <Animated.View
        style={[
          s.shimmerTrack,
          {
            transform: [
              {
                translateX: shimmer.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-200, screenWidth + 200],
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.shimmerGrad}
        />
      </Animated.View>

      {/* ── Content row ───────────────────────────────────────────────────── */}
      <View style={[s.tabRow, { height: TAB_HEIGHT }]}>

        {/* Animated blob pill behind active tab */}
        <Animated.View
          style={[
            s.blob,
            {
              backgroundColor: blobColor,
              left: blobX.interpolate({
                inputRange: [0, 1, 2],
                outputRange: [
                  tabWidth * 0 + 8,
                  tabWidth * 1 + 8,
                  tabWidth * 2 + 8,
                ],
              }),
              width: tabWidth - 16,
            },
          ]}
          pointerEvents="none"
        />

        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const activeColor = isDark ? colors.primary : colors.primary;
          const color = isFocused ? activeColor : colors.mutedForeground;
          const icon = options.tabBarIcon?.({ focused: isFocused, color, size: 22 });
          const label: string = (options.title as string) ?? route.name;

          return (
            <Pressable
              key={route.key}
              style={s.tabItem}
              onPress={() => pressTab(index, route, isFocused)}
              onHoverIn={() => {
                if (!isWeb) return;
                Animated.timing(hoverAnims[index], {
                  toValue: 1,
                  duration: 150,
                  useNativeDriver: true,
                }).start();
              }}
              onHoverOut={() => {
                if (!isWeb) return;
                Animated.timing(hoverAnims[index], {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start();
              }}
              testID={`tab-${route.name}`}
            >
              {/* Hover glow */}
              <Animated.View
                style={[
                  s.hoverGlow,
                  {
                    opacity: hoverAnims[index],
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.07)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
                pointerEvents="none"
              />

              <Animated.View
                style={[
                  s.tabContent,
                  { transform: [{ scale: scaleAnims[index] }] },
                ]}
              >
                {icon}
                <Text
                  style={[
                    s.tabLabel,
                    {
                      color,
                      fontFamily: isFocused
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                      opacity: isFocused ? 1 : 0.6,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>

      {/* Safe area spacer */}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  webBlur: {
    backdropFilter: "blur(24px) saturate(1.6)",
  } as any,
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  innerHighlight: {
    position: "absolute",
    top: StyleSheet.hairlineWidth,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 10,
  },
  shimmerTrack: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 160,
    zIndex: 5,
  },
  shimmerGrad: {
    flex: 1,
    opacity: 0.7,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  blob: {
    position: "absolute",
    height: BLOB_H,
    borderRadius: BLOB_H / 2,
    top: (TAB_HEIGHT - BLOB_H) / 2,
    zIndex: 1,
  },
  tabItem: {
    flex: 1,
    height: TAB_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },
  hoverGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    marginHorizontal: 8,
    marginVertical: 8,
  },
  tabContent: {
    alignItems: "center",
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
