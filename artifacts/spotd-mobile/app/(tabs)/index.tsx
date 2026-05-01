import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { URLInput } from "@/components/URLInput";
import colors from "@/constants/colors";
import { useDownloads } from "@/contexts/DownloadContext";
import { useSettings } from "@/contexts/SettingsContext";
import type { ParsedUrl } from "@/utils/urlParser";

const TIPS = [
  {
    icon: "music" as const,
    label: "Spotify Track",
    hint: "open.spotify.com/track/…",
    color: colors.spotify,
  },
  {
    icon: "list" as const,
    label: "Spotify Playlist",
    hint: "open.spotify.com/playlist/…",
    color: colors.spotify,
  },
  {
    icon: "disc" as const,
    label: "Spotify Album",
    hint: "open.spotify.com/album/…",
    color: colors.spotify,
  },
  {
    icon: "youtube" as const,
    label: "YouTube Video",
    hint: "youtube.com/watch?v=…",
    color: colors.youtube,
  },
  {
    icon: "film" as const,
    label: "YouTube Shorts",
    hint: "youtube.com/shorts/…",
    color: colors.youtube,
  },
  {
    icon: "list" as const,
    label: "YouTube Playlist",
    hint: "youtube.com/playlist?list=…",
    color: colors.youtube,
  },
];

export default function DownloaderScreen() {
  const insets = useSafeAreaInsets();
  const { startDownload, activeCount } = useDownloads();
  const { settings } = useSettings();
  const router = useRouter();
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (parsed: ParsedUrl) => {
    try {
      await startDownload(parsed);
      setLastSubmitted(parsed.raw);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      router.navigate("/(tabs)/downloads");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 20, paddingBottom: botPad + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroSection}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Feather name="download-cloud" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.appName}>SpotD</Text>
            <Text style={styles.appSub}>by Suyash Prabhu</Text>
          </View>
        </View>

        <Text style={styles.headline}>
          Download anything.{"\n"}No account needed.
        </Text>

        {activeCount > 0 && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => router.navigate("/(tabs)/downloads")}
            activeOpacity={0.8}
          >
            <View style={styles.activeDot} />
            <Text style={styles.activeBannerText}>
              {activeCount} download{activeCount > 1 ? "s" : ""} in progress
            </Text>
            <Feather name="arrow-right" size={13} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {success && (
        <View style={styles.successBanner}>
          <Feather name="check-circle" size={15} color={colors.success} />
          <Text style={styles.successText}>Download started!</Text>
        </View>
      )}

      <View style={styles.card}>
        <URLInput onSubmit={handleSubmit} />
      </View>

      <View style={styles.qualityRow}>
        <View style={styles.qualityChip}>
          <Feather name="headphones" size={13} color={colors.primary} />
          <Text style={styles.qualityText}>
            {settings.downloadMode === "audio"
              ? `MP3 ${settings.audioQuality}kbps`
              : `Video ${settings.videoQuality}p`}
          </Text>
        </View>
        <Text style={styles.qualityHint}>Change in Settings →</Text>
      </View>

      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>Supported URLs</Text>
        <View style={styles.tipsGrid}>
          {TIPS.map((tip) => (
            <View key={tip.label} style={styles.tipChip}>
              <Feather name={tip.icon} size={13} color={tip.color} />
              <View>
                <Text style={styles.tipLabel}>{tip.label}</Text>
                <Text style={styles.tipHint} numberOfLines={1}>{tip.hint}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  heroSection: {
    gap: 12,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary + "44",
  },
  appName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.text,
  },
  appSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.textTertiary,
  },
  headline: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: colors.text,
    lineHeight: 32,
    marginTop: 8,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.primary + "33",
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  activeBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    fontFamily: "Inter_500Medium",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.success + "18",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.success + "33",
  },
  successText: {
    fontSize: 13,
    color: colors.success,
    fontFamily: "Inter_500Medium",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  qualityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  qualityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qualityText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: "Inter_500Medium",
  },
  qualityHint: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  tipsSection: {
    gap: 10,
  },
  tipsTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tipsGrid: {
    gap: 6,
  },
  tipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipLabel: {
    fontSize: 13,
    color: colors.text,
    fontFamily: "Inter_500Medium",
  },
  tipHint: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
});
