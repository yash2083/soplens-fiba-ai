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

interface Props {
  keyFrames: string[];
  trajectory: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THUMB_SIZE = (SCREEN_WIDTH - 64) / 3;

export function KeyFrameGallery({ keyFrames, trajectory }: Props) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const s = styles(colors);

  const allImages = [
    ...keyFrames.map((f, i) => ({ src: `data:image/jpeg;base64,${f}`, label: `Frame ${i + 1}` })),
    ...(trajectory ? [{ src: `data:image/jpeg;base64,${trajectory}`, label: "Trajectory" }] : []),
  ];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="images-outline" size={18} color={colors.primary} />
        <Text style={s.title}>Key Frames</Text>
        <Text style={s.count}>{keyFrames.length} frames</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scroll} contentContainerStyle={s.scrollContent}>
        {allImages.map((img, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setSelectedIndex(index)}
            style={s.thumb}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: img.src }}
              style={s.thumbImage}
              resizeMode="cover"
            />
            <View style={s.thumbLabel}>
              <Text style={s.thumbLabelText}>{img.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {trajectory ? (
        <View style={s.trajectorySection}>
          <Text style={s.trajectoryLabel}>Motion Trajectory</Text>
          <Image
            source={{ uri: `data:image/jpeg;base64,${trajectory}` }}
            style={s.trajectoryImage}
            resizeMode="contain"
          />
        </View>
      ) : null}

      <Modal visible={selectedIndex !== null} transparent animationType="fade">
        <TouchableOpacity
          style={s.modalBg}
          activeOpacity={1}
          onPress={() => setSelectedIndex(null)}
        >
          {selectedIndex !== null && (
            <View style={s.modalContent}>
              <Image
                source={{ uri: allImages[selectedIndex]?.src }}
                style={s.modalImage}
                resizeMode="contain"
              />
              <Text style={s.modalLabel}>{allImages[selectedIndex]?.label}</Text>
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
    title: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    count: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    scroll: {
      paddingVertical: 12,
    },
    scrollContent: {
      paddingHorizontal: 14,
      gap: 8,
    },
    thumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE * 0.75,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.muted,
      position: "relative",
    },
    thumbImage: {
      width: "100%",
      height: "100%",
    },
    thumbLabel: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingVertical: 2,
      paddingHorizontal: 4,
    },
    thumbLabelText: {
      fontSize: 9,
      color: "#fff",
      fontFamily: "Inter_500Medium",
      textAlign: "center",
    },
    trajectorySection: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      gap: 6,
    },
    trajectoryLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    trajectoryImage: {
      width: "100%",
      height: 120,
      borderRadius: 8,
      backgroundColor: colors.muted,
    },
    modalBg: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.92)",
      alignItems: "center",
      justifyContent: "center",
    },
    modalContent: {
      width: "90%",
      alignItems: "center",
      gap: 10,
    },
    modalImage: {
      width: "100%",
      height: 300,
      borderRadius: 10,
    },
    modalLabel: {
      color: "#fff",
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
  });
