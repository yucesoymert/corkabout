"use client";

import { CheckCircle, X } from "@phosphor-icons/react";
import { MotionConfig, motion, type Variants } from "motion/react";
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

// Opening choreography (Motion springs): the dialog rises, the plans follow one after the other with a little
// tilt, their perks tick in, the PRO wordmark pops and the mascot jumps in, then stays put.
// Children pick up "hidden" → "show" from the dialog. Reduced motion: opacity only.
const fade = { opacity: { duration: 0.2, ease: "easeOut" } } as const; // springs move things; a bouncy spring on opacity flickers
const spring = { type: "spring", stiffness: 320, damping: 24, ...fade } as const;
const dialogIn: Variants = { hidden: { opacity: 0, y: 40, scale: 0.94 }, show: { opacity: 1, y: 0, scale: 1, transition: spring } };
const plans: Variants = { show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } };
const cardIn: Variants = {
  hidden: (tilt: number) => ({ opacity: 0, y: 28, rotate: tilt }),
  show: { opacity: 1, y: 0, rotate: 0, transition: { type: "spring", stiffness: 260, damping: 18, ...fade } },
};
const perks: Variants = { show: { transition: { staggerChildren: 0.06, delayChildren: 0.22 } } };
const perkIn: Variants = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: spring } };
const pop: Variants = {
  hidden: { opacity: 0, scale: 0.8, rotate: -4 },
  show: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 400, damping: 24, delay: 0.25, opacity: { duration: 0.2, delay: 0.25 } } },
};
const mascotIn: Variants = {
  hidden: { opacity: 0, scale: 0.7, rotate: -10, y: 24 },
  show: { opacity: 1, scale: 1, rotate: -3, y: 0, transition: { type: "spring", stiffness: 260, damping: 22, delay: 0.38, opacity: { duration: 0.2, delay: 0.38 } } },
};

