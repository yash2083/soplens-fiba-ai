import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface ImageItem {
  src: string;
  label: string;
  tag?: string;
}

interface Props {
  keyFrames: string[];
  trajectory?: string;
  skeletonFrames?: string[];
  fingerTrajectory?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THUMB_SIZE = (SCREEN_WIDTH - 64) / 3;
type Tab = "frames" | "skeleton";

export function KeyFrameGallery({ keyFrames, trajectory, skeletonFrames, fingerTrajectory }: Props) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("frames");
  const s = styles(colors);

  const hasSkeletons = (skeletonFrames?.length ?? 0) > 0;

  const frameImages: ImageItem[] = [
    ...keyFrames.map((f, i) => ({ src: `data:image/jpeg;base64,${f}`, label: `Frame ${i + 1}`, tag: "key" })),
    ...(trajectory ? [{ src: `data:image/jpeg;base64,${trajectory}`, label: "Trajectory", tag: "traj" }] : []),
  ];

  const skeletonImages: ImageItem[] = (skeletonFrames ?? []).map((f, i) => ({
    src: `data:image/jpeg;base64,${f}`,
    label: `Skeleton ${i + 1}`,
    tag: "skel",
  }));

  const activeImages = activeTab === "frames" ? frameImages : skeletonImages;
  const totalCount = frameImages.length + skeletonImages.length;

  if (totalCount === 0) return null;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="images-outline" size={18} color={colors.primary} />
        <Text style={s.title}>Visual Evidence</Text>
        <Text style={s.count}>{totalCount} images</Text>
      </View>

      {hasSkeletons && (
        <View style={s.tabs}>
          {(["frames", "skeleton"] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, { color: activeTab === tab ? colors.primaryForeground : colors.mutedForeground }]}>
                {tab === "frames" ? `Key Frames (${frameImages.length})` : `Skeleton (${skeletonImages.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeImages.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
        >
          {activeImages.map((img, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedIndex(index)}
              style={s.thumb}
              activeOpacity={0.85}
            >
              <Image source={{ uri: img.src }} style={s.thumbImage} resizeMode="cover" />
              <View style={s.thumbLabel}>
                <Text style={s.thumbLabelText}>{img.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={s.empty}>
          <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No images for this tab</Text>
        </View>
      )}

      {(trajectory || fingerTrajectory) && (
        <View style={s.vizSection}>
          {trajectory ? (
            <View style={s.vizItem}>
              <Text style={[s.vizLabel, { color: colors.mutedForeground }]}>Motion Trajectory</Text>
              <Image
                source={{ uri: `data:image/jpeg;base64,${trajectory}` }}
                style={s.vizImage}
                resizeMode="contain"
              />
            </View>
          ) : null}
          {fingerTrajectory ? (
            <View style={s.vizItem}>
              <Text style={[s.vizLabel, { color: colors.mutedForeground }]}>Finger Trajectory</Text>
              <Image
                source={{ uri: `data:image/jpeg;base64,${fingerTrajectory}` }}
                style={s.vizImage}
                resizeMode="contain"
              />
            </View>
          ) : null}
        </View>
      )}

      <Modal visible={selectedIndex !== null} transparent animationType="fade">
        <TouchableOpacity
          style={s.modalBg}
          activeOpacity={1}
          onPress={() => setSelectedIndex(null)}
        >
          {selectedIndex !== null && (
            <View style={s.modalContent}>
              <Image
                source={{ uri: activeImages[selectedIndex]?.src }}
                style={s.modalImage}
                resizeMode="contain"
              />
              <Text style={s.modalLabel}>{activeImages[selectedIndex]?.label}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedIndex(null)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
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
    count: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    tabs: {
      flexDirection: "row",
      marginHorizontal: 14,
      marginTop: 10,
      backgroundColor: colors.muted,
      borderRadius: 8,
      padding: 2,
      gap: 2,
    },
    tab: {
      flex: 1,
      paddingVertical: 5,
      borderRadius: 6,
      alignItems: "center",
    },
    tabText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    scroll: { paddingVertical: 12 },
    scrollContent: { paddingHorizontal: 14, gap: 8 },
    thumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE * 0.75,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.muted,
    },
    thumbImage: { width: "100%", height: "100%" },
    thumbLabel: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(0,0,0,0.55)",
      paddingVertical: 2,
      paddingHorizontal: 4,
    },
    thumbLabelText: { fontSize: 9, color: "#fff", fontFamily: "Inter_500Medium", textAlign: "center" },
    empty: { padding: 20, alignItems: "center" },
    emptyText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    vizSection: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
    vizItem: { gap: 4 },
    vizLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.6 },
    vizImage: {
      width: "100%",
      height: 120,
      borderRadius: 8,
      backgroundColor: colors.muted,
    },
    modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
    modalContent: { width: "90%", alignItems: "center", gap: 10 },
    modalImage: { width: "100%", height: 300, borderRadius: 10 },
    modalLabel: { color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium" },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
  });
