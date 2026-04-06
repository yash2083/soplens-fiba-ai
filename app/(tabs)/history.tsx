import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FixedHeader } from "@/components/FixedHeader";
import { type HistoryEntry, useJob } from "@/context/JobContext";
import { useColors } from "@/hooks/useColors";

function timeLabel(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupLabel(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return "This Week";
  return "Earlier";
}

function groupEntries(entries: HistoryEntry[]): { label: string; items: HistoryEntry[] }[] {
  const groups: Record<string, HistoryEntry[]> = {};
  const order: string[] = [];
  for (const entry of entries) {
    const g = groupLabel(entry.timestamp);
    if (!groups[g]) { groups[g] = []; order.push(g); }
    groups[g].push(entry);
  }
  return order.map((label) => ({ label, items: groups[label] }));
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, clearHistory } = useJob();
  const [expanded, setExpanded] = useState<string | null>(null);
  const s = styles(colors);
  const isWeb = Platform.OS === "web";
  const tabBarHeight = isWeb ? 72 : insets.bottom + 56;

  const handleClear = () => {
    Alert.alert(
      "Clear History",
      "Remove all past analyses from this session?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearHistory },
      ]
    );
  };

  const groups = groupEntries(history);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <FixedHeader
        title="History"
        subtitle={history.length > 0 ? `${history.length} analysis${history.length !== 1 ? "es" : ""}` : "Session results"}
        right={
          history.length > 0 ? (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}>
              <Text style={[s.clearBtn, { color: colors.destructive }]}>Clear</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: tabBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 ? (
          <View style={s.empty}>
            <View style={[s.emptyIconWrap, { backgroundColor: colors.muted }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={30} color={colors.mutedForeground} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>No analyses yet</Text>
            <Text style={[s.emptySub, { color: colors.mutedForeground }]}>
              Your past analyses will appear here, grouped by time — just like chat history.
            </Text>
          </View>
        ) : (
          groups.map((group, gi) => (
            <View key={group.label}>
              {/* Group header */}
              <Text style={[s.groupLabel, { color: colors.mutedForeground }]}>
                {group.label}
              </Text>

              {/* Items */}
              <View style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {group.items.map((entry, idx) => {
                  const isOpen = expanded === entry.id;
                  const pct = Math.round(entry.confidence * 100);
                  const isLast = idx === group.items.length - 1;

                  return (
                    <View key={entry.id}>
                      <Pressable
                        onPress={() => setExpanded(isOpen ? null : entry.id)}
                        style={({ pressed }) => [
                          s.row,
                          pressed && { backgroundColor: colors.muted },
                        ]}
                      >
                        {/* Left icon */}
                        <View style={[s.rowIcon, { backgroundColor: colors.muted }]}>
                          <Ionicons
                            name={entry.actionDetected ? "videocam" : "videocam-off"}
                            size={16}
                            color={entry.actionDetected ? colors.foreground : colors.mutedForeground}
                          />
                        </View>

                        {/* Center text */}
                        <View style={s.rowBody}>
                          <Text style={[s.rowQuery, { color: colors.foreground }]} numberOfLines={1}>
                            {entry.query}
                          </Text>
                          <Text style={[s.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {entry.actionLabel}
                          </Text>
                        </View>

                        {/* Right meta */}
                        <View style={s.rowMeta}>
                          <Text style={[s.rowTime, { color: colors.mutedForeground }]}>
                            {timeLabel(entry.timestamp)}
                          </Text>
                          <View style={[
                            s.confBadge,
                            { backgroundColor: entry.actionDetected ? colors.success + "18" : colors.muted },
                          ]}>
                            <Text style={[
                              s.confText,
                              { color: entry.actionDetected ? colors.success : colors.mutedForeground },
                            ]}>
                              {pct}%
                            </Text>
                          </View>
                        </View>

                        {/* Chevron */}
                        <Ionicons
                          name={isOpen ? "chevron-up" : "chevron-down"}
                          size={14}
                          color={colors.mutedForeground}
                          style={{ marginLeft: 6 }}
                        />
                      </Pressable>

                      {/* Expanded detail */}
                      {isOpen && (
                        <View style={[s.detail, { borderTopColor: colors.border }]}>
                          <View style={s.detailGrid}>
                            <DetailCell label="Action" value={entry.actionLabel} colors={colors} />
                            <DetailCell label="Confidence" value={`${pct}%`} colors={colors} highlight />
                            <DetailCell
                              label="Status"
                              value={entry.actionDetected ? "Detected" : "Not found"}
                              colors={colors}
                            />
                            {entry.result.processing_time_s != null && (
                              <DetailCell
                                label="Time"
                                value={`${entry.result.processing_time_s.toFixed(1)}s`}
                                colors={colors}
                              />
                            )}
                          </View>
                          {entry.result.evidence ? (
                            <View style={s.evidenceBlock}>
                              <Text style={[s.evidenceLabel, { color: colors.mutedForeground }]}>
                                Evidence
                              </Text>
                              <Text style={[s.evidenceText, { color: colors.foreground }]}>
                                {entry.result.evidence}
                              </Text>
                            </View>
                          ) : null}
                          {entry.result.query_info && (
                            <View style={s.parsedRow}>
                              {(["verb", "object", "category"] as const).map((k) => {
                                const val = entry.result.query_info?.[k];
                                if (!val) return null;
                                return (
                                  <View key={k} style={[s.parsedPill, { backgroundColor: colors.muted }]}>
                                    <Text style={[s.parsedKey, { color: colors.mutedForeground }]}>{k}</Text>
                                    <Text style={[s.parsedVal, { color: colors.foreground }]}>{val}</Text>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      )}

                      {/* Row separator */}
                      {!isLast && (
                        <View style={[s.separator, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {history.length > 0 && (
          <Text style={[s.footNote, { color: colors.mutedForeground }]}>
            History is session-only and clears on refresh.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function DetailCell({
  label,
  value,
  colors,
  highlight,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  highlight?: boolean;
}) {
  return (
    <View style={[
      detailCellStyle.cell,
      { backgroundColor: highlight ? colors.primary : colors.muted },
    ]}>
      <Text style={[detailCellStyle.label, { color: highlight ? colors.primaryForeground + "aa" : colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[detailCellStyle.value, { color: highlight ? colors.primaryForeground : colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

const detailCellStyle = StyleSheet.create({
  cell: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    minWidth: 70,
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    textTransform: "capitalize",
  },
});

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingTop: 12 },

    clearBtn: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },

    empty: {
      alignItems: "center",
      paddingTop: 80,
      paddingHorizontal: 40,
      gap: 10,
    },
    emptyIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    emptySub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 20,
    },

    groupLabel: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 20,
      paddingHorizontal: 20,
    },

    groupCard: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: "hidden",
      marginHorizontal: 16,
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 13,
      paddingHorizontal: 14,
      gap: 10,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    rowBody: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    rowQuery: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
    rowSub: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      textTransform: "capitalize",
    },
    rowMeta: {
      alignItems: "flex-end",
      gap: 4,
      flexShrink: 0,
    },
    rowTime: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
    },
    confBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 10,
    },
    confText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
    },

    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 58,
    },

    detail: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      paddingTop: 10,
      gap: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    detailGrid: {
      flexDirection: "row",
      gap: 6,
      flexWrap: "wrap",
    },
    evidenceBlock: {
      gap: 4,
    },
    evidenceLabel: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    evidenceText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 19,
    },
    parsedRow: {
      flexDirection: "row",
      gap: 6,
      flexWrap: "wrap",
    },
    parsedPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 1,
    },
    parsedKey: {
      fontSize: 9,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    parsedVal: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },

    footNote: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginTop: 20,
      paddingHorizontal: 20,
    },
  });
