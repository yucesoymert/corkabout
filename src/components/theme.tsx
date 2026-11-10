"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";

// Light/dark toggle and a toaster that follows the `dark` class (set by the script in [lang]/layout.tsx).
// ponytail: the toggle stores light/dark only; "follow the system again" needs a third state if anyone asks

const subscribe = (cb: () => void) => {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => o.disconnect();
};
const useDark = () => useSyncExternalStore(subscribe, () => document.documentElement.classList.contains("dark"), () => false);

export function ThemeToggle({ label }: { label: string }) {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    localStorage.theme = dark ? "dark" : "light";
  };
  // Both icons rendered, CSS picks one: the server can't know the theme, so nothing here depends on it.
  return (
    <button onClick={toggle} aria-label={label} title={label} className="grid size-8 place-items-center rounded-full text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900">
      <Moon className="size-4 dark:hidden" aria-hidden />
      <Sun className="hidden size-4 dark:block" aria-hidden />
    </button>
  );
}

export function ThemedToaster() {
  return <Toaster position="bottom-center" theme={useDark() ? "dark" : "light"} />;
}
