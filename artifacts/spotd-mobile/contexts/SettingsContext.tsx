import React, { createContext, useContext, useEffect, useState } from "react";
import { AppSettings, getSettings, saveSettings } from "@/utils/storage";

interface SettingsCtx {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  loaded: boolean;
}

const SettingsContext = createContext<SettingsCtx>({
  settings: {
    audioQuality: "320",
    videoQuality: "720",
    downloadMode: "audio",
    saveToGallery: true,
    maxConcurrent: 3,
  },
  update: async () => {},
  loaded: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    audioQuality: "320",
    videoQuality: "720",
    downloadMode: "audio",
    saveToGallery: true,
    maxConcurrent: 3,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const update = async (patch: Partial<AppSettings>) => {
    const updated = await saveSettings(patch);
    setSettings(updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, update, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
