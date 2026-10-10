"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PatchworkTheme } from "./tokens";

const storageKey = "patchwork-theme";

interface ThemeContextValue {
  theme: PatchworkTheme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: PatchworkTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(theme: PatchworkTheme): "light" | "dark" {
  if (theme !== "system") return theme;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function initialTheme(): PatchworkTheme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(storageKey);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, setThemeState] = useState<PatchworkTheme>(initialTheme);
  const resolvedTheme = resolveTheme(theme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    window.localStorage.setItem(storageKey, theme);
  }, [resolvedTheme, theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => document.documentElement.dataset.theme = resolveTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedTheme,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState((current) => resolveTheme(current) === "dark" ? "light" : "dark"),
  }), [resolvedTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider.");
  return value;
}
