"use client";

import {
  Moon,
  Sun,
} from "lucide-react";

import {
  useTheme,
} from "./ThemeProvider";

export default function ThemeToggle() {
  const {
    theme,
    mounted,
    toggleTheme,
  } = useTheme();

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="agriva-global-theme-toggle h-12 w-12"
      />
    );
  }

  const isDark =
    theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="agriva-global-theme-toggle"
      aria-label={
        isDark
          ? "Switch AGRIVA to light mode"
          : "Switch AGRIVA to dark mode"
      }
      title={
        isDark
          ? "Light mode"
          : "Dark mode"
      }
    >
      {isDark ? (
        <Sun
          className="h-5 w-5"
          aria-hidden="true"
        />
      ) : (
        <Moon
          className="h-5 w-5"
          aria-hidden="true"
        />
      )}

      <span className="agriva-theme-toggle-label">
        {isDark
          ? "Light"
          : "Dark"}
      </span>
    </button>
  );
}
