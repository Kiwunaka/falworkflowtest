"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface AppSettings {
  falKey: string;
  fireworksKey: string;
  fireworksModel: string;
  openrouterKey: string;
  openrouterModel: string;
}

const DEFAULTS: AppSettings = {
  falKey: "",
  fireworksKey: "",
  fireworksModel: "accounts/fireworks/routers/kimi-k2p5-turbo",
  openrouterKey: "",
  openrouterModel: "qwen/qwen3-30b",
};

const STORAGE_KEY = "fal_studio_settings";

const SettingsContext = createContext<{
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  isConfigured: boolean;
}>({
  settings: DEFAULTS,
  updateSettings: () => {},
  isConfigured: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULTS, ...parsed });
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Keys might also be set in .env.local (server-side)
  // so isConfigured is lenient — we allow even empty keys here
  // since .env will serve as fallback
  const isConfigured = loaded;

  if (!loaded) return null; // avoid hydration mismatch

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isConfigured }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/**
 * Build headers to send client-side API keys to server routes.
 * Server routes will use these if .env.local keys are not set.
 */
export function buildApiHeaders(settings: AppSettings): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.falKey) headers["x-fal-key"] = settings.falKey;
  if (settings.fireworksKey) headers["x-fireworks-key"] = settings.fireworksKey;
  if (settings.fireworksModel) headers["x-fireworks-model"] = settings.fireworksModel;
  if (settings.openrouterKey) headers["x-openrouter-key"] = settings.openrouterKey;
  if (settings.openrouterModel) headers["x-openrouter-model"] = settings.openrouterModel;
  return headers;
}
