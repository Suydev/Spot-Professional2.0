import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import colors from "@/constants/colors";
import { useDownloads } from "@/contexts/DownloadContext";

function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Feather name={name} size={21} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const { activeCount } = useDownloads();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.surface,
          borderTopWidth: 0,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 72,
          paddingBottom: isWeb ? 16 : 8,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={[StyleSheet.absoluteFill, styles.tabBg]}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              ]}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              ]}
            />
          ),
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Download",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="download-cloud" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: "Queue",
          tabBarBadge: activeCount > 0 ? activeCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: colors.background,
            fontSize: 10,
            fontFamily: "Inter_700Bold",
          },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="activity" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="folder" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="sliders" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBg: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  iconWrapActive: {
    backgroundColor: colors.primaryMuted,
  },
});
