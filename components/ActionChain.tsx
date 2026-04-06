import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { type AnalysisResult, getMotionLabel } from "@/services/fibaApi";

interface Props {
  result: AnalysisResult;
}

interface ChainStep {
  icon: string;
  label: string;
  value: string;
  color: string;
}

export function ActionChain({ result }: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(true);

  const motionLabel = getMotionLabel(result.motion_summary);
  const object = result.query_info?.object || "object";
  const action = result.action_label || "unknown";
  const confidence = Math.round((result.confidence ?? 0) * 100);

  const steps: ChainStep[] = [
    { icon: "cube-outline", label: "Detected Object", value: object, color: colors.info },
    { icon: "analytics-outline", label: "Motion Primitive", value: motionLabel, color: colors.warning },
    { icon: "flash-outline", label: "Inferred Action", value: action, color: colors.success },
  ];

  const s = styles(colors);

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.header} onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
        <View style={s.headerLeft}>
          <Ionicons name="bulb-outline" size={18} color={colors.primary} />
          <Text style={s.headerTitle}>AI Reasoning Chain</Text>
        </View>
        <View style={s.badge}>
          <Text style={s.badgeText}>{confidence}% conf.</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {expanded && (
        <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutUp.duration(150)}>
          <View style={s.chain}>
            {steps.map((step, index) => (
              <React.Fragment key={step.label}>
                <ChainNode step={step} colors={colors} />
                {index < steps.length - 1 && (
                  <View style={s.arrow}>
                    <Ionicons name="arrow-down" size={14} color={colors.mutedForeground} />
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>

          <View style={s.inferenceBox}>
            <Text style={s.inferenceLabel}>Inference:</Text>
            <Text style={s.inferenceText}>
              {object} + {motionLabel.toLowerCase()} → <Text style={s.inferenceBold}>{action}</Text>
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function ChainNode({ step, colors }: { step: ChainStep; colors: ReturnType<typeof useColors> }) {
  const s = styles(colors);
  return (
    <View style={s.node}>
      <View style={[s.nodeIcon, { backgroundColor: step.color + "20", borderColor: step.color + "40" }]}>
        <Ionicons name={step.icon as "cube-outline"} size={16} color={step.color} />
      </View>
      <View style={s.nodeContent}>
        <Text style={s.nodeLabel}>{step.label}</Text>
        <Text style={[s.nodeValue, { color: step.color }]}>{step.value}</Text>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: 12,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    badge: {
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 20,
    },
    badgeText: {
      fontSize: 11,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    chain: {
      paddingHorizontal: 14,
      paddingBottom: 8,
      alignItems: "center",
    },
    node: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      width: "100%",
      paddingVertical: 6,
    },
    nodeIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    nodeContent: {
      flex: 1,
    },
    nodeLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    nodeValue: {
      fontSize: 14,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    arrow: {
      alignItems: "center",
      marginVertical: 2,
    },
    inferenceBox: {
      marginHorizontal: 14,
      marginBottom: 12,
      backgroundColor: colors.primary + "12",
      borderRadius: 10,
      padding: 10,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    inferenceLabel: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    inferenceText: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    inferenceBold: {
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
  });
