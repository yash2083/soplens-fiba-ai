import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
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
  const { setSopSteps } = useJob();
  const s = styles(colors);
  const isWeb = Platform.OS === "web";
  const tabBarHeight = isWeb ? 72 : insets.bottom + 56;

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
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <FixedHeader title="SOP Builder" subtitle="Standard Operating Procedures" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingTop: 12, paddingBottom: tabBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <SOPCompliancePanel />

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
                <Text style={[s.stepText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {step}
                </Text>
              </View>
            ))}
            {tpl.steps.length > 3 && (
              <Text style={[s.moreText, { color: colors.mutedForeground }]}>
                +{tpl.steps.length - 3} more
              </Text>
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
    root: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginBottom: 20,
      marginTop: 4,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 12,
    },
    templateCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
      gap: 6,
    },
    templateHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    templateName: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
    templateCount: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 1,
    },
    stepDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    stepText: {
      flex: 1,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    moreText: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      paddingLeft: 13,
    },
    loadBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 10,
      borderRadius: 12,
      paddingVertical: 16,
    },
    loadBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
  });
