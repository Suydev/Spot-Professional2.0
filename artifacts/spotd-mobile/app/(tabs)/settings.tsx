import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { useDownloads } from "@/contexts/DownloadContext";
import { useSettings } from "@/contexts/SettingsContext";
import { clearAllDownloads } from "@/utils/storage";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function OptionRow<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.optRow}>
      <Text style={styles.optLabel}>{label}</Text>
      <View style={styles.optChips}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            style={[
              styles.chip,
              value === o.value && styles.chipActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(o.value);
            }}
          >
            <Text
              style={[
                styles.chipText,
                value === o.value && styles.chipTextActive,
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.optLabel}>{label}</Text>
        {sublabel ? <Text style={styles.toggleSub}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceHighlight, true: colors.primary + "88" }}
        thumbColor={value ? colors.primary : colors.textTertiary}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const { downloads } = useDownloads();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const handleClearHistory = () => {
    Alert.alert(
      "Clear download history?",
      "This removes all records. Downloaded files on your device are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearAllDownloads();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Cleared", "Download history has been cleared.");
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: botPad + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Settings</Text>

      <Section title="DOWNLOAD MODE">
        <OptionRow
          label="Format"
          value={settings.downloadMode}
          options={[
            { label: "Audio (MP3)", value: "audio" },
            { label: "Video (MP4)", value: "video" },
          ]}
          onSelect={(v) => update({ downloadMode: v })}
        />
      </Section>

      <Section title="AUDIO QUALITY">
        <OptionRow
          label="MP3 Bitrate"
          value={settings.audioQuality}
          options={[
            { label: "128 kbps", value: "128" },
            { label: "192 kbps", value: "192" },
            { label: "320 kbps", value: "320" },
          ]}
          onSelect={(v) => update({ audioQuality: v })}
        />
      </Section>

      <Section title="VIDEO QUALITY">
        <OptionRow
          label="Max Resolution"
          value={settings.videoQuality}
          options={[
            { label: "360p", value: "360" },
            { label: "480p", value: "480" },
            { label: "720p", value: "720" },
            { label: "1080p", value: "1080" },
          ]}
          onSelect={(v) => update({ videoQuality: v })}
        />
      </Section>

      <Section title="CONCURRENCY">
        <OptionRow
          label="Parallel Downloads"
          value={String(settings.maxConcurrent) as any}
          options={[
            { label: "1", value: "1" },
            { label: "3", value: "3" },
            { label: "5", value: "5" },
          ]}
          onSelect={(v) => update({ maxConcurrent: Number(v) })}
        />
      </Section>

      <Section title="DEVICE">
        <ToggleRow
          label="Save to Gallery"
          sublabel="Attempt to save audio to device music library"
          value={settings.saveToGallery}
          onChange={(v) => update({ saveToGallery: v })}
        />
      </Section>

      <Section title="STORAGE">
        <View style={styles.statBlock}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total downloads</Text>
            <Text style={styles.statValue}>{downloads.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statValue}>
              {downloads.filter((d) => d.status === "done").length}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Tracks downloaded</Text>
            <Text style={styles.statValue}>
              {downloads.reduce((s, d) => s + d.completedTracks, 0)}
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.7 }]}
          onPress={handleClearHistory}
        >
          <Feather name="trash-2" size={15} color={colors.error} />
          <Text style={styles.dangerBtnText}>Clear Download History</Text>
        </Pressable>
      </Section>

      <Section title="ABOUT">
        <View style={styles.aboutBlock}>
          <View style={styles.logoMini}>
            <Feather name="download-cloud" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.aboutApp}>SpotD Mobile</Text>
            <Text style={styles.aboutSub}>by Suyash Prabhu · v1.0</Text>
          </View>
        </View>
        <Text style={styles.aboutDesc}>
          Powered by Spotify's public embed API and cobalt.tools.{"\n"}No account required. All downloads are stored locally on your device.
        </Text>
        <View style={styles.apiBlock}>
          <Feather name="zap" size={13} color={colors.primary} />
          <Text style={styles.apiText}>Download engine: cobalt.tools (free, open-source)</Text>
        </View>
        <View style={styles.apiBlock}>
          <Feather name="shield" size={13} color={colors.primary} />
          <Text style={styles.apiText}>No server — everything runs on your device</Text>
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 16,
    gap: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.text,
    marginBottom: 4,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.textTertiary,
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  optRow: {
    padding: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.text,
  },
  optChips: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  toggleInfo: {
    flex: 1,
    gap: 3,
    paddingRight: 12,
  },
  toggleSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textTertiary,
  },
  statBlock: {
    padding: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
  },
  dangerBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.error,
  },
  aboutBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logoMini: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary + "44",
  },
  aboutApp: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: colors.text,
  },
  aboutSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textTertiary,
  },
  aboutDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    lineHeight: 20,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  apiBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  apiText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    flex: 1,
  },
});
