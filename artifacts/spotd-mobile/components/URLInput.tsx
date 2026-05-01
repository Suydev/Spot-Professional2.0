import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import colors from "@/constants/colors";
import { ParsedUrl, getUrlLabel, parseUrl } from "@/utils/urlParser";

interface Props {
  onSubmit: (parsed: ParsedUrl) => void;
}

export function URLInput({ onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [parsed, setParsed] = useState<ParsedUrl | null>(null);
  const [error, setError] = useState("");

  const handleChange = (text: string) => {
    setValue(text);
    setError("");
    if (text.trim()) {
      const p = parseUrl(text);
      setParsed(p.kind !== "unknown" ? p : null);
    } else {
      setParsed(null);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) handleChange(text);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleSubmit = () => {
    const p = parseUrl(value.trim());
    if (p.kind === "unknown") {
      setError("Paste a valid Spotify or YouTube URL");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    onSubmit(p);
    setValue("");
    setParsed(null);
  };

  const handleClear = () => {
    setValue("");
    setParsed(null);
    setError("");
  };

  const isSpotify = parsed?.kind.startsWith("spotify");
  const isYouTube = parsed?.kind.startsWith("youtube");

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputRow,
          error ? styles.inputRowError : parsed ? styles.inputRowValid : null,
        ]}
      >
        <View style={styles.iconWrap}>
          {isSpotify ? (
            <View style={[styles.badge, { backgroundColor: colors.spotify + "22" }]}>
              <Feather name="music" size={16} color={colors.spotify} />
            </View>
          ) : isYouTube ? (
            <View style={[styles.badge, { backgroundColor: colors.youtube + "22" }]}>
              <Feather name="youtube" size={16} color={colors.youtube} />
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Feather name="link" size={16} color={colors.textTertiary} />
            </View>
          )}
        </View>

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder="Paste Spotify or YouTube URL…"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />

        {value.length > 0 ? (
          <Pressable onPress={handleClear} style={styles.actionBtn} hitSlop={8}>
            <Feather name="x" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : (
          <Pressable onPress={handlePaste} style={styles.actionBtn} hitSlop={8}>
            <Feather name="clipboard" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {parsed && (
        <View style={styles.detectedRow}>
          <Feather name="check-circle" size={13} color={colors.primary} />
          <Text style={styles.detectedText}>{getUrlLabel(parsed.kind)}</Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={13} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={!parsed}
        style={({ pressed }) => [
          styles.downloadBtn,
          !parsed && styles.downloadBtnDisabled,
          pressed && styles.downloadBtnPressed,
        ]}
      >
        <Feather name="download" size={18} color={parsed ? colors.background : colors.textTertiary} />
        <Text style={[styles.downloadBtnText, !parsed && styles.downloadBtnTextDisabled]}>
          Download
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    gap: 10,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  inputRowValid: {
    borderColor: colors.primary + "55",
  },
  iconWrap: {},
  badge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: "Inter_400Regular",
  },
  actionBtn: {
    padding: 4,
  },
  detectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
  detectedText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: "Inter_500Medium",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    fontFamily: "Inter_400Regular",
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: colors.radius,
    paddingVertical: 14,
    marginTop: 4,
  },
  downloadBtnDisabled: {
    backgroundColor: colors.surfaceHighlight,
  },
  downloadBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  downloadBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.background,
  },
  downloadBtnTextDisabled: {
    color: colors.textTertiary,
  },
});
