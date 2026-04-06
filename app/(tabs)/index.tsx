import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FixedHeader } from "@/components/FixedHeader";
import { useJob } from "@/context/JobContext";
import { useColors } from "@/hooks/useColors";
import { isDemoMode } from "@/services/fibaApi";

const DEMO_SCENARIOS = [
  { query: "opening bottle cap",  label: "Bottle cap",   icon: "flask-outline"      },
  { query: "tighten bolt",        label: "Bolt tighten", icon: "settings-outline"   },
  { query: "pick up component",   label: "Pick & place", icon: "hand-left-outline"  },
  { query: "insert seal ring",    label: "Seal ring",    icon: "ellipse-outline"    },
  { query: "check box contents",  label: "Inspection",   icon: "search-outline"     },
];

export default function AnalyzeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { submitAnalysis, resetJob } = useJob();
  const [videoFile, setVideoFile] = useState<{ uri: string; name: string; isDemo?: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [demoActive, setDemoActive] = useState(isDemoMode);
  const s = styles(colors);
  const isWeb = Platform.OS === "web";
  const tabBarHeight = isWeb ? 72 : insets.bottom + 56;

  useEffect(() => {
    setDemoActive(isDemoMode);
  });

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setVideoFile({ uri: asset.uri, name: asset.name });
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      /* user cancelled */
    }
  };

  const launchDemo = (scenario: typeof DEMO_SCENARIOS[number]) => {
    setVideoFile({ uri: "demo://placeholder.mp4", name: "demo_factory_floor.mp4", isDemo: true });
    setQuery(scenario.query);
    setShowDemoPanel(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (!videoFile || !query.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetJob();
    submitAnalysis(videoFile.uri, videoFile.name, query.trim());
    router.push("/processing");
  };

  const canSubmit = !!videoFile && query.trim().length > 0;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <FixedHeader title="Analyze" subtitle="FIBA · Find-It-By-Action" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.content, { paddingTop: 12, paddingBottom: tabBarHeight + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Demo mode banner */}
          {demoActive && (
            <View style={[s.demoBanner, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "50" }]}>
              <Ionicons name="flask-outline" size={13} color={colors.warning} />
              <Text style={[s.demoBannerText, { color: colors.warning }]}>
                Demo mode — simulated AI pipeline active (Flask API not detected)
              </Text>
            </View>
          )}

          {/* Video selector */}
          <View style={s.section}>
            <View style={s.labelRow}>
              <Text style={[s.label, { color: colors.mutedForeground }]}>Video</Text>
              <TouchableOpacity
                style={[s.demoToggle, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => setShowDemoPanel((v) => !v)}
              >
                <Ionicons name="play-circle-outline" size={13} color={colors.primary} />
                <Text style={[s.demoToggleText, { color: colors.primary }]}>Try Demo</Text>
              </TouchableOpacity>
            </View>

            {/* Demo scenario panel */}
            {showDemoPanel && (
              <View style={[s.demoPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.demoPanelTitle, { color: colors.mutedForeground }]}>
                  SELECT A DEMO SCENARIO
                </Text>
                {DEMO_SCENARIOS.map((sc) => (
                  <TouchableOpacity
                    key={sc.query}
                    style={[s.demoScenarioRow, { borderColor: colors.border }]}
                    onPress={() => launchDemo(sc)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.demoScenarioIcon, { backgroundColor: colors.muted }]}>
                      <Ionicons name={sc.icon as any} size={16} color={colors.foreground} />
                    </View>
                    <View style={s.demoScenarioText}>
                      <Text style={[s.demoScenarioLabel, { color: colors.foreground }]}>{sc.label}</Text>
                      <Text style={[s.demoScenarioQuery, { color: colors.mutedForeground }]}>{sc.query}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[
                s.uploadZone,
                { borderColor: colors.border },
                videoFile && [s.uploadZoneActive, { borderColor: colors.border, backgroundColor: colors.secondary }],
              ]}
              onPress={pickVideo}
              activeOpacity={0.7}
              testID="pick-video-btn"
            >
              {videoFile ? (
                <View style={s.fileRow}>
                  <View style={[s.fileIcon, { backgroundColor: videoFile.isDemo ? colors.warning + "20" : colors.muted }]}>
                    <Ionicons
                      name={videoFile.isDemo ? "play-circle-outline" : "videocam"}
                      size={18}
                      color={videoFile.isDemo ? colors.warning : colors.foreground}
                    />
                  </View>
                  <View style={s.fileDetails}>
                    <Text style={[s.fileName, { color: colors.foreground }]} numberOfLines={1}>
                      {videoFile.name}
                    </Text>
                    <Text style={[s.fileReady, { color: videoFile.isDemo ? colors.warning : colors.success }]}>
                      {videoFile.isDemo ? "Demo clip" : "Ready"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setVideoFile(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.uploadPlaceholder}>
                  <View style={[s.uploadIconBox, { backgroundColor: colors.muted }]}>
                    <Ionicons name="arrow-up" size={20} color={colors.foreground} />
                  </View>
                  <Text style={[s.uploadText, { color: colors.foreground }]}>Select video file</Text>
                  <Text style={[s.uploadHint, { color: colors.mutedForeground }]}>MP4, MOV, AVI</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Query input */}
          <View style={s.section}>
            <Text style={[s.label, { color: colors.mutedForeground }]}>Query</Text>
            <TextInput
              style={[s.queryInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={query}
              onChangeText={setQuery}
              placeholder='Describe the action, e.g. "opening a bottle cap"'
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              testID="query-input"
            />
            <View style={s.chips}>
              {["opening box", "pick up cup", "tighten bolt"].map((example) => (
                <TouchableOpacity
                  key={example}
                  style={[s.chip, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => setQuery(example)}
                >
                  <Text style={[s.chipText, { color: colors.foreground }]}>{example}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.analyzeBtn, { backgroundColor: canSubmit ? colors.primary : colors.muted }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
            testID="analyze-btn"
          >
            <Ionicons
              name={canSubmit ? "eye-outline" : "alert-circle-outline"}
              size={18}
              color={canSubmit ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text style={[s.analyzeBtnText, { color: canSubmit ? colors.primaryForeground : colors.mutedForeground }]}>
              {canSubmit ? "Run Analysis" : "Select video & enter query"}
            </Text>
          </TouchableOpacity>

          {/* Hint */}
          <Text style={[s.hint, { color: colors.mutedForeground }]}>
            No Flask server? Tap "Try Demo" above — the full AI pipeline runs in simulation mode.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20 },
    demoBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 14,
    },
    demoBannerText: {
      flex: 1,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    section: { marginBottom: 20 },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    label: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    demoToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
    },
    demoToggleText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    demoPanel: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      gap: 2,
    },
    demoPanelTitle: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    demoScenarioRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    demoScenarioIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    demoScenarioText: { flex: 1 },
    demoScenarioLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    demoScenarioQuery: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
    },
    uploadZone: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderRadius: 12,
      padding: 20,
      alignItems: "center",
    },
    uploadZoneActive: { borderStyle: "solid" },
    uploadPlaceholder: { alignItems: "center", gap: 8 },
    uploadIconBox: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    uploadText: { fontSize: 14, fontFamily: "Inter_500Medium" },
    uploadHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
    fileRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%" },
    fileIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    fileDetails: { flex: 1, gap: 2 },
    fileName: { fontSize: 13, fontFamily: "Inter_500Medium" },
    fileReady: { fontSize: 11, fontFamily: "Inter_400Regular" },
    queryInput: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      minHeight: 80,
      textAlignVertical: "top",
    },
    chips: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
    chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
    chipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    analyzeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 20,
      borderRadius: 14,
      marginTop: 4,
    },
    analyzeBtnText: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.2,
    },
    hint: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginTop: 12,
      lineHeight: 17,
    },
  });
