import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import colors from "@/constants/colors";
import type { TrackRecord } from "@/utils/storage";

interface Props {
  track: TrackRecord;
  index: number;
}

const STATUS_COLOR: Record<TrackRecord["status"], string> = {
  queued: colors.textTertiary,
  searching: colors.warning,
  downloading: colors.primary,
  done: colors.success,
  error: colors.error,
};

const STATUS_LABEL: Record<TrackRecord["status"], string> = {
  queued: "Queued",
  searching: "Searching…",
  downloading: "Downloading…",
  done: "Done",
  error: "Failed",
};

export function TrackRow({ track, index }: Props) {
  const color = STATUS_COLOR[track.status];

  return (
    <View style={styles.row}>
      <View style={styles.numWrap}>
        {track.status === "done" ? (
          <Feather name="check" size={12} color={colors.primary} />
        ) : track.status === "error" ? (
          <Feather name="x" size={12} color={colors.error} />
        ) : track.status === "searching" || track.status === "downloading" ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.num}>{index + 1}</Text>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {track.name}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track.artist}
        </Text>
        {track.error ? (
          <Text style={styles.error} numberOfLines={1}>
            {track.error}
          </Text>
        ) : null}
      </View>

      <View style={[styles.statusBadge, { backgroundColor: color + "22" }]}>
        <Text style={[styles.statusText, { color }]}>{STATUS_LABEL[track.status]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  numWrap: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  num: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  info: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontSize: 13,
    color: colors.text,
    fontFamily: "Inter_500Medium",
  },
  artist: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  error: {
    fontSize: 10,
    color: colors.error,
    fontFamily: "Inter_400Regular",
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});
