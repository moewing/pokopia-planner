"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "zh" | "en";

interface LocaleState {
  locale: Locale;
  hasHydrated: boolean;
  setLocale: (l: Locale) => void;
  _setHydrated: (v: boolean) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "zh",
      hasHydrated: false,
      setLocale: (l) => set({ locale: l }),
      _setHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "pokopia:locale",
      partialize: (s) => ({ locale: s.locale }),
      onRehydrateStorage: () => (state) => {
        // Default to browser language on first load (fallback to zh)
        if (state && !state.locale && typeof navigator !== "undefined") {
          const browser = (navigator.language || "zh").toLowerCase();
          state.locale = browser.startsWith("zh") ? "zh" : "en";
        }
        state?._setHydrated(true);
      },
    },
  ),
);
