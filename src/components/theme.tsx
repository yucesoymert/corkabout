"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useSyncExternalStore } from "react";
import { Toaster } from "sonner";

// Theme choice: localStorage.theme = "light" | "dark", missing = follow the system. The `dark` class on <html>
// is set before paint by the script in [lang]/layout.tsx and kept in sync here.
export type ThemeChoice = "light" | "dark" | "system";

const EVENT = "corkabout:theme";
const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
const stored = (): ThemeChoice => (localStorage.theme === "light" || localStorage.theme === "dark" ? localStorage.theme : "system");
const apply = () => document.documentElement.classList.toggle("dark", stored() === "system" ? systemDark() : stored() === "dark");

export function setTheme(choice: ThemeChoice) {
  if (choice === "system") localStorage.removeItem("theme");
  else localStorage.theme = choice;
  apply();
  dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  addEventListener(EVENT, cb);
  return () => removeEventListener(EVENT, cb);
};
export const useThemeChoice = () => useSyncExternalStore(subscribe, stored, () => "system" as ThemeChoice);
const useDark = () => useSyncExternalStore(subscribe, () => document.documentElement.classList.contains("dark"), () => false);

/** Dashboard header button: flips between light and dark. */
export function ThemeToggle({ label }: { label: string }) {
  // Both icons rendered, CSS picks one: the server can't know the theme, so nothing here depends on it.
  return (
    <button
      onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
    >
      <Moon className="size-4 dark:hidden" aria-hidden />
      <Sun className="hidden size-4 dark:block" aria-hidden />
    </button>
  );
}

/** Light / Dark / System segmented control (board menu and settings). */
export function ThemePicker({ labels }: { labels: Record<ThemeChoice, string> }) {
  const choice = useThemeChoice();
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-lg bg-neutral-100 p-1 text-xs">
      {(["light", "dark", "system"] as const).map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={choice === c}
          onClick={() => setTheme(c)}
          className="rounded-md px-2 py-1.5 text-neutral-600 hover:text-neutral-900 aria-checked:bg-white aria-checked:font-medium aria-checked:text-neutral-900 aria-checked:shadow-sm"
        >
          {labels[c]}
        </button>
      ))}
    </div>
  );
}

export function ThemedToaster() {
  // While following the system, react to the OS switching themes.
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => stored() === "system" && setTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return <Toaster position="bottom-center" theme={useDark() ? "dark" : "light"} />;
}
