import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { type SOPStep, useJob } from "@/context/JobContext";

function parseSOPLine(text: string): { object: string; action: string } {
  const lower = text.toLowerCase();
  const actionVerbs = ["pick", "place", "open", "close", "tighten", "loosen", "press", "hold", "lift", "insert", "remove", "rotate", "slide", "push", "pull", "connect", "disconnect", "check", "verify", "align"];
  let action = "";
  for (const verb of actionVerbs) {
    if (lower.includes(verb)) {
      action = verb;
      break;
    }
  }
  const words = text.split(" ");
  const verbIndex = words.findIndex((w) => action && w.toLowerCase().includes(action));
  const objectWords = verbIndex >= 0 ? words.slice(verbIndex + 1).join(" ") : words.slice(1).join(" ");
  const object = objectWords.split(" ").slice(0, 3).join(" ").replace(/[^a-zA-Z ]/g, "").trim();
  return { object: object || "item", action: action || "perform" };
}

export function SOPCompliancePanel() {
  const colors = useColors();
  const { sopSteps, setSopSteps } = useJob();
  const [newStepText, setNewStepText] = useState("");
  const s = styles(colors);

  const addStep = () => {
    if (!newStepText.trim()) return;
    const { object, action } = parseSOPLine(newStepText.trim());
    const newStep: SOPStep = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      text: newStepText.trim(),
      object,
      action,
      status: "pending",
    };
    setSopSteps((prev) => [...prev, newStep]);
    setNewStepText("");
  };

  const removeStep = (id: string) => {
    setSopSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const overrideStatus = (id: string, status: SOPStep["status"]) => {
    setSopSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const getStatusColor = (status: SOPStep["status"]) => {
    switch (status) {
      case "correct": return colors.success;
      case "skipped": return colors.warning;
      case "wrong": return colors.destructive;
      default: return colors.mutedForeground;
    }
  };

  const getStatusIcon = (status: SOPStep["status"]) => {
    switch (status) {
      case "correct": return "checkmark-circle";
      case "skipped": return "alert-circle";
      case "wrong": return "close-circle";
      default: return "ellipse-outline";
    }
  };

  const getStatusLabel = (status: SOPStep["status"]) => {
    switch (status) {
      case "correct": return "Correct";
      case "skipped": return "Skipped";
      case "wrong": return "Wrong";
      default: return "Pending";
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="list-outline" size={18} color={colors.primary} />
        <Text style={s.title}>SOP Compliance</Text>
        <Text style={s.stepCount}>{sopSteps.length} steps</Text>
      </View>

      {sopSteps.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="clipboard-outline" size={28} color={colors.mutedForeground} />
          <Text style={s.emptyText}>Define SOP steps below</Text>
          <Text style={s.emptySubText}>Steps will be validated against detected actions</Text>
        </View>
      )}

      {sopSteps.map((step, index) => (
        <View key={step.id} style={s.stepRow}>
          <View style={s.stepNumber}>
            <Text style={s.stepNumberText}>{index + 1}</Text>
          </View>
          <View style={s.stepBody}>
            <Text style={s.stepText}>{step.text}</Text>
            <View style={s.stepMeta}>
              <View style={[s.tag, { backgroundColor: colors.info + "20" }]}>
                <Text style={[s.tagText, { color: colors.info }]}>{step.object}</Text>
              </View>
              <View style={[s.tag, { backgroundColor: colors.accent + "20" }]}>
                <Text style={[s.tagText, { color: colors.accent }]}>{step.action}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Override Status",
                `Step: ${step.text}`,
                [
                  { text: "Correct", onPress: () => overrideStatus(step.id, "correct") },
                  { text: "Skipped", onPress: () => overrideStatus(step.id, "skipped") },
                  { text: "Wrong", onPress: () => overrideStatus(step.id, "wrong") },
                  { text: "Pending", onPress: () => overrideStatus(step.id, "pending") },
                  { text: "Delete", style: "destructive", onPress: () => removeStep(step.id) },
                  { text: "Cancel", style: "cancel" },
                ]
              )
            }
            style={s.statusBtn}
          >
            <Ionicons
              name={getStatusIcon(step.status) as "checkmark-circle"}
              size={22}
              color={getStatusColor(step.status)}
            />
            <Text style={[s.statusLabel, { color: getStatusColor(step.status) }]}>
              {getStatusLabel(step.status)}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={newStepText}
          onChangeText={setNewStepText}
          placeholder="e.g. Open the bottle cap"
          placeholderTextColor={colors.mutedForeground}
          onSubmitEditing={addStep}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[s.addBtn, { opacity: newStepText.trim() ? 1 : 0.4 }]}
          onPress={addStep}
          disabled={!newStepText.trim()}
        >
          <Ionicons name="add" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
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
      gap: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    stepCount: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 20,
      paddingHorizontal: 14,
      gap: 4,
    },
    emptyText: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    emptySubText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    stepNumber: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    stepNumberText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    stepBody: {
      flex: 1,
    },
    stepText: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      marginBottom: 4,
    },
    stepMeta: {
      flexDirection: "row",
      gap: 6,
      flexWrap: "wrap",
    },
    tag: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    tagText: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
      textTransform: "lowercase",
    },
    statusBtn: {
      alignItems: "center",
      gap: 2,
      minWidth: 52,
    },
    statusLabel: {
      fontSize: 9,
      fontFamily: "Inter_500Medium",
    },
    inputRow: {
      flexDirection: "row",
      padding: 12,
      gap: 8,
      alignItems: "center",
    },
    input: {
      flex: 1,
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      borderWidth: 1,
      borderColor: colors.border,
    },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