// The photo limit's plans page: Free (current) next to Pro. Payments aren't open yet, so Pro's button stays locked;
// when they are, it becomes a link to the checkout (monthly or yearly variant) with the user id attached.
// Always light (cream + Pro yellow), like a printed poster, in both themes (.always-light in globals.css).
// It scrolls on short screens without a scrollbar: a native one runs down the rounded edge and looks cut off.
export function Paywall({ t, onClose }: { t: T; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [yearly, setYearly] = useState(false);
  useEffect(() => dialog.current?.showModal(), []);
  // Closing plays the opening backwards first (plain WAAPI, the ::backdrop too), since
  // the dialog unmounts the moment it closes. Escape goes through here too (cancel → close).
  const close = () => {
    const d = dialog.current;
    if (!d || matchMedia("(prefers-reduced-motion: reduce)").matches) return d?.close();
    const out = { duration: 180, easing: "ease-in", fill: "forwards" } as const;
    d.animate({ opacity: [1, 0], transform: ["none", "translateY(12px) scale(.97)"] }, out);
    d.animate({ opacity: [1, 0] }, { ...out, pseudoElement: "::backdrop" }).finished.then(() => d.close());
  };
  const n = (x: number) => x.toLocaleString(document.documentElement.lang);
  const per = yearly ? t.perYear : t.perMonth;
  const [usd, setUsd] = useState(() => document.documentElement.lang !== "tr"); // English UI opens in dollars
  const price = PRICES[usd ? "USD" : "TRY"];

  return (
    <MotionConfig reducedMotion="user">
    <motion.dialog
      ref={dialog}
      variants={dialogIn}
      initial="hidden"
      animate="show"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-labelledby="paywall-title"
      aria-describedby="paywall-body"
      style={{ backgroundImage: NOISE }}
      className="always-light m-auto max-h-[calc(100dvh-1.5rem)] w-[min(56rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-[28px] [scrollbar-width:none] bg-[#f7efe3] p-4 text-neutral-900 shadow-2xl backdrop:bg-black/50 backdrop:animate-[backdrop-in_.3s_ease-out] motion-reduce:backdrop:animate-none sm:p-6"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element -- the app icon, same as the home page */}
          <img src="/icon.svg" alt="" className="size-8" />
          corkabout
        </span>
        <button onClick={close} aria-label={t.close} title={t.close} className="grid size-9 place-items-center rounded-full hover:bg-black/5">
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
          <Toggle label={t.yearly} on={yearly} set={setYearly} options={[t.monthly, <>{t.yearly}<span className="relative overflow-hidden rounded-full bg-[#FECF39] px-2 py-0.5 text-xs font-semibold text-neutral-900">{t.yearlySave}<span aria-hidden className="absolute inset-0 animate-[shine_6s_ease-in-out_infinite] bg-[linear-gradient(45deg,transparent_36%,rgba(255,255,255,.55)_50%,transparent_64%)] bg-size-[250%_100%] bg-no-repeat motion-reduce:hidden" /></span></>]} />
          {/* phones: no room beside the period toggle, so it moves up next to the close button */}
          <div className="justify-self-end max-sm:absolute max-sm:top-3.5 max-sm:right-14">
            <Currency label={t.currency} usd={usd} set={setUsd} />
          </div>
        </div>
      </div>

      {/* subgrid: both cards share the rows, so titles, prices, lists and buttons line up across them */}
      <motion.div variants={plans} className="mt-6 grid grid-rows-[auto_auto_1fr_auto] gap-x-3 md:grid-cols-[2fr_3fr]">
        {/* same cream and grain as the dialog; a warm hairline and a lifted shadow set it apart */}
        <motion.section
          variants={cardIn}
          custom={-3}
          aria-label={t.freeName}
          style={{ backgroundImage: NOISE }}
          className="row-span-4 grid grid-rows-subgrid rounded-[22px] bg-[#f7efe3] p-5 shadow-[0_0_0_1px_rgba(120,85,40,.14),0_1px_0_rgba(255,255,255,.8)_inset,0_2px_4px_rgba(80,50,20,.06),0_14px_32px_-14px_rgba(80,50,20,.4)] sm:p-6"
        >
          <h3 className="self-end text-3xl font-extrabold sm:text-4xl tracking-tight">{t.freeName}</h3>
          <Price value={price.sign + price.free} per={per} />
          <Perks list={fill(t.freePerks, { n: MAX_PHOTOS_FREE, boards: n(MAX_BOARDS), cards: n(MAX_CARDS) })} />
          <button disabled className="h-12 w-full rounded-xl border-2 border-neutral-900 font-semibold">
            {t.currentPlan}
          </button>
        </motion.section>

        {/* phones and small tablets: Pro stacks first so the offer is on screen without scrolling */}
        <motion.section variants={cardIn} custom={3} aria-label="Pro" className="relative row-span-4 grid grid-rows-subgrid overflow-hidden rounded-[22px] bg-[#FECF39] p-5 sm:p-6 shadow-[0_1px_0_rgba(255,255,255,.6)_inset,0_8px_24px_-12px_rgba(80,50,20,.35)] max-md:order-first max-md:mb-3">
          <motion.img
            variants={mascotIn}
            src="/pro-mascot.webp"
            alt=""
            width={600}
            height={548}
            className="pointer-events-none absolute top-3 right-2 w-[38%] max-w-56 md:top-12 md:w-[40%] md:max-w-72 lg:w-[50%]"
          />
          <h3 className="relative">
            <motion.img variants={pop} src="/pro-wordmark.webp" alt="Pro" width={560} height={190} className="h-12 w-auto origin-left sm:h-16" />
          </h3>
          <Price value={price.sign + (yearly ? price.year : price.month)} per={per} />
          <Perks list={fill(t.proPerks, { n: n(MAX_PHOTOS_PRO) })} />
          {/* ponytail: locked until the payment provider is set up; then an <a href={checkout}> in its place */}
          <button disabled aria-describedby="paywall-soon" className="relative flex h-12 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl bg-neutral-900 text-lg font-bold text-white">
            {t.goPro}
            <span className="rounded-full bg-[#FECF39] px-2.5 py-0.5 text-xs font-semibold text-neutral-900">{t.soon}</span>
          </button>
        </motion.section>
      </motion.div>

      <p id="paywall-soon" className="pt-4 text-center text-sm text-neutral-900/45">
        {t.paywallSoon}
      </p>
    </motion.dialog>
    </MotionConfig>
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
    <motion.ul variants={perks} className="relative mt-5 mb-6 flex flex-col gap-2.5 font-medium">
      {list.split("|").map((perk) => (
        <motion.li variants={perkIn} key={perk} className="flex items-center gap-2.5">
          <CheckCircle weight="fill" className="size-6 shrink-0" aria-hidden />
          {perk}
        </motion.li>
      ))}
    </motion.ul>
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
        style={{ backgroundImage: NOISE }}
        className={`absolute inset-y-1 left-1 w-[calc((100%-0.75rem)/2)] rounded-xl bg-[#f7efe3] shadow-sm transition-transform duration-300 ease-[cubic-bezier(.3,1.3,.5,1)] motion-reduce:transition-none ${usd ? "translate-x-[calc(100%+0.25rem)]" : ""}`}
      />
      {(["₺", "$"] as const).map((sign, i) => (
        <button
          key={sign}
          aria-pressed={usd === !!i}
          aria-label={i ? "USD" : "TL"}
          onClick={() => set(!!i)}
          className={`relative grid size-8 place-items-center rounded-xl text-base sm:size-10 sm:text-lg font-bold transition-colors duration-300 ${usd === !!i ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800"}`}
        >
          {sign}
        </button>
      ))}
    </div>
  );
}
