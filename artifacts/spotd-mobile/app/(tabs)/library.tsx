import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";

interface LocalFile {
  name: string;
  path: string;
  size: number;
  modTime: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileItem({ file, onShare, onDelete }: {
  file: LocalFile;
  onShare: () => void;
  onDelete: () => void;
}) {
  const isVideo = file.name.endsWith(".mp4");
  return (
    <View style={styles.fileCard}>
      <View style={[styles.fileIcon, { backgroundColor: isVideo ? colors.youtube + "22" : colors.primary + "22" }]}>
        <Feather
          name={isVideo ? "film" : "music"}
          size={18}
          color={isVideo ? colors.youtube : colors.primary}
        />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={2}>
          {file.name.replace(/_[a-z0-9]+\.(mp3|mp4)$/, "").replace(/_/g, " ")}
        </Text>
        <Text style={styles.fileMeta}>
          {isVideo ? "MP4 Video" : "MP3 Audio"} · {formatBytes(file.size)}
        </Text>
      </View>
      <View style={styles.fileActions}>
        <Pressable onPress={onShare} style={styles.iconBtn} hitSlop={8}>
          <Feather name="share" size={16} color={colors.primary} />
        </Pressable>
        <Pressable onPress={onDelete} style={styles.iconBtn} hitSlop={8}>
          <Feather name="trash-2" size={16} color={colors.error} />
        </Pressable>
      </View>
    </View>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const dir = `${FileSystem.documentDirectory}spotd/`;
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) {
        setFiles([]);
        return;
      }
      const names = await FileSystem.readDirectoryAsync(dir);
      const items: LocalFile[] = [];
      for (const name of names) {
        if (!name.endsWith(".mp3") && !name.endsWith(".mp4")) continue;
        const path = dir + name;
        const fi = await FileSystem.getInfoAsync(path);
        items.push({
          name,
          path,
          size: (fi as any).size ?? 0,
          modTime: (fi as any).modificationTime
            ? new Date((fi as any).modificationTime * 1000).toLocaleDateString()
            : "",
        });
      }
      items.sort((a, b) => b.modTime.localeCompare(a.modTime));
      setFiles(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleShare = async (file: LocalFile) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (Platform.OS !== "web") {
        const can = await Sharing.isAvailableAsync();
        if (can) await Sharing.shareAsync(file.path);
        else Alert.alert("Unavailable", "Sharing not supported on this device.");
      } else {
        Alert.alert("File path", file.path);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleDelete = (file: LocalFile) => {
    Alert.alert("Delete file?", file.name.replace(/_[a-z0-9]+\.(mp3|mp4)$/, "").replace(/_/g, " "), [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(file.path);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadFiles();
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: botPad + 32 },
      ]}
      data={files}
      keyExtractor={(f) => f.path}
      showsVerticalScrollIndicator={false}
      onRefresh={loadFiles}
      refreshing={loading}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Library</Text>
            {files.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{files.length}</Text>
              </View>
            )}
          </View>
          {files.length > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Feather name="hard-drive" size={13} color={colors.primary} />
                <Text style={styles.statText}>{formatBytes(totalSize)} used</Text>
              </View>
              <View style={styles.statChip}>
                <Feather name="file" size={13} color={colors.primary} />
                <Text style={styles.statText}>{files.length} files</Text>
              </View>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="folder" size={32} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Library is empty</Text>
            <Text style={styles.emptyText}>
              Completed downloads will appear here. Pull to refresh after downloading.
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <FileItem
          file={item}
          onShare={() => handleShare(item)}
          onDelete={() => handleDelete(item)}
        />
      )}
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
    gap: 12,
    marginBottom: 16,
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
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statChip: {
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
  statText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: "Inter_500Medium",
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
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: {
    flex: 1,
    gap: 3,
  },
  fileName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.text,
    textTransform: "capitalize",
  },
  fileMeta: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  fileActions: {
    flexDirection: "row",
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.surfaceHighlight,
  },
});
