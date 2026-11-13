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

const ICON = "col-start-1 row-start-1 size-4 transition-[rotate,scale,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none";

/** Dashboard header button: flips between light and dark. */
export function ThemeToggle({ label }: { label: string }) {
  // Both icons rendered, CSS picks one: the server can't know the theme, so nothing here depends on it.
  return (
    <button
      onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center overflow-hidden rounded-full text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
    >
      {/* Stacked in one cell: the moon spins out as the sun spins in (and back), on the springy curve the buttons use.
          On load the dark class is set before paint, so nothing animates then. */}
      <Moon className={`${ICON} dark:-rotate-90 dark:scale-0 dark:opacity-0`} aria-hidden />
      <Sun className={`${ICON} rotate-90 scale-0 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100`} aria-hidden />
    </button>
  );
}

/** Light / Dark / System segmented control (board menu and settings). */
export function ThemePicker({ labels }: { labels: Record<ThemeChoice, string> }) {
  const choice = useThemeChoice();
  const choices = ["light", "dark", "system"] as const;
  return (
    <div role="radiogroup" className="relative grid grid-cols-3 gap-1 rounded-lg bg-neutral-100 p-1 text-xs">
      {/* One white pill under the picked option, slid from column to column: one column wide, one gap (0.25rem) per step */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc((100%-1rem)/3)] rounded-md bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(calc(${choices.indexOf(choice)} * (100% + 0.25rem)))` }}
      />
      {choices.map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={choice === c}
          onClick={() => setTheme(c)}
          className="relative rounded-md px-2 py-1.5 text-neutral-600 hover:text-neutral-900 aria-checked:font-medium aria-checked:text-neutral-900"
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
