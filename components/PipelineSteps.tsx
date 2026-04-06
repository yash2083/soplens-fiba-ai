import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface PipelineStep {
  key: string;
  label: string;
  icon: string;
  activeThreshold: number;
  doneThreshold: number;
}

const STEPS: PipelineStep[] = [
  { key: "query", label: "Query", icon: "text-outline", activeThreshold: 0, doneThreshold: 10 },
  { key: "detect", label: "Detect", icon: "scan-outline", activeThreshold: 10, doneThreshold: 35 },
  { key: "track", label: "Track", icon: "locate-outline", activeThreshold: 35, doneThreshold: 55 },
  { key: "motion", label: "Motion", icon: "analytics-outline", activeThreshold: 55, doneThreshold: 75 },
  { key: "action", label: "Action", icon: "flash-outline", activeThreshold: 75, doneThreshold: 90 },
  { key: "validate", label: "Validate", icon: "shield-checkmark-outline", activeThreshold: 90, doneThreshold: 100 },
];

interface Props {
  progress: number;
}

export function PipelineSteps({ progress }: Props) {
  const colors = useColors();
  const s = styles(colors);

  return (
    <View style={s.container}>
      <Text style={s.pipelineTitle}>ANALYSIS PIPELINE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.steps}>
        {STEPS.map((step, index) => {
          const isDone = progress >= step.doneThreshold;
          const isActive = progress >= step.activeThreshold && !isDone;
          const isIdle = !isDone && !isActive;

          const nodeColor = isDone ? colors.success : isActive ? colors.primary : colors.mutedForeground;
          const bg = isDone ? colors.success + "20" : isActive ? colors.primary + "20" : colors.muted;

          return (
            <React.Fragment key={step.key}>
              <View style={s.step}>
                <View style={[s.stepIcon, { backgroundColor: bg, borderColor: nodeColor + "40" }]}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={14} color={colors.success} />
                  ) : (
                    <Ionicons name={step.icon as "text-outline"} size={14} color={nodeColor} />
                  )}
                </View>
                <Text style={[s.stepLabel, { color: nodeColor }]} numberOfLines={1}>
                  {step.label}
                </Text>
              </View>
              {index < STEPS.length - 1 && (
                <View style={[s.connector, { backgroundColor: isDone ? colors.success + "40" : colors.border }]} />
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    pipelineTitle: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    steps: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
    },
    step: {
      alignItems: "center",
      gap: 4,
      minWidth: 44,
    },
    stepIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    stepLabel: {
      fontSize: 9,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    connector: {
      height: 2,
      width: 16,
      borderRadius: 1,
      marginBottom: 18,
    },
  });
