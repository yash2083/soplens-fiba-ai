import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import { PipelineSteps } from "@/components/PipelineSteps";
import { useJob } from "@/context/JobContext";
import { useColors } from "@/hooks/useColors";

export default function ProcessingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { jobState, resetJob } = useJob();
  const s = styles(colors);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (jobState.done && !jobState.error) {
      const timer = setTimeout(() => {
        router.replace("/results");
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [jobState.done, jobState.error]);

  const handleCancel = () => {
    resetJob();
    router.back();
  };

  const statusText = jobState.error ? "Analysis Failed" : jobState.done ? "Complete" : "Analyzing";

  return (
    <View style={[s.container, { paddingTop: isWeb ? 60 : insets.top + 16, paddingBottom: isWeb ? 32 : insets.bottom + 16 }]}>
      <View style={s.topRow}>
        <TouchableOpacity onPress={handleCancel} style={[s.closeBtn, { backgroundColor: colors.muted }]}>
          <Ionicons name="close" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={s.center}>
        <View style={[s.iconBox, { backgroundColor: colors.muted }]}>
          <Ionicons
            name={jobState.error ? "alert-circle-outline" : jobState.done ? "checkmark-circle-outline" : "eye-outline"}
            size={32}
            color={jobState.error ? colors.destructive : jobState.done ? colors.success : colors.foreground}
          />
        </View>

        <Text style={[s.statusTitle, { color: colors.foreground }]}>{statusText}</Text>
        <Text style={[s.jobIdText, { color: colors.mutedForeground }]} numberOfLines={1}>
          {jobState.jobId ? `${jobState.jobId.slice(0, 16)}…` : "Preparing…"}
        </Text>
      </View>

      <View style={s.progressSection}>
        <PipelineSteps progress={jobState.progress} />
        <AnimatedProgressBar
          progress={jobState.progress}
          message={jobState.message || "Starting analysis…"}
        />
      </View>

      {jobState.error && (
        <View style={[s.errorCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
          <Text style={[s.errorText, { color: colors.destructive }]}>{jobState.error}</Text>
        </View>
      )}

      {jobState.error && (
        <TouchableOpacity style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={handleCancel}>
          <Text style={[s.retryText, { color: colors.primaryForeground }]}>Back to Upload</Text>
        </TouchableOpacity>
      )}

      <View style={[s.pipelineInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.pipelineInfoTitle, { color: colors.mutedForeground }]}>Pipeline</Text>
        <View style={s.pipelineList}>
          {[
            "Detect objects from your query",
            "Segment and track detected objects",
            "Infer motion primitives from tracking",
            "Map motion → action label",
            "Validate against SOP steps",
          ].map((text, i) => (
            <View key={i} style={s.pipelineItem}>
              <Text style={[s.pipelineNumber, { color: colors.mutedForeground }]}>{i + 1}</Text>
              <Text style={[s.pipelineText, { color: colors.foreground }]}>{text}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 8,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    center: {
      alignItems: "center",
      paddingVertical: 28,
      gap: 6,
    },
    iconBox: {
      width: 72,
      height: 72,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    statusTitle: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.5,
    },
    jobIdText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    progressSection: {
      gap: 12,
      marginBottom: 20,
    },
    errorCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      borderRadius: 10,
      borderWidth: 1,
      padding: 12,
      marginBottom: 12,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
    retryBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 16,
    },
    retryText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    pipelineInfo: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
    },
    pipelineInfoTitle: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    pipelineList: {
      gap: 8,
    },
    pipelineItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    pipelineNumber: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      width: 14,
    },
    pipelineText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
  });
