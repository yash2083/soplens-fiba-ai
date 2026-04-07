import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FixedHeader } from "@/components/FixedHeader";
import { SOPCompliancePanel } from "@/components/SOPCompliancePanel";
import { useJob } from "@/context/JobContext";
import { useColors } from "@/hooks/useColors";
import { type SOPStepResult } from "@/services/fibaApi";

const TEMPLATE_SOPS: { label: string; steps: string[] }[] = [
  {
    label: "Bottle Assembly",
    steps: [
      "Pick up the bottle",
      "Open the bottle cap",
      "Insert the seal ring",
      "Close the bottle cap",
      "Tighten the cap firmly",
    ],
  },
  {
    label: "Box Inspection",
    steps: [
      "Pick up the box",
      "Open the box lid",
      "Check the contents",
      "Close the box lid",
      "Place the box on belt",
    ],
  },
];

export default function SOPBuilderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setSopSteps, sopStatus, sopJobState, uploadSOPReference, runSOPValidate, refreshSOPStatus } = useJob();
  const [refVideo, setRefVideo] = useState<{ uri: string; name: string } | null>(null);
  const [testVideo, setTestVideo] = useState<{ uri: string; name: string } | null>(null);
  const s = styles(colors);
  const isWeb = Platform.OS === "web";
  const tabBarHeight = isWeb ? 72 : insets.bottom + 56;

  useEffect(() => {
    refreshSOPStatus();
  }, []);

  const pickVideo = async (setter: (v: { uri: string; name: string }) => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "video/*", copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        setter({ uri: result.assets[0].uri, name: result.assets[0].name });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch { /* cancelled */ }
  };

  const loadTemplate = (template: { label: string; steps: string[] }) => {
    setSopSteps(
      template.steps.map((text, i) => {
        const lower = text.toLowerCase();
        const verbs = ["pick", "open", "close", "tighten", "insert", "check", "place", "remove"];
        const action = verbs.find((v) => lower.includes(v)) || "perform";
        const words = text.split(" ");
        const vi = words.findIndex((w) => w.toLowerCase().includes(action));
        const object = vi >= 0 ? words.slice(vi + 1, vi + 4).join(" ") : words.slice(1, 4).join(" ");
        return {
          id: `${Date.now()}-${i}`,
          text,
          object: object.replace(/[^a-zA-Z ]/g, "").trim() || "item",
          action,
          status: "pending" as const,
        };
      })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleUploadReference = async () => {
    if (!refVideo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await uploadSOPReference(refVideo.uri, refVideo.name);
    setRefVideo(null);
  };

  const handleValidate = async () => {
    if (!testVideo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await runSOPValidate(testVideo.uri, testVideo.name);
    setTestVideo(null);
  };

  const validateResult = sopJobState.validateResult;
  const referenceResult = sopJobState.referenceResult;
  const isReferenceLoading = sopJobState.loading && !validateResult;
  const isValidateLoading = sopJobState.loading && !referenceResult;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <FixedHeader title="SOP Builder" subtitle="Standard Operating Procedures" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingTop: 12, paddingBottom: tabBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Backend SOP status */}
        <View style={[s.statusBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.statusItem}>
            <View style={[s.statusDot, { backgroundColor: sopStatus?.has_reference ? colors.success : colors.border }]} />
            <Text style={[s.statusText, { color: colors.mutedForeground }]}>Reference</Text>
          </View>
          <View style={s.statusItem}>
            <View style={[s.statusDot, { backgroundColor: sopStatus?.has_classifier ? colors.success : colors.border }]} />
            <Text style={[s.statusText, { color: colors.mutedForeground }]}>Classifier</Text>
          </View>
          <TouchableOpacity onPress={refreshSOPStatus} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Compliance panel (manual steps) */}
        <SOPCompliancePanel />

        {/* Upload Reference Video */}
        <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="videocam-outline" size={16} color={colors.primary} />
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Reference Video</Text>
            {sopStatus?.has_reference && (
              <View style={[s.badge, { backgroundColor: colors.success + "20" }]}>
                <Text style={[s.badgeText, { color: colors.success }]}>Loaded</Text>
              </View>
            )}
          </View>
          <Text style={[s.sectionDesc, { color: colors.mutedForeground }]}>
            Upload a video showing the correct SOP sequence. The AI will learn the step order.
          </Text>

          <TouchableOpacity
            style={[s.videoPickBtn, { borderColor: colors.border, backgroundColor: refVideo ? colors.secondary : colors.muted }]}
            onPress={() => pickVideo(setRefVideo)}
          >
            <Ionicons name={refVideo ? "videocam" : "arrow-up-circle-outline"} size={16} color={refVideo ? colors.success : colors.mutedForeground} />
            <Text style={[s.videoPickText, { color: refVideo ? colors.success : colors.mutedForeground }]} numberOfLines={1}>
              {refVideo ? refVideo.name : "Select reference video"}
            </Text>
            {refVideo && <TouchableOpacity onPress={() => setRefVideo(null)}><Ionicons name="close" size={15} color={colors.mutedForeground} /></TouchableOpacity>}
          </TouchableOpacity>

          {sopJobState.loading && referenceResult === null && sopJobState.jobId?.includes("sop_ref") && (
            <View style={s.progressRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[s.progressText, { color: colors.mutedForeground }]}>{sopJobState.message} ({sopJobState.progress}%)</Text>
            </View>
          )}

          {sopJobState.error && !sopJobState.loading && (
            <Text style={[s.errorText, { color: colors.destructive }]}>{sopJobState.error}</Text>
          )}

          {referenceResult && (
            <View style={[s.resultPill, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[s.resultPillText, { color: colors.success }]}>
                {referenceResult.segment_count} SOP steps learned from {referenceResult.sop_steps?.map(s => s.task_name).join(" → ")}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: refVideo ? colors.primary : colors.muted }]}
            onPress={handleUploadReference}
            disabled={!refVideo || isReferenceLoading}
          >
            {isReferenceLoading
              ? <ActivityIndicator size="small" color={colors.primaryForeground} />
              : <Text style={[s.actionBtnText, { color: refVideo ? colors.primaryForeground : colors.mutedForeground }]}>Upload Reference</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Validate Test Video */}
        <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Validate Test Video</Text>
          </View>
          <Text style={[s.sectionDesc, { color: colors.mutedForeground }]}>
            Upload a test video to validate SOP compliance. Requires a reference or trained classifier.
          </Text>

          {!sopStatus?.has_reference && !sopStatus?.has_classifier && (
            <View style={[s.warnBanner, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
              <Ionicons name="alert-circle-outline" size={13} color={colors.warning} />
              <Text style={[s.warnText, { color: colors.warning }]}>Upload a reference video first, or train a classifier offline.</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.videoPickBtn, { borderColor: colors.border, backgroundColor: testVideo ? colors.secondary : colors.muted }]}
            onPress={() => pickVideo(setTestVideo)}
          >
            <Ionicons name={testVideo ? "videocam" : "arrow-up-circle-outline"} size={16} color={testVideo ? colors.success : colors.mutedForeground} />
            <Text style={[s.videoPickText, { color: testVideo ? colors.success : colors.mutedForeground }]} numberOfLines={1}>
              {testVideo ? testVideo.name : "Select test video"}
            </Text>
            {testVideo && <TouchableOpacity onPress={() => setTestVideo(null)}><Ionicons name="close" size={15} color={colors.mutedForeground} /></TouchableOpacity>}
          </TouchableOpacity>

          {sopJobState.loading && sopJobState.jobId?.includes("sop_val") && (
            <View style={s.progressRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[s.progressText, { color: colors.mutedForeground }]}>{sopJobState.message} ({sopJobState.progress}%)</Text>
            </View>
          )}

          {validateResult && (
            <View style={s.validateResults}>
              <View style={[s.verdictBanner, { backgroundColor: validateResult.passed ? colors.success + "15" : colors.destructive + "15", borderColor: validateResult.passed ? colors.success : colors.destructive }]}>
                <Ionicons name={validateResult.passed ? "checkmark-circle" : "close-circle"} size={18} color={validateResult.passed ? colors.success : colors.destructive} />
                <Text style={[s.verdictText, { color: validateResult.passed ? colors.success : colors.destructive }]}>
                  {validateResult.passed ? "SOP COMPLIANCE PASSED" : "SOP VIOLATION DETECTED"}
                </Text>
              </View>
              <Text style={[s.summaryStat, { color: colors.mutedForeground }]}>{validateResult.summary}</Text>

              {validateResult.step_results.map((step: SOPStepResult, i: number) => (
                <View key={i} style={[s.stepResult, { borderColor: step.is_correct ? colors.success + "40" : colors.destructive + "40", backgroundColor: step.is_correct ? colors.success + "08" : colors.destructive + "08" }]}>
                  <View style={s.stepResultTop}>
                    <Ionicons name={step.is_correct ? "checkmark-circle" : "close-circle"} size={16} color={step.is_correct ? colors.success : colors.destructive} />
                    <Text style={[s.stepResultPos, { color: colors.foreground }]}>Step {step.position}</Text>
                    <Text style={[s.stepResultSim, { color: step.is_correct ? colors.success : colors.destructive }]}>{Math.round(step.similarity * 100)}%</Text>
                  </View>
                  <View style={s.stepResultRows}>
                    <Text style={[s.stepResultLabel, { color: colors.mutedForeground }]}>Expected: <Text style={{ color: colors.foreground }}>{step.expected_task}</Text></Text>
                    <Text style={[s.stepResultLabel, { color: colors.mutedForeground }]}>Detected: <Text style={{ color: step.is_correct ? colors.success : colors.destructive }}>{step.detected_task}</Text></Text>
                  </View>
                  {step.keyframe_b64 ? (
                    <Image source={{ uri: `data:image/jpeg;base64,${step.keyframe_b64}` }} style={s.stepKeyframe} resizeMode="cover" />
                  ) : null}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: testVideo && (sopStatus?.has_reference || sopStatus?.has_classifier) ? colors.primary : colors.muted }]}
            onPress={handleValidate}
            disabled={!testVideo || isValidateLoading || (!sopStatus?.has_reference && !sopStatus?.has_classifier)}
          >
            {isValidateLoading
              ? <ActivityIndicator size="small" color={colors.primaryForeground} />
              : <Text style={[s.actionBtnText, { color: testVideo ? colors.primaryForeground : colors.mutedForeground }]}>Run Validation</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={[s.divider, { backgroundColor: colors.border }]} />
        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>Templates</Text>

        {TEMPLATE_SOPS.map((tpl) => (
          <View key={tpl.label} style={[s.templateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.templateHeader}>
              <Text style={[s.templateName, { color: colors.foreground }]}>{tpl.label}</Text>
              <Text style={[s.templateCount, { color: colors.mutedForeground }]}>{tpl.steps.length} steps</Text>
            </View>
            {tpl.steps.slice(0, 3).map((step, i) => (
              <View key={i} style={s.stepRow}>
                <View style={[s.stepDot, { backgroundColor: colors.border }]} />
                <Text style={[s.stepText, { color: colors.mutedForeground }]} numberOfLines={1}>{step}</Text>
              </View>
            ))}
            {tpl.steps.length > 3 && (
              <Text style={[s.moreText, { color: colors.mutedForeground }]}>+{tpl.steps.length - 3} more</Text>
            )}
            <TouchableOpacity
              style={[s.loadBtn, { backgroundColor: colors.primary }]}
              onPress={() => loadTemplate(tpl)}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={14} color={colors.primaryForeground} />
              <Text style={[s.loadBtnText, { color: colors.primaryForeground }]}>Load Template</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20 },
    statusBar: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
    statusItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 11, fontFamily: "Inter_400Regular" },
    section: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, marginBottom: 12 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
    sectionTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
    sectionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
    badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    videoPickBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    videoPickText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    progressText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    resultPill: { flexDirection: "row", alignItems: "flex-start", gap: 6, borderRadius: 8, borderWidth: 1, padding: 8 },
    resultPillText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
    actionBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
    actionBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    warnBanner: { flexDirection: "row", alignItems: "flex-start", gap: 6, borderRadius: 8, borderWidth: 1, padding: 8 },
    warnText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
    validateResults: { gap: 8 },
    verdictBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1.5, padding: 10 },
    verdictText: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
    summaryStat: { fontSize: 12, fontFamily: "Inter_400Regular" },
    stepResult: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 4 },
    stepResultTop: { flexDirection: "row", alignItems: "center", gap: 6 },
    stepResultPos: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
    stepResultSim: { fontSize: 12, fontFamily: "Inter_700Bold" },
    stepResultRows: { gap: 2 },
    stepResultLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
    stepKeyframe: { width: "100%", height: 80, borderRadius: 6, marginTop: 4, backgroundColor: colors.muted },
    divider: { height: StyleSheet.hairlineWidth, marginBottom: 20, marginTop: 4 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
    templateCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12, gap: 6 },
    templateHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    templateName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    templateCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
    stepRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 1 },
    stepDot: { width: 5, height: 5, borderRadius: 2.5 },
    stepText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
    moreText: { fontSize: 11, fontFamily: "Inter_400Regular", paddingLeft: 13 },
    loadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, borderRadius: 12, paddingVertical: 16 },
    loadBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
