import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DownloadCard } from "@/components/DownloadCard";
import colors from "@/constants/colors";
import { useDownloads } from "@/contexts/DownloadContext";

export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const { downloads, cancelDownload, removeDownload, activeCount } = useDownloads();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const active = downloads.filter(
    (d) => d.status === "queued" || d.status === "fetching" || d.status === "downloading"
  );
  const history = downloads.filter(
    (d) => d.status === "done" || d.status === "error" || d.status === "cancelled"
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: botPad + 32 },
      ]}
      data={downloads}
      keyExtractor={(d) => d.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Downloads</Text>
            {activeCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeCount}</Text>
              </View>
            )}
          </View>
          {active.length > 0 && (
            <Text style={styles.sectionLabel}>ACTIVE</Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="download" size={32} color={colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No downloads yet</Text>
          <Text style={styles.emptyText}>
            Paste a Spotify or YouTube URL on the Download tab to get started.
          </Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const isFirstHistory =
          item.status !== "queued" &&
          item.status !== "fetching" &&
          item.status !== "downloading" &&
          (index === 0 || 
            (downloads[index - 1]?.status === "queued" ||
             downloads[index - 1]?.status === "fetching" ||
             downloads[index - 1]?.status === "downloading"));

        return (
          <>
            {isFirstHistory && history.length > 0 && (
              <Text style={[styles.sectionLabel, { marginTop: active.length > 0 ? 20 : 0 }]}>
                HISTORY
              </Text>
            )}
            <DownloadCard
              record={item}
              onCancel={() => cancelDownload(item.id)}
              onRemove={() => removeDownload(item.id)}
            />
          </>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 16,
    gap: 0,
  },
  header: {
    gap: 16,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: colors.background,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
