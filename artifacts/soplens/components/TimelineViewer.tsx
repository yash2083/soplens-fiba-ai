import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { type AnalysisResult, formatFrameTime } from "@/services/fibaApi";

interface Props {
  result: AnalysisResult;
}

interface TimelineEvent {
  label: string;
  frame: number;
  type: "start" | "action" | "end" | "keyframe";
  description?: string;
}

export function TimelineViewer({ result }: Props) {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const [activeEvent, setActiveEvent] = useState<number | null>(null);
  const s = styles(colors);

  const fps = result.fps || 30;
  const [startFrame, endFrame] = result.timestamp_range ?? [0, 0];
  const durationFrames = Math.max(endFrame - startFrame, 1);

  const events: TimelineEvent[] = ([
    { label: "Start", frame: startFrame, type: "start" as const, description: "Video analysis begins" },
    ...(result.key_frames ?? []).map((_, i): TimelineEvent => ({
      label: `Frame ${i + 1}`,
      frame: startFrame + Math.round((durationFrames / (result.key_frames.length + 1)) * (i + 1)),
      type: "keyframe",
      description: `Key moment ${i + 1} detected`,
    })),
    {
      label: result.action_label,
      frame: startFrame + Math.round(durationFrames * 0.5),
      type: "action" as const,
      description: result.evidence || `${result.action_label} detected`,
    },
    { label: "End", frame: endFrame, type: "end" as const, description: `Complete in ${result.processing_time_s?.toFixed(1)}s` },
  ] as TimelineEvent[]).sort((a, b) => a.frame - b.frame);

  const getEventColor = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "start": return colors.mutedForeground;
      case "action": return colors.primary;
      case "end": return colors.success;
      case "keyframe": return colors.accent;
    }
  };

  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "start": return "play-circle-outline";
      case "action": return "flash-outline";
      case "end": return "checkmark-circle-outline";
      case "keyframe": return "image-outline";
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="time-outline" size={18} color={colors.primary} />
        <Text style={s.title}>Timeline</Text>
        <Text style={s.duration}>
          {formatFrameTime(startFrame, fps)} — {formatFrameTime(endFrame, fps)}
          {"  "}
          <Text style={{ fontSize: 10 }}>({durationFrames} frames)</Text>
        </Text>
      </View>

      <View style={s.track}>
        <View style={s.trackLine} />
        {events.map((event, index) => {
          const progress = (event.frame - startFrame) / durationFrames;
          const leftPct = Math.max(0, Math.min(progress * 100, 100));
          return (
            <TouchableOpacity
              key={index}
              style={[s.dot, { left: `${leftPct}%` as unknown as number }]}
              onPress={() => setActiveEvent(activeEvent === index ? null : index)}
            >
              <View
                style={[
                  s.dotInner,
                  {
                    backgroundColor: getEventColor(event.type),
                    width: event.type === "action" ? 14 : 10,
                    height: event.type === "action" ? 14 : 10,
                    borderRadius: event.type === "action" ? 7 : 5,
                  },
                  activeEvent === index && { transform: [{ scale: 1.3 }] },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.eventList}
        showsVerticalScrollIndicator={false}
        scrollEnabled={events.length > 3}
      >
        {events.map((event, index) => (
          <TouchableOpacity
            key={index}
            style={[s.eventRow, activeEvent === index && s.eventRowActive]}
            onPress={() => setActiveEvent(activeEvent === index ? null : index)}
            activeOpacity={0.75}
          >
            <View style={[s.eventIcon, { backgroundColor: getEventColor(event.type) + "20" }]}>
              <Ionicons name={getEventIcon(event.type) as "play-circle-outline"} size={15} color={getEventColor(event.type)} />
            </View>
            <View style={s.eventContent}>
              <View style={s.eventHeader}>
                <Text style={s.eventLabel}>{event.label}</Text>
                <Text style={s.eventTime}>
                  {formatFrameTime(event.frame, fps)}
                  {" "}
                  <Text style={{ fontSize: 10, color: colors.mutedForeground }}>f{event.frame}</Text>
                </Text>
              </View>
              {event.description && (
                <Text style={s.eventDesc} numberOfLines={2}>{event.description}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    title: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    duration: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    track: { height: 40, marginHorizontal: 14, justifyContent: "center", position: "relative" },
    trackLine: { height: 2, backgroundColor: colors.border, borderRadius: 1 },
    dot: { position: "absolute", transform: [{ translateX: -7 }], alignItems: "center", justifyContent: "center", width: 20, height: 20 },
    dotInner: { backgroundColor: colors.primary },
    eventList: { maxHeight: 200 },
    eventRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    eventRowActive: { backgroundColor: colors.primary + "08" },
    eventIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 1 },
    eventContent: { flex: 1 },
    eventHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
    eventLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    eventTime: { fontSize: 11, color: colors.primary, fontFamily: "Inter_500Medium" },
    eventDesc: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
