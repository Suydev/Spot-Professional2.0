import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import colors from "@/constants/colors";
import type { DownloadRecord } from "@/utils/storage";
import { ProgressBar } from "./ProgressBar";
import { TrackRow } from "./TrackRow";

interface Props {
  record: DownloadRecord;
  onCancel: () => void;
  onRemove: () => void;
}

const STATUS_LABEL: Record<DownloadRecord["status"], string> = {
  queued: "Queued",
  fetching: "Fetching info…",
  downloading: "Downloading",
  done: "Completed",
  error: "Failed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<DownloadRecord["status"], string> = {
  queued: colors.textTertiary,
  fetching: colors.warning,
  downloading: colors.primary,
  done: colors.success,
  error: colors.error,
  cancelled: colors.textTertiary,
};

export function DownloadCard({ record, onCancel, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [sharing, setSharing] = useState(false);

  const progress =
    record.totalTracks > 0
      ? record.completedTracks / record.totalTracks
      : 0;

  const isActive =
    record.status === "queued" ||
    record.status === "fetching" ||
    record.status === "downloading";

  const statusColor = STATUS_COLOR[record.status];
  const kindIsSpotify = record.kind.startsWith("spotify");
  const kindIcon = kindIsSpotify ? "music" : "youtube";

  const handleShare = async () => {
    const paths = record.tracks
      .filter((t) => t.status === "done" && t.localPath)
      .map((t) => t.localPath!);
    if (!paths.length && !record.localPath) {
      Alert.alert("Nothing to share yet", "No files downloaded yet.");
      return;
    }
    const target = record.localPath || paths[0];
    if (!target) return;
    try {
      setSharing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (Platform.OS !== "web") {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(target, { mimeType: "audio/mpeg" });
        } else {
          Alert.alert("Sharing unavailable", "Sharing is not supported on this device.");
        }
      } else {
        Alert.alert("File saved", `Your file is at:\n${target}`);
      }
    } catch (e: any) {
      Alert.alert("Share failed", e.message);
    } finally {
      setSharing(false);
    }
  };

  const shortName = record.name.length > 60
    ? record.name.slice(0, 57) + "…"
    : record.name;

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded((e) => !e)}
        hitSlop={4}
      >
        {record.coverUrl ? (
          <Image source={{ uri: record.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Feather name={kindIcon} size={20} color={colors.textTertiary} />
          </View>
        )}

        <View style={styles.titleArea}>
          <Text style={styles.title} numberOfLines={2}>
            {shortName}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {STATUS_LABEL[record.status]}
            </Text>
            {record.totalTracks > 0 && (
              <Text style={styles.tracksText}>
                {" "}· {record.completedTracks}/{record.totalTracks} tracks
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightArea}>
          {isActive && <ActivityIndicator size="small" color={colors.primary} />}
          {!isActive && (
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textTertiary}
            />
          )}
        </View>
      </Pressable>

      {record.status === "downloading" && record.totalTracks > 0 && (
        <View style={styles.progressWrap}>
          <ProgressBar progress={progress} />
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      )}

      {record.status === "error" && record.errorMessage ? (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={13} color={colors.error} />
          <Text style={styles.errorText} numberOfLines={2}>{record.errorMessage}</Text>
        </View>
      ) : null}

      {expanded && (
        <View style={styles.expandedArea}>
          {record.tracks.length > 0 && (
            <ScrollView
              style={styles.trackList}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {record.tracks.map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} />
              ))}
            </ScrollView>
          )}

          <View style={styles.actionRow}>
            {record.status === "done" && (
              <Pressable
                style={[styles.actionBtn, styles.shareBtn]}
                onPress={handleShare}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Feather name="share" size={15} color={colors.background} />
                )}
                <Text style={styles.shareBtnText}>
                  {sharing ? "Sharing…" : "Share Files"}
                </Text>
              </Pressable>
            )}

            {isActive && (
              <Pressable
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={onCancel}
              >
                <Feather name="x" size={15} color={colors.error} />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            )}

            {!isActive && (
              <Pressable
                style={[styles.actionBtn, styles.removeBtn]}
                onPress={() => {
                  Alert.alert("Remove download?", "This will remove it from history.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: onRemove },
                  ]);
                }}
              >
                <Feather name="trash-2" size={15} color={colors.textTertiary} />
                <Text style={styles.removeBtnText}>Remove</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.surfaceHighlight,
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  titleArea: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  tracksText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  rightArea: {
    width: 28,
    alignItems: "center",
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  progressText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: "Inter_500Medium",
    width: 32,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 10,
    backgroundColor: colors.error + "18",
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
    fontFamily: "Inter_400Regular",
  },
  expandedArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    padding: 14,
    gap: 12,
  },
  trackList: {
    maxHeight: 260,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
  },
  shareBtn: {
    backgroundColor: colors.primary,
  },
  shareBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.background,
  },
  cancelBtn: {
    backgroundColor: colors.error + "18",
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.error,
  },
  removeBtn: {
    backgroundColor: colors.surfaceHighlight,
  },
  removeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.textTertiary,
  },
});
