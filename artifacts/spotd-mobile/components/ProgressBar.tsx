import React from "react";
import { StyleSheet, View } from "react-native";
import colors from "@/constants/colors";

interface Props {
  progress: number;
  height?: number;
  color?: string;
}

export function ProgressBar({ progress, height = 4, color = colors.primary }: Props) {
  const pct = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 99,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    borderRadius: 99,
  },
});
