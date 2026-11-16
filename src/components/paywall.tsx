"use client";

import { CheckCircle, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/tr";
import { fill } from "@/lib/format";
import { MAX_BOARDS, MAX_CARDS, MAX_PHOTOS_FREE, MAX_PHOTOS_PRO } from "@/lib/limits";

type T = Dictionary["board"];

// Paper grain over the cream: SVG turbulence, no image file.
const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .22 0 0 0 0 .12 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

// ponytail: prices live here, not in the dictionaries: both languages can show TL or USD
const PRICES = {
  TRY: { sign: "₺", free: "0", month: "99", year: "899" },
  USD: { sign: "$", free: "0", month: "3.99", year: "35" },
};

// The photo limit's plans page: Free (current) next to Pro. Payments aren't open yet, so Pro's button stays locked;
// when they are, it becomes a link to the checkout (monthly or yearly variant) with the user id attached.
// Always light (cream + Pro yellow), like a printed poster, in both themes.
export function Paywall({ t, onClose }: { t: T; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [yearly, setYearly] = useState(false);
  useEffect(() => dialog.current?.showModal(), []);
  const n = (x: number) => x.toLocaleString(document.documentElement.lang);
  const per = yearly ? t.perYear : t.perMonth;
  const [usd, setUsd] = useState(() => document.documentElement.lang !== "tr"); // English UI opens in dollars
  const price = PRICES[usd ? "USD" : "TRY"];

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="paywall-title"
      aria-describedby="paywall-body"
      style={{ backgroundImage: NOISE }}
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[min(56rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[28px] bg-[#f7efe3] p-4 text-neutral-900 shadow-2xl backdrop:bg-black/50 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element -- the app icon, same as the home page */}
          <img src="/icon.svg" alt="" className="size-8" />
          corkabout
        </span>
        <button onClick={() => dialog.current?.close()} aria-label={t.close} title={t.close} className="grid size-9 place-items-center rounded-full hover:bg-black/5">
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="text-center">
        <h2 id="paywall-title" className="mt-1 text-2xl font-extrabold tracking-tight sm:text-4xl">
          {t.paywallTitle}
        </h2>
        <p id="paywall-body" className="mx-auto mt-2 max-w-md text-neutral-600">
          {fill(t.paywallBody, { n: MAX_PHOTOS_FREE })}
        </p>
        {/* 1fr | toggle | 1fr: the period toggle sits dead centre, the currency switch at the right edge */}
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <span />
          <Toggle label={t.yearly} on={yearly} set={setYearly} options={[t.monthly, <>{t.yearly}<span className="rounded-full bg-[#FECF39] px-2 py-0.5 text-xs font-semibold text-neutral-900">{t.yearlySave}</span></>]} />
          <div className="justify-self-end">
            <Currency label={t.currency} usd={usd} set={setUsd} />
          </div>
        </div>
      </div>

      {/* subgrid: both cards share the rows, so titles, prices, lists and buttons line up across them */}
      <div className="mt-6 grid grid-rows-[auto_auto_1fr_auto] gap-x-3 sm:grid-cols-[2fr_3fr]">
        <section aria-label={t.freeName} className="row-span-4 grid grid-rows-subgrid rounded-[22px] bg-[#ead7b9] p-6 shadow-[0_1px_0_rgba(255,255,255,.6)_inset,0_8px_24px_-12px_rgba(80,50,20,.35)] max-sm:mb-3">
          <h3 className="self-end text-4xl font-extrabold tracking-tight">{t.freeName}</h3>
          <Price value={price.sign + price.free} per={per} />
          <Perks list={fill(t.freePerks, { n: MAX_PHOTOS_FREE, boards: n(MAX_BOARDS), cards: n(MAX_CARDS) })} />
          <button disabled className="h-12 w-full rounded-xl border-2 border-neutral-900 font-semibold">
            {t.currentPlan}
          </button>
        </section>

        <section aria-label="Pro" className="relative row-span-4 grid grid-rows-subgrid overflow-hidden rounded-[22px] bg-[#FECF39] p-6 shadow-[0_1px_0_rgba(255,255,255,.6)_inset,0_8px_24px_-12px_rgba(80,50,20,.35)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static artwork */}
          <img src="/pro-mascot.webp" alt="" width={600} height={548} className="pointer-events-none absolute top-12 right-2 w-[50%] max-w-72 -rotate-3" />
          <h3 className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- static artwork */}
            <img src="/pro-wordmark.webp" alt="Pro" width={560} height={190} className="h-16 w-auto" />
          </h3>
          <Price value={price.sign + (yearly ? price.year : price.month)} per={per} />
          <Perks list={fill(t.proPerks, { n: n(MAX_PHOTOS_PRO) })} />
          {/* ponytail: locked until the payment provider is set up; then an <a href={checkout}> in its place */}
          <button disabled aria-describedby="paywall-soon" className="relative flex h-12 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl bg-neutral-900 text-lg font-bold text-white">
            {t.goPro}
            <span className="rounded-full bg-[#FECF39] px-2.5 py-0.5 text-xs font-semibold text-neutral-900">{t.soon}</span>
          </button>
        </section>
      </div>

      <p id="paywall-soon" className="pt-4 text-center text-sm text-neutral-700">
        {t.paywallSoon}
      </p>
    </dialog>
  );
}

function Price({ value, per }: { value: string; per: string }) {
  return (
    <p className="relative mt-3 flex items-baseline gap-1.5">
      <span className="text-4xl font-extrabold tracking-tight tabular-nums">
        <span className="sr-only">{value}</span>
        <Odometer value={value} />
      </span>
      <span key={per} className="animate-[fade-up_.3s_ease-out] text-xl font-semibold motion-reduce:animate-none">
        {per}
      </span>
    </p>
  );
}

const SLOTS = 5; // ponytail: prices up to 5 characters after the currency sign ("3.99", "1299"); raise if one gets longer
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const ease = "duration-500 ease-[cubic-bezier(.2,.9,.3,1)] motion-reduce:transition-none";

/** "₺99" ↔ "₺899" as an odometer: each digit rolls to its new value, right-aligned, and a digit that comes or goes
 * opens or closes its slot (width 1ch ↔ 0), so "₺99" rolls as two digits and the "/ ay" after it glides instead of jumping. */
function Odometer({ value }: { value: string }) {
  const [, sign, num] = value.match(/^(\D*)(.*)$/)!;
  return (
    <span aria-hidden className="inline-flex h-[1em] items-start overflow-y-clip leading-none">
      <span className="mr-0.5">{sign}</span>
      {[...num.padStart(SLOTS).slice(-SLOTS)].map((c, i) => (
        <span key={i} className={`overflow-y-clip transition-[width,opacity] ${ease} ${c === " " ? "w-0 opacity-0" : c === "." ? "w-[.26em]" : "w-[.86ch]"}`}>
          {c === "." ? (
            c
          ) : (
            <span className={`flex flex-col items-center transition-transform ${ease}`} style={{ transform: `translateY(-${(c === " " ? 0 : +c) * 10}%)` }}>
              {DIGITS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

function Perks({ list }: { list: string }) {
  return (
    <ul className="relative mt-5 mb-6 flex flex-col gap-2.5 font-medium">
      {list.split("|").map((perk) => (
        <li key={perk} className="flex items-center gap-2.5">
          <CheckCircle weight="fill" className="size-6 shrink-0" aria-hidden />
          {perk}
        </li>
      ))}
    </ul>
  );
}

/** Two options with a black pill that slides under the chosen one (equal columns, so one translate does it). */
function Toggle({ label, on, set, options }: { label: string; on: boolean; set: (on: boolean) => void; options: [React.ReactNode, React.ReactNode] }) {
  return (
    <div role="group" aria-label={label} className="relative inline-grid grid-cols-2 gap-x-2 rounded-full border-2 border-neutral-900 p-1 text-sm">
      <span
        aria-hidden
        className={`absolute inset-y-1 left-1 w-[calc((100%-1rem)/2)] rounded-full bg-neutral-900 transition-transform duration-300 ease-[cubic-bezier(.3,1.3,.5,1)] motion-reduce:transition-none ${on ? "translate-x-[calc(100%+0.5rem)]" : ""}`}
      />
      {options.map((o, i) => (
        <button
          key={i}
          aria-pressed={on === !!i}
          onClick={() => set(!!i)}
          className={`relative flex h-10 items-center justify-center gap-2 rounded-full px-5 font-semibold whitespace-nowrap transition-colors duration-300 ${on === !!i ? "text-white" : "text-neutral-900 hover:bg-black/5"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** ₺ / $: just the signs, a soft square slides under the chosen one. */
function Currency({ label, usd, set }: { label: string; usd: boolean; set: (usd: boolean) => void }) {
  return (
    <div role="group" aria-label={label} className="relative grid grid-cols-2 gap-x-1 rounded-2xl bg-black/[.07] p-1">
      <span
        aria-hidden
        className={`absolute inset-y-1 left-1 w-[calc((100%-0.75rem)/2)] rounded-xl bg-[#f7efe3] shadow-sm transition-transform duration-300 ease-[cubic-bezier(.3,1.3,.5,1)] motion-reduce:transition-none ${usd ? "translate-x-[calc(100%+0.25rem)]" : ""}`}
      />
      {(["₺", "$"] as const).map((sign, i) => (
        <button
          key={sign}
          aria-pressed={usd === !!i}
          aria-label={i ? "USD" : "TL"}
          onClick={() => set(!!i)}
          className={`relative grid size-10 place-items-center rounded-xl text-lg font-bold transition-colors duration-300 ${usd === !!i ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800"}`}
        >
          {sign}
        </button>
      ))}
    </div>
  );
}
