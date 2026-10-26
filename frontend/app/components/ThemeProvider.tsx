"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AgrivaTheme =
  | "light"
  | "dark";

type ThemeContextValue = {
  theme: AgrivaTheme;
  mounted: boolean;
  setTheme: (
    theme: AgrivaTheme
  ) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY =
  "agriva_theme";

const ThemeContext =
  createContext<
    ThemeContextValue | undefined
  >(undefined);

function systemTheme(): AgrivaTheme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches
  ) {
    return "dark";
  }

  return "light";
}

function readStoredTheme():
  | AgrivaTheme
  | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const saved =
    window.localStorage.getItem(
      STORAGE_KEY
    );

  return saved === "light" ||
    saved === "dark"
    ? saved
    : null;
}

function applyTheme(
  theme: AgrivaTheme
) {
  const root =
    document.documentElement;

  root.dataset.theme = theme;

  root.classList.toggle(
    "dark",
    theme === "dark"
  );

  root.style.colorScheme =
    theme;
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] =
    useState<AgrivaTheme>("light");

  const [mounted, setMounted] =
    useState(false);

  const setTheme = useCallback(
    (nextTheme: AgrivaTheme) => {
      setThemeState(nextTheme);

      applyTheme(nextTheme);

      window.localStorage.setItem(
        STORAGE_KEY,
        nextTheme
      );

      window.dispatchEvent(
        new CustomEvent(
          "agriva-theme-change",
          {
            detail: nextTheme,
          }
        )
      );
    },
    []
  );

  const toggleTheme =
    useCallback(() => {
      setTheme(
        theme === "dark"
          ? "light"
          : "dark"
      );
    }, [setTheme, theme]);

  useEffect(() => {
    const htmlTheme =
      document.documentElement
        .dataset.theme;

    const initialTheme =
      htmlTheme === "light" ||
      htmlTheme === "dark"
        ? htmlTheme
        : readStoredTheme() ??
          systemTheme();

    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);

    function handleStorage(
      event: StorageEvent
    ) {
      if (
        event.key !== STORAGE_KEY
      ) {
        return;
      }

      const next =
        event.newValue;

      if (
        next === "light" ||
        next === "dark"
      ) {
        setThemeState(next);
        applyTheme(next);
      }
    }

    function handleThemeEvent(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<
          AgrivaTheme
        >;

      const next =
        customEvent.detail;

      if (
        next === "light" ||
        next === "dark"
      ) {
        setThemeState(next);
        applyTheme(next);
      }
    }

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "agriva-theme-change",
      handleThemeEvent
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "agriva-theme-change",
        handleThemeEvent
      );
    };
  }, []);

  const value = useMemo(
    () => ({
      theme,
      mounted,
      setTheme,
      toggleTheme,
    }),
    [
      theme,
      mounted,
      setTheme,
      toggleTheme,
    ]
  );

  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider."
    );
  }

  return context;
}
