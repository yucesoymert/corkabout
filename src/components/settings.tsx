"use client";

import { ArrowRight, GearSix } from "@phosphor-icons/react";
import { type Ref, useRef, useState } from "react";
import { updateNameAction } from "@/app/[lang]/actions";
import type { Dictionary } from "@/i18n/tr";
import type { Locale } from "@/i18n/locales";
import { fill } from "@/lib/format";
import { MAX_PHOTOS_PRO } from "@/lib/limits";
import type { Photos } from "./composer";
import { Paywall } from "./paywall";
import { ThemePicker } from "./theme";

type T = Dictionary["menu"];

// One glint across a yellow surface (keyframes "shine" in globals.css); `run` says when.
const glint = (run: string) =>
  `pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,transparent_36%,rgba(255,255,255,.55)_50%,transparent_64%)] bg-size-[250%_100%] bg-position-[150%_0] bg-no-repeat motion-reduce:hidden ${run}`;

/** Settings: name, language, theme, plan. Opened by the caller through `ref` (showModal). Used on a board (⋯ menu)
 * and on the home page (gear button); `path` is the current page without the locale, for the language links. */
export function Settings({
  ref,
  name: initialName,
  path,
  locale,
  languages,
  photos,
  t,
  onUpgrade,
  onRenamed,
}: {
  ref: Ref<HTMLDialogElement>;
  name: string;
  path: string;
  locale: Locale;
  languages: Record<Locale, string>;
  photos: Photos;
  t: T;
  onUpgrade: () => void;
  onRenamed?: (name: string) => void; // the board menu shows the name too
}) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const pro = photos.limit === MAX_PHOTOS_PRO;

  const saveName = async (fd: FormData) => {
    const next = String(fd.get("name") ?? "").trim();
    if (!next || next === name) return;
    setSaved("saving");
    const ok = await updateNameAction(next);
    if (ok) {
      setName(next);
      onRenamed?.(next);
    }
    setSaved(ok ? "saved" : "failed");
  };

  return (
    <dialog ref={ref} onClose={() => setSaved("idle")} aria-labelledby="settings-title" className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl bg-white p-6 text-neutral-900 backdrop:bg-black/40">
      <h2 id="settings-title" className="font-semibold">
        {t.settings}
      </h2>

      <form action={saveName} className="mt-5">
        <label htmlFor="settings-name" className="text-sm font-medium">
          {t.name}
        </label>
        <div className="mt-1.5 flex gap-2">
          <input id="settings-name" name="name" defaultValue={name} onChange={() => saved !== "saving" && setSaved("idle")} required maxLength={80} className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900" />
          {/* green once saved, until the name is edited again; text-[#fff]: text-white turns dark in dark mode */}
          <button disabled={saved === "saving"} className={`rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${saved === "saved" ? "bg-green-600 text-[#fff] hover:bg-green-700" : "bg-neutral-900 text-white hover:bg-neutral-700"}`}>
            {t.save}
          </button>
        </div>
        <p className={`mt-1 ml-0.5 h-4 text-[11px] ${saved === "saved" ? "text-green-700 dark:text-green-400" : "text-neutral-500"}`} aria-live="polite">
          {saved === "saved" ? t.saved : saved === "failed" ? t.saveFailed : ""}
        </p>
      </form>

      <p className="mt-4 text-sm font-medium">{t.language}</p>
      <nav className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
        {(Object.keys(languages) as Locale[]).map((l) => (
          // <a>, not <Link>: another language is another root layout. A full load keeps React from re-creating the theme <script> in <head>.
          <a
            key={l}
            href={`/${l}${path}`}
            aria-current={l === locale ? "true" : undefined}
            className="rounded-md px-2 py-1.5 text-center text-neutral-600 hover:text-neutral-900 aria-[current=true]:bg-white aria-[current=true]:font-medium aria-[current=true]:text-neutral-900 aria-[current=true]:shadow-sm"
          >
            {languages[l]}
          </a>
        ))}
      </nav>

      <p className="mt-5 text-sm font-medium">{t.theme}</p>
      <div className="mt-1.5">
        <ThemePicker labels={{ light: t.light, dark: t.dark, system: t.system }} />
      </div>

      <p className="mt-5 text-sm font-medium">{t.plan}</p>
      {/* the shadow sets the box above the count tab below it; Pro: the whole box yellow, no glint */}
      <div
        className={`relative z-10 mt-1.5 flex min-h-11 items-center justify-between gap-2 rounded-xl py-1 pr-1 pl-3 text-sm ${pro ? "always-light overflow-hidden bg-[#FECF39] shadow-[0_0_0_1px_rgba(120,85,0,.15),0_6px_16px_-4px_rgba(160,110,0,.55)]" : "bg-neutral-100 shadow-[0_6px_12px_-4px_rgba(0,0,0,.3)]"}`}
      >
        <span className="flex items-center text-neutral-700">
          {pro ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- static artwork */}
              <img src="/pro-wordmark.webp" alt="Pro" width={560} height={190} className="h-5 w-auto" />
            </>
          ) : photos.limit === null ? (
            t.planUnlimited
          ) : (
            t.planFree
          )}
        </span>
        {photos.limit !== null && !pro && (
          <button
            onClick={(e) => {
              e.currentTarget.closest("dialog")?.close();
              onUpgrade();
            }}
            // hover: the arrow lifts and turns to ↗, and one glint sweeps across
            className="always-light group relative flex items-center gap-1.5 overflow-hidden rounded-md bg-[#FECF39] px-3 py-1.5 font-semibold text-neutral-900 shadow-sm"
          >
            {t.upgrade}
            <ArrowRight weight="bold" className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] group-hover:-translate-y-0.5 group-hover:-rotate-45 motion-reduce:transition-none" aria-hidden />
            <span aria-hidden className={glint("group-hover:animate-[shine_2.2s_ease-out]")} />
          </button>
        )}
      </div>
      {photos.limit !== null && (
        // the count, a tab sliding out from under the plan box each time the dialog opens (display:none → block restarts
        // it). The wrapper clips it, so it never shows above the box on its way down.
        <div className="-mt-3 overflow-hidden px-3 pb-1">
          <div className="animate-[tab-out_.6s_.15s_cubic-bezier(.22,1,.36,1)_both] rounded-b-xl bg-neutral-200 px-3 pt-6 pb-2 text-xs text-neutral-600 tabular-nums motion-reduce:animate-none">
            {fill(t.planPhotos, { used: photos.used, limit: photos.limit.toLocaleString(locale) })}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={(e) => e.currentTarget.closest("dialog")?.close()} className="rounded-full px-4 py-2 text-sm font-medium hover:bg-neutral-100">
          {t.close}
        </button>
      </div>
    </dialog>
  );
}

/** The home page's gear: opens Settings, and its "Go Pro" opens the paywall right here. */
export function SettingsButton({ board, ...props }: Omit<Parameters<typeof Settings>[0], "ref" | "onUpgrade"> & { board: Dictionary["board"] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [paywall, setPaywall] = useState(false);
  return (
    <>
      <button
        onClick={() => dialog.current?.showModal()}
        aria-label={props.t.settings}
        title={props.t.settings}
        className="grid size-8 place-items-center rounded-full text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
      >
        <GearSix className="size-4" aria-hidden />
      </button>
      <Settings ref={dialog} {...props} onUpgrade={() => setPaywall(true)} />
      {paywall && <Paywall t={board} onClose={() => setPaywall(false)} />}
    </>
  );
}
