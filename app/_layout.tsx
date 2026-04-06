import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useVideoPlayer, VideoView } from "expo-video";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { JobProvider } from "@/context/JobContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const introVideo = require("../assets/intro.mp4");
const isWeb = Platform.OS === "web";

function AppNameOverlay() {
  return (
    <View style={s.nameOverlay} pointerEvents="none">
      <Text style={s.appName}>SOP Lens</Text>
    </View>
  );
}

function IntroScreen({ onDone }: { onDone: () => void }) {
  const fadeOut = useRef(new Animated.Value(1)).current;
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => onDone());
  }, [fadeOut, onDone]);

  const player = useVideoPlayer(isWeb ? null : introVideo, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const fallbackTimer = setTimeout(finish, 15000);

    let endSub: { remove: () => void } | null = null;
    if (!isWeb) {
      endSub = player.addListener("playToEnd", finish);
    }

    return () => {
      clearTimeout(fallbackTimer);
      endSub?.remove();
    };
  }, [player, finish]);

  if (isWeb) {
    return (
      <Animated.View style={[s.intro, { opacity: fadeOut }]}>
        {/* pointerEvents none prevents browser click-to-pause */}
        <video
          src={introVideo}
          autoPlay
          muted
          playsInline
          onEnded={finish}
          style={{
            position: "absolute" as const,
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover" as const,
            pointerEvents: "none" as const,
          }}
        />
        {/* Transparent intercept layer — blocks all clicks reaching the video */}
        <div
          style={{
            position: "absolute" as const,
            inset: 0,
            zIndex: 1,
          }}
        />
        <AppNameOverlay />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[s.intro, { opacity: fadeOut }]}>
      {/* nativeControls=false hides all native controls on iOS/Android */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      {/* Intercept layer — prevents tap-to-pause on native */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-only" />
      <AppNameOverlay />
    </Animated.View>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="processing"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="results"
        options={{ headerShown: false, presentation: "card" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const skipIntro =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    (window.location.search.includes("skip=1") ||
      window.localStorage.getItem("soplens_skip_intro") === "1");
  const [introComplete, setIntroComplete] = useState(skipIntro);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <JobProvider>
                <View style={{ flex: 1 }}>
                  <RootLayoutNav />
                  {!introComplete && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                      <IntroScreen onDone={() => setIntroComplete(true)} />
                    </View>
                  )}
                </View>
              </JobProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  intro: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 999,
  },
  nameOverlay: {
    position: "absolute",
    top: "18%" as unknown as number,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 32,
    fontFamily: "Inter_400Regular",
    letterSpacing: 2,
    textAlign: "center",
  },
});
