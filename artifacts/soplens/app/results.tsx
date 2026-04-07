import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionChain } from "@/components/ActionChain";
import { KeyFrameGallery } from "@/components/KeyFrameGallery";
import { SOPCompliancePanel } from "@/components/SOPCompliancePanel";
import { TimelineViewer } from "@/components/TimelineViewer";
import { useJob } from "@/context/JobContext";
import { useColors } from "@/hooks/useColors";
import { formatFrameTime } from "@/services/fibaApi";

export default function ResultsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { jobState, currentQuery, overrideAction, resetJob } = useJob();
  const [showOverride, setShowOverride] = useState(false);
  const [overrideText, setOverrideText] = useState("");
  const [showEdgeStats, setShowEdgeStats] = useState(false);
  const s = styles(colors);
  const isWeb = Platform.OS === "web";

  const result = jobState.result;
  if (!result) {
    return (
      <View style={[s.container, { paddingTop: isWeb ? 67 : insets.top }]}>
        <View style={s.noResult}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
          <Text style={s.noResultText}>No result available</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.replace("/")}>
            <Text style={s.backBtnText}>Start New Analysis</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const confidence = Math.round((result.confidence ?? 0) * 100);
  const fps = result.fps || 30;
  const [startFrame, endFrame] = result.timestamp_range ?? [0, 0];

  const handleOverride = () => {
    if (!overrideText.trim()) return;
    overrideAction(overrideText.trim());
    setOverrideText("");
    setShowOverride(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Override Applied", `Action relabeled to: ${overrideText.trim()}`);
  };

  const handleNewAnalysis = () => {
    resetJob();
    router.replace("/");
  };

  const hasVisuals =
    (result.key_frames?.length > 0) ||
    !!result.trajectory ||
    (result.skeleton_frames?.length ?? 0) > 0 ||
    !!result.finger_trajectory;

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.content, { paddingTop: isWeb ? 60 : insets.top + 8, paddingBottom: isWeb ? 32 : insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={handleNewAnalysis} style={s.newAnalysisBtn}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={s.newAnalysisText}>New</Text>
        </TouchableOpacity>
        <Text style={s.screenTitle}>Results</Text>
        <TouchableOpacity onPress={() => setShowOverride((v) => !v)} style={s.overrideToggle}>
          <Ionicons name="create-outline" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {currentQuery ? (
        <View style={s.queryBanner}>
          <Ionicons name="search-outline" size={13} color={colors.mutedForeground} />
          <Text style={s.queryBannerText}>{currentQuery}</Text>
        </View>
      ) : null}

      {/* Summary card */}
      <View style={s.resultSummaryCard}>
        <View style={s.resultSummaryTop}>
          <View style={[s.detectedBadge, { backgroundColor: result.action_detected ? colors.success + "20" : colors.destructive + "20" }]}>
            <Ionicons
              name={result.action_detected ? "checkmark-circle" : "close-circle"}
              size={14}
              color={result.action_detected ? colors.success : colors.destructive}
            />
            <Text style={[s.detectedText, { color: result.action_detected ? colors.success : colors.destructive }]}>
              {result.action_detected ? "Action Detected" : "Not Detected"}
            </Text>
          </View>
          <View style={s.confidenceWrap}>
            <Text style={[s.confidenceNum, { color: confidence > 80 ? colors.success : confidence > 50 ? colors.warning : colors.destructive }]}>
              {confidence}%
            </Text>
            <Text style={s.confidenceLabel}>confidence</Text>
          </View>
        </View>

        <Text style={s.actionLabel}>{result.action_label}</Text>
        <Text style={s.actionCategory}>{result.action_category}</Text>

        {result.action_description ? (
          <Text style={[s.actionDescription, { color: colors.foreground }]}>{result.action_description}</Text>
        ) : null}

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="film-outline" size={13} color={colors.mutedForeground} />
            <Text style={s.metaText}>
              {formatFrameTime(startFrame, fps)} — {formatFrameTime(endFrame, fps)}
              {"  "}(frames {startFrame}–{endFrame})
            </Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="layers-outline" size={13} color={colors.mutedForeground} />
            <Text style={s.metaText}>{result.total_frames} frames @ {fps?.toFixed(0)} fps</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="flash-outline" size={13} color={colors.mutedForeground} />
            <Text style={s.metaText}>{result.processing_time_s?.toFixed(1)}s pipeline</Text>
          </View>
        </View>

        {result.evidence ? (
          <View style={s.evidenceBox}>
            <Text style={s.evidenceLabel}>Evidence</Text>
            <Text style={s.evidenceText}>{result.evidence}</Text>
          </View>
        ) : null}
      </View>

      {/* Expert Override */}
      {showOverride && (
        <View style={s.overrideCard}>
          <View style={s.overrideHeader}>
            <Ionicons name="person-outline" size={15} color={colors.primary} />
            <Text style={s.overrideTitle}>Expert Override</Text>
          </View>
          <Text style={s.overrideSubtitle}>
            Relabel the detected action if the AI made an error. This creates a feedback loop for model improvement.
          </Text>
          <View style={s.overrideInputRow}>
            <TextInput
              style={s.overrideInput}
              value={overrideText}
              onChangeText={setOverrideText}
              placeholder={`Current: ${result.action_label}`}
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              onSubmitEditing={handleOverride}
            />
            <TouchableOpacity
              style={[s.overrideBtn, { opacity: overrideText.trim() ? 1 : 0.4 }]}
              onPress={handleOverride}
              disabled={!overrideText.trim()}
            >
              <Ionicons name="checkmark" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ActionChain result={result} />

      {hasVisuals && (
        <KeyFrameGallery
          keyFrames={result.key_frames ?? []}
          trajectory={result.trajectory}
          skeletonFrames={result.skeleton_frames}
          fingerTrajectory={result.finger_trajectory}
        />
      )}

      <TimelineViewer result={result} />

      <SOPCompliancePanel />

      {/* Edge / pipeline stats */}
      {result.edge_stats && (
        <View style={[s.edgeCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={s.edgeHeader}
            onPress={() => setShowEdgeStats((v) => !v)}
            activeOpacity={0.7}
          >
            <Ionicons name="hardware-chip-outline" size={16} color={colors.mutedForeground} />
            <Text style={[s.edgeTitle, { color: colors.mutedForeground }]}>Pipeline Stats</Text>
            <Ionicons name={showEdgeStats ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
          {showEdgeStats && (
            <View style={s.edgeGrid}>
              {[
                ["Latency",      `${result.edge_stats.pipeline_latency_s?.toFixed(2)}s`],
                ["Effective FPS", `${result.edge_stats.effective_fps?.toFixed(1)}`],
                ["Resolution",   result.edge_stats.resolution ?? "—"],
                ["Frames proc.", `${result.edge_stats.processed_frames} / ${result.edge_stats.total_frames}`],
                ["Frame skip",   `${result.edge_stats.frame_skip}×`],
                ["Models",       result.edge_stats.models_used ?? "—"],
                ["Edge ready",   result.edge_stats.edge_ready ? "✓" : "✗"],
                ["Zero-shot",    result.edge_stats.zero_shot ? "✓" : "✗"],
              ].map(([k, v]) => (
                <View key={k} style={s.edgeStat}>
                  <Text style={[s.edgeStatKey, { color: colors.mutedForeground }]}>{k}</Text>
                  <Text style={[s.edgeStatVal, { color: colors.foreground }]}>{v}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={s.newAnalysisBtnFull} onPress={handleNewAnalysis}>
        <Ionicons name="camera-outline" size={18} color={colors.primaryForeground} />
        <Text style={s.newAnalysisBtnText}>Start New Analysis</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    noResult: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    noResultText: { fontSize: 16, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    backBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    backBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primaryForeground },
    scroll: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 16 },
    topBar: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
    newAnalysisBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    newAnalysisText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.primary },
    screenTitle: { flex: 1, textAlign: "center", fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    overrideToggle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    queryBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
    queryBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, fontStyle: "italic" },
    resultSummaryCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10, marginBottom: 12 },
    resultSummaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    detectedBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    detectedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    confidenceWrap: { alignItems: "flex-end" },
    confidenceNum: { fontSize: 24, fontFamily: "Inter_700Bold" },
    confidenceLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.4 },
    actionLabel: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground, textTransform: "capitalize" },
    actionCategory: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textTransform: "capitalize" },
    actionDescription: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, opacity: 0.85 },
    metaRow: { gap: 4 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    metaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    evidenceBox: { backgroundColor: colors.muted, borderRadius: 10, padding: 10, gap: 2 },
    evidenceLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8 },
    evidenceText: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 18 },
    overrideCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.warning + "40", padding: 14, gap: 8, marginBottom: 12 },
    overrideHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
    overrideTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    overrideSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 18 },
    overrideInputRow: { flexDirection: "row", gap: 8 },
    overrideInput: { flex: 1, backgroundColor: colors.muted, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular" },
    overrideBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    edgeCard: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
    edgeHeader: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12 },
    edgeTitle: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.6 },
    edgeGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
    edgeStat: { width: "46%", gap: 1 },
    edgeStatKey: { fontSize: 10, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.4 },
    edgeStatVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    newAnalysisBtnFull: { backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 20, borderRadius: 14, marginBottom: 8 },
    newAnalysisBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.primaryForeground },
  });
