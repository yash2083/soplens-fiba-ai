import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface FixedHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function FixedHeader({ title, subtitle, right }: FixedHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const paddingTop = isWeb ? 14 : insets.top + 8;

  const inner = (
    <View style={[s.inner, { paddingTop }]}>
      <View style={s.textBlock}>
        <Text style={[s.title, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[s.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={s.right}>{right}</View> : null}
    </View>
  );

  if (isIOS) {
    return (
      <BlurView
        intensity={75}
        tint={isDark ? "dark" : "light"}
        style={s.header}
      >
        {inner}
        <View style={[s.bottomBorder, { backgroundColor: colors.border }]} />
      </BlurView>
    );
  }

  return (
    <View style={[s.header, { backgroundColor: colors.background }]}>
      {inner}
      <View style={[s.bottomBorder, { backgroundColor: colors.border }]} />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    width: "100%",
  },
  inner: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  textBlock: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.1,
    marginTop: 1,
  },
  right: {
    marginLeft: 12,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  bottomBorder: {
    height: StyleSheet.hairlineWidth,
  },
});
